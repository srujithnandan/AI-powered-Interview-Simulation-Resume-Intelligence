using MongoDB.Driver;
using MyWebApi.Models;
using MyWebApi.Settings;

namespace MyWebApi.Data;

public class MongoDbContext
{
    private readonly IMongoDatabase _database;

    public MongoDbContext(MongoDbSettings settings)
    {
        var client = new MongoClient(settings.ConnectionString);
        _database = client.GetDatabase(settings.DatabaseName);

        Users = _database.GetCollection<User>(settings.UsersCollectionName);
        Resumes = _database.GetCollection<Resume>(settings.ResumesCollectionName);
        InterviewSessions = _database.GetCollection<InterviewSession>(settings.InterviewSessionsCollectionName);
    }

    public IMongoCollection<User> Users { get; }
    public IMongoCollection<Resume> Resumes { get; }
    public IMongoCollection<InterviewSession> InterviewSessions { get; }
}
