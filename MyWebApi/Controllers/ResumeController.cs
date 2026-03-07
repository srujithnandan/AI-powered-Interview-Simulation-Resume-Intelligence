using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyWebApi.DTOs;
using MyWebApi.Services;

namespace MyWebApi.Controllers;

[ApiController]
[Authorize]
[Route("api/resume")]
public class ResumeController : ControllerBase
{
    private readonly IResumeService _resumeService;

    public ResumeController(IResumeService resumeService)
    {
        _resumeService = resumeService;
    }

    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Upload([FromForm] ResumeUploadRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _resumeService.UploadAndAnalyzeAsync(userId, request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMyResumes()
    {
        var userId = GetCurrentUserId();
        var resumes = await _resumeService.GetMyResumesAsync(userId);
        return Ok(resumes);
    }

    [HttpGet("{resumeId}/detailed-analysis")]
    public async Task<IActionResult> GetDetailedAnalysis(string resumeId)
    {
        try
        {
            var userId = GetCurrentUserId();
            var analysis = await _resumeService.GetDetailedAnalysisAsync(resumeId, userId);
            return Ok(analysis);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{resumeId}/keyword-analysis")]
    public async Task<IActionResult> AnalyzeKeywords(string resumeId, [FromBody] KeywordAnalysisRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var analysis = await _resumeService.AnalyzeKeywordsAsync(resumeId, userId, request.Keywords);
            return Ok(analysis);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private string GetCurrentUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException("User ID claim is missing.");
    }
}
