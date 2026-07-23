using Backend.DTOs;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Backend.Services;

public class GoogleMapsService(IConfiguration config, IHttpClientFactory httpClientFactory)
{
    private readonly string _apiKey = config["GoogleMaps:ApiKey"]!;

    public async Task<(double lat, double lng)?> GeocodeAsync(string address)
    {
        if (string.IsNullOrWhiteSpace(address)) return null;

        try
        {
            var client = httpClientFactory.CreateClient();
            var encoded = Uri.EscapeDataString(address);
            var requestUrl = $"https://maps.googleapis.com/maps/api/geocode/json?address={encoded}&key={_apiKey}";

            var response = await client.GetStringAsync(requestUrl);
            var json = JsonDocument.Parse(response);
            var results = json.RootElement.GetProperty("results");

            if (results.GetArrayLength() == 0) return null;

            var loc = results[0].GetProperty("geometry").GetProperty("location");
            return (loc.GetProperty("lat").GetDouble(), loc.GetProperty("lng").GetDouble());
        }
        catch
        {
            return null;
        }
    }

    public async Task<ParsedPlaceDto?> ParseMapsUrlAsync(string url)
    {
        // Expand shortened URLs (maps.app.goo.gl)
        var expandedUrl = await ExpandUrlAsync(url);

        // Try to extract Place ID or coordinates from URL
        var placeId = ExtractPlaceId(expandedUrl);
        var coords = ExtractCoordinates(expandedUrl);
        var nameFromUrl = ExtractNameFromUrl(expandedUrl);

        if (placeId != null)
            return await GetPlaceDetailsAsync(placeId);

        if (coords != null)
            return await ReverseGeocodeAsync(coords.Value.lat, coords.Value.lng, nameFromUrl);

        if (nameFromUrl != null)
            return await SearchPlaceAsync(nameFromUrl, null);

        return null;
    }

    // Lets the user search for a place by free text directly in the app (instead of only
    // pasting a ready-made Google Maps link). Returns several candidates so the user can
    // pick the right one. `bias` (usually the group's destination) keeps results close to
    // where the trip is happening instead of matching a same-named place elsewhere in the world.
    public async Task<List<ParsedPlaceDto>> SearchPlacesAsync(string query, (double lat, double lng)? bias = null)
    {
        if (string.IsNullOrWhiteSpace(query)) return [];

        try
        {
            var client = httpClientFactory.CreateClient();
            var encoded = Uri.EscapeDataString(query);
            var requestUrl = $"https://maps.googleapis.com/maps/api/place/textsearch/json?query={encoded}&key={_apiKey}";
            if (bias != null)
            {
                var latStr = bias.Value.lat.ToString(System.Globalization.CultureInfo.InvariantCulture);
                var lngStr = bias.Value.lng.ToString(System.Globalization.CultureInfo.InvariantCulture);
                requestUrl += $"&location={latStr},{lngStr}&radius=50000";
            }

            var response = await client.GetStringAsync(requestUrl);
            var json = JsonDocument.Parse(response);
            if (!json.RootElement.TryGetProperty("results", out var results)) return [];

            var list = new List<ParsedPlaceDto>();
            foreach (var r in results.EnumerateArray().Take(8))
            {
                var dto = MapPlaceResult(r, null);
                if (dto != null) list.Add(dto);
            }
            return list;
        }
        catch
        {
            return [];
        }
    }

    private async Task<string> ExpandUrlAsync(string url)
    {
        if (!url.Contains("goo.gl") && !url.Contains("maps.app"))
            return url;

        try
        {
            var client = httpClientFactory.CreateClient("NoRedirect");
            var response = await client.GetAsync(url);
            if (response.Headers.Location != null)
                return response.Headers.Location.ToString();
        }
        catch { /* ignore */ }

        return url;
    }

    private static string? ExtractPlaceId(string url)
    {
        // Matches both `place_id=` and the official `query_place_id=` link format
        // (e.g. https://www.google.com/maps/search/?api=1&query=Name&query_place_id=ChIJ...),
        // which we use for locations added via in-app search.
        var match = Regex.Match(url, @"[?&](?:query_)?place_id=([^&]+)");
        return match.Success ? Uri.UnescapeDataString(match.Groups[1].Value) : null;
    }

    private static (double lat, double lng)? ExtractCoordinates(string url)
    {
        // Matches @lat,lng or /lat,lng,zoom
        var match = Regex.Match(url, @"@(-?\d+\.?\d*),(-?\d+\.?\d*)");
        if (match.Success &&
            double.TryParse(match.Groups[1].Value, System.Globalization.CultureInfo.InvariantCulture, out var lat) &&
            double.TryParse(match.Groups[2].Value, System.Globalization.CultureInfo.InvariantCulture, out var lng))
            return (lat, lng);
        return null;
    }

    private static string? ExtractNameFromUrl(string url)
    {
        // e.g. /maps/place/Restaurante+XYZ/
        var match = Regex.Match(url, @"/maps/place/([^/@]+)");
        if (match.Success)
            return Uri.UnescapeDataString(match.Groups[1].Value.Replace("+", " "));
        return null;
    }

    private async Task<ParsedPlaceDto?> GetPlaceDetailsAsync(string placeId)
    {
        var client = httpClientFactory.CreateClient();
        var fields = "name,formatted_address,geometry,rating,photos,types";
        var requestUrl = $"https://maps.googleapis.com/maps/api/place/details/json?place_id={placeId}&fields={fields}&key={_apiKey}";

        var response = await client.GetStringAsync(requestUrl);
        var json = JsonDocument.Parse(response);
        var result = json.RootElement.GetProperty("result");

        return MapPlaceResult(result, placeId);
    }

    private async Task<ParsedPlaceDto?> ReverseGeocodeAsync(double lat, double lng, string? hint)
    {
        // First try a nearby search if we have a name hint, biasing results to these exact
        // coordinates via `locationbias` (NOT by appending the coords to the text query -
        // that used to make Google match a same-named place on the wrong continent, e.g. a
        // link to a spot in Ireland resolving to a US/Canada location with the same name).
        if (hint != null)
        {
            var nearby = await SearchPlaceAsync(hint, (lat, lng));
            if (nearby != null) return nearby;
        }

        var client = httpClientFactory.CreateClient();
        var requestUrl = $"https://maps.googleapis.com/maps/api/geocode/json?latlng={lat},{lng}&key={_apiKey}";
        var response = await client.GetStringAsync(requestUrl);
        var json = JsonDocument.Parse(response);
        var results = json.RootElement.GetProperty("results");

        if (results.GetArrayLength() == 0) return null;

        var first = results[0];
        var address = first.GetProperty("formatted_address").GetString() ?? "";
        var placeId = first.TryGetProperty("place_id", out var pid) ? pid.GetString() : null;

        return new ParsedPlaceDto(hint ?? address, address, lat, lng, placeId, null, null, "other");
    }

    private async Task<ParsedPlaceDto?> SearchPlaceAsync(string query, (double lat, double lng)? bias = null)
    {
        var client = httpClientFactory.CreateClient();
        var encoded = Uri.EscapeDataString(query);
        var requestUrl = $"https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input={encoded}&inputtype=textquery&fields=place_id,name,formatted_address,geometry,rating,photos,types&key={_apiKey}";
        if (bias != null)
        {
            // `locationbias=circle:RADIUS@lat,lng` biases (rather than embedding coordinates
            // into free text, which Google's text parser doesn't reliably understand).
            var latStr = bias.Value.lat.ToString(System.Globalization.CultureInfo.InvariantCulture);
            var lngStr = bias.Value.lng.ToString(System.Globalization.CultureInfo.InvariantCulture);
            requestUrl += $"&locationbias=circle:2000@{latStr},{lngStr}";
        }

        var response = await client.GetStringAsync(requestUrl);
        var json = JsonDocument.Parse(response);

        if (!json.RootElement.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
            return null;

        return MapPlaceResult(candidates[0], null);
    }

    private ParsedPlaceDto? MapPlaceResult(JsonElement result, string? placeId)
    {
        var name = result.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "";
        var address = result.TryGetProperty("formatted_address", out var a) ? a.GetString() ?? "" : "";
        var pid = placeId ?? (result.TryGetProperty("place_id", out var p) ? p.GetString() : null);
        double? rating = result.TryGetProperty("rating", out var r) ? r.GetDouble() : null;

        double lat = 0, lng = 0;
        if (result.TryGetProperty("geometry", out var geo))
        {
            var loc = geo.GetProperty("location");
            lat = loc.GetProperty("lat").GetDouble();
            lng = loc.GetProperty("lng").GetDouble();
        }

        string? photoUrl = null;
        if (result.TryGetProperty("photos", out var photos) && photos.GetArrayLength() > 0)
        {
            var photoRef = photos[0].GetProperty("photo_reference").GetString();
            photoUrl = $"https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference={photoRef}&key={_apiKey}";
        }

        var types = result.TryGetProperty("types", out var t)
            ? t.EnumerateArray().Select(x => x.GetString()).ToList()
            : [];

        var suggestedType = MapGoogleTypesToOurs(types!);

        return new ParsedPlaceDto(name, address, lat, lng, pid, rating, photoUrl, suggestedType);
    }

    private static string MapGoogleTypesToOurs(List<string> types)
    {
        if (types.Contains("restaurant") || types.Contains("food")) return "restaurant";
        if (types.Contains("bar") || types.Contains("night_club")) return "bar";
        if (types.Contains("lodging")) return "hotel";
        if (types.Contains("church") || types.Contains("place_of_worship")) return "church";
        if (types.Contains("museum")) return "museum";
        if (types.Contains("park") || types.Contains("natural_feature")) return "park";
        if (types.Contains("tourist_attraction") || types.Contains("point_of_interest")) return "tourist";
        return "other";
    }
}

