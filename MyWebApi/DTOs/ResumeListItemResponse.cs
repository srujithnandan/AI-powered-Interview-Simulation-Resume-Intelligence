namespace MyWebApi.DTOs;

public class ResumeListItemResponse
{
    public string ResumeId { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public int AtsScore { get; set; }
    public DateTime CreatedAt { get; set; }
}
