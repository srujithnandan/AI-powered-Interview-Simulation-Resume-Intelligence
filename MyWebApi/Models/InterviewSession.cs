using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MyWebApi.Models;

public class InterviewSession
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonRepresentation(BsonType.ObjectId)]
    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("role")]
    public string Role { get; set; } = string.Empty;

    [BsonElement("difficulty")]
    public string Difficulty { get; set; } = "Medium";

    [BsonElement("category")]
    public string Category { get; set; } = "Mixed";

    [BsonElement("questions")]
    public List<string> Questions { get; set; } = new();

    [BsonElement("currentQuestionIndex")]
    public int CurrentQuestionIndex { get; set; }

    [BsonElement("status")]
    public string Status { get; set; } = "InProgress";

    [BsonElement("timeLimitMinutes")]
    public int? TimeLimitMinutes { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("completedAt")]
    public DateTime? CompletedAt { get; set; }

    [BsonElement("results")]
    public List<InterviewResult> Results { get; set; } = new();
}
