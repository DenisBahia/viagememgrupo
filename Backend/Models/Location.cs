namespace Backend.Models;

public class Location
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string GoogleMapsUrl { get; set; } = string.Empty;
    public string? GooglePlaceId { get; set; }
    public double Lat { get; set; }
    public double Lng { get; set; }

    // restaurant | bar | tourist | church | hotel | museum | park | other
    public string Type { get; set; } = "other";

    // must | nice | maybe
    public string Priority { get; set; } = "nice";

    public DateTime? VisitDate { get; set; }
    public string? VisitTime { get; set; }
    public double? DurationHours { get; set; }
    public bool NeedsReservation { get; set; } = false;
    public bool ReservationDone { get; set; } = false;
    public string? Notes { get; set; }
    public double? GoogleRating { get; set; }
    public string? DayLabel { get; set; }
    public string? PhotoUrl { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Guid GroupId { get; set; }
    public TravelGroup Group { get; set; } = null!;

    public Guid AddedById { get; set; }
    public User AddedBy { get; set; } = null!;
}

