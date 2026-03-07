using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyWebApi.DTOs;
using MyWebApi.Services;

namespace MyWebApi.Controllers;

[ApiController]
[Authorize]
[Route("api/interview")]
public class InterviewController : ControllerBase
{
    private readonly IInterviewService _interviewService;
    private readonly IInterviewSimulatorService _simulatorService;

    public InterviewController(IInterviewService interviewService, IInterviewSimulatorService simulatorService)
    {
        _interviewService = interviewService;
        _simulatorService = simulatorService;
    }

    [HttpGet("questions")]
    public async Task<IActionResult> GenerateQuestions([FromQuery] string role, [FromQuery] int count = 5)
    {
        if (string.IsNullOrWhiteSpace(role))
        {
            return BadRequest(new { message = "Role is required." });
        }

        var userId = GetCurrentUserId();
        var response = await _interviewService.GenerateQuestionsAsync(userId, role, count);
        return Ok(response);
    }

    [HttpPost("answer")]
    public async Task<IActionResult> SubmitAnswer([FromBody] InterviewAnswerRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _interviewService.EvaluateAnswerAsync(userId, request);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpGet("analytics")]
    public async Task<IActionResult> GetAnalytics()
    {
        var userId = GetCurrentUserId();
        var analytics = await _interviewService.GetAnalyticsAsync(userId);
        return Ok(analytics);
    }

    // ── Interview Simulator Endpoints ──

    [HttpPost("simulator/start")]
    public async Task<IActionResult> StartSession([FromBody] StartSessionRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var response = await _simulatorService.StartSessionAsync(userId, request);
            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("simulator/submit")]
    public async Task<IActionResult> SubmitSimulatorAnswer([FromBody] SubmitAnswerRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await _simulatorService.SubmitAnswerAsync(userId, request);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("simulator/active")]
    public async Task<IActionResult> GetActiveSession()
    {
        var userId = GetCurrentUserId();
        var session = await _simulatorService.GetActiveSessionAsync(userId);
        if (session is null)
        {
            return Ok(new { message = "No active session found." });
        }
        return Ok(session);
    }

    [HttpGet("simulator/session/{sessionId}/report")]
    public async Task<IActionResult> GetSessionReport(string sessionId)
    {
        try
        {
            var userId = GetCurrentUserId();
            var report = await _simulatorService.GetSessionReportAsync(userId, sessionId);
            return Ok(report);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }

    [HttpPost("simulator/session/{sessionId}/end")]
    public async Task<IActionResult> EndSession(string sessionId)
    {
        try
        {
            var userId = GetCurrentUserId();
            var report = await _simulatorService.EndSessionAsync(userId, sessionId);
            return Ok(report);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("simulator/history")]
    public async Task<IActionResult> GetSessionHistory()
    {
        var userId = GetCurrentUserId();
        var history = await _simulatorService.GetSessionHistoryAsync(userId);
        return Ok(history);
    }

    [HttpGet("simulator/trends")]
    public async Task<IActionResult> GetPerformanceTrends()
    {
        var userId = GetCurrentUserId();
        var trends = await _simulatorService.GetPerformanceTrendsAsync(userId);
        return Ok(trends);
    }

    private string GetCurrentUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException("User ID claim is missing.");
    }
}
