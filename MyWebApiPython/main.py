import os
import re
import json
import math
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import httpx
from bson import ObjectId
from docx import Document
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field
from pypdf import PdfReader
from pymongo import DESCENDING, MongoClient
from pymongo.errors import OperationFailure

load_dotenv()


# ---------- Configuration ----------
MONGODB_CONNECTION_STRING = os.getenv("MONGODB_CONNECTION_STRING", "")
MONGODB_DATABASE_NAME = os.getenv("MONGODB_DATABASE_NAME", "AiInterviewDb")
JWT_SECRET = os.getenv("JWT_SECRET", "")
JWT_ISSUER = os.getenv("JWT_ISSUER", "AIInterviewSimulator")
JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "AIInterviewSimulatorUsers")
JWT_EXPIRY_MINUTES = int(os.getenv("JWT_EXPIRY_MINUTES", "120"))
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1/")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

MAX_FAILED_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 15
REFRESH_TOKEN_EXPIRY_DAYS = 7

if not MONGODB_CONNECTION_STRING:
    raise RuntimeError("MONGODB_CONNECTION_STRING is required")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is required")

client = MongoClient(MONGODB_CONNECTION_STRING)
db = client[MONGODB_DATABASE_NAME]
users_col = db["Users"]
resumes_col = db["Resumes"]
sessions_col = db["InterviewSessions"]

def safe_create_index(collection, keys, **kwargs):
    try:
        collection.create_index(keys, **kwargs)
    except OperationFailure as ex:
        # Accept existing equivalent indexes that use different names/options in the same DB.
        if getattr(ex, "code", None) != 85:
            raise


safe_create_index(users_col, "email", unique=True)
safe_create_index(users_col, "refreshTokens.token")
safe_create_index(resumes_col, [("userId", DESCENDING), ("createdAt", DESCENDING)])
safe_create_index(sessions_col, [("userId", DESCENDING), ("createdAt", DESCENDING)])

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

app = FastAPI(title="AI Interview Simulator and Resume Analyzer API (Python)", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Helpers ----------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def oid_str(value: Any) -> str:
    if isinstance(value, ObjectId):
        return str(value)
    return str(value)


def to_public_user(doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": oid_str(doc.get("_id")),
        "fullName": doc.get("fullName", ""),
        "email": doc.get("email", ""),
        "role": doc.get("role", "User"),
        "lastLoginAt": doc.get("lastLoginAt"),
        "createdAt": doc.get("createdAt"),
    }


def create_access_token(user: dict[str, Any]) -> tuple[str, datetime]:
    exp = now_utc() + timedelta(minutes=JWT_EXPIRY_MINUTES)
    payload = {
        "sub": oid_str(user["_id"]),
        "name": user.get("fullName", ""),
        "email": user.get("email", ""),
        "role": user.get("role", "User"),
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "exp": exp,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256"), exp


def generate_refresh_token() -> dict[str, Any]:
    return {
        "token": secrets.token_urlsafe(48),
        "expiresAt": now_utc() + timedelta(days=REFRESH_TOKEN_EXPIRY_DAYS),
        "createdAt": now_utc(),
        "revokedAt": None,
        "replacedByToken": None,
    }


def is_refresh_token_active(token: dict[str, Any]) -> bool:
    return token.get("revokedAt") is None and token.get("expiresAt") > now_utc()


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_password(value: str) -> str:
    return pwd_context.hash(value)


def decode_bearer_token(authorization: Optional[str]) -> dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"], audience=JWT_AUDIENCE, issuer=JWT_ISSUER)
        return payload
    except JWTError as ex:
        raise HTTPException(status_code=401, detail="Invalid token") from ex


def get_current_user(authorization: Optional[str] = Header(default=None)) -> dict[str, Any]:
    payload = decode_bearer_token(authorization)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = users_col.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def normalize_email(email: str) -> str:
    return email.strip().lower()


def parse_json_from_llm(text: str) -> dict[str, Any]:
    value = text.strip()
    if value.startswith("```"):
        first = value.find("{")
        last = value.rfind("}")
        if first >= 0 and last > first:
            value = value[first:last + 1]
    return json.loads(value)


async def openai_chat(system_prompt: str, user_prompt: str) -> str:
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is missing")

    async with httpx.AsyncClient(timeout=60.0, base_url=OPENAI_BASE_URL) as ac:
        resp = await ac.post(
            "chat/completions",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
            json={
                "model": OPENAI_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.2,
            },
        )
    if resp.status_code >= 400:
        raise HTTPException(status_code=500, detail=f"OpenAI call failed: {resp.text}")
    payload = resp.json()
    return payload["choices"][0]["message"]["content"]


async def try_openai_chat(system_prompt: str, user_prompt: str) -> Optional[str]:
    if not OPENAI_API_KEY:
        return None
    try:
        return await openai_chat(system_prompt, user_prompt)
    except Exception:
        return None


def extract_text(file_name: str, content: bytes) -> str:
    ext = os.path.splitext(file_name)[1].lower()
    if ext == ".txt":
        return content.decode("utf-8", errors="ignore")
    if ext == ".pdf":
        from io import BytesIO

        reader = PdfReader(BytesIO(content))
        return "\n".join([p.extract_text() or "" for p in reader.pages]).strip()
    if ext == ".docx":
        from io import BytesIO

        doc = Document(BytesIO(content))
        return "\n".join([p.text for p in doc.paragraphs]).strip()
    raise HTTPException(status_code=400, detail="Unsupported file type. Allowed: .pdf, .docx, .txt")


# ---------- DTOs ----------
class RegisterRequest(BaseModel):
    fullName: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    refreshToken: str


class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str = Field(min_length=6)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    email: EmailStr
    newPassword: str = Field(min_length=6)


class UpdateProfileRequest(BaseModel):
    fullName: str


class InterviewAnswerRequest(BaseModel):
    sessionId: str
    question: str
    answer: str


class StartSessionRequest(BaseModel):
    role: str
    questionCount: int = 5
    difficulty: str = "Medium"
    category: str = "Mixed"
    timeLimitMinutes: Optional[int] = None


class SubmitAnswerRequest(BaseModel):
    sessionId: str
    answer: str


class KeywordAnalysisRequest(BaseModel):
    keywords: list[str] = []


# ---------- Auth Endpoints ----------
@app.post("/api/auth/register")
async def register(request: RegisterRequest):
    email = normalize_email(request.email)
    existing = users_col.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="User with this email already exists.")

    refresh = generate_refresh_token()
    user = {
        "fullName": request.fullName.strip(),
        "email": email,
        "passwordHash": hash_password(request.password),
        "role": "User",
        "isActive": True,
        "failedLoginAttempts": 0,
        "lockoutEnd": None,
        "lastLoginAt": now_utc(),
        "passwordChangedAt": None,
        "passwordResetToken": None,
        "passwordResetTokenExpiry": None,
        "refreshTokens": [refresh],
        "createdAt": now_utc(),
        "updatedAt": None,
    }

    result = users_col.insert_one(user)
    user["_id"] = result.inserted_id
    token, exp = create_access_token(user)

    return {
        "message": "Registration successful",
        "token": token,
        "refreshToken": refresh["token"],
        "tokenExpiry": exp,
        "fullName": user["fullName"],
        "email": user["email"],
        "role": user["role"],
    }


@app.post("/api/auth/login")
async def login(request: LoginRequest):
    email = normalize_email(request.email)
    user = users_col.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.get("isActive", True):
        raise HTTPException(status_code=400, detail="Account is deactivated. Contact support.")

    lockout = user.get("lockoutEnd")
    if lockout and lockout > now_utc():
        remaining = math.ceil((lockout - now_utc()).total_seconds() / 60)
        raise HTTPException(status_code=400, detail=f"Account is locked. Try again in {remaining} minute(s).")

    if not verify_password(request.password, user["passwordHash"]):
        failed = int(user.get("failedLoginAttempts", 0)) + 1
        updates: dict[str, Any] = {"failedLoginAttempts": failed}
        if failed >= MAX_FAILED_LOGIN_ATTEMPTS:
            updates["lockoutEnd"] = now_utc() + timedelta(minutes=LOCKOUT_MINUTES)
            updates["failedLoginAttempts"] = 0
        users_col.update_one({"_id": user["_id"]}, {"$set": updates})
        raise HTTPException(status_code=401, detail="Invalid credentials")

    refresh_tokens = user.get("refreshTokens", [])
    cutoff = now_utc() - timedelta(days=REFRESH_TOKEN_EXPIRY_DAYS)
    refresh_tokens = [t for t in refresh_tokens if (t.get("revokedAt") is None) or (t.get("createdAt", now_utc()) > cutoff)]

    refresh = generate_refresh_token()
    refresh_tokens.append(refresh)

    users_col.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "failedLoginAttempts": 0,
                "lockoutEnd": None,
                "lastLoginAt": now_utc(),
                "refreshTokens": refresh_tokens,
            }
        },
    )

    user = users_col.find_one({"_id": user["_id"]})
    token, exp = create_access_token(user)

    return {
        "message": "Login successful",
        "token": token,
        "refreshToken": refresh["token"],
        "tokenExpiry": exp,
        "fullName": user["fullName"],
        "email": user["email"],
        "role": user["role"],
    }


@app.post("/api/auth/refresh-token")
async def refresh_token(request: RefreshTokenRequest):
    user = users_col.find_one({"refreshTokens.token": request.refreshToken})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    tokens = user.get("refreshTokens", [])
    existing = next((t for t in tokens if t.get("token") == request.refreshToken), None)
    if not existing or not is_refresh_token_active(existing):
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    existing["revokedAt"] = now_utc()
    new_refresh = generate_refresh_token()
    existing["replacedByToken"] = new_refresh["token"]
    tokens.append(new_refresh)

    users_col.update_one({"_id": user["_id"]}, {"$set": {"refreshTokens": tokens}})
    user = users_col.find_one({"_id": user["_id"]})
    token, exp = create_access_token(user)

    return {
        "message": "Token refreshed",
        "token": token,
        "refreshToken": new_refresh["token"],
        "tokenExpiry": exp,
        "fullName": user["fullName"],
        "email": user["email"],
        "role": user["role"],
    }


@app.post("/api/auth/logout")
async def logout(request: RefreshTokenRequest, user: dict[str, Any] = Depends(get_current_user)):
    tokens = user.get("refreshTokens", [])
    found = False
    for token in tokens:
        if token.get("token") == request.refreshToken and is_refresh_token_active(token):
            token["revokedAt"] = now_utc()
            found = True
            break
    if not found:
        raise HTTPException(status_code=400, detail="Invalid or already revoked token.")
    users_col.update_one({"_id": user["_id"]}, {"$set": {"refreshTokens": tokens}})
    return {"message": "Logged out successfully"}


@app.post("/api/auth/logout-all")
async def logout_all(user: dict[str, Any] = Depends(get_current_user)):
    tokens = user.get("refreshTokens", [])
    for token in tokens:
        if is_refresh_token_active(token):
            token["revokedAt"] = now_utc()
    users_col.update_one({"_id": user["_id"]}, {"$set": {"refreshTokens": tokens}})
    return {"message": "All sessions revoked successfully"}


@app.post("/api/auth/change-password")
async def change_password(request: ChangePasswordRequest, user: dict[str, Any] = Depends(get_current_user)):
    if not verify_password(request.currentPassword, user["passwordHash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    if request.currentPassword == request.newPassword:
        raise HTTPException(status_code=400, detail="New password must be different from the current password.")

    tokens = user.get("refreshTokens", [])
    for token in tokens:
        if is_refresh_token_active(token):
            token["revokedAt"] = now_utc()

    users_col.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "passwordHash": hash_password(request.newPassword),
                "passwordChangedAt": now_utc(),
                "updatedAt": now_utc(),
                "refreshTokens": tokens,
            }
        },
    )
    return {"message": "Password changed successfully. Please log in again."}


@app.post("/api/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    email = normalize_email(request.email)
    user = users_col.find_one({"email": email})
    reset_token = None
    if user:
        reset_token = secrets.token_hex(32)
        users_col.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "passwordResetToken": reset_token,
                    "passwordResetTokenExpiry": now_utc() + timedelta(hours=1),
                    "updatedAt": now_utc(),
                }
            },
        )
    return {
        "message": "If an account with that email exists, a password reset link has been sent.",
        "resetToken": reset_token,
    }


@app.post("/api/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    email = normalize_email(request.email)
    user = users_col.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid reset request.")

    if (
        user.get("passwordResetToken") != request.token
        or user.get("passwordResetTokenExpiry") is None
        or user.get("passwordResetTokenExpiry") < now_utc()
    ):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")

    tokens = user.get("refreshTokens", [])
    for token in tokens:
        if is_refresh_token_active(token):
            token["revokedAt"] = now_utc()

    users_col.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "passwordHash": hash_password(request.newPassword),
                "passwordResetToken": None,
                "passwordResetTokenExpiry": None,
                "passwordChangedAt": now_utc(),
                "updatedAt": now_utc(),
                "failedLoginAttempts": 0,
                "lockoutEnd": None,
                "refreshTokens": tokens,
            }
        },
    )

    return {"message": "Password has been reset successfully."}


@app.get("/api/auth/profile")
async def get_profile(user: dict[str, Any] = Depends(get_current_user)):
    return {
        "userId": oid_str(user["_id"]),
        "fullName": user.get("fullName", ""),
        "email": user.get("email", ""),
        "role": user.get("role", "User"),
        "lastLoginAt": user.get("lastLoginAt"),
        "createdAt": user.get("createdAt"),
    }


@app.put("/api/auth/profile")
async def update_profile(request: UpdateProfileRequest, user: dict[str, Any] = Depends(get_current_user)):
    users_col.update_one(
        {"_id": user["_id"]},
        {"$set": {"fullName": request.fullName.strip(), "updatedAt": now_utc()}},
    )
    updated = users_col.find_one({"_id": user["_id"]})
    return {
        "userId": oid_str(updated["_id"]),
        "fullName": updated.get("fullName", ""),
        "email": updated.get("email", ""),
        "role": updated.get("role", "User"),
        "lastLoginAt": updated.get("lastLoginAt"),
        "createdAt": updated.get("createdAt"),
    }


@app.get("/api/auth/me")
async def me(user: dict[str, Any] = Depends(get_current_user)):
    return {
        "userId": oid_str(user["_id"]),
        "fullName": user.get("fullName", ""),
        "email": user.get("email", ""),
        "role": user.get("role", "User"),
    }


# ---------- Resume Analysis Helpers ----------
ACTION_VERBS = {
    "achieved", "accomplished", "designed", "developed", "implemented", "led", "managed", "created",
    "improved", "increased", "reduced", "launched", "established", "built", "delivered", "optimized",
    "coordinated", "executed", "initiated", "resolved", "streamlined", "transformed", "drove",
    "spearheaded", "pioneered",
}

SENIOR_KWS = {
    "architect", "lead", "senior", "principal", "director", "manager", "head of", "vp", "chief", "strategy",
    "mentored", "managed team", "leadership",
}

MID_KWS = {
    "developed", "designed", "implemented", "collaborated", "contributed", "years of experience", "professional",
    "specialist",
}


def detect_sections(text: str) -> int:
    keys = ["summary", "objective", "experience", "education", "skills", "projects", "certifications", "achievements"]
    lines = [l.strip().lower() for l in text.splitlines() if l.strip()]
    return sum(1 for line in lines if any(line.startswith(k) or f"{k}:" in line for k in keys))


def count_words(text: str) -> int:
    return len([w for w in re.split(r"\s+", text) if w])


def has_bullets(text: str) -> bool:
    return re.search(r"^\s*[•\-\*◦▪]", text, flags=re.MULTILINE) is not None


def count_bullets(text: str) -> int:
    return len(re.findall(r"^\s*[•\-\*◦▪]", text, flags=re.MULTILINE))


def has_quantifiable_metrics(text: str) -> bool:
    patterns = [r"\d+%", r"\$[\d,]+", r"\d+[kmb]", r"\d+\s*(users?|customers?|clients?|team|people)"]
    return any(re.search(p, text, flags=re.IGNORECASE) for p in patterns)


def count_quantifiable_metrics(text: str) -> int:
    patterns = [r"\d+%", r"\$[\d,]+", r"\d+[kmb]"]
    return sum(len(re.findall(p, text, flags=re.IGNORECASE)) for p in patterns)


def detect_experience_level(text: str) -> str:
    lower = text.lower()
    years_match = re.search(r"(\d+)\+?\s*years?\s*(of)?\s*experience", lower)
    years = int(years_match.group(1)) if years_match else 0
    senior_score = sum(1 for k in SENIOR_KWS if k in lower)
    mid_score = sum(1 for k in MID_KWS if k in lower)

    if senior_score >= 3 or years >= 8:
        return "Senior"
    if mid_score >= 2 or years >= 3:
        return "Mid"
    if any(k in lower for k in ["internship", "graduate", "entry"]) or years < 2:
        return "Junior"
    return "Unknown"


def validate_contact_info(text: str) -> dict[str, Any]:
    has_email = re.search(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b", text) is not None
    has_phone = re.search(r"(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}", text) is not None
    has_linkedin = re.search(r"linkedin\.com/in/[\w-]+", text, flags=re.IGNORECASE) is not None
    has_github = re.search(r"github\.com/[\w-]+", text, flags=re.IGNORECASE) is not None
    has_location = any(
        re.search(p, text)
        for p in [r"\b[A-Z][a-z]+,\s*[A-Z]{2}\b", r"\b[A-Z][a-z]+\s+[A-Z][a-z]+,\s*[A-Z]{2}\b", r"\b\d{5}(-\d{4})?\b"]
    )
    return {
        "hasEmail": has_email,
        "hasPhone": has_phone,
        "hasLinkedIn": has_linkedin,
        "hasGitHub": has_github,
        "hasLocation": bool(has_location),
        "missingContactInfo": [],
    }


def top_keywords(words: list[str], count: int) -> dict[str, int]:
    stop_words = {
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "from",
        "as", "is", "was", "are", "were", "be", "have", "has", "had", "this", "that", "these", "those",
    }
    freq: dict[str, int] = {}
    for w in words:
        if len(w) <= 3 or w in stop_words:
            continue
        freq[w] = freq.get(w, 0) + 1
    pairs = sorted(freq.items(), key=lambda x: x[1], reverse=True)[:count]
    return {k: v for k, v in pairs}


def resume_detailed_analysis(resume_text: str) -> dict[str, Any]:
    words = count_words(resume_text)
    action_verb_count = sum(1 for v in ACTION_VERBS if re.search(rf"\b{re.escape(v)}\b", resume_text.lower()))

    sentence_parts = [s.strip() for s in re.split(r"[.!?]+", resume_text) if s.strip()]
    avg_words_sentence = (words / len(sentence_parts)) if sentence_parts else 0
    if 15 <= avg_words_sentence <= 20:
        readability = 100.0
    elif avg_words_sentence < 15:
        readability = max(0.0, 100.0 - (15 - avg_words_sentence) * 5)
    else:
        readability = max(0.0, 100.0 - (avg_words_sentence - 20) * 3)

    format_score = 0
    if has_bullets(resume_text):
        format_score += 20
    if detect_sections(resume_text) >= 3:
        format_score += 20
    if action_verb_count > 0:
        format_score += 20
    if has_quantifiable_metrics(resume_text):
        format_score += 20
    if 300 <= words <= 1000:
        format_score += 20

    recommendations: list[str] = []
    if action_verb_count == 0:
        recommendations.append("Add strong action verbs to describe your accomplishments.")
    if not has_quantifiable_metrics(resume_text):
        recommendations.append("Include quantifiable achievements with percentages, numbers, or metrics.")
    if not has_bullets(resume_text):
        recommendations.append("Use bullet points to make your experience easier to scan.")
    if words < 300:
        recommendations.append("Resume is too short. Add more details about experience and skills.")
    if words > 1000:
        recommendations.append("Resume is too long. Focus on the most relevant experience.")

    return {
        "wordCount": words,
        "characterCount": len(resume_text),
        "sectionCount": detect_sections(resume_text),
        "hasActionVerbs": action_verb_count > 0,
        "actionVerbCount": action_verb_count,
        "hasQuantifiableAchievements": has_quantifiable_metrics(resume_text),
        "quantifiableAchievementCount": count_quantifiable_metrics(resume_text),
        "experienceLevel": detect_experience_level(resume_text),
        "contactInfo": validate_contact_info(resume_text),
        "formatScore": min(format_score, 100),
        "readabilityScore": round(readability, 2),
        "recommendations": recommendations,
    }


def resume_keyword_analysis(resume_text: str, target_keywords: list[str]) -> dict[str, Any]:
    lower_text = resume_text.lower()
    words = [w for w in re.split(r"\W+", lower_text) if w]

    keyword_matches: dict[str, int] = {}
    missing: list[str] = []
    for kw in target_keywords:
        count = len(re.findall(rf"\b{re.escape(kw.lower())}\b", lower_text))
        if count > 0:
            keyword_matches[kw] = count
        else:
            missing.append(kw)

    density = (len(keyword_matches) / len(target_keywords) * 100) if target_keywords else 0

    return {
        "totalWords": len(words),
        "uniqueWords": len(set(words)),
        "keywordMatches": keyword_matches,
        "missingKeywords": missing,
        "keywordDensity": round(density, 2),
        "topKeywords": top_keywords(words, 10),
    }


# ---------- Resume Endpoints ----------
@app.post("/api/resume/upload")
async def upload_resume(file: UploadFile = File(...), user: dict[str, Any] = Depends(get_current_user)):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in [".pdf", ".docx", ".txt"]:
        raise HTTPException(status_code=400, detail="Unsupported file type. Allowed: .pdf, .docx, .txt")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10 MB limit.")

    extracted = extract_text(file.filename or "resume.txt", content)
    if not extracted.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from the uploaded resume.")

    prompt = (
        "Analyze this resume and respond with strict JSON only:\n"
        "{\n"
        '  "atsScore": 0,\n'
        '  "missingSkills": [""],\n'
        '  "strengthAreas": [""],\n'
        '  "improvementSuggestions": [""]\n'
        "}\n\n"
        f"Resume:\n{extracted}"
    )
    content_resp = await try_openai_chat("You are an expert ATS and technical recruiter.", prompt)
    if content_resp:
        parsed = parse_json_from_llm(content_resp)
    else:
        # Fallback heuristic when AI key is absent/unavailable.
        details = resume_detailed_analysis(extracted)
        ats = int(
            _clamp(
                0.35 * details["formatScore"]
                + 0.25 * details["readabilityScore"]
                + 0.20 * min(details["actionVerbCount"] * 5, 100)
                + 0.20 * min(details["quantifiableAchievementCount"] * 8, 100),
                0,
                100,
            )
        )
        parsed = {
            "atsScore": ats,
            "missingSkills": [],
            "strengthAreas": [
                "Resume structure analyzed successfully",
                f"Detected experience level: {details.get('experienceLevel', 'Unknown')}",
            ],
            "improvementSuggestions": details.get("recommendations", [])[:5],
        }

    resume_doc = {
        "userId": oid_str(user["_id"]),
        "fileName": file.filename,
        "extractedText": extracted,
        "atsScore": int(parsed.get("atsScore", 0)),
        "missingSkills": parsed.get("missingSkills", []),
        "strengthAreas": parsed.get("strengthAreas", []),
        "improvementSuggestions": parsed.get("improvementSuggestions", []),
        "createdAt": now_utc(),
    }
    ins = resumes_col.insert_one(resume_doc)

    return {
        "resumeId": oid_str(ins.inserted_id),
        "fileName": resume_doc["fileName"],
        "atsScore": resume_doc["atsScore"],
        "missingSkills": resume_doc["missingSkills"],
        "strengthAreas": resume_doc["strengthAreas"],
        "improvementSuggestions": resume_doc["improvementSuggestions"],
        "createdAt": resume_doc["createdAt"],
    }


@app.get("/api/resume/my")
async def my_resumes(user: dict[str, Any] = Depends(get_current_user)):
    docs = list(resumes_col.find({"userId": oid_str(user["_id"])}).sort("createdAt", DESCENDING))
    return [
        {
            "resumeId": oid_str(d["_id"]),
            "fileName": d.get("fileName", ""),
            "atsScore": d.get("atsScore", 0),
            "createdAt": d.get("createdAt"),
        }
        for d in docs
    ]


@app.get("/api/resume/{resume_id}/detailed-analysis")
async def detailed_analysis(resume_id: str, user: dict[str, Any] = Depends(get_current_user)):
    doc = resumes_col.find_one({"_id": ObjectId(resume_id)})
    if not doc:
        raise HTTPException(status_code=404, detail=f"Resume with ID {resume_id} not found.")
    if doc.get("userId") != oid_str(user["_id"]):
        raise HTTPException(status_code=403, detail="You do not have permission to access this resume.")
    return resume_detailed_analysis(doc.get("extractedText", ""))


@app.post("/api/resume/{resume_id}/keyword-analysis")
async def keyword_analysis(resume_id: str, request: KeywordAnalysisRequest, user: dict[str, Any] = Depends(get_current_user)):
    doc = resumes_col.find_one({"_id": ObjectId(resume_id)})
    if not doc:
        raise HTTPException(status_code=404, detail=f"Resume with ID {resume_id} not found.")
    if doc.get("userId") != oid_str(user["_id"]):
        raise HTTPException(status_code=403, detail="You do not have permission to access this resume.")
    return resume_keyword_analysis(doc.get("extractedText", ""), request.keywords)


# ---------- Interview Helpers ----------
async def generate_questions(role: str, count: int, difficulty: str = "Medium", category: str = "Mixed") -> list[str]:
    category_instruction = (
        f" Focus on {category} questions."
        if category != "Mixed"
        else " Include a mix of technical, behavioral, and system design questions."
    )

    prompt = (
        f"Generate {count} {difficulty}-level technical interview questions for the following role:\n\n"
        f"Role: {role}\n\n"
        "Rules:\n"
        "- Focus on practical software engineering knowledge.\n"
        "- Avoid trivial textbook definitions.\n"
        "- Questions should encourage explanation and reasoning.\n"
        f"{category_instruction}\n\n"
        "Return strict JSON only in this format:\n"
        "{\n"
        '  "questions": ["Question 1", "Question 2"]\n'
        "}"
    )
    content = await try_openai_chat("You are a senior technical interviewer.", prompt)
    if content:
        parsed = parse_json_from_llm(content)
        questions = [q.strip() for q in parsed.get("questions", []) if isinstance(q, str) and q.strip()]
        if questions:
            return questions[:count]

    # Fallback dynamic bank when AI key/service is unavailable.
    fallback_bank = {
        "Python Developer": {
            "Easy": [
                "What is the difference between a list and tuple in Python?",
                "How does virtualenv help in Python development?",
                "What is the purpose of requirements.txt?",
            ],
            "Medium": [
                "Explain async and await in Python with a practical API example.",
                "How would you design JWT authentication in a FastAPI app?",
                "How do you optimize MongoDB queries in a Python backend?",
            ],
            "Hard": [
                "Design a scalable Python API for high traffic and explain trade-offs.",
                "How would you implement resilient external API calls with retries/backoff?",
                "How do you structure observability (logs, metrics, tracing) in production Python services?",
            ],
        },
        "Backend Developer": {
            "Easy": [
                "What is a REST API and why is it useful?",
                "What is the difference between SQL and NoSQL databases?",
                "What is authentication vs authorization?",
            ],
            "Medium": [
                "How would you design database indexes for a read-heavy API?",
                "Explain caching strategies for backend performance.",
                "How do you handle retries and idempotency for write APIs?",
            ],
            "Hard": [
                "How do you design eventual consistency in distributed systems?",
                "Design a resilient backend for 1M daily users.",
                "How do you handle zero-downtime deployments for backend services?",
            ],
        },
    }

    role_bank = fallback_bank.get(role) or fallback_bank.get("Backend Developer", {})
    level = difficulty if difficulty in ["Easy", "Medium", "Hard"] else "Medium"
    pool = role_bank.get(level, [])

    # Add cross-category prompts when requested, so it is not static.
    if category in ["Behavioral", "System Design", "Coding", "Technical"]:
        pool = pool + [f"{category}: {q}" for q in pool[:2]]

    if not pool:
        pool = [f"Explain a core concept for {role} at {level} level with a practical example."]

    generated = []
    i = 0
    while len(generated) < count:
        generated.append(pool[i % len(pool)])
        i += 1
    return generated


_REFERENCE_ANSWER_CACHE: dict[str, str] = {}


async def get_reference_answer(question: str) -> Optional[str]:
    key = question.strip().lower()
    if not key:
        return None
    if key in _REFERENCE_ANSWER_CACHE:
        return _REFERENCE_ANSWER_CACHE[key]

    prompt = (
        "Create a concise but strong reference answer for this interview question. "
        "Return plain text only. Include concept, trade-off, and practical example.\n\n"
        f"Question: {question}"
    )
    content = await try_openai_chat("You are a senior software interview coach.", prompt)
    if content:
        ref = content.strip()
        _REFERENCE_ANSWER_CACHE[key] = ref
        return ref
    return None


INTERVIEW_STOP_WORDS = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "from",
    "as", "is", "was", "are", "were", "be", "have", "has", "had", "this", "that", "these", "those",
    "what", "how", "why", "when", "where", "which", "explain", "describe", "difference", "between",
    "can", "could", "should", "would", "into", "about", "your", "you", "they", "them", "their", "flow",
}

ADVANCED_TERMS = {
    "scalability", "throughput", "latency", "tradeoff", "consistency", "availability", "partition", "idempotent",
    "observability", "monitoring", "logging", "metrics", "tracing", "retry", "backoff", "caching", "indexing",
    "concurrency", "parallelism", "thread", "async", "queue", "architecture", "security", "authentication",
    "authorization", "validation", "transaction", "rollback", "normalization", "denormalization", "replication",
    "scale", "stateless", "rotate", "revoke", "expiry",
}

REASONING_MARKERS = {
    "because", "therefore", "so that", "if", "then", "tradeoff", "trade-off", "however", "for example", "for instance",
    "in practice", "depends on", "pros", "cons", "first", "second", "finally",
}


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z][a-zA-Z0-9+#]*", text.lower())


TOKEN_CANONICAL_MAP = {
    "authentication": "auth",
    "authorize": "auth",
    "authorization": "auth",
    "authenticated": "auth",
    "auth": "auth",
    "apis": "api",
    "tokens": "token",
    "services": "service",
    "microservices": "service",
    "scalable": "scale",
    "scalability": "scale",
    "indexed": "index",
    "indexing": "index",
}


def _canonicalize_token(token: str) -> str:
    t = TOKEN_CANONICAL_MAP.get(token, token)
    if len(t) > 4 and t.endswith("ing"):
        t = t[:-3]
    elif len(t) > 3 and t.endswith("ed"):
        t = t[:-2]
    elif len(t) > 4 and t.endswith("es"):
        t = t[:-2]
    elif len(t) > 3 and t.endswith("s"):
        t = t[:-1]
    return TOKEN_CANONICAL_MAP.get(t, t)


def _canonical_set(tokens: list[str]) -> set[str]:
    return {_canonicalize_token(t) for t in tokens}


def _question_keywords(question: str) -> set[str]:
    tokens = _tokenize(question)
    return {_canonicalize_token(t) for t in tokens if len(t) > 2 and t not in INTERVIEW_STOP_WORDS}


def _keyword_overlap(question_keys: set[str], answer_keys: set[str]) -> int:
    hits = 0
    for qk in question_keys:
        if qk in answer_keys:
            hits += 1
            continue
        if len(qk) >= 5 and any(ak.startswith(qk[:5]) or qk.startswith(ak[:5]) for ak in answer_keys if len(ak) >= 5):
            hits += 1
    return hits


def _contains_phrase(text: str, phrases: set[str]) -> int:
    lower = text.lower()
    return sum(1 for p in phrases if p in lower)


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


async def evaluate_answer(question: str, answer: str) -> dict[str, Any]:
    answer_text = answer.strip()
    answer_tokens = _tokenize(answer_text)
    answer_keys = _canonical_set(answer_tokens)
    question_keys = _question_keywords(question)

    key_overlap = 0
    if question_keys:
        key_overlap = _keyword_overlap(question_keys, answer_keys)
        relevance_ratio = key_overlap / len(question_keys)
    else:
        relevance_ratio = 0.5

    word_count = len(answer_tokens)
    sentence_count = max(1, len([s for s in re.split(r"[.!?]+", answer_text) if s.strip()]))
    avg_sentence_words = word_count / sentence_count
    reasoning_hits = _contains_phrase(answer_text, REASONING_MARKERS)
    depth_hits = sum(1 for t in set(answer_tokens) if t in ADVANCED_TERMS)

    length_score = _clamp((word_count - 12) / 25, 0, 1)
    relevance_score = _clamp(relevance_ratio, 0, 1)
    reasoning_score = _clamp(reasoning_hits / 3, 0, 1)
    depth_score = _clamp(depth_hits / 4, 0, 1)

    readability_score = 1.0
    if avg_sentence_words < 6:
        readability_score = 0.6
    elif avg_sentence_words > 32:
        readability_score = 0.7

    technical_raw = 10 * (0.50 * relevance_score + 0.20 * reasoning_score + 0.20 * depth_score + 0.10 * length_score)
    communication_raw = 10 * (0.45 * readability_score + 0.35 * length_score + 0.20 * reasoning_score)
    depth_raw = 10 * (0.45 * depth_score + 0.35 * reasoning_score + 0.20 * relevance_score)

    # Hybrid refinement: compare with AI reference answer when key is available.
    reference = await get_reference_answer(question)
    if reference:
        ref_keys = _canonical_set(_tokenize(reference))
        ref_overlap = _keyword_overlap(ref_keys, answer_keys)
        ref_ratio = ref_overlap / max(1, len(ref_keys))
        technical_raw += 1.5 * _clamp(ref_ratio * 2, 0, 1)
        depth_raw += 1.0 * _clamp(ref_ratio * 2, 0, 1)

    technical = int(round(_clamp(technical_raw, 0, 10)))
    communication = int(round(_clamp(communication_raw, 0, 10)))
    depth = int(round(_clamp(depth_raw, 0, 10)))

    overall = int(round(_clamp(0.50 * technical + 0.25 * communication + 0.25 * depth, 0, 10)))

    if overall >= 8:
        accuracy_text = "Strong and technically relevant answer."
    elif overall >= 6:
        accuracy_text = "Mostly correct, but missing some important technical detail."
    elif overall >= 4:
        accuracy_text = "Partially correct with gaps in technical relevance."
    else:
        accuracy_text = "Limited technical accuracy for the question asked."

    if communication >= 8:
        clarity_text = "Clear, structured, and easy to follow."
    elif communication >= 6:
        clarity_text = "Understandable, but structure can be improved."
    else:
        clarity_text = "Needs clearer structure and more precise wording."

    if depth >= 8:
        depth_text = "Shows solid depth with reasoning and trade-offs."
    elif depth >= 6:
        depth_text = "Shows moderate depth but could include stronger trade-off discussion."
    else:
        depth_text = "Answer is fairly shallow; add deeper reasoning and system implications."

    suggestions = []
    if key_overlap < max(1, len(question_keys) // 3):
        suggestions.append("Address more of the key concepts asked in the question.")
    if reasoning_hits == 0:
        suggestions.append("Explain your reasoning using cause/effect and trade-offs.")
    if depth_hits == 0:
        suggestions.append("Add deeper technical details (performance, scalability, reliability, or security).")
    if word_count < 20:
        suggestions.append("Expand the answer with a concrete implementation example.")
    if not suggestions:
        suggestions.append("Great answer. Add one concrete real-world example to make it even stronger.")

    focus_term = next(iter(question_keys), "the core concept")
    example_improvement = (
        f"A stronger answer would define {focus_term}, explain why it matters, discuss one trade-off, "
        "and finish with a practical implementation example."
    )

    return {
        "score": overall,
        "technicalAccuracy": accuracy_text,
        "communicationClarity": clarity_text,
        "depthOfKnowledge": depth_text,
        "suggestions": " ".join(suggestions),
        "exampleImprovement": example_improvement,
    }


def grade_from_score(score: float) -> str:
    if score >= 9:
        return "Exceptional"
    if score >= 8:
        return "Excellent"
    if score >= 7:
        return "Good"
    if score >= 6:
        return "Satisfactory"
    if score >= 5:
        return "Needs Improvement"
    if score >= 3:
        return "Below Expectations"
    return "Unsatisfactory"


def safe_avg(values: list[float]) -> float:
    return round(sum(values) / len(values), 2) if values else 0.0


# ---------- Interview Endpoints ----------
@app.get("/api/interview/questions")
async def interview_questions(role: str, count: int = 5, user: dict[str, Any] = Depends(get_current_user)):
    if not role.strip():
        raise HTTPException(status_code=400, detail="Role is required.")

    questions = await generate_questions(role, max(1, min(count, 20)))
    session = {
        "userId": oid_str(user["_id"]),
        "role": role,
        "difficulty": "Medium",
        "category": "Mixed",
        "questions": questions,
        "currentQuestionIndex": 0,
        "status": "InProgress",
        "timeLimitMinutes": None,
        "createdAt": now_utc(),
        "completedAt": None,
        "results": [],
    }
    ins = sessions_col.insert_one(session)

    return {
        "sessionId": oid_str(ins.inserted_id),
        "role": role,
        "questions": questions,
    }


@app.post("/api/interview/answer")
async def interview_answer(request: InterviewAnswerRequest, user: dict[str, Any] = Depends(get_current_user)):
    session = sessions_col.find_one({"_id": ObjectId(request.sessionId)})
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    if session.get("userId") != oid_str(user["_id"]):
        raise HTTPException(status_code=401, detail="This session does not belong to the current user.")

    evaluation = await evaluate_answer(request.question, request.answer)
    result = {
        "question": request.question,
        "answer": request.answer,
        "score": max(0, min(int(evaluation.get("score", 0)), 10)),
        "feedback": (
            f"Technical Accuracy: {evaluation.get('technicalAccuracy', '')}; "
            f"Communication Clarity: {evaluation.get('communicationClarity', '')}; "
            f"Suggestions: {evaluation.get('suggestions', '')}"
        ),
        "technicalAccuracy": evaluation.get("technicalAccuracy", ""),
        "communicationClarity": evaluation.get("communicationClarity", ""),
        "depthOfKnowledge": evaluation.get("depthOfKnowledge", ""),
        "suggestions": evaluation.get("suggestions", ""),
        "exampleImprovement": evaluation.get("exampleImprovement", ""),
        "evaluatedAt": now_utc(),
    }
    sessions_col.update_one({"_id": session["_id"]}, {"$push": {"results": result}})
    return result


@app.get("/api/interview/analytics")
async def interview_analytics(user: dict[str, Any] = Depends(get_current_user)):
    sessions = list(sessions_col.find({"userId": oid_str(user["_id"])}).sort("createdAt", DESCENDING))
    all_results = [r for s in sessions for r in s.get("results", [])]
    total_questions = len(all_results)
    avg_score = safe_avg([float(r.get("score", 0)) for r in all_results])

    recent = []
    for s in sessions[:5]:
        results = s.get("results", [])
        recent.append(
            {
                "sessionId": oid_str(s["_id"]),
                "role": s.get("role", ""),
                "createdAt": s.get("createdAt"),
                "questionsAnswered": len(results),
                "averageScore": safe_avg([float(r.get("score", 0)) for r in results]),
            }
        )

    return {
        "totalSessions": len(sessions),
        "totalQuestionsAnswered": total_questions,
        "averageScore": avg_score,
        "recentSessions": recent,
    }


@app.post("/api/interview/simulator/start")
async def simulator_start(request: StartSessionRequest, user: dict[str, Any] = Depends(get_current_user)):
    if not request.role.strip():
        raise HTTPException(status_code=400, detail="Role is required.")

    active = sessions_col.find_one({"userId": oid_str(user["_id"]), "status": "InProgress"}, sort=[("createdAt", DESCENDING)])
    if active:
        sessions_col.update_one(
            {"_id": active["_id"]},
            {"$set": {"status": "Abandoned", "completedAt": now_utc()}},
        )

    q_count = max(1, min(request.questionCount, 20))
    difficulty = request.difficulty if request.difficulty in ["Easy", "Medium", "Hard"] else "Medium"
    category = request.category if request.category in ["Mixed", "Technical", "Behavioral", "System Design", "Coding"] else "Mixed"

    questions = await generate_questions(request.role, q_count, difficulty, category)
    session = {
        "userId": oid_str(user["_id"]),
        "role": request.role,
        "difficulty": difficulty,
        "category": category,
        "questions": questions,
        "currentQuestionIndex": 0,
        "status": "InProgress",
        "timeLimitMinutes": request.timeLimitMinutes,
        "createdAt": now_utc(),
        "completedAt": None,
        "results": [],
    }
    ins = sessions_col.insert_one(session)

    return {
        "sessionId": oid_str(ins.inserted_id),
        "role": request.role,
        "difficulty": difficulty,
        "category": category,
        "totalQuestions": len(questions),
        "timeLimitMinutes": request.timeLimitMinutes,
        "startedAt": session["createdAt"],
        "firstQuestion": questions[0] if questions else "",
    }


@app.post("/api/interview/simulator/submit")
async def simulator_submit(request: SubmitAnswerRequest, user: dict[str, Any] = Depends(get_current_user)):
    if not request.answer.strip():
        raise HTTPException(status_code=400, detail="Answer is required.")

    session = sessions_col.find_one({"_id": ObjectId(request.sessionId)})
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    if session.get("userId") != oid_str(user["_id"]):
        raise HTTPException(status_code=403, detail="This session does not belong to you.")
    if session.get("status") != "InProgress":
        raise HTTPException(status_code=400, detail=f"Session is already {session.get('status', '').lower()}.")

    if session.get("timeLimitMinutes") is not None:
        elapsed = (now_utc() - session.get("createdAt", now_utc())).total_seconds() / 60
        if elapsed > session["timeLimitMinutes"]:
            sessions_col.update_one(
                {"_id": session["_id"]},
                {"$set": {"status": "TimedOut", "completedAt": now_utc()}},
            )
            raise HTTPException(status_code=400, detail="Session has timed out.")

    idx = int(session.get("currentQuestionIndex", 0))
    questions = session.get("questions", [])
    if idx >= len(questions):
        raise HTTPException(status_code=400, detail="No current question available.")

    current_question = questions[idx]
    evaluation = await evaluate_answer(current_question, request.answer)
    result = {
        "question": current_question,
        "answer": request.answer,
        "score": max(0, min(int(evaluation.get("score", 0)), 10)),
        "feedback": (
            f"Technical Accuracy: {evaluation.get('technicalAccuracy', '')}; "
            f"Communication Clarity: {evaluation.get('communicationClarity', '')}; "
            f"Suggestions: {evaluation.get('suggestions', '')}"
        ),
        "technicalAccuracy": evaluation.get("technicalAccuracy", ""),
        "communicationClarity": evaluation.get("communicationClarity", ""),
        "depthOfKnowledge": evaluation.get("depthOfKnowledge", ""),
        "suggestions": evaluation.get("suggestions", ""),
        "exampleImprovement": evaluation.get("exampleImprovement", ""),
        "evaluatedAt": now_utc(),
    }

    next_idx = idx + 1
    is_complete = next_idx >= len(questions)
    updates: dict[str, Any] = {"currentQuestionIndex": next_idx}
    if is_complete:
        updates["status"] = "Completed"
        updates["completedAt"] = now_utc()

    sessions_col.update_one({"_id": session["_id"]}, {"$push": {"results": result}, "$set": updates})

    elapsed_minutes = (now_utc() - session.get("createdAt", now_utc())).total_seconds() / 60
    next_question = questions[next_idx] if not is_complete else None

    return {
        "questionNumber": next_idx,
        "question": current_question,
        "answer": request.answer,
        "score": result["score"],
        "technicalAccuracy": result["technicalAccuracy"],
        "communicationClarity": result["communicationClarity"],
        "suggestions": result["suggestions"],
        "isSessionComplete": is_complete,
        "nextQuestion": next_question,
        "followUpContext": (
            f"Your previous answer scored {result['score']}/10. The next question will test a related area."
            if (not is_complete and result["score"] <= 5)
            else None
        ),
        "questionsRemaining": max(0, len(questions) - next_idx),
        "elapsedMinutes": round(elapsed_minutes, 1),
    }


@app.get("/api/interview/simulator/active")
async def simulator_active(user: dict[str, Any] = Depends(get_current_user)):
    session = sessions_col.find_one({"userId": oid_str(user["_id"]), "status": "InProgress"}, sort=[("createdAt", DESCENDING)])
    if not session:
        return {"message": "No active session found."}

    elapsed = (now_utc() - session.get("createdAt", now_utc())).total_seconds() / 60
    if session.get("timeLimitMinutes") is not None and elapsed > session["timeLimitMinutes"]:
        sessions_col.update_one(
            {"_id": session["_id"]},
            {"$set": {"status": "TimedOut", "completedAt": now_utc()}},
        )
        return {"message": "No active session found."}

    idx = int(session.get("currentQuestionIndex", 0))
    questions = session.get("questions", [])

    return {
        "sessionId": oid_str(session["_id"]),
        "role": session.get("role", ""),
        "difficulty": session.get("difficulty", "Medium"),
        "category": session.get("category", "Mixed"),
        "currentQuestionIndex": idx,
        "totalQuestions": len(questions),
        "currentQuestion": questions[idx] if idx < len(questions) else "",
        "elapsedMinutes": round(elapsed, 1),
        "timeLimitMinutes": session.get("timeLimitMinutes"),
        "isTimedOut": False,
        "status": session.get("status", "InProgress"),
    }


def build_report(session: dict[str, Any]) -> dict[str, Any]:
    results = session.get("results", [])
    duration = ((session.get("completedAt") or now_utc()) - session.get("createdAt", now_utc())).total_seconds() / 60
    overall = safe_avg([float(r.get("score", 0)) for r in results])

    question_results = []
    for i, r in enumerate(results):
        question_results.append(
            {
                "questionNumber": i + 1,
                "question": r.get("question", ""),
                "answer": r.get("answer", ""),
                "score": r.get("score", 0),
                "technicalAccuracy": r.get("technicalAccuracy", ""),
                "communicationClarity": r.get("communicationClarity", ""),
                "suggestions": r.get("suggestions", ""),
            }
        )

    return {
        "sessionId": oid_str(session["_id"]),
        "role": session.get("role", ""),
        "difficulty": session.get("difficulty", "Medium"),
        "category": session.get("category", "Mixed"),
        "startedAt": session.get("createdAt"),
        "completedAt": session.get("completedAt"),
        "durationMinutes": round(duration, 1),
        "status": session.get("status", ""),
        "totalQuestions": len(session.get("questions", [])),
        "questionsAnswered": len(results),
        "overallScore": overall,
        "performanceGrade": grade_from_score(overall),
        "questionResults": question_results,
        "strengthAreas": [f"Strong answer on: {r.get('question', '')[:60]}" for r in results if r.get("score", 0) >= 7],
        "improvementAreas": [f"Needs improvement: {r.get('question', '')[:60]}" for r in results if r.get("score", 0) < 5],
        "overallFeedback": (
            f"You completed {len(results)}/{len(session.get('questions', []))} questions with an average score of {overall}/10."
        ),
    }


@app.get("/api/interview/simulator/session/{session_id}/report")
async def simulator_report(session_id: str, user: dict[str, Any] = Depends(get_current_user)):
    session = sessions_col.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    if session.get("userId") != oid_str(user["_id"]):
        raise HTTPException(status_code=403, detail="This session does not belong to you.")
    return build_report(session)


@app.post("/api/interview/simulator/session/{session_id}/end")
async def simulator_end(session_id: str, user: dict[str, Any] = Depends(get_current_user)):
    session = sessions_col.find_one({"_id": ObjectId(session_id)})
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    if session.get("userId") != oid_str(user["_id"]):
        raise HTTPException(status_code=403, detail="This session does not belong to you.")
    if session.get("status") != "InProgress":
        raise HTTPException(status_code=400, detail=f"Session is already {session.get('status', '').lower()}.")

    status = "Completed" if len(session.get("results", [])) > 0 else "Abandoned"
    sessions_col.update_one({"_id": session["_id"]}, {"$set": {"status": status, "completedAt": now_utc()}})
    updated = sessions_col.find_one({"_id": session["_id"]})
    return build_report(updated)


@app.get("/api/interview/simulator/history")
async def simulator_history(user: dict[str, Any] = Depends(get_current_user)):
    sessions = list(sessions_col.find({"userId": oid_str(user["_id"])}).sort("createdAt", DESCENDING))

    history = []
    for s in sessions:
        results = s.get("results", [])
        avg = safe_avg([float(r.get("score", 0)) for r in results])
        history.append(
            {
                "sessionId": oid_str(s["_id"]),
                "role": s.get("role", ""),
                "difficulty": s.get("difficulty", "Medium"),
                "category": s.get("category", "Mixed"),
                "startedAt": s.get("createdAt"),
                "completedAt": s.get("completedAt"),
                "status": s.get("status", ""),
                "questionsAnswered": len(results),
                "totalQuestions": len(s.get("questions", [])),
                "averageScore": avg,
                "performanceGrade": grade_from_score(avg) if results else "N/A",
            }
        )

    return {
        "totalSessions": len(sessions),
        "completedSessions": sum(1 for s in sessions if s.get("status") == "Completed"),
        "abandonedSessions": sum(1 for s in sessions if s.get("status") in ["Abandoned", "TimedOut"]),
        "sessions": history,
    }


@app.get("/api/interview/simulator/trends")
async def simulator_trends(user: dict[str, Any] = Depends(get_current_user)):
    sessions = list(
        sessions_col.find({"userId": oid_str(user["_id"]), "status": "Completed"}).sort("createdAt", DESCENDING)
    )
    sessions = [s for s in sessions if len(s.get("results", [])) > 0]

    all_results = [r for s in sessions for r in s.get("results", [])]

    role_map: dict[str, list[dict[str, Any]]] = {}
    for s in sessions:
        role = s.get("role", "Unknown")
        role_map.setdefault(role, []).append(s)

    performance_by_role = []
    for role, role_sessions in role_map.items():
        role_results = [r for rs in role_sessions for r in rs.get("results", [])]
        role_scores = [float(r.get("score", 0)) for r in role_results]
        latest = role_sessions[0]
        latest_score = safe_avg([float(r.get("score", 0)) for r in latest.get("results", [])])
        trend = "Stable"
        if len(role_sessions) >= 2:
            mid = len(role_sessions) // 2
            first_half = [float(r.get("score", 0)) for s1 in role_sessions[:mid] for r in s1.get("results", [])]
            second_half = [float(r.get("score", 0)) for s2 in role_sessions[mid:] for r in s2.get("results", [])]
            first_avg = safe_avg(first_half)
            second_avg = safe_avg(second_half)
            if second_avg > first_avg + 0.5:
                trend = "Improving"
            elif second_avg < first_avg - 0.5:
                trend = "Declining"

        performance_by_role.append(
            {
                "role": role,
                "sessionCount": len(role_sessions),
                "questionsAnswered": len(role_results),
                "averageScore": safe_avg(role_scores),
                "bestScore": max((safe_avg([float(r.get("score", 0)) for r in rs.get("results", [])]) for rs in role_sessions), default=0),
                "latestScore": latest_score,
                "trend": trend,
            }
        )

    diff_map: dict[str, list[float]] = {}
    for s in sessions:
        diff = s.get("difficulty", "Medium")
        diff_map.setdefault(diff, [])
        diff_map[diff].extend([float(r.get("score", 0)) for r in s.get("results", [])])

    performance_by_difficulty = [
        {"difficulty": k, "sessionCount": sum(1 for s in sessions if s.get("difficulty", "Medium") == k), "averageScore": safe_avg(v)}
        for k, v in diff_map.items()
    ]

    recent_trends = []
    for s in sessions[:10]:
        recent_trends.append(
            {
                "sessionId": oid_str(s["_id"]),
                "role": s.get("role", ""),
                "difficulty": s.get("difficulty", "Medium"),
                "date": s.get("createdAt"),
                "averageScore": safe_avg([float(r.get("score", 0)) for r in s.get("results", [])]),
                "questionsAnswered": len(s.get("results", [])),
            }
        )

    skill_gaps = [f"{r['role']}: Average score {r['averageScore']}/10 - needs improvement" for r in performance_by_role if r["averageScore"] < 6]
    recommendations = []
    if len(performance_by_role) == 1 and len(sessions) >= 5:
        recommendations.append("Consider practicing for different roles to broaden your interview skills.")
    for r in performance_by_role:
        if r["trend"] == "Declining":
            recommendations.append(f"Your {r['role']} performance is declining. Review fundamentals and practice more.")
        if r["averageScore"] < 5:
            recommendations.append(f"Focus on improving your {r['role']} skills before harder rounds.")

    strongest_role = max(performance_by_role, key=lambda x: x["averageScore"], default={"role": "N/A"}).get("role", "N/A")
    weakest_role = min(performance_by_role, key=lambda x: x["averageScore"], default={"role": "N/A"}).get("role", "N/A")

    return {
        "totalSessions": len(sessions),
        "totalQuestionsAnswered": len(all_results),
        "overallAverageScore": safe_avg([float(r.get("score", 0)) for r in all_results]),
        "strongestRole": strongest_role,
        "weakestRole": weakest_role,
        "performanceByRole": sorted(performance_by_role, key=lambda x: x["sessionCount"], reverse=True),
        "performanceByDifficulty": performance_by_difficulty,
        "recentTrends": recent_trends,
        "skillGaps": skill_gaps,
        "recommendations": recommendations,
    }


@app.get("/api/interview/readiness")
async def interview_readiness(user: dict[str, Any] = Depends(get_current_user)):
    def as_utc(dt: Any) -> Optional[datetime]:
        if not isinstance(dt, datetime):
            return None
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    now = now_utc()

    user_id = oid_str(user["_id"])
    resumes = list(resumes_col.find({"userId": user_id}).sort("createdAt", DESCENDING))
    completed_sessions = list(sessions_col.find({"userId": user_id, "status": "Completed"}).sort("createdAt", DESCENDING))

    if resumes:
        best_ats = max(r.get("atsScore", 0) for r in resumes)
        avg_ats = round(sum(r.get("atsScore", 0) for r in resumes) / len(resumes))
        missing_counts: dict[str, int] = {}
        for r in resumes:
            for s in r.get("missingSkills", []):
                key = s.strip().lower()
                if key:
                    missing_counts[key] = missing_counts.get(key, 0) + 1
        top_missing = [k for k, _ in sorted(missing_counts.items(), key=lambda x: x[1], reverse=True)[:5]]
        key_strengths = []
        seen = set()
        for r in resumes:
            for s in r.get("strengthAreas", []):
                k = s.strip().lower()
                if k and k not in seen:
                    seen.add(k)
                    key_strengths.append(s)
        resume_score = min(best_ats, 100)
    else:
        best_ats = 0
        avg_ats = 0
        top_missing = ["No resume uploaded yet"]
        key_strengths = []
        resume_score = 0

    all_results = [r for s in completed_sessions for r in s.get("results", [])]
    if all_results:
        avg_score = safe_avg([float(r.get("score", 0)) for r in all_results])
        best_session = max(
            (safe_avg([float(r.get("score", 0)) for r in s.get("results", [])]) for s in completed_sessions), default=0
        )
        recent_sessions = completed_sessions[:3]
        recent_results = [r for s in recent_sessions for r in s.get("results", [])]
        recent_avg = safe_avg([float(r.get("score", 0)) for r in recent_results])

        by_category: dict[str, list[float]] = {}
        by_diff: dict[str, list[float]] = {}
        for s in completed_sessions:
            by_category.setdefault(s.get("category", "Mixed"), [])
            by_category[s.get("category", "Mixed")].extend([float(r.get("score", 0)) for r in s.get("results", [])])
            by_diff.setdefault(s.get("difficulty", "Medium"), [])
            by_diff[s.get("difficulty", "Medium")].extend([float(r.get("score", 0)) for r in s.get("results", [])])

        cat_scores = {k: safe_avg(v) for k, v in by_category.items()}
        strongest_category = max(cat_scores, key=cat_scores.get) if cat_scores else "N/A"
        weakest_category = min(cat_scores, key=cat_scores.get) if cat_scores else "N/A"

        base = avg_score * 10
        breadth_bonus = min(len(completed_sessions), 10) * 1.5
        trend_bonus = 15 if recent_avg >= avg_score else (7 if recent_avg >= avg_score * 0.8 else 0)
        interview_score = int(min(round(base * 0.70 + trend_bonus + breadth_bonus), 100))
    else:
        avg_score = 0.0
        best_session = 0.0
        recent_avg = 0.0
        strongest_category = "N/A"
        weakest_category = "N/A"
        by_diff = {}
        interview_score = 0

    if completed_sessions:
        created_dates = [as_utc(s.get("createdAt")) for s in completed_sessions]
        created_dates = [d for d in created_dates if d is not None]
        distinct_days = len({d.date() for d in created_dates})

        last_candidates = [as_utc(s.get("completedAt") or s.get("createdAt")) for s in completed_sessions]
        last_candidates = [d for d in last_candidates if d is not None]
        last_practice = max(last_candidates) if last_candidates else None

        has_recent = bool(last_practice and (now - last_practice).days <= 7)
        first_session = min(created_dates) if created_dates else now
        span_days = max((now - first_session).days, 1)
        sessions_per_week = len(completed_sessions) / span_days * 7
        if sessions_per_week >= 5:
            frequency = "Daily"
            freq_score = 30
        elif sessions_per_week >= 3:
            frequency = "Frequent"
            freq_score = 25
        elif sessions_per_week >= 1:
            frequency = "Weekly"
            freq_score = 18
        elif sessions_per_week >= 0.5:
            frequency = "Bi-weekly"
            freq_score = 10
        else:
            frequency = "Infrequent"
            freq_score = 5

        trend_text = "Stable"
        if len(completed_sessions) >= 4:
            mid = len(completed_sessions) // 2
            recent_half = [float(r.get("score", 0)) for s in completed_sessions[:mid] for r in s.get("results", [])]
            older_half = [float(r.get("score", 0)) for s in completed_sessions[mid:] for r in s.get("results", [])]
            if recent_half and older_half:
                diff = safe_avg(recent_half) - safe_avg(older_half)
                if diff > 1.0:
                    trend_text = "Improving"
                elif diff > 0.3:
                    trend_text = "Slightly improving"
                elif diff < -1.0:
                    trend_text = "Declining"
                elif diff < -0.3:
                    trend_text = "Slightly declining"

        day_score = min(distinct_days, 20) * 2.0
        recency_score = 30 if has_recent else (15 if (last_practice and (now - last_practice).days <= 14) else 0)
        consistency_score = int(min(round(day_score + recency_score + freq_score), 100))
    else:
        distinct_days = 0
        last_practice = None
        has_recent = False
        frequency = "None"
        trend_text = "No data"
        consistency_score = 0

    overall = int(round(resume_score * 0.30 + interview_score * 0.50 + consistency_score * 0.20))

    if overall >= 85:
        level = "Highly Ready"
    elif overall >= 70:
        level = "Ready"
    elif overall >= 50:
        level = "Partially Ready"
    else:
        level = "Not Ready"

    strengths = []
    if resume_score >= 70:
        strengths.append({"area": "Resume Quality", "detail": f"ATS score of {best_ats} indicates solid resume quality."})
    if avg_score >= 7:
        strengths.append({"area": "Interview Skills", "detail": f"Average interview score is {avg_score}/10."})
    if consistency_score >= 60:
        strengths.append({"area": "Practice Habit", "detail": f"Consistent practice with {distinct_days} active days."})
    if strongest_category != "N/A":
        strengths.append({"area": "Strongest Category", "detail": f"Best performance in {strongest_category}."})

    gaps = []
    if not resumes:
        gaps.append({"area": "No Resume", "detail": "No resume uploaded yet.", "recommendation": "Upload your resume for ATS analysis."})
    elif best_ats < 60:
        gaps.append({"area": "Resume Quality", "detail": f"ATS score of {best_ats} is below target.", "recommendation": "Improve keywords and structure."})
    if not completed_sessions:
        gaps.append({"area": "No Interview Practice", "detail": "No completed interview sessions found.", "recommendation": "Start with Easy difficulty sessions."})
    elif avg_score < 5:
        gaps.append({"area": "Interview Performance", "detail": f"Average score of {avg_score}/10 needs improvement.", "recommendation": "Practice and review feedback from reports."})
    if not has_recent and completed_sessions:
        gaps.append({"area": "Consistency", "detail": "No recent activity in the last 7 days.", "recommendation": "Schedule 2-3 sessions per week."})

    action_plan = []
    if not resumes:
        action_plan.append("Upload and optimize your resume.")
    if avg_score < 6:
        action_plan.append("Practice one interview session daily for one week.")
    if weakest_category != "N/A" and weakest_category != strongest_category:
        action_plan.append(f"Focus next sessions on {weakest_category} questions.")
    if not has_recent:
        action_plan.append("Create a weekly interview practice schedule.")
    if not action_plan:
        action_plan.append("Maintain consistency and move to harder difficulty levels.")

    summary = f"Readiness based on {len(resumes)} resume(s) and {len(completed_sessions)} completed interview session(s)."

    return {
        "overallReadinessScore": overall,
        "readinessLevel": level,
        "summary": summary,
        "resume": {
            "score": resume_score,
            "resumesAnalyzed": len(resumes),
            "bestAtsScore": best_ats,
            "averageAtsScore": avg_ats,
            "totalMissingSkills": len(top_missing),
            "topMissingSkills": top_missing,
            "keyStrengths": key_strengths[:5],
        },
        "interviewPerformance": {
            "score": interview_score,
            "sessionsCompleted": len(completed_sessions),
            "totalQuestionsAnswered": len(all_results),
            "averageScore": avg_score,
            "bestSessionScore": best_session,
            "recentAverageScore": recent_avg,
            "strongestCategory": strongest_category,
            "weakestCategory": weakest_category,
            "difficultyBreakdown": {
                "easyAverage": safe_avg(by_diff.get("Easy", [])) if by_diff.get("Easy") else None,
                "mediumAverage": safe_avg(by_diff.get("Medium", [])) if by_diff.get("Medium") else None,
                "hardAverage": safe_avg(by_diff.get("Hard", [])) if by_diff.get("Hard") else None,
            },
        },
        "consistency": {
            "score": consistency_score,
            "practiceDaysCount": distinct_days,
            "practiceFrequency": frequency,
            "hasRecentActivity": has_recent,
            "lastPracticeDate": last_practice,
            "scoreTrend": trend_text,
        },
        "topStrengths": strengths[:5],
        "criticalGaps": gaps[:5],
        "actionPlan": action_plan,
        "evaluatedAt": now_utc(),
    }


@app.get("/health")
async def health():
    return {"status": "ok", "time": now_utc()}
