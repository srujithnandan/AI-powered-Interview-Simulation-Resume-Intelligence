namespace MyWebApi.DTOs;

public class InterviewReadinessResponse
{
    public int OverallReadinessScore { get; set; }
    public string ReadinessLevel { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public ResumeReadiness Resume { get; set; } = new();
    public InterviewPerformanceReadiness InterviewPerformance { get; set; } = new();
    public ConsistencyReadiness Consistency { get; set; } = new();
    public List<ReadinessStrength> TopStrengths { get; set; } = new();
    public List<ReadinessWeakness> CriticalGaps { get; set; } = new();
    public List<string> ActionPlan { get; set; } = new();
    public DateTime EvaluatedAt { get; set; }
}

public class ResumeReadiness
{
    public int Score { get; set; }
    public int ResumesAnalyzed { get; set; }
    public int BestAtsScore { get; set; }
    public int AverageAtsScore { get; set; }
    public int TotalMissingSkills { get; set; }
    public List<string> TopMissingSkills { get; set; } = new();
    public List<string> KeyStrengths { get; set; } = new();
}

public class InterviewPerformanceReadiness
{
    public int Score { get; set; }
    public int SessionsCompleted { get; set; }
    public int TotalQuestionsAnswered { get; set; }
    public double AverageScore { get; set; }
    public double BestSessionScore { get; set; }
    public double RecentAverageScore { get; set; }
    public string StrongestCategory { get; set; } = string.Empty;
    public string WeakestCategory { get; set; } = string.Empty;
    public DifficultyBreakdown DifficultyBreakdown { get; set; } = new();
}

public class DifficultyBreakdown
{
    public double? EasyAverage { get; set; }
    public double? MediumAverage { get; set; }
    public double? HardAverage { get; set; }
}

public class ConsistencyReadiness
{
    public int Score { get; set; }
    public int PracticeDaysCount { get; set; }
    public string PracticeFrequency { get; set; } = string.Empty;
    public bool HasRecentActivity { get; set; }
    public DateTime? LastPracticeDate { get; set; }
    public string ScoreTrend { get; set; } = string.Empty;
}

public class ReadinessStrength
{
    public string Area { get; set; } = string.Empty;
    public string Detail { get; set; } = string.Empty;
}

public class ReadinessWeakness
{
    public string Area { get; set; } = string.Empty;
    public string Detail { get; set; } = string.Empty;
    public string Recommendation { get; set; } = string.Empty;
}
