using System.ComponentModel.DataAnnotations;

namespace MyWebApi.DTOs;

public class KeywordAnalysisRequest
{
    [Required]
    public List<string> Keywords { get; set; } = new();
}
