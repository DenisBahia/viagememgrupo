namespace Backend.Models;

public class GroupMember
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Role { get; set; } = "member"; // "owner" | "member"

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid GroupId { get; set; }
    public TravelGroup Group { get; set; } = null!;
}

