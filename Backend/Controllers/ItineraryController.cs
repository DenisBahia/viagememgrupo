using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Backend.Controllers;

[ApiController]
[Route("api/groups/{groupId}")]
[Authorize]
public class ItineraryController(AppDbContext db, ItineraryService itineraryService, IMemoryCache memoryCache) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private const int MaxCachedSuggestionsPerGroup = 10;

    private async Task<bool> IsMemberAsync(Guid groupId) =>
        await db.GroupMembers.AnyAsync(gm => gm.GroupId == groupId && gm.UserId == UserId);

    // Computes a suggested day-by-day itinerary. Results are cached per group + the exact set/state
    // of the locations involved, so re-opening the suggestion modal doesn't redo the clustering and
    // route-description generation unless something relevant actually changed.
    [HttpPost("itinerary/suggest")]
    public async Task<ActionResult<ItinerarySuggestionResponseDto>> SuggestItinerary(Guid groupId, [FromBody] SuggestItineraryRequest req)
    {
        if (!await IsMemberAsync(groupId)) return Forbid();

        var group = await db.TravelGroups.FindAsync(groupId);
        if (group == null) return NotFound();

        var query = db.Locations.Where(l => l.GroupId == groupId);
        if (req.LocationIds is { Count: > 0 })
            query = query.Where(l => req.LocationIds.Contains(l.Id));

        var locations = await query.ToListAsync();
        if (locations.Count == 0)
            return BadRequest(new { message = "Nenhum local encontrado para gerar o roteiro." });

        var hash = ComputeRequestHash(locations, group.StartDate, group.EndDate);
        var cached = await db.ItineraryCaches.FirstOrDefaultAsync(c => c.GroupId == groupId && c.RequestHash == hash);
        if (cached != null)
        {
            var days = JsonSerializer.Deserialize<List<ItineraryDayDto>>(cached.ContentJson) ?? [];
            return Ok(new ItinerarySuggestionResponseDto(days, true, cached.CreatedAt));
        }

        var itinerary = itineraryService.BuildItinerary(locations, group.StartDate, group.EndDate);

        var entry = new ItineraryCache
        {
            GroupId = groupId,
            RequestHash = hash,
            ContentJson = JsonSerializer.Serialize(itinerary),
        };
        db.ItineraryCaches.Add(entry);
        await TrimCacheAsync(groupId);
        await db.SaveChangesAsync();

        return Ok(new ItinerarySuggestionResponseDto(itinerary, false, entry.CreatedAt));
    }

    // Persists the DayLabel/DayOrder/VisitDate/VisitTime chosen for each location from a suggested itinerary.
    [HttpPost("itinerary/apply")]
    public async Task<ActionResult> ApplyItinerary(Guid groupId, [FromBody] ApplyItineraryRequest req)
    {
        if (!await IsMemberAsync(groupId)) return Forbid();

        var ids = req.Assignments.Select(a => a.LocationId).ToList();
        var locations = await db.Locations.Where(l => l.GroupId == groupId && ids.Contains(l.Id)).ToListAsync();

        foreach (var assignment in req.Assignments)
        {
            var loc = locations.FirstOrDefault(l => l.Id == assignment.LocationId);
            if (loc == null) continue;
            loc.DayLabel = assignment.DayLabel;
            loc.DayOrder = assignment.Order;
            if (assignment.VisitDate.HasValue) loc.VisitDate = assignment.VisitDate;
            if (assignment.VisitTime != null) loc.VisitTime = assignment.VisitTime;
        }

        // The applied result changes location state, so any previously cached suggestions for
        // this group are no longer relevant (their hash won't match anymore, but we clean up
        // right away to keep the table small).
        var staleCache = await db.ItineraryCaches.Where(c => c.GroupId == groupId).ToListAsync();
        db.ItineraryCaches.RemoveRange(staleCache);

        await db.SaveChangesAsync();
        return Ok(new { updated = locations.Count });
    }


    // Builds a Google Maps directions link per day (grouped by DayLabel) for the given (or all) locations.
    // Cached in-memory per group + location state, since it's recomputed often (every time filters change).
    [HttpPost("export-routes")]
    public async Task<ActionResult<List<ExportRouteDto>>> ExportRoutes(Guid groupId, [FromBody] ExportRoutesRequest req)
    {
        if (!await IsMemberAsync(groupId)) return Forbid();

        var query = db.Locations.Where(l => l.GroupId == groupId);
        if (req.LocationIds is { Count: > 0 })
            query = query.Where(l => req.LocationIds.Contains(l.Id));

        var locations = await query
            .OrderBy(l => l.DayOrder ?? int.MaxValue).ThenBy(l => l.VisitTime).ThenBy(l => l.CreatedAt)
            .ToListAsync();

        if (locations.Count == 0)
            return BadRequest(new { message = "Nenhum local encontrado para exportar." });

        var cacheKey = $"export-routes:{groupId}:{ComputeRequestHash(locations, null, null)}";
        if (memoryCache.TryGetValue(cacheKey, out List<ExportRouteDto>? cachedRoutes) && cachedRoutes != null)
            return Ok(cachedRoutes);

        var groups = locations
            .GroupBy(l => l.DayLabel ?? "Sem dia definido")
            .OrderBy(g => g.Key, StringComparer.Create(new System.Globalization.CultureInfo("pt-BR"), true));

        var result = new List<ExportRouteDto>();
        foreach (var g in groups)
        {
            var stops = g.ToList();
            string url;
            if (stops.Count == 1)
            {
                url = $"https://www.google.com/maps/search/?api=1&query={stops[0].Lat},{stops[0].Lng}";
            }
            else
            {
                var origin = $"{stops.First().Lat},{stops.First().Lng}";
                var destination = $"{stops.Last().Lat},{stops.Last().Lng}";
                var waypoints = stops.Skip(1).Take(stops.Count - 2).Select(l => $"{l.Lat},{l.Lng}");
                var waypointsStr = string.Join("|", waypoints);
                url = $"https://www.google.com/maps/dir/?api=1&origin={origin}&destination={destination}&travelmode=driving";
                if (waypointsStr.Length > 0) url += $"&waypoints={waypointsStr}";
            }
            result.Add(new ExportRouteDto(g.Key, url, stops.Count));
        }

        memoryCache.Set(cacheKey, result, TimeSpan.FromMinutes(30));
        return Ok(result);
    }

    private static string ComputeRequestHash(List<Location> locations, DateTime? startDate, DateTime? endDate)
    {
        var sb = new StringBuilder();
        sb.Append(startDate?.ToString("yyyy-MM-dd")).Append('|').Append(endDate?.ToString("yyyy-MM-dd")).Append(';');
        foreach (var l in locations.OrderBy(l => l.Id))
        {
            sb.Append(l.Id).Append(':')
              .Append(l.Type).Append(':')
              .Append(l.Priority).Append(':')
              .Append(l.Lat.ToString("F6")).Append(':')
              .Append(l.Lng.ToString("F6")).Append(':')
              .Append(l.DurationHours).Append(':')
              .Append(l.DayLabel).Append(':')
              .Append(l.DayOrder).Append(':')
              .Append(l.VisitTime).Append(':')
              .Append(l.VisitDate?.ToString("yyyy-MM-dd"))
              .Append(';');
        }
        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return Convert.ToHexString(SHA256.HashData(bytes));
    }

    private async Task TrimCacheAsync(Guid groupId)
    {
        var rows = await db.ItineraryCaches
            .Where(c => c.GroupId == groupId)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        if (rows.Count > MaxCachedSuggestionsPerGroup)
            db.ItineraryCaches.RemoveRange(rows.Skip(MaxCachedSuggestionsPerGroup));
    }
}


