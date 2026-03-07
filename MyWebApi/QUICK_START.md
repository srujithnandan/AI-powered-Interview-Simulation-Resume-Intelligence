# Quick Start Guide - Resume Analyzer Service

## Prerequisites
- .NET 8.0 SDK
- MongoDB running locally or connection string
- OpenAI API key (for ATS scoring)

## Setup

### 1. Configure Environment Variables
```bash
# Windows PowerShell
$env:JWT_SECRET="your-super-secret-jwt-key-here-minimum-32-characters"
$env:OPENAI_API_KEY="sk-your-openai-api-key-here"
$env:MONGODB_CONNECTION_STRING="mongodb://localhost:27017"

# Or create appsettings.Development.json
```

### 2. Build and Run
```bash
cd MyWebApi
dotnet restore
dotnet build
dotnet run
```

The API will be available at: `https://localhost:5107` or `http://localhost:5107`

### 3. Access Swagger UI
Open browser: `https://localhost:5107/swagger`

## Testing the Resume Analyzer

### Option 1: Using Swagger UI

1. **Register User**
   - POST `/api/auth/register`
   - Body:
     ```json
     {
       "fullName": "Test User",
       "email": "test@example.com",
       "password": "Test@123"
     }
     ```
   - Copy the returned JWT token

2. **Authorize**
   - Click "Authorize" button in Swagger UI
   - Enter: `Bearer {your-token}`

3. **Upload Resume**
   - POST `/api/resume/upload`
   - Select file: Use `sample_resume.txt` from project root
   - Copy the returned `resumeId`

4. **Get Detailed Analysis**
   - GET `/api/resume/{resumeId}/detailed-analysis`
   - Paste the resumeId from step 3

5. **Analyze Keywords**
   - POST `/api/resume/{resumeId}/keyword-analysis`
   - Body:
     ```json
     {
       "keywords": ["C#", "ASP.NET Core", "Docker", "Kubernetes", "Azure"]
     }
     ```

### Option 2: Using Postman

1. **Import Collection**
   - Import `MyWebApi.postman_collection.json`
   - Import `MyWebApi.postman_environment.json`

2. **Run Collection**
   - Run "Register" or "Login" (token auto-saved)
   - Run "Upload Resume" (select `sample_resume.txt`)
   - Run "Get Detailed Analysis"
   - Run "Analyze Keywords"

### Option 3: Using Curl

```bash
# 1. Register
curl -X POST "http://localhost:5107/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test@example.com",
    "password": "Test@123"
  }'

# Save the returned token
TOKEN="your-jwt-token-here"

# 2. Upload Resume
curl -X POST "http://localhost:5107/api/resume/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@sample_resume.txt"

# Save the returned resumeId
RESUME_ID="your-resume-id-here"

# 3. Get Detailed Analysis
curl -X GET "http://localhost:5107/api/resume/$RESUME_ID/detailed-analysis" \
  -H "Authorization: Bearer $TOKEN"

# 4. Analyze Keywords
curl -X POST "http://localhost:5107/api/resume/$RESUME_ID/keyword-analysis" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["C#", "ASP.NET Core", "Docker", "Kubernetes", "Azure", "Microservices"]
  }'
```

## Expected Results

### Detailed Analysis Response
```json
{
  "wordCount": 600-700,
  "characterCount": ~4000,
  "sectionCount": 5-6,
  "hasActionVerbs": true,
  "actionVerbCount": 15-25,
  "hasQuantifiableAchievements": true,
  "quantifiableAchievementCount": 10-15,
  "experienceLevel": "Senior",
  "contactInfo": {
    "hasEmail": true,
    "hasPhone": true,
    "hasLinkedIn": true,
    "hasGitHub": true,
    "hasLocation": true,
    "isComplete": true,
    "completenessScore": 100
  },
  "formatScore": 90-100,
  "readabilityScore": 85-95,
  "recommendations": []
}
```

### Keyword Analysis Response
```json
{
  "totalWords": 600-700,
  "uniqueWords": 350-400,
  "keywordMatches": {
    "C#": 3-5,
    "ASP.NET Core": 4-6,
    "Docker": 2-3,
    "Kubernetes": 2-3,
    "Azure": 5-8,
    "Microservices": 3-5
  },
  "missingKeywords": [],
  "keywordDensity": 100,
  "topKeywords": {
    "development": 10-15,
    "application": 8-12,
    ...
  }
}
```

## Troubleshooting

### Issue: "OpenAI API key is missing"
**Solution**: Set the environment variable:
```bash
$env:OPENAI_API_KEY="sk-your-api-key"
```

### Issue: "JWT secret is required"
**Solution**: Set the JWT secret:
```bash
$env:JWT_SECRET="your-secret-key-minimum-32-characters-long"
```

### Issue: MongoDB connection failed
**Solution**: 
1. Ensure MongoDB is running: `mongod --version`
2. Check connection string in appsettings.json
3. Or set environment variable:
   ```bash
   $env:MONGODB_CONNECTION_STRING="mongodb://localhost:27017"
   ```

### Issue: File upload returns 400
**Solution**: 
- Ensure file is .pdf, .docx, or .txt
- File size must be under 10 MB
- File must contain text (not just images)

## Sample Test Files

### Test with Different Resume Qualities

**High Quality Resume**:
- Use `sample_resume.txt` (included)
- Expected: High scores, Senior level, minimal recommendations

**Low Quality Resume**:
Create a simple text file with minimal content:
```
John Doe
Email: john@example.com

Work Experience
I worked at company for 2 years.
I did programming.

Education
Computer Science degree
```
Expected: Low scores, many recommendations

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login existing user |
| POST | `/api/resume/upload` | Upload and analyze resume |
| GET | `/api/resume/my` | Get all user's resumes |
| GET | `/api/resume/{id}/detailed-analysis` | Get comprehensive analysis |
| POST | `/api/resume/{id}/keyword-analysis` | Analyze against target keywords |

## Analysis Metrics Explained

### Format Score (0-100)
- **90-100**: Excellent formatting with all best practices
- **70-89**: Good formatting with minor improvements needed
- **50-69**: Fair formatting with several issues
- **< 50**: Poor formatting, major improvements needed

### Experience Level
- **Junior**: 0-2 years, entry-level keywords
- **Mid**: 3-7 years, professional experience
- **Senior**: 8+ years, leadership roles

### Keyword Density
- **80-100%**: Excellent match with target keywords
- **60-79%**: Good match, missing some keywords
- **40-59%**: Fair match, many missing keywords
- **< 40%**: Poor match, significant gaps

## Next Steps

1. **Customize Analysis**:
   - Edit `ResumeAnalyzerService.cs` to add custom criteria
   - Modify scoring weights
   - Add industry-specific keywords

2. **Extend Features**:
   - Add resume comparison
   - Implement role-specific analysis
   - Add more file format support

3. **Deploy to Production**:
   - Set up Azure App Service
   - Configure MongoDB Atlas
   - Set production environment variables
   - Enable HTTPS
   - Configure CORS if needed

## Support Resources

- **Full Documentation**: `RESUME_ANALYZER_README.md`
- **Implementation Details**: `IMPLEMENTATION_SUMMARY.md`
- **Postman Collection**: `MyWebApi.postman_collection.json`
- **Swagger UI**: `https://localhost:5107/swagger`

---

**Quick Test Command** (PowerShell):
```powershell
# Run all in sequence
dotnet run &
Start-Sleep -Seconds 5
curl -X POST "http://localhost:5107/api/auth/register" -H "Content-Type: application/json" -d '{\"fullName\":\"Test\",\"email\":\"test@test.com\",\"password\":\"Test@123\"}'
```

Happy coding! 🚀
