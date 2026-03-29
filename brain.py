from google import genai
import speech_recognition as sr
import pyttsx3
import time # New import for the 'breathe' gap

# 1. Configuration
API_KEY = "AIzaSyAwHNbDL9WFlt4pYM6qoXVloPbmps9JTN8"
client = genai.Client(api_key=API_KEY)

def speak(text):
    """Robust speaker function with state management."""
    print(f"\n🤖 Alex: {text}")
    
    # Initialize engine locally to prevent state hangs
    engine = pyttsx3.init()
    voices = engine.getProperty('voices')
    engine.setProperty('voice', voices[1].id) 
    engine.setProperty('rate', 180)
    
    engine.say(text)
    engine.runAndWait()
    
    # Crucial: Give the hardware 0.5 seconds to switch from speaker to mic
    time.sleep(0.5)

def find_best_model():
    try:
        for model in client.models.list():
            if 'generateContent' in model.supported_actions and 'flash' in model.name:
                return model.name
        return "gemini-2.0-flash" 
    except Exception as e:
        print(f"❌ Connection Error: {e}")
        return None

def listen():
    recognizer = sr.Recognizer()
    recognizer.pause_threshold = 2.0
    with sr.Microphone() as source:
        print("🎤 (Alex is listening...)")
        recognizer.adjust_for_ambient_noise(source, duration=0.5)
        try:
            audio = recognizer.listen(source, timeout=10)
            print("☁️  Processing...")
            return recognizer.recognize_google(audio)
        except:
            return None

def start_interview():
    model_id = find_best_model()
    if not model_id: return

    print("\n" + "="*45)
    print("   AI VOICE INTERVIEWER v3.1 (STABLE)   ")
    print("="*45 + "\n")
    
    niche = input("Enter Niche (e.g. Java Backend): ")
    
    print("\n1. Strict | 2. Friendly | 3. Professional")
    p_choice = input("Select Personality: ")
    vibe = {"1": "strict and tough", "2": "friendly and supportive", "3": "professional"}.get(p_choice, "professional")

    system_instruction = (
        f"You are a senior interviewer named Alex for a {niche} role. "
        f"Your personality is {vibe}. Ask ONE short question at a time. "
        "Keep responses under 3 sentences for natural conversation."
    )

    chat = client.chats.create(model=model_id, config={'system_instruction': system_instruction})

    # Start conversation
    response = chat.send_message("Hello Alex, I'm ready to begin.")
    speak(response.text) 

    while True:
        user_text = listen()
        if user_text:
            print(f"👤 You: {user_text}")
            
            if any(w in user_text.lower() for w in ['exit', 'quit', 'bye']):
                speak("Thank you for a great session. Goodbye!")
                break
            
            try:
                # Get the AI's thought
                response = chat.send_message(user_text)
                # Make the AI speak that thought
                speak(response.text) 
            except Exception as e:
                print(f"Brain Error: {e}")
                break
        else:
            # If nothing was heard, Alex should gently prompt you
            print("... (Alex is waiting for you to speak)")

if __name__ == "__main__":
    start_interview()