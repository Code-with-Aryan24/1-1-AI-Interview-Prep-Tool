import os
import base64
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from groq import Groq
from elevenlabs.client import ElevenLabs

# 1. Load Environment Variables from Project Root
root_env = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=root_env)

app = FastAPI(
    title="AI Technical Interviewer - Real-Time Engine",
    description="Backend service powering Groq LLM logic, ElevenLabs TTS audio streaming, and session metrics.",
    version="1.0.0"
)

# 2. CORS Middleware (Allow Vite dev server on port 5173 / any local origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Initialize Clients
groq_api_key = os.getenv("GROQ_API_KEY")
eleven_api_key = os.getenv("ELEVENLABS_API_KEY")

groq_client = Groq(api_key=groq_api_key) if groq_api_key else None
eleven_client = ElevenLabs(api_key=eleven_api_key) if eleven_api_key else None

VOICE_MAP = {
    "female": "EXAVITQu4vr4xnSDxMaL",  # Rachel / Sophia
    "male": "JBFqnCBsd6RMkjVDRZzb",    # Adam / Alex
}

# In-memory interview session memory store
SESSION_STORE: Dict[str, Dict[str, Any]] = {}

# 4. Request & Response Schemas
class StartRequest(BaseModel):
    name: str = "Candidate"
    role: str = "Full Stack Software Engineer"
    hr_gender: str = "female"

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"
    hr_gender: str = "female"
    role: str = "Full Stack Software Engineer"

class EndRequest(BaseModel):
    session_id: Optional[str] = "default"
    candidate_name: Optional[str] = "Candidate"
    average_eye_contact: Optional[float] = 85.0
    average_confidence: Optional[float] = 80.0
    notes: Optional[str] = ""

# 5. Helper Function: Voice Synthesis
def synthesize_speech(text: str, gender: str) -> Optional[str]:
    if not eleven_client:
        return None
    try:
        voice_id = VOICE_MAP.get(gender, VOICE_MAP["female"])
        
        # Check for modern ElevenLabs SDK (v1.x+)
        if hasattr(eleven_client, "text_to_speech"):
            audio_generator = eleven_client.text_to_speech.convert(
                voice_id=voice_id,
                text=text,
                model_id="eleven_multilingual_v2"
            )
        # Fallback for older SDK versions
        elif hasattr(eleven_client, "generate"):
            audio_generator = eleven_client.generate(
                text=text,
                voice=voice_id,
                model="eleven_multilingual_v2"
            )
        else:
            print("[ElevenLabs Warning] Unsupported ElevenLabs SDK interface")
            return None

        # Convert generator/iterator chunks into complete byte sequence
        audio_bytes = b"".join(audio_generator)
        return f"data:audio/mp3;base64,{base64.b64encode(audio_bytes).decode('utf-8')}"
    except Exception as exc:
        print(f"[ElevenLabs Warning] Audio synthesis bypassed: {exc}")
        return None

# 6. Core Endpoints

@app.get("/")
@app.get("/status")
def health_check():
    """Returns the live status of the backend pipeline on port 8005."""
    return {
        "status": "online",
        "service": "Alex & Sophia AI Pipeline",
        "port": 8005,
        "groq_loaded": bool(groq_api_key),
        "elevenlabs_loaded": bool(eleven_api_key)
    }

@app.post("/start")
async def start_interview(req: StartRequest):
    """Initializes the interview session, persona, and introductory question."""
    hr_name = "Sophia" if req.hr_gender == "female" else "Alex"
    session_id = f"session_{req.name.lower().replace(' ', '_')}"

    # Reset or initialize session history
    SESSION_STORE[session_id] = {
        "name": req.name,
        "role": req.role,
        "hr_gender": req.hr_gender,
        "turns": 0,
        "history": []
    }

    intro_text = (
        f"Hello {req.name}, welcome to your technical interview for the {req.role} position! "
        f"I'm {hr_name}. To kick things off, could you briefly introduce yourself and walk me through your technical background?"
    )

    SESSION_STORE[session_id]["history"].append({"speaker": hr_name, "text": intro_text})
    audio_base64 = synthesize_speech(intro_text, req.hr_gender)

    return {
        "session_id": session_id,
        "message": intro_text,
        "reply": intro_text,
        "audio_url": audio_base64,
        "speaker": hr_name,
        "status": "started"
    }

@app.post("/api/chat")
@app.post("/chat")
async def chat_interaction(req: ChatRequest):
    """Processes candidate responses with Groq and returns speech audio + text."""
    if not groq_client:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured.")

    session_id = req.session_id or "default"
    hr_name = "Sophia" if req.hr_gender == "female" else "Alex"

    # Context history handling
    if session_id not in SESSION_STORE:
        SESSION_STORE[session_id] = {
            "name": "Candidate",
            "role": req.role,
            "hr_gender": req.hr_gender,
            "turns": 0,
            "history": []
        }

    session = SESSION_STORE[session_id]
    session["turns"] += 1
    session["history"].append({"speaker": "Candidate", "text": req.message})

    system_prompt = f"""
You are {hr_name}, a knowledgeable, encouraging Senior Technical Recruiter conducting a live technical interview for the {req.role} position.
Candidate Name: {session.get('name', 'Candidate')}
Interview Turn: {session['turns']}

Guidelines:
1. Validate or react to the candidate's last answer in 1 concise, conversational sentence.
2. Ask exactly ONE thoughtful follow-up question. Probe into architectural trade-offs, scalability, edge cases, or hands-on implementation details.
3. Keep the entire response strictly between 2 to 3 sentences so it sounds natural when spoken aloud.
4. Do not output markdown lists, asterisks, or bullet points.
"""

    messages = [{"role": "system", "content": system_prompt}]
    
    # Include recent dialog context
    for turn in session["history"][-4:]:
        role_type = "assistant" if turn["speaker"] in ["Sophia", "Alex"] else "user"
        messages.append({"role": role_type, "content": turn["text"]})

    try:
        completion = groq_client.chat.completions.create(
            messages=messages,
            model="openai/gpt-oss-120b",
            temperature=0.6,
            max_tokens=150,
        )
        reply_text = completion.choices[0].message.content.strip()
        session["history"].append({"speaker": hr_name, "text": reply_text})

        audio_base64 = synthesize_speech(reply_text, req.hr_gender)

        return {
            "reply": reply_text,
            "message": reply_text,
            "audio_url": audio_base64,
            "speaker": hr_name,
            "turn": session["turns"]
        }
    except Exception as err:
        print(f"[Groq Error] {err}")
        raise HTTPException(status_code=500, detail=str(err))

@app.post("/end")
@app.post("/api/end")
async def end_interview(req: EndRequest):
    """Wraps up the session and generates qualitative performance feedback."""
    session_id = req.session_id or "default"
    session = SESSION_STORE.get(session_id, {})
    history = session.get("history", [])

    candidate_name = req.candidate_name or session.get("name", "Candidate")
    total_responses = session.get("turns", len([h for h in history if h["speaker"] == "Candidate"]))

    closing_message = (
        f"Thank you for your time today, {candidate_name}. You did a great job walking through your experience. "
        "Our team will review your responses alongside your behavioral analytics and share feedback shortly."
    )

    # Basic performance assessment summary
    assessment = {
        "candidate": candidate_name,
        "role": session.get("role", "Software Engineer"),
        "total_questions_answered": total_responses,
        "eye_contact_score": f"{req.average_eye_contact:.1f}%",
        "confidence_index": f"{req.average_confidence:.1f}%",
        "technical_feedback": (
            "Demonstrated clear communication and structured problem solving. "
            "Good engagement with technical follow-ups."
        ),
        "status": "completed"
    }

    return {
        "message": closing_message,
        "closing_audio": synthesize_speech(closing_message, session.get("hr_gender", "female")),
        "scorecard": assessment
    }