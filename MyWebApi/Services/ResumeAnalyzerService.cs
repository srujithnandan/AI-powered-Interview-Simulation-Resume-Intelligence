using System.Text.RegularExpressions;
using MyWebApi.DTOs;

namespace MyWebApi.Services;

public interface IResumeAnalyzerService
{
    ResumeDetailedAnalysis AnalyzeResumeContent(string resumeText);
    KeywordAnalysis AnalyzeKeywords(string resumeText, List<string> targetKeywords);
    FormatAnalysis AnalyzeFormat(string resumeText);
    ExperienceLevel DetectExperienceLevel(string resumeText);
    ContactInfoValidation ValidateContactInfo(string resumeText);
}

public class ResumeAnalyzerService : IResumeAnalyzerService
{
    private static readonly string[] CommonActionVerbs = new[]
    {
        "achieved", "accomplished", "designed", "developed", "implemented", "led", "managed",
        "created", "improved", "increased", "reduced", "launched", "established", "built",
        "delivered", "optimized", "coordinated", "executed", "initiated", "resolved",
        "streamlined", "transformed", "drove", "spearheaded", "pioneered"
    };

    private static readonly string[] SeniorKeywords = new[]
    {
        "architect", "lead", "senior", "principal", "director", "manager", "head of",
        "vp", "chief", "strategy", "mentored", "managed team", "leadership"
    };

    private static readonly string[] MidLevelKeywords = new[]
    {
        "developed", "designed", "implemented", "collaborated", "contributed",
        "years of experience", "professional", "specialist"
    };

    public ResumeDetailedAnalysis AnalyzeResumeContent(string resumeText)
    {
        if (string.IsNullOrWhiteSpace(resumeText))
        {
            throw new ArgumentException("Resume text cannot be empty.", nameof(resumeText));
        }

        var analysis = new ResumeDetailedAnalysis
        {
            WordCount = CountWords(resumeText),
            CharacterCount = resumeText.Length,
            SectionCount = DetectSections(resumeText),
            HasActionVerbs = HasStrongActionVerbs(resumeText),
            ActionVerbCount = CountActionVerbs(resumeText),
            HasQuantifiableAchievements = HasQuantifiableMetrics(resumeText),
            QuantifiableAchievementCount = CountQuantifiableMetrics(resumeText),
            ExperienceLevel = DetectExperienceLevel(resumeText).ToString(),
            ContactInfo = ValidateContactInfo(resumeText),
            FormatScore = CalculateFormatScore(resumeText),
            ReadabilityScore = CalculateReadabilityScore(resumeText),
            Recommendations = GenerateRecommendations(resumeText)
        };

        return analysis;
    }

    public KeywordAnalysis AnalyzeKeywords(string resumeText, List<string> targetKeywords)
    {
        if (string.IsNullOrWhiteSpace(resumeText))
        {
            throw new ArgumentException("Resume text cannot be empty.", nameof(resumeText));
        }

        var textLower = resumeText.ToLowerInvariant();
        var words = Regex.Split(textLower, @"\W+").Where(w => w.Length > 0).ToList();
        var totalWords = words.Count;

        var keywordMatches = new Dictionary<string, int>();
        var missingKeywords = new List<string>();

        foreach (var keyword in targetKeywords ?? new List<string>())
        {
            var keywordLower = keyword.ToLowerInvariant();
            var count = Regex.Matches(textLower, $@"\b{Regex.Escape(keywordLower)}\b").Count;

            if (count > 0)
            {
                keywordMatches[keyword] = count;
            }
            else
            {
                missingKeywords.Add(keyword);
            }
        }

        return new KeywordAnalysis
        {
            TotalWords = totalWords,
            UniqueWords = words.Distinct().Count(),
            KeywordMatches = keywordMatches,
            MissingKeywords = missingKeywords,
            KeywordDensity = targetKeywords?.Count > 0 
                ? (double)keywordMatches.Count / targetKeywords.Count * 100 
                : 0,
            TopKeywords = GetTopKeywords(words, 10)
        };
    }

    public FormatAnalysis AnalyzeFormat(string resumeText)
    {
        if (string.IsNullOrWhiteSpace(resumeText))
        {
            throw new ArgumentException("Resume text cannot be empty.", nameof(resumeText));
        }

        var lines = resumeText.Split('\n').Select(l => l.Trim()).Where(l => l.Length > 0).ToList();
        var wordCount = CountWords(resumeText);

        return new FormatAnalysis
        {
            LineCount = lines.Count,
            AverageLineLength = lines.Count > 0 ? lines.Average(l => l.Length) : 0,
            HasBulletPoints = HasBulletPoints(resumeText),
            BulletPointCount = CountBulletPoints(resumeText),
            HasSections = DetectSections(resumeText) > 2,
            SectionCount = DetectSections(resumeText),
            IsAppropriateLength = wordCount >= 300 && wordCount <= 1000,
            LengthCategory = GetLengthCategory(wordCount),
            HasProperStructure = HasProperStructure(resumeText),
            FormatIssues = IdentifyFormatIssues(resumeText)
        };
    }

    public ExperienceLevel DetectExperienceLevel(string resumeText)
    {
        if (string.IsNullOrWhiteSpace(resumeText))
        {
            return ExperienceLevel.Unknown;
        }

        var textLower = resumeText.ToLowerInvariant();
        var seniorScore = SeniorKeywords.Count(k => textLower.Contains(k));
        var midScore = MidLevelKeywords.Count(k => textLower.Contains(k));

        // Extract years of experience
        var yearsMatch = Regex.Match(textLower, @"(\d+)\+?\s*years?\s*(of)?\s*experience");
        var years = yearsMatch.Success ? int.Parse(yearsMatch.Groups[1].Value) : 0;

        if (seniorScore >= 3 || years >= 8)
        {
            return ExperienceLevel.Senior;
        }

        if (midScore >= 2 || years >= 3)
        {
            return ExperienceLevel.Mid;
        }

        if (textLower.Contains("internship") || textLower.Contains("graduate") || 
            textLower.Contains("entry") || years < 2)
        {
            return ExperienceLevel.Junior;
        }

        return ExperienceLevel.Unknown;
    }

    public ContactInfoValidation ValidateContactInfo(string resumeText)
    {
        if (string.IsNullOrWhiteSpace(resumeText))
        {
            return new ContactInfoValidation();
        }

        var emailPattern = @"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b";
        var phonePattern = @"(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}";
        var linkedInPattern = @"linkedin\.com/in/[\w-]+";
        var githubPattern = @"github\.com/[\w-]+";

        return new ContactInfoValidation
        {
            HasEmail = Regex.IsMatch(resumeText, emailPattern),
            HasPhone = Regex.IsMatch(resumeText, phonePattern),
            HasLinkedIn = Regex.IsMatch(resumeText, linkedInPattern, RegexOptions.IgnoreCase),
            HasGitHub = Regex.IsMatch(resumeText, githubPattern, RegexOptions.IgnoreCase),
            HasLocation = DetectLocation(resumeText),
            MissingContactInfo = new List<string>()
        };
    }

    // Private helper methods

    private static int CountWords(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return 0;
        return Regex.Split(text, @"\s+").Count(w => w.Length > 0);
    }

    private static int DetectSections(string text)
    {
        var sectionKeywords = new[]
        {
            "summary", "objective", "experience", "education", "skills",
            "projects", "certifications", "achievements", "awards", "professional"
        };

        var lines = text.Split('\n').Select(l => l.Trim().ToLowerInvariant());
        return lines.Count(line => sectionKeywords.Any(keyword => 
            line.StartsWith(keyword) || line.Contains(keyword + ":")));
    }

    private static bool HasStrongActionVerbs(string text)
    {
        var textLower = text.ToLowerInvariant();
        return CommonActionVerbs.Any(verb => textLower.Contains(verb));
    }

    private static int CountActionVerbs(string text)
    {
        var textLower = text.ToLowerInvariant();
        return CommonActionVerbs.Count(verb => Regex.IsMatch(textLower, $@"\b{verb}\b"));
    }

    private static bool HasQuantifiableMetrics(string text)
    {
        // Look for numbers with context (percentages, currency, time, etc.)
        var patterns = new[]
        {
            @"\d+%",                    // Percentages
            @"\$[\d,]+",                // Dollar amounts
            @"\d+[kmb]",                // Thousands, millions, billions
            @"\d+\s*(users?|customers?|clients?|team|people)",
            @"(increased|reduced|improved|grew|saved)\s+\w+\s+by\s+\d+"
        };

        return patterns.Any(pattern => Regex.IsMatch(text, pattern, RegexOptions.IgnoreCase));
    }

    private static int CountQuantifiableMetrics(string text)
    {
        var patterns = new[]
        {
            @"\d+%",
            @"\$[\d,]+",
            @"\d+[kmb]"
        };

        return patterns.Sum(pattern => Regex.Matches(text, pattern, RegexOptions.IgnoreCase).Count);
    }

    private static int CalculateFormatScore(string text)
    {
        var score = 0;

        if (HasBulletPoints(text)) score += 20;
        if (DetectSections(text) >= 3) score += 20;
        if (HasStrongActionVerbs(text)) score += 20;
        if (HasQuantifiableMetrics(text)) score += 20;
        
        var wordCount = CountWords(text);
        if (wordCount >= 300 && wordCount <= 1000) score += 20;

        return Math.Min(score, 100);
    }

    private static double CalculateReadabilityScore(string text)
    {
        // Simple readability calculation based on average sentence length
        var sentences = Regex.Split(text, @"[.!?]+").Where(s => s.Trim().Length > 0).ToList();
        if (sentences.Count == 0) return 0;

        var words = CountWords(text);
        var avgWordsPerSentence = (double)words / sentences.Count;

        // Optimal is 15-20 words per sentence
        if (avgWordsPerSentence >= 15 && avgWordsPerSentence <= 20)
        {
            return 100;
        }

        if (avgWordsPerSentence < 15)
        {
            return Math.Max(0, 100 - (15 - avgWordsPerSentence) * 5);
        }

        return Math.Max(0, 100 - (avgWordsPerSentence - 20) * 3);
    }

    private static List<string> GenerateRecommendations(string text)
    {
        var recommendations = new List<string>();

        if (!HasStrongActionVerbs(text))
        {
            recommendations.Add("Add strong action verbs to describe your accomplishments (e.g., achieved, developed, led)");
        }

        if (!HasQuantifiableMetrics(text))
        {
            recommendations.Add("Include quantifiable achievements with percentages, numbers, or metrics");
        }

        if (!HasBulletPoints(text))
        {
            recommendations.Add("Use bullet points to make your experience easier to scan");
        }

        var wordCount = CountWords(text);
        if (wordCount < 300)
        {
            recommendations.Add("Your resume is too short. Add more details about your experience and skills");
        }
        else if (wordCount > 1000)
        {
            recommendations.Add("Your resume is too long. Focus on the most relevant and recent experience");
        }

        if (DetectSections(text) < 3)
        {
            recommendations.Add("Add clear sections like Summary, Experience, Education, and Skills");
        }

        return recommendations;
    }

    private static bool HasBulletPoints(string text)
    {
        return Regex.IsMatch(text, @"^\s*[•\-\*◦▪]", RegexOptions.Multiline);
    }

    private static int CountBulletPoints(string text)
    {
        return Regex.Matches(text, @"^\s*[•\-\*◦▪]", RegexOptions.Multiline).Count;
    }

    private static string GetLengthCategory(int wordCount)
    {
        return wordCount switch
        {
            < 300 => "Too Short",
            >= 300 and < 600 => "Optimal",
            >= 600 and < 1000 => "Good",
            >= 1000 and < 1500 => "Long",
            _ => "Too Long"
        };
    }

    private static bool HasProperStructure(string text)
    {
        var hasMultipleSections = DetectSections(text) >= 3;
        var hasBullets = HasBulletPoints(text);
        var hasActionVerbs = HasStrongActionVerbs(text);

        return hasMultipleSections && hasBullets && hasActionVerbs;
    }

    private static List<string> IdentifyFormatIssues(string text)
    {
        var issues = new List<string>();

        if (!HasBulletPoints(text))
        {
            issues.Add("Missing bullet points");
        }

        if (Regex.IsMatch(text, @"[A-Z]{5,}"))
        {
            issues.Add("Excessive use of capital letters");
        }

        var lines = text.Split('\n');
        var veryLongLines = lines.Count(l => l.Length > 120);
        if (veryLongLines > 5)
        {
            issues.Add("Many lines are too long, consider breaking them up");
        }

        if (!Regex.IsMatch(text, @"\d{4}"))
        {
            issues.Add("Missing dates or years");
        }

        return issues;
    }

    private static Dictionary<string, int> GetTopKeywords(List<string> words, int count)
    {
        var stopWords = new HashSet<string>
        {
            "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
            "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
            "be", "have", "has", "had", "do", "does", "did", "will", "would",
            "could", "should", "may", "might", "must", "can", "this", "that",
            "these", "those", "i", "you", "he", "she", "it", "we", "they"
        };

        return words
            .Where(w => w.Length > 3 && !stopWords.Contains(w))
            .GroupBy(w => w)
            .OrderByDescending(g => g.Count())
            .Take(count)
            .ToDictionary(g => g.Key, g => g.Count());
    }

    private static bool DetectLocation(string text)
    {
        var locationPatterns = new[]
        {
            @"\b[A-Z][a-z]+,\s*[A-Z]{2}\b",  // City, ST
            @"\b[A-Z][a-z]+\s+[A-Z][a-z]+,\s*[A-Z]{2}\b",  // City Name, ST
            @"\b\d{5}(-\d{4})?\b"  // ZIP code
        };

        return locationPatterns.Any(pattern => Regex.IsMatch(text, pattern));
    }
}

public enum ExperienceLevel
{
    Unknown,
    Junior,
    Mid,
    Senior
}
