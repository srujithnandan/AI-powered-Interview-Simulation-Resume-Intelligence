namespace MyWebApi.DTOs;

public class StartSessionRequest
{
    public string Role { get; set; } = string.Empty;
    public int QuestionCount { get; set; } = 5;
    public string Difficulty { get; set; } = "Medium";
    public string Category { get; set; } = "Mixed";
    public int? TimeLimitMinutes { get; set; }
}

public class StartSessionResponse
{
    public string SessionId { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Difficulty { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int TotalQuestions { get; set; }
    public int? TimeLimitMinutes { get; set; }
    public DateTime StartedAt { get; set; }
    public string FirstQuestion { get; set; } = string.Empty;
}

public class SubmitAnswerRequest
{
    public string SessionId { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
}

public class SubmitAnswerResponse
{
    public int QuestionNumber { get; set; }
    public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public int Score { get; set; }
    public string TechnicalAccuracy { get; set; } = string.Empty;
    public string CommunicationClarity { get; set; } = string.Empty;
    public string Suggestions { get; set; } = string.Empty;
    public bool IsSessionComplete { get; set; }
    public string? NextQuestion { get; set; }
    public string? FollowUpContext { get; set; }
    public int QuestionsRemaining { get; set; }
    public double ElapsedMinutes { get; set; }
}

public class SessionReportResponse
{
    public string SessionId { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Difficulty { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public double DurationMinutes { get; set; }
    public string Status { get; set; } = string.Empty;
    public int TotalQuestions { get; set; }
    public int QuestionsAnswered { get; set; }
    public double OverallScore { get; set; }
    public string PerformanceGrade { get; set; } = string.Empty;
    public List<QuestionResultDetail> QuestionResults { get; set; } = new();
    public List<string> StrengthAreas { get; set; } = new();
    public List<string> ImprovementAreas { get; set; } = new();
    public string OverallFeedback { get; set; } = string.Empty;
}

public class QuestionResultDetail
{
    public int QuestionNumber { get; set; }
    public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public int Score { get; set; }
    public string TechnicalAccuracy { get; set; } = string.Empty;
    public string CommunicationClarity { get; set; } = string.Empty;
    public string Suggestions { get; set; } = string.Empty;
}

public class PerformanceTrendsResponse
{
    public int TotalSessions { get; set; }
    public int TotalQuestionsAnswered { get; set; }
    public double OverallAverageScore { get; set; }
    public string StrongestRole { get; set; } = string.Empty;
    public string WeakestRole { get; set; } = string.Empty;
    public List<RolePerformance> PerformanceByRole { get; set; } = new();
    public List<DifficultyPerformance> PerformanceByDifficulty { get; set; } = new();
    public List<SessionTrend> RecentTrends { get; set; } = new();
    public List<string> SkillGaps { get; set; } = new();
    public List<string> Recommendations { get; set; } = new();
}

public class RolePerformance
{
    public string Role { get; set; } = string.Empty;
    public int SessionCount { get; set; }
    public int QuestionsAnswered { get; set; }
    public double AverageScore { get; set; }
    public double BestScore { get; set; }
    public double LatestScore { get; set; }
    public string Trend { get; set; } = string.Empty;
}

public class DifficultyPerformance
{
    public string Difficulty { get; set; } = string.Empty;
    public int SessionCount { get; set; }
    public double AverageScore { get; set; }
}

public class SessionTrend
{
    public string SessionId { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Difficulty { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public double AverageScore { get; set; }
    public int QuestionsAnswered { get; set; }
}

public class ActiveSessionResponse
{
    public string SessionId { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Difficulty { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int CurrentQuestionIndex { get; set; }
    public int TotalQuestions { get; set; }
    public string CurrentQuestion { get; set; } = string.Empty;
    public double ElapsedMinutes { get; set; }
    public int? TimeLimitMinutes { get; set; }
    public bool IsTimedOut { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class SessionHistoryResponse
{
    public int TotalSessions { get; set; }
    public int CompletedSessions { get; set; }
    public int AbandonedSessions { get; set; }
    public List<SessionHistoryItem> Sessions { get; set; } = new();
}

public class SessionHistoryItem
{
    public string SessionId { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Difficulty { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public int QuestionsAnswered { get; set; }
    public int TotalQuestions { get; set; }
    public double AverageScore { get; set; }
    public string PerformanceGrade { get; set; } = string.Empty;
}
