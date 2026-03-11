using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using MyWebApi.Settings;

namespace MyWebApi.Services;

public interface IOpenAIService
{
    Task<ResumeAnalysisAiResponse> AnalyzeResumeAsync(string resumeText);
    Task<List<string>> GenerateInterviewQuestionsAsync(string role, int count);
    Task<List<string>> GenerateInterviewQuestionsAsync(string role, int count, string difficulty, string category);
    Task<AnswerEvaluationAiResponse> EvaluateAnswerAsync(string question, string answer);
    Task<string> GenerateFollowUpQuestionAsync(string role, string previousQuestion, string previousAnswer);
    Task<string> GenerateSessionFeedbackAsync(string role, List<QuestionAnswerPair> qaHistory);
}

public class OpenAIService : IOpenAIService
{
    private readonly HttpClient _httpClient;
    private readonly OpenAISettings _settings;

    public OpenAIService(HttpClient httpClient, OpenAISettings settings)
    {
        _httpClient = httpClient;
        _settings = settings;
    }

    public async Task<ResumeAnalysisAiResponse> AnalyzeResumeAsync(string resumeText)
    {
                var prompt =
                        "Analyze this resume and respond with strict JSON only:\n" +
                        "{\n" +
                        "  \"atsScore\": 0,\n" +
                        "  \"missingSkills\": [\"\"],\n" +
                        "  \"strengthAreas\": [\"\"],\n" +
                        "  \"improvementSuggestions\": [\"\"]\n" +
                        "}\n\n" +
                        $"Resume:\n{resumeText}";

        var content = await CreateChatCompletionAsync("You are an expert ATS and technical recruiter.", prompt);
        var json = ExtractJsonObject(content);
        var parsed = JsonSerializer.Deserialize<ResumeAnalysisAiResponse>(json, JsonOptions())
            ?? throw new InvalidOperationException("Unable to parse resume analysis from AI response.");

        return parsed;
    }

    public async Task<List<string>> GenerateInterviewQuestionsAsync(string role, int count)
    {
                var prompt =
                        $"Generate {count} technical interview questions for the following role:\n\n" +
                        $"Role: {role}\n\n" +
                        "Rules:\n" +
                        "- Include a mix of easy, medium, and hard questions.\n" +
                        "- Focus on practical software engineering knowledge.\n" +
                        "- Avoid trivial textbook definitions.\n" +
                        "- Questions should encourage explanation and reasoning.\n\n" +
                        "Return strict JSON only in this format:\n" +
                        "{\n" +
                        "  \"questions\": [\"Question 1\", \"Question 2\"]\n" +
                        "}";

        var content = await CreateChatCompletionAsync("You are a senior technical interviewer.", prompt);
        var json = ExtractJsonObject(content);

        var parsed = JsonSerializer.Deserialize<QuestionListResponse>(json, JsonOptions())
            ?? throw new InvalidOperationException("Unable to parse interview questions from AI response.");

        return parsed.Questions
            .Where(q => !string.IsNullOrWhiteSpace(q))
            .Select(q => q.Trim())
            .ToList();
    }

    public async Task<List<string>> GenerateInterviewQuestionsAsync(string role, int count, string difficulty, string category)
    {
        var categoryInstruction = category != "Mixed"
            ? $" Focus on {category} questions."
            : " Include a mix of technical, behavioral, and system design questions.";

        var prompt =
            $"Generate {count} {difficulty}-level technical interview questions for the following role:\n\n" +
            $"Role: {role}\n\n" +
            $"Rules:\n" +
            "- Focus on practical software engineering knowledge.\n" +
            "- Avoid trivial textbook definitions.\n" +
            "- Questions should encourage explanation and reasoning.\n" +
            $"{categoryInstruction}\n\n" +
            "Return strict JSON only in this format:\n" +
            "{\n" +
            "  \"questions\": [\"Question 1\", \"Question 2\"]\n" +
            "}";

        var content = await CreateChatCompletionAsync("You are a senior technical interviewer.", prompt);
        var json = ExtractJsonObject(content);

        var parsed = JsonSerializer.Deserialize<QuestionListResponse>(json, JsonOptions())
            ?? throw new InvalidOperationException("Unable to parse interview questions from AI response.");

        return parsed.Questions
            .Where(q => !string.IsNullOrWhiteSpace(q))
            .Select(q => q.Trim())
            .ToList();
    }

    public async Task<string> GenerateFollowUpQuestionAsync(string role, string previousQuestion, string previousAnswer)
    {
        var prompt =
            "You are conducting a technical interview.\n\n" +
            "Based on the previous answer from the candidate, generate one intelligent follow-up question.\n\n" +
            $"Role: {role}\n\n" +
            $"Original Question:\n{previousQuestion}\n\n" +
            $"Candidate Answer:\n{previousAnswer}\n\n" +
            "Generate a follow-up question that tests deeper understanding.\n\n" +
            "Return strict JSON only:\n" +
            "{\n" +
            "  \"followUpQuestion\": \"\"\n" +
            "}";

        var content = await CreateChatCompletionAsync("You are a senior technical interviewer.", prompt);
        var json = ExtractJsonObject(content);
        using var document = JsonDocument.Parse(json);
        return document.RootElement.GetProperty("followUpQuestion").GetString()
            ?? throw new InvalidOperationException("Unable to parse follow-up question from AI response.");
    }

    public async Task<string> GenerateSessionFeedbackAsync(string role, List<QuestionAnswerPair> qaHistory)
    {
        var historyText = string.Join("\n\n", qaHistory.Select((qa, i) =>
            $"Q{i + 1}: {qa.Question}\nA{i + 1}: {qa.Answer} (Score: {qa.Score}/10)"));

        var prompt =
            $"Review this complete interview session for a {role} position and provide overall feedback.\n" +
            "Return strict JSON only:\n" +
            "{\n" +
            "  \"overallFeedback\": \"\",\n" +
            "  \"strengthAreas\": [\"\"],\n" +
            "  \"improvementAreas\": [\"\"]\n" +
            "}\n\n" +
            $"Interview History:\n{historyText}";

        var content = await CreateChatCompletionAsync("You are a senior technical interviewer providing a session debrief.", prompt);
        return content;
    }

    public async Task<AnswerEvaluationAiResponse> EvaluateAnswerAsync(string question, string answer)
    {
                var prompt =
                        "You are a senior technical interviewer with 10+ years of experience conducting software engineering interviews.\n\n" +
                        "Evaluate the candidate's answer carefully and return the result in strict JSON only:\n" +
                        "{\n" +
                        "  \"score\": 0,\n" +
                        "  \"technicalAccuracy\": \"\",\n" +
                        "  \"communicationClarity\": \"\",\n" +
                        "  \"depthOfKnowledge\": \"\",\n" +
                        "  \"suggestions\": \"\",\n" +
                        "  \"exampleImprovement\": \"\"\n" +
                        "}\n\n" +
                        "Field descriptions:\n" +
                        "- score (0-10): Numeric score based on correctness, clarity, and completeness.\n" +
                        "- technicalAccuracy: Whether the answer is technically correct and why.\n" +
                        "- communicationClarity: How clearly the candidate explained the concept.\n" +
                        "- depthOfKnowledge: Whether the candidate demonstrates shallow or deep understanding.\n" +
                        "- suggestions: Specific suggestions to improve the answer.\n" +
                        "- exampleImprovement: A short example of a better explanation.\n\n" +
                        "Rules: Be constructive but honest. Do not be overly harsh. Encourage learning. Keep feedback concise and professional.\n\n" +
                        $"Question: {question}\n" +
                        $"Candidate Answer: {answer}";

        var content = await CreateChatCompletionAsync("You are a senior technical interviewer with 10+ years of experience. Be constructive, honest, and encourage learning.", prompt);
        var json = ExtractJsonObject(content);
        var parsed = JsonSerializer.Deserialize<AnswerEvaluationAiResponse>(json, JsonOptions())
            ?? throw new InvalidOperationException("Unable to parse interview evaluation from AI response.");

        return parsed;
    }

    private async Task<string> CreateChatCompletionAsync(string systemPrompt, string userPrompt)
    {
        if (string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            throw new InvalidOperationException("OpenAI API key is missing. Set OPENAI_API_KEY.");
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, "chat/completions");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey);

        var body = new
        {
            model = _settings.Model,
            messages = new object[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userPrompt }
            },
            temperature = 0.2
        };

        request.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

        using var response = await _httpClient.SendAsync(request);
        var payload = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"OpenAI API call failed ({(int)response.StatusCode}): {payload}");
        }

        using var document = JsonDocument.Parse(payload);
        var content = document
            .RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString();

        return content ?? throw new InvalidOperationException("OpenAI returned empty content.");
    }

    private static string ExtractJsonObject(string input)
    {
        var trimmed = input.Trim();

        if (trimmed.StartsWith("```") && trimmed.Contains("{"))
        {
            var firstBrace = trimmed.IndexOf('{');
            var lastBrace = trimmed.LastIndexOf('}');
            if (firstBrace >= 0 && lastBrace > firstBrace)
            {
                return trimmed[firstBrace..(lastBrace + 1)];
            }
        }

        return trimmed;
    }

    private static JsonSerializerOptions JsonOptions()
    {
        return new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };
    }

    private class QuestionListResponse
    {
        public List<string> Questions { get; set; } = new();
    }
}

public class ResumeAnalysisAiResponse
{
    public int AtsScore { get; set; }
    public List<string> MissingSkills { get; set; } = new();
    public List<string> StrengthAreas { get; set; } = new();
    public List<string> ImprovementSuggestions { get; set; } = new();
}

public class AnswerEvaluationAiResponse
{
    public int Score { get; set; }
    public string TechnicalAccuracy { get; set; } = string.Empty;
    public string CommunicationClarity { get; set; } = string.Empty;
    public string DepthOfKnowledge { get; set; } = string.Empty;
    public string Suggestions { get; set; } = string.Empty;
    public string ExampleImprovement { get; set; } = string.Empty;
}

public class QuestionAnswerPair
{
    public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public int Score { get; set; }
}

public class SessionFeedbackAiResponse
{
    public string OverallFeedback { get; set; } = string.Empty;
    public List<string> StrengthAreas { get; set; } = new();
    public List<string> ImprovementAreas { get; set; } = new();
}
