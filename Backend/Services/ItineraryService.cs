using Backend.DTOs;
using Backend.Models;

namespace Backend.Services;

/// <summary>
/// Heuristic (non-AI) itinerary planner: groups saved locations into daily routes based on
/// geographic proximity, estimated time spent at each place and a reasonable time-of-day for
/// each type of place (museums/attractions in the morning, lunch, more sightseeing, dinner, bars at night).
/// Works with or without a defined trip period (Group.StartDate/EndDate).
/// </summary>
public class ItineraryService
{
    private const double AvgSpeedKmH = 22.0; // mixed walking/driving/uber estimate within a city
    private const double DefaultStopDurationHours = 1.5;
    private const double DayStartHour = 9.0;
    private const double DayBudgetHours = 9.0; // active hours/day used to balance clusters
    private const int TargetStopsPerDayFallback = 4;

    public List<ItineraryDayDto> BuildItinerary(List<Location> allLocations, DateTime? startDate, DateTime? endDate)
    {
        // Hotels are lodging references, not itinerary "stops" to visit.
        var stops = allLocations.Where(l => l.Type != "hotel").ToList();
        if (stops.Count == 0) return [];

        var dayCount = DetermineDayCount(stops, startDate, endDate);
        var clusters = ClusterByDay(stops, dayCount);
        clusters = OrderClustersGeographically(clusters);

        var result = new List<ItineraryDayDto>();
        var dayIndex = 0;
        foreach (var cluster in clusters)
        {
            if (cluster.Count == 0) continue;
            var ordered = OrderStopsForDay(cluster);
            result.Add(BuildDayPlan(dayIndex, ordered, startDate));
            dayIndex++;
        }
        return result;
    }

    private static int DetermineDayCount(List<Location> stops, DateTime? start, DateTime? end)
    {
        if (start.HasValue && end.HasValue && end.Value.Date >= start.Value.Date)
        {
            var days = (end.Value.Date - start.Value.Date).Days + 1;
            return Math.Max(1, days);
        }

        var totalHours = stops.Sum(s => s.DurationHours ?? DefaultStopDurationHours);
        var byBudget = (int)Math.Ceiling(totalHours / DayBudgetHours);
        var byCount = (int)Math.Ceiling(stops.Count / (double)TargetStopsPerDayFallback);
        return Math.Max(1, Math.Max(byBudget, byCount));
    }

    private static List<List<Location>> ClusterByDay(List<Location> stops, int k)
    {
        k = Math.Min(k, stops.Count);
        if (k <= 1) return [[..stops]];

        var centroids = SeedCentroids(stops, k);
        var assignment = new int[stops.Count];

        for (var iter = 0; iter < 20; iter++)
        {
            var changed = false;
            for (var i = 0; i < stops.Count; i++)
            {
                var best = 0;
                var bestDist = double.MaxValue;
                for (var c = 0; c < k; c++)
                {
                    var d = Haversine(stops[i].Lat, stops[i].Lng, centroids[c].lat, centroids[c].lng);
                    if (d < bestDist) { bestDist = d; best = c; }
                }
                if (assignment[i] != best) { assignment[i] = best; changed = true; }
            }

            for (var c = 0; c < k; c++)
            {
                var pts = stops.Where((_, idx) => assignment[idx] == c).ToList();
                if (pts.Count > 0)
                    centroids[c] = (pts.Average(p => p.Lat), pts.Average(p => p.Lng));
            }
            if (!changed) break;
        }

        var groups = Enumerable.Range(0, k).Select(_ => new List<Location>()).ToList();
        for (var i = 0; i < stops.Count; i++) groups[assignment[i]].Add(stops[i]);

        RebalanceByHours(groups, centroids);
        return groups;
    }

    private static List<(double lat, double lng)> SeedCentroids(List<Location> stops, int k)
    {
        // Farthest-point sampling for stable, spread-out initial centroids.
        var chosen = new List<Location> { stops[0] };
        while (chosen.Count < k)
        {
            Location? farthest = null;
            var farthestDist = -1.0;
            foreach (var candidate in stops)
            {
                var minDistToChosen = chosen.Min(c => Haversine(candidate.Lat, candidate.Lng, c.Lat, c.Lng));
                if (minDistToChosen > farthestDist)
                {
                    farthestDist = minDistToChosen;
                    farthest = candidate;
                }
            }
            if (farthest == null) break;
            chosen.Add(farthest);
        }
        return chosen.Select(c => (c.Lat, c.Lng)).ToList();
    }

    private static void RebalanceByHours(List<List<Location>> groups, List<(double lat, double lng)> centroids)
    {
        double Hours(List<Location> g) => g.Sum(l => l.DurationHours ?? DefaultStopDurationHours);

        for (var pass = 0; pass < 100; pass++)
        {
            var overIdx = -1; var underIdx = -1;
            var maxHours = -1.0; var minHours = double.MaxValue;
            for (var i = 0; i < groups.Count; i++)
            {
                var h = Hours(groups[i]);
                if (h > maxHours) { maxHours = h; overIdx = i; }
                if (h < minHours) { minHours = h; underIdx = i; }
            }

            if (overIdx == underIdx || maxHours - minHours <= DayBudgetHours * 0.35 || groups[overIdx].Count <= 1)
                break;

            // Move the point from the overloaded cluster that is closest to the underloaded cluster's centroid.
            var moving = groups[overIdx]
                .OrderBy(l => Haversine(l.Lat, l.Lng, centroids[underIdx].lat, centroids[underIdx].lng))
                .First();

            groups[overIdx].Remove(moving);
            groups[underIdx].Add(moving);
        }
    }

    private static List<List<Location>> OrderClustersGeographically(List<List<Location>> clusters)
    {
        var remaining = clusters.Where(c => c.Count > 0).ToList();
        if (remaining.Count <= 1) return remaining;

        (double lat, double lng) Centroid(List<Location> g) => (g.Average(l => l.Lat), g.Average(l => l.Lng));

        var ordered = new List<List<Location>> { remaining[0] };
        remaining.RemoveAt(0);
        while (remaining.Count > 0)
        {
            var lastCentroid = Centroid(ordered[^1]);
            var next = remaining
                .OrderBy(g => Haversine(lastCentroid.lat, lastCentroid.lng, Centroid(g).lat, Centroid(g).lng))
                .First();
            ordered.Add(next);
            remaining.Remove(next);
        }
        return ordered;
    }

    private static List<Location> OrderStopsForDay(List<Location> cluster)
    {
        // Rank 0=morning sightseeing, 1=lunch, 2=afternoon sightseeing, 3=dinner, 4=night/bar.
        var restaurantSeen = 0;
        var sightseeingSeen = 0;
        var ranked = new List<(Location loc, int rank)>();
        foreach (var l in cluster.OrderByDescending(PriorityWeight))
        {
            int rank;
            switch (l.Type)
            {
                case "bar":
                    rank = 4;
                    break;
                case "restaurant":
                    rank = restaurantSeen == 0 ? 1 : 3;
                    restaurantSeen++;
                    break;
                default:
                    rank = sightseeingSeen % 2 == 0 ? 0 : 2;
                    sightseeingSeen++;
                    break;
            }
            ranked.Add((l, rank));
        }

        var ordered = new List<Location>();
        foreach (var rankGroup in ranked.GroupBy(r => r.rank).OrderBy(g => g.Key))
        {
            var bucket = rankGroup.Select(r => r.loc).ToList();
            // Nearest-neighbor chain within the bucket, continuing from the last placed stop.
            var reference = ordered.Count > 0 ? ordered[^1] : bucket[0];
            while (bucket.Count > 0)
            {
                var next = bucket.OrderBy(l => Haversine(reference.Lat, reference.Lng, l.Lat, l.Lng)).First();
                ordered.Add(next);
                bucket.Remove(next);
                reference = next;
            }
        }
        return ordered;
    }

    private static int PriorityWeight(Location l) => l.Priority switch
    {
        "must" => 2,
        "nice" => 1,
        _ => 0,
    };

    private static ItineraryDayDto BuildDayPlan(int dayIndex, List<Location> ordered, DateTime? startDate)
    {
        var date = startDate?.AddDays(dayIndex);
        var dayLabel = date.HasValue ? $"Dia {dayIndex + 1} - {date.Value:dd/MM}" : $"Dia {dayIndex + 1}";

        var stops = new List<ItineraryStopDto>();
        var currentHour = DayStartHour;
        double totalHours = 0, totalKm = 0;
        Location? previous = null;

        for (var i = 0; i < ordered.Count; i++)
        {
            var loc = ordered[i];
            double travelKm = 0; var travelMinutes = 0;
            if (previous != null)
            {
                travelKm = Haversine(previous.Lat, previous.Lng, loc.Lat, loc.Lng);
                travelMinutes = (int)Math.Round(travelKm / AvgSpeedKmH * 60);
                currentHour += travelMinutes / 60.0;
                totalKm += travelKm;
            }

            var suggestedTime = HourToTimeString(currentHour);
            var duration = loc.DurationHours ?? DefaultStopDurationHours;

            stops.Add(new ItineraryStopDto(
                loc.Id, loc.Name, loc.Type, i + 1, suggestedTime, duration,
                Math.Round(travelKm, 1), travelMinutes));

            currentHour += duration;
            totalHours += duration;
            previous = loc;
        }

        return new ItineraryDayDto(dayIndex, dayLabel, date, stops, Math.Round(totalHours, 1), Math.Round(totalKm, 1),
            BuildSummary(stops, totalHours, totalKm));
    }

    /// <summary>
    /// Builds a short, friendly narrative (in Portuguese, with **bold** highlights) describing
    /// the day's plan, based on the time-of-day each suggested stop falls into.
    /// </summary>
    private static string BuildSummary(List<ItineraryStopDto> stops, double totalHours, double totalKm)
    {
        if (stops.Count == 0) return "";

        static string Period(string time)
        {
            var hour = int.Parse(time.Split(':')[0]);
            return hour switch
            {
                < 12 => "morning",
                < 14 => "lunch",
                < 18 => "afternoon",
                < 20 => "dinner",
                _ => "night",
            };
        }

        var byPeriod = stops
            .GroupBy(s => Period(s.SuggestedTime))
            .ToDictionary(g => g.Key, g => g.Select(s => s.Name).ToList());

        var parts = new List<string>();
        if (byPeriod.TryGetValue("morning", out var morning))
            parts.Add($"comece a manhã explorando {JoinNames(morning)}");
        if (byPeriod.TryGetValue("lunch", out var lunch))
            parts.Add($"faça uma pausa para almoçar em {JoinNames(lunch)}");
        if (byPeriod.TryGetValue("afternoon", out var afternoon))
            parts.Add($"aproveite a tarde para conhecer {JoinNames(afternoon)}");
        if (byPeriod.TryGetValue("dinner", out var dinner))
            parts.Add($"jante em {JoinNames(dinner)}");
        if (byPeriod.TryGetValue("night", out var night))
            parts.Add($"encerre a noite em {JoinNames(night)}");

        var narrative = "";
        if (parts.Count > 0)
        {
            var first = parts[0];
            first = char.ToUpper(first[0]) + first[1..];
            narrative = parts.Count > 1
                ? first + ", depois " + string.Join(", depois ", parts.Skip(1)) + "."
                : first + ".";
        }

        var stopsWord = stops.Count == 1 ? "1 parada" : $"{stops.Count} paradas";
        var footer = $" Um dia com {stopsWord}, cerca de {totalHours:0.#}h de passeio e {totalKm:0.#}km de deslocamento entre os pontos.";

        return narrative + footer;
    }

    private static string JoinNames(List<string> names)
    {
        var bolded = names.Select(n => $"**{n}**").ToList();
        if (bolded.Count == 1) return bolded[0];
        if (bolded.Count == 2) return $"{bolded[0]} e {bolded[1]}";
        return string.Join(", ", bolded.Take(bolded.Count - 1)) + $" e {bolded[^1]}";
    }

    private static string HourToTimeString(double hour)
    {
        var h = (int)Math.Floor(hour) % 24;
        var m = (int)Math.Round((hour - Math.Floor(hour)) * 60);
        if (m == 60) { m = 0; h = (h + 1) % 24; }
        return $"{h:D2}:{m:D2}";
    }

    private static double Haversine(double lat1, double lng1, double lat2, double lng2)
    {
        const double r = 6371; // km
        var dLat = ToRad(lat2 - lat1);
        var dLng = ToRad(lng2 - lng1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2)) *
                Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return r * c;
    }

    private static double ToRad(double deg) => deg * Math.PI / 180;
}


