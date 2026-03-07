using MongoDB.Driver;

namespace MyWebApi.Data;

public static class MongoDbIndexesInitializer
{
    public static async Task InitializeAsync(MongoDbContext context)
    {
        var userEmailIndex = new CreateIndexModel<Models.User>(
            Builders<Models.User>.IndexKeys.Ascending(x => x.Email),
            new CreateIndexOptions { Unique = true, Name = "ux_users_email" });

        var resumeUserIdIndex = new CreateIndexModel<Models.Resume>(
            Builders<Models.Resume>.IndexKeys.Ascending(x => x.UserId),
            new CreateIndexOptions { Name = "ix_resumes_userId" });

        var interviewUserIdIndex = new CreateIndexModel<Models.InterviewSession>(
            Builders<Models.InterviewSession>.IndexKeys.Ascending(x => x.UserId),
            new CreateIndexOptions { Name = "ix_interviewSessions_userId" });

        await context.Users.Indexes.CreateOneAsync(userEmailIndex);
        await context.Resumes.Indexes.CreateOneAsync(resumeUserIdIndex);
        await context.InterviewSessions.Indexes.CreateOneAsync(interviewUserIdIndex);
    }
}
