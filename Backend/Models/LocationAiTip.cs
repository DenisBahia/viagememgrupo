namespace Backend.Models;

// Cache of AI-generated tips (Gemini) for a Location, so we only call the AI API once per place.
public class LocationAiTip
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid LocationId { get; set; }
    public Location Location { get; set; } = null!;

    public string Content { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

