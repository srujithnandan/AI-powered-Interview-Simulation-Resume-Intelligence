using MyWebApi.DTOs;
using MyWebApi.Models;
using MyWebApi.Repositories;

namespace MyWebApi.Services;

public interface IInterviewService
{
    Task<InterviewQuestionsResponse> GenerateQuestionsAsync(string userId, string role, int count);
    Task<InterviewResult> EvaluateAnswerAsync(string userId, InterviewAnswerRequest request);
    Task<InterviewAnalyticsResponse> GetAnalyticsAsync(string userId);
}

public class InterviewService : IInterviewService
{
    private readonly IInterviewRepository _interviewRepository;
    private readonly IOpenAIService _openAiService;

    public InterviewService(IInterviewRepository interviewRepository, IOpenAIService openAiService)
    {
        _interviewRepository = interviewRepository;
        _openAiService = openAiService;
    }

    public async Task<InterviewQuestionsResponse> GenerateQuestionsAsync(string userId, string role, int count)
    {
        var questions = await _openAiService.GenerateInterviewQuestionsAsync(role, count);

        var session = new InterviewSession
        {
            UserId = userId,
            Role = role,
            CreatedAt = DateTime.UtcNow
        };

        await _interviewRepository.CreateSessionAsync(session);

        return new InterviewQuestionsResponse
        {
            SessionId = session.Id,
            Role = role,
            Questions = questions
        };
    }

    public async Task<InterviewResult> EvaluateAnswerAsync(string userId, InterviewAnswerRequest request)
    {
        var session = await _interviewRepository.GetByIdAsync(request.SessionId)
            ?? throw new KeyNotFoundException("Interview session not found.");

        if (session.UserId != userId)
        {
            throw new UnauthorizedAccessException("This session does not belong to the current user.");
        }

        var evaluation = await _openAiService.EvaluateAnswerAsync(request.Question, request.Answer);

        var result = new InterviewResult
        {
            Question = request.Question,
            Answer = request.Answer,
            Score = Math.Clamp(evaluation.Score, 0, 10),
            Feedback = $"Technical Accuracy: {evaluation.TechnicalAccuracy}; Communication Clarity: {evaluation.CommunicationClarity}; Suggestions: {evaluation.Suggestions}",
            TechnicalAccuracy = evaluation.TechnicalAccuracy,
            CommunicationClarity = evaluation.CommunicationClarity,
            Suggestions = evaluation.Suggestions,
            EvaluatedAt = DateTime.UtcNow
        };

        session.Results.Add(result);
        await _interviewRepository.UpdateSessionAsync(session);

        return result;
    }

    public async Task<InterviewAnalyticsResponse> GetAnalyticsAsync(string userId)
    {
        var sessions = await _interviewRepository.GetByUserIdAsync(userId);

        var allResults = sessions.SelectMany(s => s.Results).ToList();
        var totalQuestions = allResults.Count;

        return new InterviewAnalyticsResponse
        {
            TotalSessions = sessions.Count,
            TotalQuestionsAnswered = totalQuestions,
            AverageScore = totalQuestions == 0 ? 0 : Math.Round(allResults.Average(x => x.Score), 2),
            RecentSessions = sessions.Take(5).Select(x => new SessionSummary
            {
                SessionId = x.Id,
                Role = x.Role,
                CreatedAt = x.CreatedAt,
                QuestionsAnswered = x.Results.Count,
                AverageScore = x.Results.Count == 0 ? 0 : Math.Round(x.Results.Average(r => r.Score), 2)
            }).ToList()
        };
    }
}

public class InterviewQuestionsResponse
{
    public string SessionId { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public List<string> Questions { get; set; } = new();
}

public class InterviewAnalyticsResponse
{
    public int TotalSessions { get; set; }
    public int TotalQuestionsAnswered { get; set; }
    public double AverageScore { get; set; }
    public List<SessionSummary> RecentSessions { get; set; } = new();
}

public class SessionSummary
{
    public string SessionId { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public int QuestionsAnswered { get; set; }
    public double AverageScore { get; set; }
}
