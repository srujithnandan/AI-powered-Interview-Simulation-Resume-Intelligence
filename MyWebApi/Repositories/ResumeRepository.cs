using MongoDB.Driver;
using MyWebApi.Data;
using MyWebApi.Models;

namespace MyWebApi.Repositories;

public interface IResumeRepository
{
    Task CreateAsync(Resume resume);
    Task<List<Resume>> GetByUserIdAsync(string userId);
    Task<Resume?> GetByIdAsync(string id);
}

public class ResumeRepository : IResumeRepository
{
    private readonly MongoDbContext _context;

    public ResumeRepository(MongoDbContext context)
    {
        _context = context;
    }

    public async Task CreateAsync(Resume resume)
    {
        await _context.Resumes.InsertOneAsync(resume);
    }

    public async Task<List<Resume>> GetByUserIdAsync(string userId)
    {
        return await _context.Resumes
            .Find(x => x.UserId == userId)
            .SortByDescending(x => x.CreatedAt)
            .ToListAsync();
    }

    public async Task<Resume?> GetByIdAsync(string id)
    {
        return await _context.Resumes
            .Find(x => x.Id == id)
            .FirstOrDefaultAsync();
    }
}
