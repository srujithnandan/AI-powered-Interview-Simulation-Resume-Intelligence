using System.Text.Json;
using MyWebApi.DTOs;
using MyWebApi.Models;
using MyWebApi.Repositories;

namespace MyWebApi.Services;

public interface IInterviewSimulatorService
{
    Task<StartSessionResponse> StartSessionAsync(string userId, StartSessionRequest request);
    Task<SubmitAnswerResponse> SubmitAnswerAsync(string userId, SubmitAnswerRequest request);
    Task<ActiveSessionResponse?> GetActiveSessionAsync(string userId);
    Task<SessionReportResponse> GetSessionReportAsync(string userId, string sessionId);
    Task<SessionReportResponse> EndSessionAsync(string userId, string sessionId);
    Task<SessionHistoryResponse> GetSessionHistoryAsync(string userId);
    Task<PerformanceTrendsResponse> GetPerformanceTrendsAsync(string userId);
}

public class InterviewSimulatorService : IInterviewSimulatorService
{
    private static readonly string[] ValidDifficulties = { "Easy", "Medium", "Hard" };
    private static readonly string[] ValidCategories = { "Mixed", "Technical", "Behavioral", "System Design", "Coding" };

    private readonly IInterviewRepository _interviewRepository;
    private readonly IOpenAIService _openAiService;

    public InterviewSimulatorService(IInterviewRepository interviewRepository, IOpenAIService openAiService)
    {
        _interviewRepository = interviewRepository;
        _openAiService = openAiService;
    }

    public async Task<StartSessionResponse> StartSessionAsync(string userId, StartSessionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Role))
        {
            throw new ArgumentException("Role is required.");
        }

        var questionCount = Math.Clamp(request.QuestionCount, 1, 20);
        var difficulty = ValidDifficulties.Contains(request.Difficulty) ? request.Difficulty : "Medium";
        var category = ValidCategories.Contains(request.Category) ? request.Category : "Mixed";

        // Check for existing active session
        var activeSession = await _interviewRepository.GetActiveSessionAsync(userId);
        if (activeSession is not null)
        {
            // Mark old session as abandoned
            activeSession.Status = "Abandoned";
            activeSession.CompletedAt = DateTime.UtcNow;
            await _interviewRepository.UpdateSessionAsync(activeSession);
        }

        var questions = await _openAiService.GenerateInterviewQuestionsAsync(
            request.Role, questionCount, difficulty, category);

        var session = new InterviewSession
        {
            UserId = userId,
            Role = request.Role,
            Difficulty = difficulty,
            Category = category,
            Questions = questions,
            CurrentQuestionIndex = 0,
            Status = "InProgress",
            TimeLimitMinutes = request.TimeLimitMinutes,
            CreatedAt = DateTime.UtcNow
        };

        await _interviewRepository.CreateSessionAsync(session);

        return new StartSessionResponse
        {
            SessionId = session.Id,
            Role = session.Role,
            Difficulty = difficulty,
            Category = category,
            TotalQuestions = questions.Count,
            TimeLimitMinutes = session.TimeLimitMinutes,
            StartedAt = session.CreatedAt,
            FirstQuestion = questions.FirstOrDefault() ?? string.Empty
        };
    }

    public async Task<SubmitAnswerResponse> SubmitAnswerAsync(string userId, SubmitAnswerRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Answer))
        {
            throw new ArgumentException("Answer is required.");
        }

        var session = await _interviewRepository.GetByIdAsync(request.SessionId)
            ?? throw new KeyNotFoundException("Interview session not found.");

        if (session.UserId != userId)
        {
            throw new UnauthorizedAccessException("This session does not belong to you.");
        }

        if (session.Status != "InProgress")
        {
            throw new InvalidOperationException($"Session is already {session.Status.ToLowerInvariant()}.");
        }

        // Check time limit
        if (session.TimeLimitMinutes.HasValue)
        {
            var elapsed = (DateTime.UtcNow - session.CreatedAt).TotalMinutes;
            if (elapsed > session.TimeLimitMinutes.Value)
            {
                session.Status = "TimedOut";
                session.CompletedAt = DateTime.UtcNow;
                await _interviewRepository.UpdateSessionAsync(session);
                throw new InvalidOperationException("Session has timed out.");
            }
        }

        var currentQuestion = session.Questions[session.CurrentQuestionIndex];

        // Evaluate the answer
        var evaluation = await _openAiService.EvaluateAnswerAsync(currentQuestion, request.Answer);

        var result = new InterviewResult
        {
            Question = currentQuestion,
            Answer = request.Answer,
            Score = Math.Clamp(evaluation.Score, 0, 10),
            Feedback = $"Technical Accuracy: {evaluation.TechnicalAccuracy}; Communication Clarity: {evaluation.CommunicationClarity}; Suggestions: {evaluation.Suggestions}",
            TechnicalAccuracy = evaluation.TechnicalAccuracy,
            CommunicationClarity = evaluation.CommunicationClarity,
            Suggestions = evaluation.Suggestions,
            EvaluatedAt = DateTime.UtcNow
        };

        session.Results.Add(result);
        session.CurrentQuestionIndex++;

        var isComplete = session.CurrentQuestionIndex >= session.Questions.Count;
        string? nextQuestion = null;
        string? followUpContext = null;

        if (isComplete)
        {
            session.Status = "Completed";
            session.CompletedAt = DateTime.UtcNow;
        }
        else
        {
            nextQuestion = session.Questions[session.CurrentQuestionIndex];

            // Generate follow-up context if the score was low
            if (result.Score <= 5)
            {
                try
                {
                    followUpContext = $"Your previous answer scored {result.Score}/10. The next question will test a related area.";
                }
                catch
                {
                    // Don't fail the response if follow-up generation fails
                }
            }
        }

        await _interviewRepository.UpdateSessionAsync(session);

        var elapsedMinutes = (DateTime.UtcNow - session.CreatedAt).TotalMinutes;

        return new SubmitAnswerResponse
        {
            QuestionNumber = session.CurrentQuestionIndex,
            Question = currentQuestion,
            Answer = request.Answer,
            Score = result.Score,
            TechnicalAccuracy = result.TechnicalAccuracy,
            CommunicationClarity = result.CommunicationClarity,
            Suggestions = result.Suggestions,
            IsSessionComplete = isComplete,
            NextQuestion = nextQuestion,
            FollowUpContext = followUpContext,
            QuestionsRemaining = session.Questions.Count - session.CurrentQuestionIndex,
            ElapsedMinutes = Math.Round(elapsedMinutes, 1)
        };
    }

    public async Task<ActiveSessionResponse?> GetActiveSessionAsync(string userId)
    {
        var session = await _interviewRepository.GetActiveSessionAsync(userId);
        if (session is null) return null;

        var elapsed = (DateTime.UtcNow - session.CreatedAt).TotalMinutes;
        var isTimedOut = session.TimeLimitMinutes.HasValue && elapsed > session.TimeLimitMinutes.Value;

        if (isTimedOut)
        {
            session.Status = "TimedOut";
            session.CompletedAt = DateTime.UtcNow;
            await _interviewRepository.UpdateSessionAsync(session);
            return null;
        }

        return new ActiveSessionResponse
        {
            SessionId = session.Id,
            Role = session.Role,
            Difficulty = session.Difficulty,
            Category = session.Category,
            CurrentQuestionIndex = session.CurrentQuestionIndex,
            TotalQuestions = session.Questions.Count,
            CurrentQuestion = session.CurrentQuestionIndex < session.Questions.Count
                ? session.Questions[session.CurrentQuestionIndex]
                : string.Empty,
            ElapsedMinutes = Math.Round(elapsed, 1),
            TimeLimitMinutes = session.TimeLimitMinutes,
            IsTimedOut = false,
            Status = session.Status
        };
    }

    public async Task<SessionReportResponse> GetSessionReportAsync(string userId, string sessionId)
    {
        var session = await _interviewRepository.GetByIdAsync(sessionId)
            ?? throw new KeyNotFoundException("Interview session not found.");

        if (session.UserId != userId)
        {
            throw new UnauthorizedAccessException("This session does not belong to you.");
        }

        return await BuildSessionReport(session);
    }

    public async Task<SessionReportResponse> EndSessionAsync(string userId, string sessionId)
    {
        var session = await _interviewRepository.GetByIdAsync(sessionId)
            ?? throw new KeyNotFoundException("Interview session not found.");

        if (session.UserId != userId)
        {
            throw new UnauthorizedAccessException("This session does not belong to you.");
        }

        if (session.Status != "InProgress")
        {
            throw new InvalidOperationException($"Session is already {session.Status.ToLowerInvariant()}.");
        }

        session.Status = session.Results.Count > 0 ? "Completed" : "Abandoned";
        session.CompletedAt = DateTime.UtcNow;
        await _interviewRepository.UpdateSessionAsync(session);

        return await BuildSessionReport(session);
    }

    public async Task<SessionHistoryResponse> GetSessionHistoryAsync(string userId)
    {
        var sessions = await _interviewRepository.GetByUserIdAsync(userId);

        return new SessionHistoryResponse
        {
            TotalSessions = sessions.Count,
            CompletedSessions = sessions.Count(s => s.Status == "Completed"),
            AbandonedSessions = sessions.Count(s => s.Status is "Abandoned" or "TimedOut"),
            Sessions = sessions.Select(s => new SessionHistoryItem
            {
                SessionId = s.Id,
                Role = s.Role,
                Difficulty = s.Difficulty,
                Category = s.Category,
                StartedAt = s.CreatedAt,
                CompletedAt = s.CompletedAt,
                Status = s.Status,
                QuestionsAnswered = s.Results.Count,
                TotalQuestions = s.Questions.Count,
                AverageScore = s.Results.Count > 0 ? Math.Round(s.Results.Average(r => r.Score), 2) : 0,
                PerformanceGrade = s.Results.Count > 0
                    ? GetPerformanceGrade(s.Results.Average(r => r.Score))
                    : "N/A"
            }).ToList()
        };
    }

    public async Task<PerformanceTrendsResponse> GetPerformanceTrendsAsync(string userId)
    {
        var sessions = await _interviewRepository.GetByUserIdAsync(userId);
        var completedSessions = sessions.Where(s => s.Status == "Completed" && s.Results.Count > 0).ToList();
        var allResults = completedSessions.SelectMany(s => s.Results).ToList();

        var performanceByRole = completedSessions
            .GroupBy(s => s.Role)
            .Select(g =>
            {
                var roleSessions = g.OrderBy(s => s.CreatedAt).ToList();
                var allRoleResults = g.SelectMany(s => s.Results).ToList();
                var latestSession = roleSessions.Last();
                var latestScore = latestSession.Results.Count > 0 ? latestSession.Results.Average(r => r.Score) : 0;

                // Calculate trend
                string trend = "Stable";
                if (roleSessions.Count >= 2)
                {
                    var firstHalf = roleSessions.Take(roleSessions.Count / 2).SelectMany(s => s.Results).ToList();
                    var secondHalf = roleSessions.Skip(roleSessions.Count / 2).SelectMany(s => s.Results).ToList();
                    if (firstHalf.Count > 0 && secondHalf.Count > 0)
                    {
                        var firstAvg = firstHalf.Average(r => r.Score);
                        var secondAvg = secondHalf.Average(r => r.Score);
                        trend = secondAvg > firstAvg + 0.5 ? "Improving" : secondAvg < firstAvg - 0.5 ? "Declining" : "Stable";
                    }
                }

                return new RolePerformance
                {
                    Role = g.Key,
                    SessionCount = g.Count(),
                    QuestionsAnswered = allRoleResults.Count,
                    AverageScore = Math.Round(allRoleResults.Average(r => r.Score), 2),
                    BestScore = Math.Round(g.Max(s => s.Results.Count > 0 ? s.Results.Average(r => r.Score) : 0), 2),
                    LatestScore = Math.Round(latestScore, 2),
                    Trend = trend
                };
            })
            .OrderByDescending(r => r.SessionCount)
            .ToList();

        var performanceByDifficulty = completedSessions
            .GroupBy(s => s.Difficulty)
            .Select(g => new DifficultyPerformance
            {
                Difficulty = g.Key,
                SessionCount = g.Count(),
                AverageScore = Math.Round(g.SelectMany(s => s.Results).Average(r => r.Score), 2)
            })
            .OrderBy(d => Array.IndexOf(ValidDifficulties, d.Difficulty))
            .ToList();

        var recentTrends = completedSessions
            .Take(10)
            .Select(s => new SessionTrend
            {
                SessionId = s.Id,
                Role = s.Role,
                Difficulty = s.Difficulty,
                Date = s.CreatedAt,
                AverageScore = Math.Round(s.Results.Average(r => r.Score), 2),
                QuestionsAnswered = s.Results.Count
            })
            .ToList();

        // Identify skill gaps (roles/difficulties with low scores)
        var skillGaps = new List<string>();
        foreach (var role in performanceByRole.Where(r => r.AverageScore < 6))
        {
            skillGaps.Add($"{role.Role}: Average score {role.AverageScore}/10 - needs improvement");
        }

        // Generate recommendations
        var recommendations = GenerateRecommendations(performanceByRole, performanceByDifficulty, completedSessions);

        var strongestRole = performanceByRole.OrderByDescending(r => r.AverageScore).FirstOrDefault()?.Role ?? "N/A";
        var weakestRole = performanceByRole.OrderBy(r => r.AverageScore).FirstOrDefault()?.Role ?? "N/A";

        return new PerformanceTrendsResponse
        {
            TotalSessions = completedSessions.Count,
            TotalQuestionsAnswered = allResults.Count,
            OverallAverageScore = allResults.Count > 0 ? Math.Round(allResults.Average(r => r.Score), 2) : 0,
            StrongestRole = strongestRole,
            WeakestRole = weakestRole,
            PerformanceByRole = performanceByRole,
            PerformanceByDifficulty = performanceByDifficulty,
            RecentTrends = recentTrends,
            SkillGaps = skillGaps,
            Recommendations = recommendations
        };
    }

    // Private helpers

    private async Task<SessionReportResponse> BuildSessionReport(InterviewSession session)
    {
        var duration = ((session.CompletedAt ?? DateTime.UtcNow) - session.CreatedAt).TotalMinutes;

        var report = new SessionReportResponse
        {
            SessionId = session.Id,
            Role = session.Role,
            Difficulty = session.Difficulty,
            Category = session.Category,
            StartedAt = session.CreatedAt,
            CompletedAt = session.CompletedAt,
            DurationMinutes = Math.Round(duration, 1),
            Status = session.Status,
            TotalQuestions = session.Questions.Count,
            QuestionsAnswered = session.Results.Count,
            OverallScore = session.Results.Count > 0
                ? Math.Round(session.Results.Average(r => r.Score), 2) : 0,
            QuestionResults = session.Results.Select((r, i) => new QuestionResultDetail
            {
                QuestionNumber = i + 1,
                Question = r.Question,
                Answer = r.Answer,
                Score = r.Score,
                TechnicalAccuracy = r.TechnicalAccuracy,
                CommunicationClarity = r.CommunicationClarity,
                Suggestions = r.Suggestions
            }).ToList()
        };

        report.PerformanceGrade = GetPerformanceGrade(report.OverallScore);

        // Generate AI-powered overall feedback for completed sessions with answers
        if (session.Results.Count > 0)
        {
            try
            {
                var qaHistory = session.Results.Select(r => new QuestionAnswerPair
                {
                    Question = r.Question,
                    Answer = r.Answer,
                    Score = r.Score
                }).ToList();

                var feedbackJson = await _openAiService.GenerateSessionFeedbackAsync(session.Role, qaHistory);
                var json = ExtractJsonObject(feedbackJson);
                var feedback = JsonSerializer.Deserialize<SessionFeedbackAiResponse>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (feedback is not null)
                {
                    report.OverallFeedback = feedback.OverallFeedback;
                    report.StrengthAreas = feedback.StrengthAreas.Where(s => !string.IsNullOrWhiteSpace(s)).ToList();
                    report.ImprovementAreas = feedback.ImprovementAreas.Where(s => !string.IsNullOrWhiteSpace(s)).ToList();
                }
            }
            catch
            {
                // Fall back to basic feedback if AI call fails
                report.OverallFeedback = $"You completed {session.Results.Count}/{session.Questions.Count} questions with an average score of {report.OverallScore}/10.";
                report.StrengthAreas = session.Results
                    .Where(r => r.Score >= 7)
                    .Select(r => $"Strong answer on: {Truncate(r.Question, 60)}")
                    .ToList();
                report.ImprovementAreas = session.Results
                    .Where(r => r.Score < 5)
                    .Select(r => $"Needs improvement: {Truncate(r.Question, 60)}")
                    .ToList();
            }
        }

        return report;
    }

    private static string GetPerformanceGrade(double averageScore)
    {
        return averageScore switch
        {
            >= 9 => "Exceptional",
            >= 8 => "Excellent",
            >= 7 => "Good",
            >= 6 => "Satisfactory",
            >= 5 => "Needs Improvement",
            >= 3 => "Below Expectations",
            _ => "Unsatisfactory"
        };
    }

    private static string Truncate(string value, int maxLength)
    {
        if (string.IsNullOrEmpty(value)) return value;
        return value.Length <= maxLength ? value : value[..maxLength] + "...";
    }

    private static string ExtractJsonObject(string input)
    {
        var trimmed = input.Trim();
        if (trimmed.StartsWith("```") && trimmed.Contains('{'))
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

    private static List<string> GenerateRecommendations(
        List<RolePerformance> byRole,
        List<DifficultyPerformance> byDifficulty,
        List<InterviewSession> completedSessions)
    {
        var recommendations = new List<string>();

        // Check if user only practices easy questions
        var easyOnly = byDifficulty.All(d => d.Difficulty == "Easy");
        if (easyOnly && completedSessions.Count >= 3)
        {
            recommendations.Add("Try Medium or Hard difficulty to challenge yourself and grow.");
        }

        // Check for declining roles
        foreach (var role in byRole.Where(r => r.Trend == "Declining"))
        {
            recommendations.Add($"Your {role.Role} performance is declining. Review fundamentals and practice more.");
        }

        // Check for low-scoring roles
        foreach (var role in byRole.Where(r => r.AverageScore < 5))
        {
            recommendations.Add($"Focus on improving your {role.Role} skills. Consider studying key concepts before practicing.");
        }

        // Recommend diversity
        if (byRole.Count == 1 && completedSessions.Count >= 5)
        {
            recommendations.Add("Consider practicing for different roles to broaden your interview skills.");
        }

        // Check for high performers ready for harder challenges
        foreach (var role in byRole.Where(r => r.AverageScore >= 8 && r.SessionCount >= 3))
        {
            recommendations.Add($"You're excelling at {role.Role}! Try harder difficulty levels to push yourself further.");
        }

        if (completedSessions.Count < 3)
        {
            recommendations.Add("Complete more sessions to get meaningful performance insights.");
        }

        return recommendations;
    }
}
