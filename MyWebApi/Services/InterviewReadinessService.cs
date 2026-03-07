using MyWebApi.DTOs;
using MyWebApi.Models;
using MyWebApi.Repositories;

namespace MyWebApi.Services;

public interface IInterviewReadinessService
{
    Task<InterviewReadinessResponse> GetReadinessScoreAsync(string userId);
}

public class InterviewReadinessService : IInterviewReadinessService
{
    private readonly IResumeRepository _resumeRepository;
    private readonly IInterviewRepository _interviewRepository;

    public InterviewReadinessService(
        IResumeRepository resumeRepository,
        IInterviewRepository interviewRepository)
    {
        _resumeRepository = resumeRepository;
        _interviewRepository = interviewRepository;
    }

    public async Task<InterviewReadinessResponse> GetReadinessScoreAsync(string userId)
    {
        var resumes = await _resumeRepository.GetByUserIdAsync(userId);
        var completedSessions = await _interviewRepository.GetCompletedSessionsAsync(userId);

        var resumeReadiness = EvaluateResumeReadiness(resumes);
        var interviewReadiness = EvaluateInterviewReadiness(completedSessions);
        var consistencyReadiness = EvaluateConsistency(completedSessions);

        // Weighted composite: Resume 30%, Interview 50%, Consistency 20%
        var overall = (int)Math.Round(
            resumeReadiness.Score * 0.30 +
            interviewReadiness.Score * 0.50 +
            consistencyReadiness.Score * 0.20);

        var strengths = IdentifyStrengths(resumeReadiness, interviewReadiness, consistencyReadiness);
        var gaps = IdentifyGaps(resumeReadiness, interviewReadiness, consistencyReadiness);
        var actionPlan = BuildActionPlan(resumeReadiness, interviewReadiness, consistencyReadiness);

        return new InterviewReadinessResponse
        {
            OverallReadinessScore = overall,
            ReadinessLevel = GetReadinessLevel(overall),
            Summary = GenerateSummary(overall, resumes.Count, completedSessions.Count),
            Resume = resumeReadiness,
            InterviewPerformance = interviewReadiness,
            Consistency = consistencyReadiness,
            TopStrengths = strengths,
            CriticalGaps = gaps,
            ActionPlan = actionPlan,
            EvaluatedAt = DateTime.UtcNow
        };
    }

    private static ResumeReadiness EvaluateResumeReadiness(List<Resume> resumes)
    {
        if (resumes.Count == 0)
        {
            return new ResumeReadiness
            {
                Score = 0,
                ResumesAnalyzed = 0,
                TopMissingSkills = new List<string> { "No resume uploaded yet" }
            };
        }

        var bestAts = resumes.Max(r => r.AtsScore);
        var avgAts = (int)Math.Round(resumes.Average(r => (double)r.AtsScore));

        var allMissing = resumes
            .SelectMany(r => r.MissingSkills)
            .GroupBy(s => s, StringComparer.OrdinalIgnoreCase)
            .OrderByDescending(g => g.Count())
            .Select(g => g.Key)
            .ToList();

        var allStrengths = resumes
            .SelectMany(r => r.StrengthAreas)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(5)
            .ToList();

        // Score based on best ATS score (0-100 maps to 0-100)
        var score = Math.Min(bestAts, 100);

        return new ResumeReadiness
        {
            Score = score,
            ResumesAnalyzed = resumes.Count,
            BestAtsScore = bestAts,
            AverageAtsScore = avgAts,
            TotalMissingSkills = allMissing.Count,
            TopMissingSkills = allMissing.Take(5).ToList(),
            KeyStrengths = allStrengths
        };
    }

    private static InterviewPerformanceReadiness EvaluateInterviewReadiness(List<InterviewSession> sessions)
    {
        if (sessions.Count == 0)
        {
            return new InterviewPerformanceReadiness
            {
                Score = 0,
                StrongestCategory = "N/A",
                WeakestCategory = "N/A",
                DifficultyBreakdown = new DifficultyBreakdown()
            };
        }

        var allResults = sessions.SelectMany(s => s.Results).ToList();
        var totalAnswered = allResults.Count;
        var avgScore = totalAnswered > 0 ? allResults.Average(r => (double)r.Score) : 0;

        var bestSession = sessions
            .Where(s => s.Results.Count > 0)
            .Select(s => s.Results.Average(r => (double)r.Score))
            .DefaultIfEmpty(0)
            .Max();

        // Recent = last 3 sessions
        var recentSessions = sessions.Take(3).ToList();
        var recentResults = recentSessions.SelectMany(s => s.Results).ToList();
        var recentAvg = recentResults.Count > 0 ? recentResults.Average(r => (double)r.Score) : 0;

        // Performance by category
        var byCategory = sessions
            .Where(s => s.Results.Count > 0)
            .GroupBy(s => s.Category)
            .Select(g => new
            {
                Category = g.Key,
                Avg = g.SelectMany(s => s.Results).Average(r => (double)r.Score)
            })
            .ToList();

        var strongest = byCategory.OrderByDescending(c => c.Avg).FirstOrDefault();
        var weakest = byCategory.OrderBy(c => c.Avg).FirstOrDefault();

        // Difficulty breakdown
        var byDifficulty = sessions
            .Where(s => s.Results.Count > 0)
            .GroupBy(s => s.Difficulty, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                g => g.Key.ToLowerInvariant(),
                g => Math.Round(g.SelectMany(s => s.Results).Average(r => (double)r.Score), 1));

        // Score calculation: base on average (70%) + improvement trend (15%) + breadth (15%)
        var baseScore = avgScore * 10; // 0-10 avg → 0-100
        var breadthBonus = Math.Min(sessions.Count, 10) * 1.5; // Up to 15 for doing 10+ sessions
        var trendBonus = recentAvg >= avgScore ? 15 : recentAvg >= avgScore * 0.8 ? 7 : 0;
        var score = (int)Math.Min(Math.Round(baseScore * 0.70 + trendBonus + breadthBonus), 100);

        return new InterviewPerformanceReadiness
        {
            Score = score,
            SessionsCompleted = sessions.Count,
            TotalQuestionsAnswered = totalAnswered,
            AverageScore = Math.Round(avgScore, 1),
            BestSessionScore = Math.Round(bestSession, 1),
            RecentAverageScore = Math.Round(recentAvg, 1),
            StrongestCategory = strongest?.Category ?? "N/A",
            WeakestCategory = weakest?.Category ?? "N/A",
            DifficultyBreakdown = new DifficultyBreakdown
            {
                EasyAverage = byDifficulty.GetValueOrDefault("easy"),
                MediumAverage = byDifficulty.GetValueOrDefault("medium"),
                HardAverage = byDifficulty.GetValueOrDefault("hard")
            }
        };
    }

    private static ConsistencyReadiness EvaluateConsistency(List<InterviewSession> sessions)
    {
        if (sessions.Count == 0)
        {
            return new ConsistencyReadiness
            {
                Score = 0,
                PracticeFrequency = "None",
                ScoreTrend = "No data"
            };
        }

        var distinctDays = sessions
            .Select(s => s.CreatedAt.Date)
            .Distinct()
            .Count();

        var lastPractice = sessions.Max(s => s.CompletedAt ?? s.CreatedAt);
        var hasRecent = (DateTime.UtcNow - lastPractice).TotalDays <= 7;

        // Practice frequency
        var firstSession = sessions.Min(s => s.CreatedAt);
        var daySpan = Math.Max((DateTime.UtcNow - firstSession).TotalDays, 1);
        var sessionsPerWeek = sessions.Count / daySpan * 7;

        var frequency = sessionsPerWeek switch
        {
            >= 5 => "Daily",
            >= 3 => "Frequent",
            >= 1 => "Weekly",
            >= 0.5 => "Bi-weekly",
            _ => "Infrequent"
        };

        // Score trend: compare first half vs second half
        var midpoint = sessions.Count / 2;
        var trend = "Stable";
        if (sessions.Count >= 4)
        {
            // Sessions are sorted desc by CreatedAt
            var recentHalf = sessions.Take(midpoint).SelectMany(s => s.Results).ToList();
            var olderHalf = sessions.Skip(midpoint).SelectMany(s => s.Results).ToList();

            if (recentHalf.Count > 0 && olderHalf.Count > 0)
            {
                var recentAvg = recentHalf.Average(r => (double)r.Score);
                var olderAvg = olderHalf.Average(r => (double)r.Score);
                var diff = recentAvg - olderAvg;

                trend = diff switch
                {
                    > 1.0 => "Improving",
                    > 0.3 => "Slightly improving",
                    < -1.0 => "Declining",
                    < -0.3 => "Slightly declining",
                    _ => "Stable"
                };
            }
        }

        // Consistency score: practice days (40%) + recency (30%) + frequency (30%)
        var dayScore = Math.Min(distinctDays, 20) * 2.0; // Up to 40 for 20 distinct days
        var recencyScore = hasRecent ? 30 : (DateTime.UtcNow - lastPractice).TotalDays <= 14 ? 15 : 0;
        var freqScore = sessionsPerWeek switch
        {
            >= 5 => 30,
            >= 3 => 25,
            >= 1 => 18,
            >= 0.5 => 10,
            _ => 5
        };

        var score = (int)Math.Min(Math.Round(dayScore + recencyScore + freqScore), 100);

        return new ConsistencyReadiness
        {
            Score = score,
            PracticeDaysCount = distinctDays,
            PracticeFrequency = frequency,
            HasRecentActivity = hasRecent,
            LastPracticeDate = lastPractice,
            ScoreTrend = trend
        };
    }

    private static List<ReadinessStrength> IdentifyStrengths(
        ResumeReadiness resume,
        InterviewPerformanceReadiness interview,
        ConsistencyReadiness consistency)
    {
        var strengths = new List<ReadinessStrength>();

        if (resume.Score >= 70)
            strengths.Add(new ReadinessStrength { Area = "Resume Quality", Detail = $"ATS score of {resume.BestAtsScore} — your resume is well-optimized" });

        if (resume.KeyStrengths.Count > 0)
            strengths.Add(new ReadinessStrength { Area = "Skills", Detail = $"Strong in: {string.Join(", ", resume.KeyStrengths.Take(3))}" });

        if (interview.AverageScore >= 7)
            strengths.Add(new ReadinessStrength { Area = "Interview Skills", Detail = $"Average score of {interview.AverageScore}/10 demonstrates solid performance" });

        if (interview.RecentAverageScore > interview.AverageScore)
            strengths.Add(new ReadinessStrength { Area = "Improvement Trend", Detail = "Your recent scores are trending upward" });

        if (interview.StrongestCategory != "N/A")
            strengths.Add(new ReadinessStrength { Area = "Strongest Category", Detail = $"Performing best in {interview.StrongestCategory} questions" });

        if (consistency.Score >= 60)
            strengths.Add(new ReadinessStrength { Area = "Practice Habit", Detail = $"Consistent practice with {consistency.PracticeDaysCount} days of practice" });

        if (interview.DifficultyBreakdown.HardAverage >= 7)
            strengths.Add(new ReadinessStrength { Area = "Hard Questions", Detail = $"Scoring {interview.DifficultyBreakdown.HardAverage}/10 on hard difficulty" });

        return strengths.Take(5).ToList();
    }

    private static List<ReadinessWeakness> IdentifyGaps(
        ResumeReadiness resume,
        InterviewPerformanceReadiness interview,
        ConsistencyReadiness consistency)
    {
        var gaps = new List<ReadinessWeakness>();

        if (resume.Score == 0)
        {
            gaps.Add(new ReadinessWeakness
            {
                Area = "No Resume",
                Detail = "You haven't uploaded a resume yet",
                Recommendation = "Upload your resume for ATS analysis and skill gap identification"
            });
        }
        else if (resume.BestAtsScore < 60)
        {
            gaps.Add(new ReadinessWeakness
            {
                Area = "Resume Quality",
                Detail = $"ATS score of {resume.BestAtsScore} is below competitive threshold",
                Recommendation = "Revise your resume to address missing keywords and formatting issues"
            });
        }

        if (resume.TopMissingSkills.Count > 0 && resume.Score > 0)
        {
            gaps.Add(new ReadinessWeakness
            {
                Area = "Missing Skills",
                Detail = $"Key skills missing: {string.Join(", ", resume.TopMissingSkills.Take(3))}",
                Recommendation = "Add these skills to your resume or gain experience in these areas"
            });
        }

        if (interview.SessionsCompleted == 0)
        {
            gaps.Add(new ReadinessWeakness
            {
                Area = "No Interview Practice",
                Detail = "You haven't completed any practice interviews",
                Recommendation = "Start with an Easy difficulty session to build confidence"
            });
        }
        else if (interview.AverageScore < 5)
        {
            gaps.Add(new ReadinessWeakness
            {
                Area = "Interview Performance",
                Detail = $"Average score of {interview.AverageScore}/10 needs improvement",
                Recommendation = "Review feedback from past sessions and practice weak areas"
            });
        }

        if (interview.WeakestCategory != "N/A" && interview.WeakestCategory != interview.StrongestCategory)
        {
            gaps.Add(new ReadinessWeakness
            {
                Area = "Weak Category",
                Detail = $"Lowest performance in {interview.WeakestCategory} questions",
                Recommendation = $"Focus your next practice sessions on {interview.WeakestCategory} questions"
            });
        }

        if (!consistency.HasRecentActivity && interview.SessionsCompleted > 0)
        {
            gaps.Add(new ReadinessWeakness
            {
                Area = "Practice Gap",
                Detail = $"No practice in over a week (last: {consistency.LastPracticeDate:MMM dd})",
                Recommendation = "Resume regular practice to maintain and improve your skills"
            });
        }

        if (consistency.ScoreTrend.Contains("Declining", StringComparison.OrdinalIgnoreCase))
        {
            gaps.Add(new ReadinessWeakness
            {
                Area = "Declining Performance",
                Detail = "Your recent scores are trending downward",
                Recommendation = "Review fundamentals and slow down to focus on quality answers"
            });
        }

        return gaps.Take(5).ToList();
    }

    private static List<string> BuildActionPlan(
        ResumeReadiness resume,
        InterviewPerformanceReadiness interview,
        ConsistencyReadiness consistency)
    {
        var plan = new List<string>();

        // Priority 1: Foundations
        if (resume.Score == 0)
            plan.Add("Step 1: Upload your resume to identify skill gaps and get your ATS score");
        else if (resume.BestAtsScore < 70)
            plan.Add($"Step {plan.Count + 1}: Improve your resume — current best ATS score is {resume.BestAtsScore}, aim for 70+");

        if (interview.SessionsCompleted == 0)
        {
            plan.Add($"Step {plan.Count + 1}: Complete your first practice interview (start with Easy difficulty)");
            plan.Add($"Step {plan.Count + 1}: After your first session, try a Medium difficulty interview");
        }

        // Priority 2: Targeted improvement
        if (interview.SessionsCompleted > 0 && interview.AverageScore < 7)
            plan.Add($"Step {plan.Count + 1}: Focus on improving your average score from {interview.AverageScore} to 7.0+");

        if (interview.WeakestCategory != "N/A" && interview.SessionsCompleted >= 3)
            plan.Add($"Step {plan.Count + 1}: Practice {interview.WeakestCategory} questions — your weakest area");

        if (interview.DifficultyBreakdown.HardAverage == null && interview.SessionsCompleted >= 3)
            plan.Add($"Step {plan.Count + 1}: Challenge yourself with Hard difficulty interviews");
        else if (interview.DifficultyBreakdown.HardAverage < 6)
            plan.Add($"Step {plan.Count + 1}: Work on Hard difficulty — currently averaging {interview.DifficultyBreakdown.HardAverage}/10");

        // Priority 3: Consistency
        if (!consistency.HasRecentActivity && interview.SessionsCompleted > 0)
            plan.Add($"Step {plan.Count + 1}: Resume regular practice — aim for 2-3 sessions per week");
        else if (consistency.PracticeFrequency == "Infrequent")
            plan.Add($"Step {plan.Count + 1}: Increase practice frequency — aim for at least 1 session per week");

        // Priority 4: Excellence
        if (interview.AverageScore >= 7 && interview.SessionsCompleted >= 5)
            plan.Add($"Step {plan.Count + 1}: You're performing well — try mock interviews with timed sessions to simulate real pressure");

        if (resume.Score >= 80 && interview.AverageScore >= 8)
            plan.Add($"Step {plan.Count + 1}: Excellent progress! Consider applying to target roles now");

        if (plan.Count == 0)
            plan.Add("Keep up your current practice routine — you're on a great track!");

        return plan;
    }

    private static string GetReadinessLevel(int score) => score switch
    {
        >= 85 => "Interview Ready",
        >= 70 => "Almost Ready",
        >= 50 => "Progressing",
        >= 30 => "Building Foundation",
        _ => "Getting Started"
    };

    private static string GenerateSummary(int score, int resumeCount, int sessionCount)
    {
        var level = GetReadinessLevel(score);

        if (resumeCount == 0 && sessionCount == 0)
            return "You're just getting started. Upload your resume and complete a practice interview to begin building your readiness score.";

        if (resumeCount == 0)
            return $"You've completed {sessionCount} interview session(s) but haven't uploaded a resume yet. Upload your resume to get a complete readiness picture.";

        if (sessionCount == 0)
            return $"Your resume has been analyzed but you haven't done any practice interviews yet. Start a practice session to build your interview skills.";

        return level switch
        {
            "Interview Ready" => $"With a score of {score}/100, you're well-prepared for real interviews. Your resume is strong and your interview performance is solid across {sessionCount} session(s).",
            "Almost Ready" => $"Score: {score}/100 — you're close to being interview-ready. A few more targeted practice sessions will get you there.",
            "Progressing" => $"Score: {score}/100 — you're making good progress across {sessionCount} session(s). Focus on the action plan below to level up.",
            "Building Foundation" => $"Score: {score}/100 — you're building a foundation. Keep practising and addressing the gaps identified below.",
            _ => $"Score: {score}/100 — you're just getting started. Follow the action plan to quickly improve your readiness."
        };
    }
}
