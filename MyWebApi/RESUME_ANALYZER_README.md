# Resume Analyzer Service



A comprehensive resume analysis service that provides detailed insights into resume quality, format, keyword optimization, and content effectiveness.

## Features

### 1. **Detailed Resume Analysis**
Provides comprehensive analysis of resume content including:
- **Word Count & Character Count**: Overall resume length metrics
- **Section Detection**: Identifies key sections (Experience, Education, Skills, etc.)
- **Action Verb Analysis**: Detects and counts strong action verbs
- **Quantifiable Achievements**: Identifies metrics and measurable results
- **Experience Level Detection**: Classifies as Junior, Mid, or Senior level
- **Contact Information Validation**: Verifies presence of email, phone, LinkedIn, GitHub, location
- **Format Score**: Overall formatting quality (0-100)
- **Readability Score**: Sentence structure and readability assessment
- **Personalized Recommendations**: Actionable suggestions for improvement

### 2. **Keyword Analysis**
Analyzes resume against target keywords for job applications:
- **Total & Unique Word Count**: Vocabulary diversity metrics
- **Keyword Matches**: Found keywords with frequency counts
- **Missing Keywords**: Important keywords not found in resume
- **Keyword Density**: Percentage of target keywords present
- **Top Keywords**: Most frequently used words in resume

### 3. **Format Analysis**
Evaluates resume structure and formatting:
- **Line Count & Average Line Length**: Document structure metrics
- **Bullet Point Detection**: Identifies and counts bullet points
- **Section Count**: Number of distinct sections
- **Length Category**: Classifies as Too Short, Optimal, Good, Long, or Too Long
- **Format Issues**: Specific formatting problems identified
- **Structure Validation**: Checks for proper resume structure

### 4. **Contact Information Validation**
Ensures completeness of contact information:
- Email presence
- Phone number presence
- LinkedIn profile
- GitHub profile
- Location information
- Completeness score (0-100)

## API Endpoints

### 1. Upload and Analyze Resume
```http
POST /api/resume/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

Form Data:
- file: [resume file - .pdf, .docx, or .txt]
```

**Response:**
```json
{
  "resumeId": "string",
  "fileName": "string",
  "atsScore": 85,
  "missingSkills": ["Docker", "Kubernetes"],
  "strengthAreas": ["JavaScript", "React", "Node.js"],
  "improvementSuggestions": [
    "Add metrics to quantify achievements",
    "Include cloud computing experience"
  ],
  "createdAt": "2026-03-07T10:30:00Z"
}
```

### 2. Get My Resumes
```http
GET /api/resume/my
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "resumeId": "string",
    "fileName": "john_doe_resume.pdf",
    "atsScore": 85,
    "createdAt": "2026-03-07T10:30:00Z"
  }
]
```

### 3. Get Detailed Analysis
```http
GET /api/resume/{resumeId}/detailed-analysis
Authorization: Bearer {token}
```

**Response:**
```json
{
  "wordCount": 450,
  "characterCount": 2890,
  "sectionCount": 4,
  "hasActionVerbs": true,
  "actionVerbCount": 15,
  "hasQuantifiableAchievements": true,
  "quantifiableAchievementCount": 8,
  "experienceLevel": "Mid",
  "contactInfo": {
    "hasEmail": true,
    "hasPhone": true,
    "hasLinkedIn": true,
    "hasGitHub": true,
    "hasLocation": true,
    "missingContactInfo": [],
    "isComplete": true,
    "completenessScore": 100
  },
  "formatScore": 85,
  "readabilityScore": 92.5,
  "recommendations": [
    "Add more quantifiable achievements with percentages",
    "Include more strong action verbs"
  ]
}
```

### 4. Analyze Keywords
```http
POST /api/resume/{resumeId}/keyword-analysis
Authorization: Bearer {token}
Content-Type: application/json

{
  "keywords": ["JavaScript", "React", "Node.js", "Docker", "AWS"]
}
```

**Response:**
```json
{
  "totalWords": 450,
  "uniqueWords": 285,
  "keywordMatches": {
    "JavaScript": 5,
    "React": 8,
    "Node.js": 4,
    "AWS": 2
  },
  "missingKeywords": ["Docker"],
  "keywordDensity": 80.0,
  "topKeywords": {
    "development": 12,
    "application": 10,
    "frontend": 9,
    "backend": 7,
    "project": 6
  }
}
```

## Usage Example

### 1. Upload and Analyze
```bash
curl -X POST "https://api.example.com/api/resume/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@resume.pdf"
```

### 2. Get Detailed Analysis
```bash
curl -X GET "https://api.example.com/api/resume/RESUME_ID/detailed-analysis" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Analyze Keywords
```bash
curl -X POST "https://api.example.com/api/resume/RESUME_ID/keyword-analysis" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["JavaScript", "React", "Docker", "Kubernetes"]
  }'
```

## Analysis Components

### Experience Level Detection
The service automatically detects experience level based on:
- **Junior**: 0-2 years, internships, entry-level keywords
- **Mid**: 3-7 years, professional keywords, developed/implemented actions
- **Senior**: 8+ years, leadership keywords (architect, lead, manager, director)

### Format Scoring (0-100)
- **20 points**: Bullet points present
- **20 points**: 3+ sections identified
- **20 points**: Strong action verbs used
- **20 points**: Quantifiable achievements included
- **20 points**: Appropriate length (300-1000 words)

### Contact Info Completeness (0-100)
- **25 points**: Email address
- **25 points**: Phone number
- **15 points**: LinkedIn profile
- **15 points**: GitHub profile
- **20 points**: Location information

## Best Practices

### Resume Length
- **Too Short**: < 300 words
- **Optimal**: 300-599 words
- **Good**: 600-999 words
- **Long**: 1000-1499 words
- **Too Long**: 1500+ words

### Action Verbs
Use strong action verbs like: achieved, accomplished, designed, developed, implemented, led, managed, created, improved, increased, reduced, launched, established, built, delivered, optimized, coordinated, executed, initiated, resolved, streamlined, transformed.

### Quantifiable Achievements
Include metrics such as:
- Percentages (increased sales by 25%)
- Dollar amounts ($500K revenue)
- Time savings (reduced processing time by 2 hours)
- User/customer numbers (supported 10,000+ users)
- Team size (led team of 5 developers)

## Error Handling

All endpoints return appropriate HTTP status codes:
- **200**: Success
- **400**: Bad request (invalid input)
- **401**: Unauthorized (missing or invalid token)
- **403**: Forbidden (accessing another user's resume)
- **404**: Not found (resume doesn't exist)

## Service Architecture

```
ResumeService
├── OpenAIService (AI-powered analysis)
│   ├── ATS Score calculation
│   ├── Missing skills detection
│   ├── Strength areas identification
│   └── Improvement suggestions
│
└── ResumeAnalyzerService (Content analysis)
    ├── Keyword analysis
    ├── Format validation
    ├── Experience level detection
    ├── Contact info validation
    └── Readability scoring
```

## Integration

The analyzer service is automatically integrated into the resume upload flow:
1. User uploads resume file
2. Text extraction (PDF/DOCX/TXT)
3. AI analysis (OpenAI) for ATS scoring
4. Content analysis (ResumeAnalyzerService) for format and structure
5. Storage in MongoDB
6. Results returned to user

Additional analysis can be requested on-demand:
- Detailed analysis endpoint
- Custom keyword analysis
- Format-specific analysis

## Performance

- Text extraction: < 2 seconds
- AI analysis: 3-5 seconds
- Content analysis: < 1 second
- Total processing time: 5-8 seconds

## Supported File Formats

- **PDF**: Full text extraction using PdfPig
- **DOCX**: Text extraction using OpenXML
- **TXT**: Plain text reading

Maximum file size: 10 MB
