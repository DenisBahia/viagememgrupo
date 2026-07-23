namespace Backend.DTOs;

// Auth
public record RegisterRequest(string Name, string Email, string Password);
public record LoginRequest(string Email, string Password);
public record AuthResponse(string Token, UserDto User);
public record UserDto(Guid Id, string Name, string Email);

// Groups
public record CreateGroupRequest(string Name, string Destination, DateTime? StartDate, DateTime? EndDate);
public record UpdateGroupRequest(string Name, string Destination, DateTime? StartDate, DateTime? EndDate);
public record JoinGroupRequest(string ShareKey);
public record GroupMemberDto(Guid Id, string Name, string Email, string Role);
public record GroupDto(
    Guid Id, string Name, string Destination,
    double? DestinationLat, double? DestinationLng,
    DateTime? StartDate, DateTime? EndDate,
    string ShareKey, string OwnerName, int MemberCount, DateTime CreatedAt,
    bool IsOwner, List<GroupMemberDto> Members);

// Locations
public record CreateLocationRequest(
    string GoogleMapsUrl,
    string Priority,
    string Type,
    DateTime? VisitDate,
    string? VisitTime,
    double? DurationHours,
    bool NeedsReservation,
    string? Notes,
    string? DayLabel);

public record UpdateLocationRequest(
    string? Priority,
    string? Type,
    DateTime? VisitDate,
    string? VisitTime,
    double? DurationHours,
    bool? NeedsReservation,
    bool? ReservationDone,
    string? Notes,
    string? DayLabel,
    bool ClearVisitDate = false,
    bool ClearVisitTime = false,
    bool ClearDurationHours = false,
    bool ClearNotes = false,
    bool ClearDayLabel = false);

// Drag & drop reordering of locations within a day
public record ReorderLocationsRequest(string? DayLabel, List<Guid> OrderedLocationIds);

public record LocationDto(
    Guid Id,
    string Name,
    string Address,
    string GoogleMapsUrl,
    string? GooglePlaceId,
    double Lat,
    double Lng,
    string Type,
    string Priority,
    DateTime? VisitDate,
    string? VisitTime,
    double? DurationHours,
    bool NeedsReservation,
    bool ReservationDone,
    string? Notes,
    double? GoogleRating,
    string? DayLabel,
    int? DayOrder,
    string? PhotoUrl,
    string AddedByName,
    DateTime CreatedAt,
    int LikeCount,
    int DislikeCount,
    bool? MyVote,
    List<string> LikedByNames,
    List<string> DislikedByNames);


public record VoteRequest(bool IsLike);

public record ParsedPlaceDto(
    string Name,
    string Address,
    double Lat,
    double Lng,
    string? PlaceId,
    double? Rating,
    string? PhotoUrl,
    string SuggestedType);

// AI (Gemini) tips
public record AiTipsDto(string Content, DateTime GeneratedAt, bool FromCache);

// Itinerary suggestion
public record SuggestItineraryRequest(List<Guid>? LocationIds);

public record ItineraryStopDto(
    Guid LocationId,
    string Name,
    string Type,
    int Order,
    string SuggestedTime,
    double SuggestedDurationHours,
    double TravelKmFromPrevious,
    int TravelMinutesFromPrevious);

public record ItineraryDayDto(
    int DayIndex,
    string DayLabel,
    DateTime? Date,
    List<ItineraryStopDto> Stops,
    double TotalDurationHours,
    double TotalDistanceKm,
    string Summary);

public record ItineraryAssignmentDto(Guid LocationId, string DayLabel, int Order, DateTime? VisitDate, string? VisitTime);
public record ApplyItineraryRequest(List<ItineraryAssignmentDto> Assignments);

public record ItinerarySuggestionResponseDto(List<ItineraryDayDto> Days, bool FromCache, DateTime GeneratedAt);


// Multi-day route export
public record ExportRoutesRequest(List<Guid>? LocationIds);
public record ExportRouteDto(string DayLabel, string Url, int StopsCount);

