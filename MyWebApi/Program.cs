using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MyWebApi.Data;
using MyWebApi.Extensions;
using MyWebApi.Helpers;
using MyWebApi.Repositories;
using MyWebApi.Services;
using MyWebApi.Settings;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddEnvironmentVariables();

builder.Services.AddMongoDb(builder.Configuration);

var jwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>() ?? new JwtSettings();
jwtSettings.Secret = Environment.GetEnvironmentVariable("JWT_SECRET")
    ?? jwtSettings.Secret;

var openAiSettings = builder.Configuration.GetSection("OpenAI").Get<OpenAISettings>() ?? new OpenAISettings();
openAiSettings.ApiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY")
    ?? openAiSettings.ApiKey;

if (string.IsNullOrWhiteSpace(jwtSettings.Secret))
{
    throw new InvalidOperationException("JWT secret is required. Set JWT_SECRET.");
}

builder.Services.AddSingleton(jwtSettings);
builder.Services.AddSingleton(openAiSettings);

builder.Services.AddSingleton<IJwtHelper, JwtHelper>();
builder.Services.AddSingleton<IPasswordHasher, PasswordHasher>();

builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IResumeRepository, ResumeRepository>();
builder.Services.AddScoped<IInterviewRepository, InterviewRepository>();

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IResumeService, ResumeService>();
builder.Services.AddScoped<IResumeAnalyzerService, ResumeAnalyzerService>();
builder.Services.AddScoped<IInterviewService, InterviewService>();
builder.Services.AddScoped<IInterviewSimulatorService, InterviewSimulatorService>();
builder.Services.AddScoped<IInterviewReadinessService, InterviewReadinessService>();

builder.Services.AddHttpClient<IOpenAIService, OpenAIService>(client =>
{
    client.BaseAddress = new Uri(openAiSettings.BaseUrl);
    client.Timeout = TimeSpan.FromSeconds(60);
});

var jwtKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret));

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = jwtKey,
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "AI Interview Simulator and Resume Analyzer API",
        Version = "v1"
    });

    var jwtSecurityScheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter JWT Bearer token",
        Reference = new OpenApiReference
        {
            Id = JwtBearerDefaults.AuthenticationScheme,
            Type = ReferenceType.SecurityScheme
        }
    };

    options.AddSecurityDefinition(jwtSecurityScheme.Reference.Id, jwtSecurityScheme);
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        { jwtSecurityScheme, Array.Empty<string>() }
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var mongoDbContext = scope.ServiceProvider.GetRequiredService<MongoDbContext>();
    await MongoDbIndexesInitializer.InitializeAsync(mongoDbContext);
}

app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
