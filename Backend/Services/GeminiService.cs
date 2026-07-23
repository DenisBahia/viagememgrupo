using System.Text;
using System.Text.Json;
using Backend.Models;

namespace Backend.Services;

public class GeminiService(IConfiguration config, IHttpClientFactory httpClientFactory, ILogger<GeminiService> logger)
{
    private readonly string _apiKey = config["Gemini:ApiKey"] ?? "";
    private readonly string _model = config["Gemini:Model"] ?? "gemini-1.5-flash";

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_apiKey);

    public async Task<string> GetTipsAsync(Location location)
    {
        if (!IsConfigured)
            throw new InvalidOperationException("Gemini API key não configurada.");

        var prompt = BuildPrompt(location);

        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    role = "user",
                    parts = new[] { new { text = prompt } }
                }
            },
            generationConfig = new
            {
                temperature = 0.4,
                maxOutputTokens = 800
            }
        };

        var client = httpClientFactory.CreateClient();
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_model}:generateContent?key={_apiKey}";

        try
        {
            var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
            var json = JsonSerializer.Serialize(requestBody, options);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await client.PostAsync(url, content);
            var responseText = await response.Content.ReadAsStringAsync();

            logger.LogInformation("Gemini API response status: {StatusCode}", response.StatusCode);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogError("Gemini API error - Status: {StatusCode}, Response: {Response}", response.StatusCode, responseText);
                throw new InvalidOperationException($"Gemini API retornou erro {response.StatusCode}. Tente novamente em instantes.");
            }

            var text = ExtractTextFromResponse(responseText);
            if (string.IsNullOrWhiteSpace(text))
                throw new InvalidOperationException("Resposta do Gemini vazia ou inválida.");

            logger.LogInformation("Dicas geradas com sucesso para local: {LocationName}", location.Name);
            return text.Trim();
        }
        catch (JsonException ex)
        {
            logger.LogError(ex, "Erro ao parsear resposta do Gemini");
            throw new InvalidOperationException("Erro ao processar resposta do Gemini. Tente novamente.", ex);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Erro na requisição ao Gemini");
            throw new InvalidOperationException("Erro de conexão com Gemini. Tente novamente.", ex);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Erro inesperado ao chamar Gemini");
            throw new InvalidOperationException("Erro inesperado ao buscar dicas. Tente novamente.", ex);
        }
    }

    private string ExtractTextFromResponse(string responseText)
    {
        using var doc = JsonDocument.Parse(responseText);
        var root = doc.RootElement;

        // Checar se há erro na resposta
        if (root.TryGetProperty("error", out var errorProp))
        {
            var errorMsg = errorProp.TryGetProperty("message", out var msgProp)
                ? msgProp.GetString() ?? "Erro desconhecido"
                : "Erro desconhecido";
            logger.LogError("Gemini retornou erro: {Error}", errorMsg);
            throw new InvalidOperationException($"Gemini: {errorMsg}");
        }

        // Extrair o texto da resposta
        if (!root.TryGetProperty("candidates", out var candidatesProp))
        {
            logger.LogError("Resposta não contém 'candidates'");
            throw new InvalidOperationException("Formato de resposta inesperado (sem candidates).");
        }

        var candidates = candidatesProp.EnumerateArray().ToList();
        if (candidates.Count == 0)
        {
            logger.LogError("Array 'candidates' vazio");
            throw new InvalidOperationException("Resposta vazia do Gemini.");
        }

        var candidate = candidates[0];
        if (!candidate.TryGetProperty("content", out var contentProp))
        {
            logger.LogError("Candidato não contém 'content'");
            throw new InvalidOperationException("Formato de resposta inesperado (sem content).");
        }

        if (!contentProp.TryGetProperty("parts", out var partsProp))
        {
            logger.LogError("Content não contém 'parts'");
            throw new InvalidOperationException("Formato de resposta inesperado (sem parts).");
        }

        var parts = partsProp.EnumerateArray().ToList();
        if (parts.Count == 0)
        {
            logger.LogError("Array 'parts' vazio");
            throw new InvalidOperationException("Nenhum texto na resposta do Gemini.");
        }

        if (!parts[0].TryGetProperty("text", out var textProp))
        {
            logger.LogError("Part não contém 'text'");
            throw new InvalidOperationException("Formato de resposta inesperado (sem text).");
        }

        var text = textProp.GetString();
        if (string.IsNullOrWhiteSpace(text))
        {
            logger.LogError("Text está vazio");
            throw new InvalidOperationException("Texto da resposta vazio.");
        }

        return text;
    }

    private static string BuildPrompt(Location location)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Você é um assistente de viagens. Dê dicas práticas e objetivas em português (Brasil) sobre o seguinte local, no formato de tópicos curtos (use markdown com títulos em negrito e listas):");
        sb.AppendLine();
        sb.AppendLine($"Nome: {location.Name}");
        sb.AppendLine($"Endereço: {location.Address}");
        sb.AppendLine($"Tipo: {location.Type}");
        if (location.GoogleRating.HasValue)
            sb.AppendLine($"Avaliação no Google: {location.GoogleRating}");
        sb.AppendLine();
        sb.AppendLine("Inclua, quando fizer sentido para o tipo de local:");
        sb.AppendLine("- **Melhor horário/período do dia** para visitar (manhã, tarde, noite) e por quê.");
        sb.AppendLine("- **Tempo médio** que costuma ser necessário para a visita.");
        sb.AppendLine("- Se for restaurante/bar: **o que pedir/comer**, pratos famosos ou recomendados.");
        sb.AppendLine("- Se costuma ter fila ou lotação: melhores dias/horários para evitar.");
        sb.AppendLine("- Se **precisa reservar** com antecedência (mesa, hotel, tour).");
        sb.AppendLine("- Se **precisa comprar ingresso** antecipado ou há custo de entrada.");
        sb.AppendLine("- Outras dicas úteis (o que levar, roupa adequada, acessibilidade, etc).");
        sb.AppendLine();
        sb.AppendLine("Seja conciso (máximo ~200 palavras), direto ao ponto, sem introduções genéricas.");
        return sb.ToString();
    }
}



