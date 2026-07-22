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
public class LocationsController(AppDbContext db, GoogleMapsService mapsService) : ControllerBase
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

    [HttpGet("groups/{groupId}/locations")]
    public async Task<ActionResult<List<LocationDto>>> GetLocations(Guid groupId)
    {
        if (!await IsMemberAsync(groupId)) return Forbid();

        var locations = await db.Locations
            .Where(l => l.GroupId == groupId)
            .Include(l => l.AddedBy)
            .OrderBy(l => l.VisitDate).ThenBy(l => l.VisitTime).ThenBy(l => l.CreatedAt)
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
        var location = await db.Locations.Include(l => l.AddedBy).FirstOrDefaultAsync(l => l.Id == id);
        if (location == null) return NotFound();
        if (!await IsMemberAsync(location.GroupId)) return Forbid();

        if (req.Priority != null) location.Priority = req.Priority;
        if (req.Type != null) location.Type = req.Type;
        if (req.VisitDate.HasValue) location.VisitDate = req.VisitDate;
        if (req.VisitTime != null) location.VisitTime = req.VisitTime;
        if (req.DurationHours.HasValue) location.DurationHours = req.DurationHours;
        if (req.NeedsReservation.HasValue) location.NeedsReservation = req.NeedsReservation.Value;
        if (req.ReservationDone.HasValue) location.ReservationDone = req.ReservationDone.Value;
        if (req.Notes != null) location.Notes = req.Notes;
        if (req.DayLabel != null) location.DayLabel = req.DayLabel;

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

    private static LocationDto MapToDto(Location l) => new(
        l.Id, l.Name, l.Address, l.GoogleMapsUrl, l.GooglePlaceId,
        l.Lat, l.Lng, l.Type, l.Priority, l.VisitDate, l.VisitTime,
        l.DurationHours, l.NeedsReservation, l.ReservationDone,
        l.Notes, l.GoogleRating, l.DayLabel, l.PhotoUrl,
        l.AddedBy?.Name ?? "", l.CreatedAt);
}

public record PreviewRequest(string Url);

