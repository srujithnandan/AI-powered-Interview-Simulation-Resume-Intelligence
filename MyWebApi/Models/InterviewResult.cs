namespace MyWebApi.Models;

public class InterviewResult
{
    public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public int Score { get; set; }
    public string Feedback { get; set; } = string.Empty;
    public string TechnicalAccuracy { get; set; } = string.Empty;
    public string CommunicationClarity { get; set; } = string.Empty;
    public string Suggestions { get; set; } = string.Empty;
    public DateTime EvaluatedAt { get; set; } = DateTime.UtcNow;
}
