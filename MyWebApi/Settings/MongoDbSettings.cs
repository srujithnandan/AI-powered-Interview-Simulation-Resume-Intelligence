namespace MyWebApi.Settings;

public class MongoDbSettings
{
    public string ConnectionString { get; set; } = string.Empty;
    public string DatabaseName { get; set; } = "AiInterviewDb";
    public string UsersCollectionName { get; set; } = "Users";
    public string ResumesCollectionName { get; set; } = "Resumes";
    public string InterviewSessionsCollectionName { get; set; } = "InterviewSessions";
}
