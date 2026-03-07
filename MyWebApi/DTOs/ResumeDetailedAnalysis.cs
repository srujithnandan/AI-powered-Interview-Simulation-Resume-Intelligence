namespace MyWebApi.DTOs;

public class ResumeDetailedAnalysis
{
    public int WordCount { get; set; }
    public int CharacterCount { get; set; }
    public int SectionCount { get; set; }
    public bool HasActionVerbs { get; set; }
    public int ActionVerbCount { get; set; }
    public bool HasQuantifiableAchievements { get; set; }
    public int QuantifiableAchievementCount { get; set; }
    public string ExperienceLevel { get; set; } = string.Empty;
    public ContactInfoValidation ContactInfo { get; set; } = new();
    public int FormatScore { get; set; }
    public double ReadabilityScore { get; set; }
    public List<string> Recommendations { get; set; } = new();
}

public class KeywordAnalysis
{
    public int TotalWords { get; set; }
    public int UniqueWords { get; set; }
    public Dictionary<string, int> KeywordMatches { get; set; } = new();
    public List<string> MissingKeywords { get; set; } = new();
    public double KeywordDensity { get; set; }
    public Dictionary<string, int> TopKeywords { get; set; } = new();
}

public class FormatAnalysis
{
    public int LineCount { get; set; }
    public double AverageLineLength { get; set; }
    public bool HasBulletPoints { get; set; }
    public int BulletPointCount { get; set; }
    public bool HasSections { get; set; }
    public int SectionCount { get; set; }
    public bool IsAppropriateLength { get; set; }
    public string LengthCategory { get; set; } = string.Empty;
    public bool HasProperStructure { get; set; }
    public List<string> FormatIssues { get; set; } = new();
}

public class ContactInfoValidation
{
    public bool HasEmail { get; set; }
    public bool HasPhone { get; set; }
    public bool HasLinkedIn { get; set; }
    public bool HasGitHub { get; set; }
    public bool HasLocation { get; set; }
    public List<string> MissingContactInfo { get; set; } = new();
    
    public bool IsComplete => HasEmail && HasPhone && (HasLinkedIn || HasGitHub);
    public int CompletenessScore => 
        (HasEmail ? 25 : 0) + 
        (HasPhone ? 25 : 0) + 
        (HasLinkedIn ? 15 : 0) + 
        (HasGitHub ? 15 : 0) + 
        (HasLocation ? 20 : 0);
}
