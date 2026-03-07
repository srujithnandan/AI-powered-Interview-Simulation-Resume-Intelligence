using MongoDB.Driver;
using MyWebApi.Data;
using MyWebApi.Models;

namespace MyWebApi.Repositories;

public interface IInterviewRepository
{
    Task CreateSessionAsync(InterviewSession session);
    Task<InterviewSession?> GetByIdAsync(string id);
    Task UpdateSessionAsync(InterviewSession session);
    Task<List<InterviewSession>> GetByUserIdAsync(string userId);
    Task<InterviewSession?> GetActiveSessionAsync(string userId);
    Task<List<InterviewSession>> GetCompletedSessionsAsync(string userId);
}

public class InterviewRepository : IInterviewRepository
{
    private readonly MongoDbContext _context;

    public InterviewRepository(MongoDbContext context)
    {
        _context = context;
    }

    public async Task CreateSessionAsync(InterviewSession session)
    {
        await _context.InterviewSessions.InsertOneAsync(session);
    }

    public async Task<InterviewSession?> GetByIdAsync(string id)
    {
        return await _context.InterviewSessions.Find(x => x.Id == id).FirstOrDefaultAsync();
    }

    public async Task UpdateSessionAsync(InterviewSession session)
    {
        await _context.InterviewSessions.ReplaceOneAsync(x => x.Id == session.Id, session);
    }

    public async Task<List<InterviewSession>> GetByUserIdAsync(string userId)
    {
        return await _context.InterviewSessions
            .Find(x => x.UserId == userId)
            .SortByDescending(x => x.CreatedAt)
            .ToListAsync();
    }

    public async Task<InterviewSession?> GetActiveSessionAsync(string userId)
    {
        return await _context.InterviewSessions
            .Find(x => x.UserId == userId && x.Status == "InProgress")
            .SortByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync();
    }

    public async Task<List<InterviewSession>> GetCompletedSessionsAsync(string userId)
    {
        return await _context.InterviewSessions
            .Find(x => x.UserId == userId && x.Status == "Completed")
            .SortByDescending(x => x.CreatedAt)
            .ToListAsync();
    }
}
