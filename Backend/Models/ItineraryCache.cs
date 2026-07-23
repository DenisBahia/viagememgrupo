namespace Backend.Models;

/// <summary>
/// Caches a computed itinerary suggestion (routes grouped by day + friendly description) for a
/// group + a specific set of locations/fields, so re-opening the "Sugerir Roteiros" modal doesn't
/// re-run the clustering/heuristics every time. The cache is keyed by a hash of everything that
/// influences the result (location ids, lat/lng, type, priority, duration, day/visit info, trip
/// dates), so any relevant change naturally produces a different hash (cache miss) instead of
/// requiring explicit invalidation.
/// </summary>
public class ItineraryCache
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid GroupId { get; set; }
    public string RequestHash { get; set; } = string.Empty;
    public string ContentJson { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

