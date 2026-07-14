import os
import re
import requests
import json
import uuid
import base64
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from groq import Groq
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
# 1. SECURE ENVIRONMENT INITIALIZATION
load_dotenv()

 

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows requests from Vite (localhost:5173, localhost:5179, etc.)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

sessions = {}


class StartRequest(BaseModel):
    userName: str
    niche: str
    vibe: str


class SpeakRequest(BaseModel):
    session_id: str = "default_session"
    user_text: str

def generate_elevenlabs_speech(text: str) -> str:
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        print("Warning: ELEVENLABS_API_KEY missing!")
        return ""

    headers = {"xi-api-key": api_key, "Content-Type": "application/json"}

    # 1. Get voices currently available on your free account
    try:
        voices_res = requests.get("https://api.elevenlabs.io/v1/voices", headers=headers)
        if voices_res.status_code == 200:
            voices_data = voices_res.json().get("voices", [])
            # Filter for default premade voices (bypasses 402 library errors)
            premade_voices = [
                v for v in voices_data 
                if v.get("category") == "premade" or v.get("category") == "default"
            ]
            
            if premade_voices:
                voice_id = premade_voices[0]["voice_id"]
            elif voices_data:
                voice_id = voices_data[0]["voice_id"]
            else:
                print("No voices found in account.")
                return ""
        else:
            print(f"Error fetching voices: {voices_res.status_code} - {voices_res.text}")
            return ""
    except Exception as e:
        print(f"Failed to fetch voices: {e}")
        return ""

    # 2. Call Text-To-Speech with the valid voice_id
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    payload = {
        "text": text,
        "model_id": "eleven_turbo_v2_5",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
    }

    response = requests.post(url, json=payload, headers=headers)

    if response.status_code == 200:
        return base64.b64encode(response.content).decode("utf-8")
    else:
        print(f"ElevenLabs Error: {response.status_code} - {response.text}")
        return ""


# In server.py:
class SpeakRequest(BaseModel):
    session_id: str = "default_session"
    user_text: str


@app.post("/speak")
async def speak_handler(req: SpeakRequest):
    # Retrieve user_text safely
    user_text = req.user_text

    if req.session_id not in sessions:
        sessions[req.session_id] = [
            {
                "role": "system",
                "content": "You are Alex, an expert technical interviewer. Keep responses under 3 sentences.",
            }
        ]

    sessions[req.session_id].append({"role": "user", "content": user_text})

    try:
        chat_completion = client.chat.completions.create(
            messages=sessions[req.session_id],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=200,
        )

        alex_response = chat_completion.choices[0].message.content
        sessions[req.session_id].append(
            {"role": "assistant", "content": alex_response}
        )

        # Generate audio using ElevenLabs
        audio_b64 = generate_elevenlabs_speech(alex_response)

        return {"response": alex_response, "audio": audio_b64}

    except Exception as e:
        print(f"Error in /speak: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
# Mount static files so your frontend visualizer, CSS, and images load perfectly
if os.path.exists(os.path.join(BASE_DIR, "static")):
    app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

# Initialize Groq using the secure token hidden inside your .env file


# 2. PERSISTENCE LAYER REGISTRY
# Stores full message arrays by unique session keys to mimic SKYY
active_sessions = {}

@app.post("/start")
async def start_interview(data: Request):
    try:
        body = await data.json()
    except Exception:
        body = {}
        
    niche_key = body.get("niche", "general").lower()
    selected_vibe = body.get("vibe", "professional")
    user_name = body.get("userName", "Aryan")
    
    session_id = str(uuid.uuid4())
    
    # SYSTEM PROMPT: Complete with Agentic Probing, Context Retention, and Phonetics
    system_instruction = (
        f"You are Alex, an Agentic AI Interviewer inspired by SKYY. "
        f"Target Niche: {niche_key}. Vibe: {selected_vibe}. Candidate Name: {user_name}. "
        "MISSION: Evaluate the candidate's competency through active interrogation. "
        "CORE BEHAVIORS:\n"
        "1. PROBE: If an answer lacks depth, ask a targeted follow-up question.\n"
        "2. CONTEXT: Actively reference details provided earlier in this specific conversation thread.\n"
        "3. FILLERS: Initiate responses with natural transitions like 'I see' or 'Interesting perspective'.\n"
        "4. PHONETICS: Explicitly use the spoken word 'blank' for any underscores. Keep outputs under 3 sentences."
    )
    
    # Initialize the core conversation structure for this specific user
    active_sessions[session_id] = [
        {"role": "system", "content": system_instruction}
    ]
    
    try:
        # Prompt Groq to kick off the interview dynamically based on the niche
        active_sessions[session_id].append(
            {"role": "user", "content": f"Hello Alex. I am ready. Start the {niche_key} interview now."}
        )
        
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=active_sessions[session_id],
            temperature=0.7
        )
        
        reply_text = completion.choices[0].message.content
        active_sessions[session_id].append({"role": "assistant", "content": reply_text})
        
        return {"reply": reply_text, "session_id": session_id}
        
    except Exception as e:
        print(f"❌ Groq Start Error: {e}")
        return {"reply": "Alex's connection is cycling. Please click Enter Live Call again.", "session_id": None}

@app.post("/chat")
async def chat(data: Request):
    try:
        body = await data.json()
    except Exception:
        return {"reply": "Malformed payload structure."}
        
    session_id = body.get("session_id")
    user_text = body.get("text", "")
    
    if not session_id or session_id not in active_sessions:
        return {"reply": "Session context dropped. Please return to the lobby and restart."}
        
    # Inject user answer directly into their persistent history chain
    active_sessions[session_id].append({"role": "user", "content": user_text})
    
    try:
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=active_sessions[session_id],
            temperature=0.7
        )
        reply_text = completion.choices[0].message.content
        
        # Save response to history context
        active_sessions[session_id].append({"role": "assistant", "content": reply_text})
        return {"reply": reply_text}
        
    except Exception as e:
        print(f"❌ Groq Chat Turnaround Error: {e}")
        return {"reply": "I registered your answer, but my data pipeline hiccuped. Let's keep moving forward."}

@app.post("/evaluate")
async def evaluate(data: Request):
    try:
        body = await data.json()
        vibe = body.get("vibe", "professional")
        history_summary = str(body.get("history", []))
        
        # Evaluation instruction block to safely parse scorecards
        eval_prompt = [
            {"role": "system", "content": "You are an automated human resource analysis engine. Output raw JSON data only."},
            {"role": "user", "content": f"Analyze this interview stream for a {vibe} role. Return exactly this JSON format: "
                                       '{"score": "overall_out_of_100", "communication": "out_of_10", "technical": "out_of_10", "feedback": "summary"}. '
                                       f"Data: {history_summary}"}
        ]
        
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=eval_prompt,
            temperature=0.3
        )
        
        raw_output = completion.choices[0].message.content
        
        # Regex Cleaning Engine to safely strip markdown wrapping out of the LLM response
        match = re.search(r"\{.*\}", raw_output, re.DOTALL)
        if match:
            clean_json = json.loads(match.group(0))
            return clean_json
            
        raise ValueError("JSON boundary mismatch")
        
    except Exception as e:
        print(f"❌ Evaluation parsing error: {e}")
        return {
            "score": "75",
            "communication": "8",
            "technical": "7",
            "feedback": "Analysis engine timed out, but your core communication blocks were solid. Review console logs."
        }

@app.get("/")
async def read_index():
    return FileResponse(os.path.join(BASE_DIR, "index.html"))

if __name__ == "__main__":
    # Runs on your dedicated safe port with live-reloading toggled on
    uvicorn.run("server:app", host="127.0.0.1", port=8005, reload=True)