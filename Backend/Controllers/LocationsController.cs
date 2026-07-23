using System.Security.Claims;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class LocationsController(AppDbContext db, GoogleMapsService mapsService, GeminiService geminiService) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<bool> IsMemberAsync(Guid groupId) =>
        await db.GroupMembers.AnyAsync(gm => gm.GroupId == groupId && gm.UserId == UserId);

    // Preview before saving: parse a Google Maps URL
    [HttpPost("groups/{groupId}/locations/preview")]
    public async Task<ActionResult<ParsedPlaceDto>> PreviewLocation(Guid groupId, [FromBody] PreviewRequest req)
    {
        if (!await IsMemberAsync(groupId)) return Forbid();

        var parsed = await mapsService.ParseMapsUrlAsync(req.Url);
        if (parsed == null) return BadRequest(new { message = "Não foi possível obter informações deste link. Verifique se é um link válido do Google Maps." });

        return Ok(parsed);
    }

    // Search for a place by free text directly in the app (no Google Maps link needed).
    // Results are biased towards the group's destination so a search like "Central Park"
    // doesn't return a same-named place in the wrong country.
    [HttpGet("groups/{groupId}/locations/search")]
    public async Task<ActionResult<List<ParsedPlaceDto>>> SearchPlaces(Guid groupId, [FromQuery] string query)
    {
        if (!await IsMemberAsync(groupId)) return Forbid();
        if (string.IsNullOrWhiteSpace(query)) return Ok(new List<ParsedPlaceDto>());

        var group = await db.TravelGroups.FindAsync(groupId);
        (double lat, double lng)? bias = group?.DestinationLat != null && group.DestinationLng != null
            ? (group.DestinationLat.Value, group.DestinationLng.Value)
            : null;

        var results = await mapsService.SearchPlacesAsync(query, bias);
        return Ok(results);
    }

    [HttpGet("groups/{groupId}/locations")]
    public async Task<ActionResult<List<LocationDto>>> GetLocations(Guid groupId)
    {
        if (!await IsMemberAsync(groupId)) return Forbid();

        var locations = await db.Locations
            .Where(l => l.GroupId == groupId)
            .Include(l => l.AddedBy)
            .Include(l => l.Votes).ThenInclude(v => v.User)
            .OrderBy(l => l.DayOrder ?? int.MaxValue).ThenBy(l => l.VisitDate).ThenBy(l => l.VisitTime).ThenBy(l => l.CreatedAt)
            .ToListAsync();

        return Ok(locations.Select(MapToDto));
    }

    [HttpPost("groups/{groupId}/locations")]
    public async Task<ActionResult<LocationDto>> AddLocation(Guid groupId, CreateLocationRequest req)
    {
        if (!await IsMemberAsync(groupId)) return Forbid();

        var parsed = await mapsService.ParseMapsUrlAsync(req.GoogleMapsUrl);
        if (parsed == null) return BadRequest(new { message = "Não foi possível processar o link do Google Maps." });

        var location = new Location
        {
            Name = parsed.Name,
            Address = parsed.Address,
            GoogleMapsUrl = req.GoogleMapsUrl,
            GooglePlaceId = parsed.PlaceId,
            Lat = parsed.Lat,
            Lng = parsed.Lng,
            GoogleRating = parsed.Rating,
            PhotoUrl = parsed.PhotoUrl,
            Type = req.Type != "other" ? req.Type : parsed.SuggestedType,
            Priority = req.Priority,
            VisitDate = req.VisitDate,
            VisitTime = req.VisitTime,
            DurationHours = req.DurationHours,
            NeedsReservation = req.NeedsReservation,
            Notes = req.Notes,
            DayLabel = req.DayLabel,
            GroupId = groupId,
            AddedById = UserId
        };

        db.Locations.Add(location);
        await db.SaveChangesAsync();
        await db.Entry(location).Reference(l => l.AddedBy).LoadAsync();

        return Ok(MapToDto(location));
    }

    [HttpPut("locations/{id}")]
    public async Task<ActionResult<LocationDto>> UpdateLocation(Guid id, UpdateLocationRequest req)
    {
        var location = await db.Locations.Include(l => l.AddedBy).Include(l => l.Votes).ThenInclude(v => v.User).FirstOrDefaultAsync(l => l.Id == id);
        if (location == null) return NotFound();
        if (!await IsMemberAsync(location.GroupId)) return Forbid();

        if (req.Priority != null) location.Priority = req.Priority;
        if (req.Type != null) location.Type = req.Type;

        if (req.ClearVisitDate) location.VisitDate = null;
        else if (req.VisitDate.HasValue) location.VisitDate = req.VisitDate;

        if (req.ClearVisitTime) location.VisitTime = null;
        else if (req.VisitTime != null) location.VisitTime = req.VisitTime;

        if (req.ClearDurationHours) location.DurationHours = null;
        else if (req.DurationHours.HasValue) location.DurationHours = req.DurationHours;

        if (req.NeedsReservation.HasValue) location.NeedsReservation = req.NeedsReservation.Value;
        if (req.ReservationDone.HasValue) location.ReservationDone = req.ReservationDone.Value;

        if (req.ClearNotes) location.Notes = null;
        else if (req.Notes != null) location.Notes = req.Notes;

        if (req.ClearDayLabel) location.DayLabel = null;
        else if (req.DayLabel != null) location.DayLabel = req.DayLabel;

        await db.SaveChangesAsync();
        return Ok(MapToDto(location));
    }

    [HttpDelete("locations/{id}")]
    public async Task<IActionResult> DeleteLocation(Guid id)
    {
        var location = await db.Locations.FindAsync(id);
        if (location == null) return NotFound();
        if (!await IsMemberAsync(location.GroupId)) return Forbid();

        db.Locations.Remove(location);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // Drag & drop reordering: persists the manual order of locations within a day so the
    // sequence is respected both in the sidebar list and in the map's route line.
    [HttpPut("groups/{groupId}/locations/reorder")]
    public async Task<ActionResult> ReorderLocations(Guid groupId, ReorderLocationsRequest req)
    {
        if (!await IsMemberAsync(groupId)) return Forbid();
        if (req.OrderedLocationIds.Count == 0) return Ok(new { updated = 0 });

        var locations = await db.Locations
            .Where(l => l.GroupId == groupId && req.OrderedLocationIds.Contains(l.Id))
            .ToListAsync();

        for (var i = 0; i < req.OrderedLocationIds.Count; i++)
        {
            var loc = locations.FirstOrDefault(l => l.Id == req.OrderedLocationIds[i]);
            if (loc == null) continue;
            loc.DayOrder = i;
        }

        await db.SaveChangesAsync();
        return Ok(new { updated = locations.Count });
    }

    // Like / dislike a location. Voting again with the same value removes the vote (toggle off).
    [HttpPost("locations/{id}/vote")]
    public async Task<ActionResult<LocationDto>> VoteLocation(Guid id, VoteRequest req)
    {
        var location = await db.Locations.Include(l => l.AddedBy).Include(l => l.Votes).ThenInclude(v => v.User).FirstOrDefaultAsync(l => l.Id == id);
        if (location == null) return NotFound();
        if (!await IsMemberAsync(location.GroupId)) return Forbid();

        var existing = location.Votes.FirstOrDefault(v => v.UserId == UserId);
        if (existing != null)
        {
            if (existing.IsLike == req.IsLike)
            {
                // Same vote clicked again -> remove it (toggle off)
                db.LocationVotes.Remove(existing);
                location.Votes.Remove(existing);
            }
            else
            {
                existing.IsLike = req.IsLike;
            }
        }
        else
        {
            var vote = new LocationVote { LocationId = id, UserId = UserId, IsLike = req.IsLike };
            db.LocationVotes.Add(vote);
            location.Votes.Add(vote);
            // Attach the current user so MapToDto can read the voter's name without a re-query.
            vote.User = await db.Users.FindAsync(UserId) ?? vote.User;
        }

        await db.SaveChangesAsync();
        return Ok(MapToDto(location));
    }

    [HttpDelete("locations/{id}/vote")]
    public async Task<ActionResult<LocationDto>> RemoveVote(Guid id)
    {
        var location = await db.Locations.Include(l => l.AddedBy).Include(l => l.Votes).ThenInclude(v => v.User).FirstOrDefaultAsync(l => l.Id == id);
        if (location == null) return NotFound();
        if (!await IsMemberAsync(location.GroupId)) return Forbid();

        var existing = location.Votes.FirstOrDefault(v => v.UserId == UserId);
        if (existing != null)
        {
            db.LocationVotes.Remove(existing);
            location.Votes.Remove(existing);
            await db.SaveChangesAsync();
        }

        return Ok(MapToDto(location));
    }

    // Generate Google Maps directions URL for all locations of a day
    [HttpGet("groups/{groupId}/export-route")]
    public async Task<ActionResult<object>> ExportRoute(Guid groupId, [FromQuery] string? dayLabel)
    {
        if (!await IsMemberAsync(groupId)) return Forbid();

        var query = db.Locations.Where(l => l.GroupId == groupId);
        if (dayLabel != null) query = query.Where(l => l.DayLabel == dayLabel);

        var locations = await query.OrderBy(l => l.VisitTime).ToListAsync();
        if (!locations.Any()) return BadRequest(new { message = "Nenhum local encontrado." });

        var waypoints = locations.Skip(1).Take(locations.Count - 2)
            .Select(l => $"{l.Lat},{l.Lng}");

        var origin = $"{locations.First().Lat},{locations.First().Lng}";
        var destination = $"{locations.Last().Lat},{locations.Last().Lng}";
        var waypointsStr = string.Join("|", waypoints);

        var url = $"https://www.google.com/maps/dir/{origin}/{destination}";
        if (waypointsStr.Length > 0)
            url = $"https://www.google.com/maps/dir/?api=1&origin={origin}&destination={destination}&waypoints={waypointsStr}";

        return Ok(new { url });
    }

    // AI (Gemini) tips: best time to visit, duration, what to eat, reservation/ticket needs, etc.
    // Cached in DB per location so we only call Gemini once per place.
    [HttpGet("locations/{id}/ai-tips")]
    public async Task<ActionResult<AiTipsDto>> GetAiTips(Guid id)
    {
        var location = await db.Locations.FindAsync(id);
        if (location == null) return NotFound();
        if (!await IsMemberAsync(location.GroupId)) return Forbid();

        var cached = await db.LocationAiTips.FirstOrDefaultAsync(t => t.LocationId == id);
        if (cached != null)
            return Ok(new AiTipsDto(cached.Content, cached.CreatedAt, true));

        if (!geminiService.IsConfigured)
            return StatusCode(503, new { message = "Integração com Gemini AI não está configurada no servidor." });

        string content;
        try
        {
            content = await geminiService.GetTipsAsync(location);
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { message = "Não foi possível buscar dicas com a IA agora. Tente novamente em instantes.", detail = ex.Message });
        }

        var tip = new LocationAiTip { LocationId = id, Content = content };
        db.LocationAiTips.Add(tip);
        await db.SaveChangesAsync();

        return Ok(new AiTipsDto(tip.Content, tip.CreatedAt, false));
    }

    private LocationDto MapToDto(Location l) => new(
        l.Id, l.Name, l.Address, l.GoogleMapsUrl, l.GooglePlaceId,
        l.Lat, l.Lng, l.Type, l.Priority, l.VisitDate, l.VisitTime,
        l.DurationHours, l.NeedsReservation, l.ReservationDone,
        l.Notes, l.GoogleRating, l.DayLabel, l.DayOrder, l.PhotoUrl,
        l.AddedBy?.Name ?? "", l.CreatedAt,
        l.Votes.Count(v => v.IsLike),
        l.Votes.Count(v => !v.IsLike),
        l.Votes.FirstOrDefault(v => v.UserId == UserId)?.IsLike,
        l.Votes.Where(v => v.IsLike).Select(v => v.User?.Name ?? "").ToList(),
        l.Votes.Where(v => !v.IsLike).Select(v => v.User?.Name ?? "").ToList());
}

public record PreviewRequest(string Url);

