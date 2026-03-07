using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MyWebApi.Models;

public class Resume
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonRepresentation(BsonType.ObjectId)]
    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("fileName")]
    public string FileName { get; set; } = string.Empty;

    [BsonElement("extractedText")]
    public string ExtractedText { get; set; } = string.Empty;

    [BsonElement("atsScore")]
    public int AtsScore { get; set; }

    [BsonElement("missingSkills")]
    public List<string> MissingSkills { get; set; } = new();

    [BsonElement("strengthAreas")]
    public List<string> StrengthAreas { get; set; } = new();

    [BsonElement("improvementSuggestions")]
    public List<string> ImprovementSuggestions { get; set; } = new();

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
