using Microsoft.Extensions.Options;
using MongoDB.Driver;
using MyWebApi.Data;
using MyWebApi.Settings;

namespace MyWebApi.Extensions;

public static class MongoDbServiceCollectionExtensions
{
    public static IServiceCollection AddMongoDb(this IServiceCollection services, IConfiguration configuration)
    {
        var mongoSettings = configuration.GetSection("MongoDb").Get<MongoDbSettings>() ?? new MongoDbSettings();
        mongoSettings.ConnectionString = Environment.GetEnvironmentVariable("MONGODB_CONNECTION_STRING")
            ?? mongoSettings.ConnectionString;

        if (string.IsNullOrWhiteSpace(mongoSettings.ConnectionString))
        {
            throw new InvalidOperationException("MongoDB connection string is required. Set MONGODB_CONNECTION_STRING.");
        }

        if (string.IsNullOrWhiteSpace(mongoSettings.DatabaseName))
        {
            throw new InvalidOperationException("MongoDB database name is required.");
        }

        services.AddSingleton(Options.Create(mongoSettings));
        services.AddSingleton(sp => sp.GetRequiredService<IOptions<MongoDbSettings>>().Value);
        services.AddSingleton<IMongoClient>(_ => new MongoClient(mongoSettings.ConnectionString));
        services.AddSingleton<MongoDbContext>();

        return services;
    }
}
