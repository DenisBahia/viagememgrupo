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
[Route("api/groups")]
[Authorize]
public class GroupsController(AppDbContext db, GoogleMapsService mapsService) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<List<GroupDto>>> GetMyGroups()
    {
        var groups = await db.GroupMembers
            .Where(gm => gm.UserId == UserId)
            .Include(gm => gm.Group)
                .ThenInclude(g => g.Members)
                    .ThenInclude(m => m.User)
            .Select(gm => gm.Group)
            .ToListAsync();

        return Ok(groups.Select(MapToDto));
    }

    [HttpPost]
    public async Task<ActionResult<GroupDto>> CreateGroup(CreateGroupRequest req)
    {
        var group = new TravelGroup
        {
            Name = req.Name,
            Destination = req.Destination,
            StartDate = req.StartDate,
            EndDate = req.EndDate
        };

        var coords = await mapsService.GeocodeAsync(req.Destination);
        if (coords != null)
        {
            group.DestinationLat = coords.Value.lat;
            group.DestinationLng = coords.Value.lng;
        }

        db.TravelGroups.Add(group);
        db.GroupMembers.Add(new GroupMember { UserId = UserId, GroupId = group.Id, Role = "owner" });
        await db.SaveChangesAsync();

        await db.Entry(group).Collection(g => g.Members).Query()
            .Include(m => m.User).LoadAsync();

        return Ok(MapToDto(group));
    }

    [HttpPost("join")]
    public async Task<ActionResult<GroupDto>> JoinGroup(JoinGroupRequest req)
    {
        var group = await db.TravelGroups
            .Include(g => g.Members).ThenInclude(m => m.User)
            .FirstOrDefaultAsync(g => g.ShareKey == req.ShareKey.ToUpper());

        if (group == null)
            return NotFound(new { message = "Chave inválida. Grupo não encontrado." });

        if (group.Members.Any(m => m.UserId == UserId))
            return Ok(MapToDto(group)); // já é membro

        db.GroupMembers.Add(new GroupMember { UserId = UserId, GroupId = group.Id, Role = "member" });
        await db.SaveChangesAsync();

        // reload members
        await db.Entry(group).Collection(g => g.Members).Query().Include(m => m.User).LoadAsync();

        return Ok(MapToDto(group));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<GroupDto>> GetGroup(Guid id)
    {
        var isMember = await db.GroupMembers.AnyAsync(gm => gm.GroupId == id && gm.UserId == UserId);
        if (!isMember) return Forbid();

        var group = await db.TravelGroups
            .Include(g => g.Members).ThenInclude(m => m.User)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group == null) return NotFound();
        return Ok(MapToDto(group));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<GroupDto>> UpdateGroup(Guid id, UpdateGroupRequest req)
    {
        var member = await db.GroupMembers.FirstOrDefaultAsync(gm => gm.GroupId == id && gm.UserId == UserId);
        if (member == null) return Forbid();
        if (member.Role != "owner") return Forbid();

        var group = await db.TravelGroups
            .Include(g => g.Members).ThenInclude(m => m.User)
            .FirstOrDefaultAsync(g => g.Id == id);
        if (group == null) return NotFound();

        group.Name = req.Name;
        if (group.Destination != req.Destination)
        {
            var newCoords = await mapsService.GeocodeAsync(req.Destination);
            group.DestinationLat = newCoords?.lat;
            group.DestinationLng = newCoords?.lng;
        }
        group.Destination = req.Destination;
        group.StartDate = req.StartDate;
        group.EndDate = req.EndDate;

        await db.SaveChangesAsync();
        return Ok(MapToDto(group));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteGroup(Guid id)
    {
        var member = await db.GroupMembers.FirstOrDefaultAsync(gm => gm.GroupId == id && gm.UserId == UserId);
        if (member == null) return Forbid();
        if (member.Role != "owner") return Forbid();

        var group = await db.TravelGroups.FindAsync(id);
        if (group == null) return NotFound();

        db.TravelGroups.Remove(group);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private GroupDto MapToDto(TravelGroup g)
    {
        var owner = g.Members.FirstOrDefault(m => m.Role == "owner")?.User;
        var isOwner = g.Members.Any(m => m.UserId == UserId && m.Role == "owner");
        var members = g.Members
            .OrderByDescending(m => m.Role == "owner")
            .ThenBy(m => m.User.Name)
            .Select(m => new GroupMemberDto(m.UserId, m.User.Name, m.User.Email, m.Role))
            .ToList();
        return new GroupDto(g.Id, g.Name, g.Destination, g.DestinationLat, g.DestinationLng, g.StartDate, g.EndDate,
            g.ShareKey, owner?.Name ?? "", g.Members.Count, g.CreatedAt, isOwner, members);
    }
}

