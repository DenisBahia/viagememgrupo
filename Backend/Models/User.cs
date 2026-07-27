namespace Backend.Models;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    // Nullable because users who sign up via Google login don't have a local password.
    public string? PasswordHash { get; set; }
    // Unique subject ("sub") claim from Google's ID token, set when the user logs in via Google.
    public string? GoogleId { get; set; }
    public string? AvatarUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<GroupMember> GroupMemberships { get; set; } = [];
    public ICollection<Location> AddedLocations { get; set; } = [];
}

