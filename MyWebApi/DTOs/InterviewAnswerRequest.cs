using System.ComponentModel.DataAnnotations;

namespace MyWebApi.DTOs;

public class InterviewAnswerRequest
{
    [Required]
    public string SessionId { get; set; } = string.Empty;

    [Required]
    public string Question { get; set; } = string.Empty;

    [Required]
    public string Answer { get; set; } = string.Empty;
}
