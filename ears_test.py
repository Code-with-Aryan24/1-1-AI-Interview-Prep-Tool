import speech_recognition as sr

def test_ears():
    recognizer = sr.Recognizer()

    # --- THE PATIENCE SETTINGS ---
    # How many seconds of silence signifies the end of a sentence?
    # 2.0 is great for interviews where you need to think.
    recognizer.pause_threshold = 2.5 
    
    # This ignores very short sounds like a "click" or a "cough"
    recognizer.non_speaking_duration = 0.5 

    with sr.Microphone() as source:
        print("\n--- Calibration: Stay quiet for a moment ---")
        recognizer.adjust_for_ambient_noise(source, duration=1)
        # Standard high-quality audio sample rate
        source.SAMPLE_RATE = 48000 
        source.SAMPLE_WIDTH = 2
        
        # Increase the 'energy_threshold' slightly if it's too sensitive
        # recognizer.energy_threshold += 50 

        print("\n--- Listening... (I'll wait 2.5s after you finish speaking) ---")
        print("Go ahead, explain a complex topic!")

        try:
            # timeout: how long to wait for you to START
            # phrase_time_limit: max length of the WHOLE sentence
            audio = recognizer.listen(source, timeout=10, phrase_time_limit=None)
            
            print("--- Processing your long answer... ---")

            text = recognizer.recognize_google(audio)
            print(f"\nSUCCESS! You said: \n\"{text}\"")
            return text

        except sr.WaitTimeoutError:
            print("❌ Error: You didn't start speaking in time.")
        except sr.UnknownValueError:
            print("❌ Error: I heard sound but couldn't understand the words.")
        except Exception as e:
            print(f"❌ An unexpected error occurred: {e}")

if __name__ == "__main__":
    test_ears()