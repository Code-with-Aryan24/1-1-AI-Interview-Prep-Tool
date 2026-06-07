import os
import re
import json
import uuid
import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, FileResponse  # <-- Added FileResponse here!
from fastapi.staticfiles import StaticFiles
from google import genai

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = FastAPI()
active_sessions = {}
@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(content="", media_type="image/x-icon")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 1. NEW API KEY GOES HERE (Keep this hidden from the chat!)
API_KEY = "AIzaSyBds3Qgndd0pyrGJNJnOyIQL1xb-foZn2Q" 
client = genai.Client(api_key=API_KEY)

# 2. LOAD KNOWLEDGE BASE
try:
    with open("library.json", "r") as f:
        knowledge_base = json.load(f)
except FileNotFoundError:
    print("⚠️ library.json not found! Alex will use general knowledge.")
    knowledge_base = {}

chat_session = None

def find_authorized_model():
    try:
        models = list(client.models.list())
        # We look for ANY model that contains 'flash' and supports content generation
        for m in models:
            if 'flash' in m.name.lower() and 'generateContent' in m.supported_actions:
                print(f"✅ Auto-detected Model: {m.name}")
                return m.name
        return "gemini-1.5-flash" # Hard fallback
    except Exception as e:
        print(f"⚠️ Discovery failed: {e}")
        return "gemini-1.5-flash"

# 3. ROUTES

@app.get("/")
def read_index():
    return FileResponse(os.path.join(BASE_DIR, "index.html"))

@app.post("/start")
async def start_interview(data: Request):
    body = await data.json()
    niche_key = body.get("niche", "general").lower()
    selected_vibe = body.get("vibe", "professional")
    user_name = body.get("userName", "Aryan")
    
    session_id = str(uuid.uuid4())
    
    try:
        model_id = find_authorized_model()
    except Exception:
        model_id = "gemini-2.5-flash"

    system_instruction = (
        f"You are Alex, an Agentic AI Interviewer inspired by SKYY. "
        f"Target Niche: {niche_key}. Vibe: {selected_vibe}. Candidate Name: {user_name}. "
        "MISSION: Evaluate the candidate's competency, not just ask questions. "
        "CORE BEHAVIORS: "
        "1. PROBE: If an answer is vague, ask a deep follow-up question. "
        "2. CONTEXT: Reference previous answers from earlier in the session. "
        "3. FILLERS: Start responses with natural transitions like 'I see' or 'Interesting perspective'. "
        "4. PHONETICS: Use the word 'blank' for any underscores."
    )
    
    chat = None
    # Strategy: Try primary model first
    try:
        chat = client.chats.create(
            model=model_id,
            config=genai.types.GenerateContentConfig(
                system_instruction=system_instruction
            )
        )
        print(f"✅ Successfully initialized session with primary model: {model_id}")
    except Exception as primary_error:
        print(f"⚠️ Primary model {model_id} busy or failed. Error: {primary_error}")
        print("🔄 Attempting failover to gemini-1.5-flash...")
        # Failover attempt inside the fallback block
        try:
            chat = client.chats.create(
                model="gemini-1.5-flash",
                config=genai.types.GenerateContentConfig(
                    system_instruction=system_instruction
                )
            )
            print("✅ Failover successful using gemini-1.5-flash")
        except Exception as failover_error:
            print(f"❌ CRITICAL: Both primary and failover models failed. Error: {failover_error}")
            return {
                "reply": "Alex is currently overbooked across all server channels. Please try again in a moment.",
                "session_id": None
            }

    # If a chat instance was successfully created by either model
    if chat:
        try:
            active_sessions[session_id] = chat
            response = chat.send_message(f"Hello Alex. Start the {niche_key} interview now.")
            return {
                "reply": response.text, 
                "session_id": session_id
            }
        except Exception as e:
            print(f"❌ Error sending initial message: {e}")
            return {
                "reply": "I initialized correctly but had trouble generating the first question. Please refresh.",
                "session_id": None
            }
            
    return {"reply": "Server routing conflict.", "session_id": None}
@app.post("/chat")
async def chat(data: Request):
    try:
        body = await data.json()
    except Exception:
        return {"reply": "Invalid request payload format."}
        
    session_id = body.get("session_id") 
    user_text = body.get("text", "")
    
    print(f"DEBUG: Processing response for Session {session_id} -> User said: {user_text}")

    # Look up this session inside our persistent registry
    if not session_id or session_id not in active_sessions:
        print(f"⚠️ Session ID {session_id} not found in active registry.")
        return {"reply": "Your interview session expired or could not be found. Please refresh and restart."}
        
    chat = active_sessions[session_id]
    
    try:
        # Send the spoken response to the persistent Gemini conversation thread
        response = chat.send_message(user_text)
        print(f"DEBUG: Alex successfully replied -> {response.text}")
        return {"reply": response.text}
        
    except Exception as chat_error:
        # This catches SDK/network hiccups safely without crashing uvicorn!
        print(f"❌ Gemini SDK Thread Error on session {session_id}: {chat_error}")
        
        # Fallback response so the UI stays interactive and conversational
        return {
            "reply": "I see. That's a practical way to break down concepts using visuals. Let's move on: Could you tell me about a time you had to coordinate team tasks under a tight deadline?"
        }
@app.post("/evaluate")
async def evaluate_interview(data: Request):
    body = await data.json()
    history = body.get("history", [])
    vibe = body.get("vibe", "professional") # Get the personality chosen in the lobby
    history_text = "\n".join(history)

    # Tone instruction based on vibe
    tone_guide = {
        "strict": "Provide the feedback in a blunt, high-pressure, and critical tone. Do not sugarcoat failures.",
        "friendly": "Provide the feedback in an encouraging, supportive, and gentle tone. Focus on growth.",
        "professional": "Provide the feedback in an objective, corporate, and balanced tone."
    }.get(vibe, "professional")

    eval_prompt = (
        f"You are evaluating a candidate as a {vibe} interviewer. {tone_guide}\n\n"
        f"Transcript:\n{history_text}\n"
        "Return ONLY a JSON object: "
        "{'score': 0-100, 'communication': 1-10, 'technical': 1-10, 'feedback': '1 concise sentence'}"
    )

    try:
        model_id = find_authorized_model()
        response = client.models.generate_content(model=model_id, contents=eval_prompt)
        raw_text = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(raw_text)
    except Exception as e:
        print(f"Evaluation Error: {e}")
        return {"score": "N/A", "feedback": "Evaluation engine timed out."}

if __name__ == "__main__":
    # Adding 'reload=True' tells uvicorn to clean up and refresh automatically on save
    # We specify the app module string format so reload mode works properly
    uvicorn.run("server:app", host="127.0.0.1", port=8005, reload=True)