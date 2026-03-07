using DocumentFormat.OpenXml.Packaging;
using MyWebApi.DTOs;
using MyWebApi.Models;
using MyWebApi.Repositories;
using UglyToad.PdfPig;

namespace MyWebApi.Services;

public interface IResumeService
{
    Task<ResumeAnalysisResponse> UploadAndAnalyzeAsync(string userId, ResumeUploadRequest request);
    Task<List<ResumeListItemResponse>> GetMyResumesAsync(string userId);
    Task<ResumeDetailedAnalysis> GetDetailedAnalysisAsync(string resumeId, string userId);
    Task<KeywordAnalysis> AnalyzeKeywordsAsync(string resumeId, string userId, List<string> targetKeywords);
}

public class ResumeService : IResumeService
{
    private readonly IResumeRepository _resumeRepository;
    private readonly IOpenAIService _openAiService;
    private readonly IResumeAnalyzerService _analyzerService;

    public ResumeService(
        IResumeRepository resumeRepository, 
        IOpenAIService openAiService,
        IResumeAnalyzerService analyzerService)
    {
        _resumeRepository = resumeRepository;
        _openAiService = openAiService;
        _analyzerService = analyzerService;
    }

    public async Task<ResumeAnalysisResponse> UploadAndAnalyzeAsync(string userId, ResumeUploadRequest request)
    {
        if (request.File is null || request.File.Length == 0)
        {
            throw new InvalidOperationException("Resume file is required.");
        }

        var extension = Path.GetExtension(request.File.FileName).ToLowerInvariant();
        if (extension is not ".pdf" and not ".docx" and not ".txt")
        {
            throw new InvalidOperationException("Unsupported file type. Allowed: .pdf, .docx, .txt");
        }

        var maxFileSizeInBytes = 10 * 1024 * 1024;
        if (request.File.Length > maxFileSizeInBytes)
        {
            throw new InvalidOperationException("File size exceeds 10 MB limit.");
        }

        var extractedText = await ExtractTextAsync(request.File);
        if (string.IsNullOrWhiteSpace(extractedText))
        {
            throw new InvalidOperationException("Could not extract text from the uploaded resume.");
        }

        var aiResult = await _openAiService.AnalyzeResumeAsync(extractedText);

        var resume = new Resume
        {
            UserId = userId,
            FileName = request.File.FileName,
            ExtractedText = extractedText,
            AtsScore = aiResult.AtsScore,
            MissingSkills = aiResult.MissingSkills,
            StrengthAreas = aiResult.StrengthAreas,
            ImprovementSuggestions = aiResult.ImprovementSuggestions,
            CreatedAt = DateTime.UtcNow
        };

        await _resumeRepository.CreateAsync(resume);

        return new ResumeAnalysisResponse
        {
            ResumeId = resume.Id,
            FileName = resume.FileName,
            AtsScore = resume.AtsScore,
            MissingSkills = resume.MissingSkills,
            StrengthAreas = resume.StrengthAreas,
            ImprovementSuggestions = resume.ImprovementSuggestions,
            CreatedAt = resume.CreatedAt
        };
    }

    public async Task<List<ResumeListItemResponse>> GetMyResumesAsync(string userId)
    {
        var resumes = await _resumeRepository.GetByUserIdAsync(userId);
        return resumes.Select(x => new ResumeListItemResponse
        {
            ResumeId = x.Id,
            FileName = x.FileName,
            AtsScore = x.AtsScore,
            CreatedAt = x.CreatedAt
        }).ToList();
    }

    public async Task<ResumeDetailedAnalysis> GetDetailedAnalysisAsync(string resumeId, string userId)
    {
        var resume = await _resumeRepository.GetByIdAsync(resumeId);
        
        if (resume is null)
        {
            throw new KeyNotFoundException($"Resume with ID {resumeId} not found.");
        }

        if (resume.UserId != userId)
        {
            throw new UnauthorizedAccessException("You do not have permission to access this resume.");
        }

        var analysis = _analyzerService.AnalyzeResumeContent(resume.ExtractedText);
        return analysis;
    }

    public async Task<KeywordAnalysis> AnalyzeKeywordsAsync(string resumeId, string userId, List<string> targetKeywords)
    {
        var resume = await _resumeRepository.GetByIdAsync(resumeId);
        
        if (resume is null)
        {
            throw new KeyNotFoundException($"Resume with ID {resumeId} not found.");
        }

        if (resume.UserId != userId)
        {
            throw new UnauthorizedAccessException("You do not have permission to access this resume.");
        }

        var analysis = _analyzerService.AnalyzeKeywords(resume.ExtractedText, targetKeywords);
        return analysis;
    }

    private static async Task<string> ExtractTextAsync(IFormFile file)
    {
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

        return extension switch
        {
            ".pdf" => await ExtractPdfTextAsync(file),
            ".docx" => await ExtractDocxTextAsync(file),
            ".txt" => await ExtractPlainTextAsync(file),
            _ => throw new InvalidOperationException("Unsupported file type. Allowed: .pdf, .docx, .txt")
        };
    }

    private static async Task<string> ExtractPdfTextAsync(IFormFile file)
    {
        await using var stream = file.OpenReadStream();
        using var document = PdfDocument.Open(stream);

        var lines = new List<string>();
        foreach (var page in document.GetPages())
        {
            if (!string.IsNullOrWhiteSpace(page.Text))
            {
                lines.Add(page.Text);
            }
        }

        return string.Join(Environment.NewLine, lines);
    }

    private static async Task<string> ExtractDocxTextAsync(IFormFile file)
    {
        await using var stream = file.OpenReadStream();
        using var memoryStream = new MemoryStream();
        await stream.CopyToAsync(memoryStream);
        memoryStream.Position = 0;

        using var wordDoc = WordprocessingDocument.Open(memoryStream, false);
        return wordDoc.MainDocumentPart?.Document?.Body?.InnerText ?? string.Empty;
    }

    private static async Task<string> ExtractPlainTextAsync(IFormFile file)
    {
        await using var stream = file.OpenReadStream();
        using var reader = new StreamReader(stream);
        return await reader.ReadToEndAsync();
    }
}
