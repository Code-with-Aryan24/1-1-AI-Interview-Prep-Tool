import pyttsx3

def test_voice():
    # 1. Initialize the engine
    engine = pyttsx3.init()

    # 2. Get available voices (Windows usually has a Male and Female voice)
    voices = engine.getProperty('voices')
    
    # Let's set it to a professional voice (usually index 1 is female, 0 is male)
    engine.setProperty('voice', voices[1].id) 

    # 3. Adjust speed (150-200 is natural human speed)
    engine.setProperty('rate', 175) 

    print("Alex is speaking...")
    engine.say("Hello Aryan. I am your AI interviewer. Can you hear me clearly?")
    
    # 4. Run the speech
    engine.runAndWait()

if __name__ == "__main__":
    test_voice()