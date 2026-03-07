namespace MyWebApi.DTOs;

public class ResumeAnalysisResponse
{
    public string ResumeId { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public int AtsScore { get; set; }
    public List<string> MissingSkills { get; set; } = new();
    public List<string> StrengthAreas { get; set; } = new();
    public List<string> ImprovementSuggestions { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}
