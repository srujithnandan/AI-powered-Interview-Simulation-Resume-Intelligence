using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace MyWebApi.DTOs;

public class ResumeUploadRequest
{
    [Required]
    public IFormFile File { get; set; } = default!;
}
