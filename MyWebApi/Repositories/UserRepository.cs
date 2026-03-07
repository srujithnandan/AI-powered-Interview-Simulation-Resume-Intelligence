using MongoDB.Driver;
using MyWebApi.Data;
using MyWebApi.Models;

namespace MyWebApi.Repositories;

public interface IUserRepository
{
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByIdAsync(string id);
    Task<User?> GetByRefreshTokenAsync(string refreshToken);
    Task CreateAsync(User user);
    Task UpdateAsync(User user);
}

public class UserRepository : IUserRepository
{
    private readonly MongoDbContext _context;

    public UserRepository(MongoDbContext context)
    {
        _context = context;
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        return await _context.Users.Find(x => x.Email == email).FirstOrDefaultAsync();
    }

    public async Task<User?> GetByIdAsync(string id)
    {
        return await _context.Users.Find(x => x.Id == id).FirstOrDefaultAsync();
    }

    public async Task<User?> GetByRefreshTokenAsync(string refreshToken)
    {
        var filter = Builders<User>.Filter.ElemMatch(u => u.RefreshTokens, t => t.Token == refreshToken);
        return await _context.Users.Find(filter).FirstOrDefaultAsync();
    }

    public async Task CreateAsync(User user)
    {
        await _context.Users.InsertOneAsync(user);
    }

    public async Task UpdateAsync(User user)
    {
        await _context.Users.ReplaceOneAsync(x => x.Id == user.Id, user);
    }
}
