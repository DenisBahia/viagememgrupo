namespace Backend.Models;

public class LocationVote
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // true = like, false = dislike
    public bool IsLike { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Guid LocationId { get; set; }
    public Location Location { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
}

