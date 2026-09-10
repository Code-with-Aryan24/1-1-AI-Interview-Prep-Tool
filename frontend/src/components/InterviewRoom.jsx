import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Sparkles, Send } from "lucide-react";
import HRAvatar from "./HRAvatar";
import CandidateStream from "./CandidateStream";

export default function InterviewRoom({ onEndInterview, candidateName = "Candidate", initialIntro = "" }) {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [hrGender, setHrGender] = useState("female");
  const [aiResponse, setAiResponse] = useState(
    initialIntro ||
      `Hello ${candidateName}, welcome to your technical interview. I'm Sophia. When you are ready, please give a brief introduction about your engineering background and core technical skills.`
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputText, setInputText] = useState("");
  const [candidateMetrics, setCandidateMetrics] = useState({
    eyeContact: "Good",
    headPose: "Centered",
    confidenceScore: 85,
  });

  const audioRef = useRef(new Audio());
  const recognitionRef = useRef(null);

  // Native Speech Synthesis fallback
  const speakNativeFallback = useCallback((text, gender) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = gender === "female" ? 1.05 : 0.95;

    const voices = window.speechSynthesis.getVoices();
    const targetVoice = voices.find((v) =>
      gender === "female"
        ? v.name.includes("Female") || v.name.includes("Zira") || v.name.includes("Samantha") || v.name.includes("Google UK English Female")
        : v.name.includes("Male") || v.name.includes("David") || v.name.includes("Google UK English Male")
    );
    if (targetVoice) utterance.voice = targetVoice;

    window.speechSynthesis.speak(utterance);
  }, []);

  // Send message to FastAPI pipeline
  const handleSendResponse = useCallback(
    async (textToSend) => {
      const message = (textToSend || inputText).trim();
      if (!message || isProcessing) return;

      setIsProcessing(true);
      setInputText("");

      try {
        const res = await fetch("http://localhost:8005/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: message,
            hr_gender: hrGender,
            role: "Full Stack Software Engineer",
          }),
        });

        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);

        const data = await res.json();
        const reply = data.reply || data.message;
        setAiResponse(reply);

        if (data.audio_url) {
          audioRef.current.src = data.audio_url;
          audioRef.current.play().catch((playErr) => {
            console.warn("Audio playback blocked, using speech synthesis fallback:", playErr);
            speakNativeFallback(reply, hrGender);
          });
        } else {
          speakNativeFallback(reply, hrGender);
        }
      } catch (err) {
        console.error("Backend interaction error:", err);
        const fallbackReply = "I had trouble processing that response. Could you please elaborate further?";
        setAiResponse(fallbackReply);
        speakNativeFallback(fallbackReply, hrGender);
      } finally {
        setIsProcessing(false);
      }
    },
    [inputText, isProcessing, hrGender, speakNativeFallback]
  );

  // Play initial greeting once on component mount
  useEffect(() => {
    if (initialIntro) {
      speakNativeFallback(initialIntro, hrGender);
    }
  }, [initialIntro, hrGender, speakNativeFallback]);

  // Live Speech Recognition for Candidate Mic
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition API unavailable in this browser environment.");
      return;
    }

    if (!isMicOn) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const currentIndex = event.resultIndex;
      const transcript = event.results[currentIndex][0].transcript.trim();
      if (transcript && !isProcessing) {
        handleSendResponse(transcript);
      }
    };

    recognition.onerror = (e) => {
      if (e.error !== "no-speech") {
        console.warn("Speech recognition status:", e.error);
      }
    };

    recognition.onend = () => {
      // Auto-restart if mic remains enabled
      if (isMicOn) {
        try {
          recognition.start();
        } catch (_) {}
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (_) {}

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, [isMicOn, isProcessing, handleSendResponse]);

  // Session termination handler
  const handleEndSession = async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    window.speechSynthesis?.cancel();

    try {
      await fetch("http://localhost:8005/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_name: candidateName,
          average_eye_contact: candidateMetrics.eyeContact === "Good" ? 88.0 : 65.0,
          average_confidence: candidateMetrics.confidenceScore,
        }),
      });
    } catch (err) {
      console.warn("Could not post end session to backend:", err);
    }

    if (onEndInterview) {
      onEndInterview();
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Top Header */}
      <header className="h-16 border-b border-slate-800/80 px-6 flex items-center justify-between bg-slate-900/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-100 leading-tight">
              AI Technical Interview Room
            </h1>
            <p className="text-xs text-slate-400">
              Candidate: <span className="text-slate-200 font-medium">{candidateName}</span> • Real-Time Vision & Voice
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-800/80 p-1 rounded-lg border border-slate-700/50 text-xs">
            <button
              onClick={() => setHrGender("female")}
              className={`px-3 py-1 rounded-md transition-all ${
                hrGender === "female"
                  ? "bg-indigo-600 text-white font-medium shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Sophia (Female)
            </button>
            <button
              onClick={() => setHrGender("male")}
              className={`px-3 py-1 rounded-md transition-all ${
                hrGender === "male"
                  ? "bg-indigo-600 text-white font-medium shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Alex (Male)
            </button>
          </div>

          <button
            onClick={handleEndSession}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-md transition-all"
          >
            <PhoneOff className="w-4 h-4" />
            End Session
          </button>
        </div>
      </header>

      {/* Main Split Grid */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 min-h-0 overflow-hidden">
        {/* Left View: 3D AI Interviewer */}
        <div className="h-full w-full relative">
          <HRAvatar
            hrGender={hrGender}
            currentResponse={aiResponse}
            isProcessing={isProcessing}
          />
        </div>

        {/* Right View: Candidate Camera + Live Response Bar */}
        <div className="h-full w-full flex flex-col gap-4 min-h-0">
          <div className="flex-1 min-h-0 relative">
            <CandidateStream
              isVideoOn={isVideoOn}
              isMicOn={isMicOn}
              onMetricsUpdate={setCandidateMetrics}
            />
          </div>

          {/* Prompt / Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendResponse();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isMicOn ? "Speak into your mic or type an answer here..." : "Microphone muted. Type your response..."}
              disabled={isProcessing}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isProcessing || !inputText.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-5 rounded-xl transition flex items-center justify-center shadow-lg"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>

      {/* Footer Controls & Live Diagnostics */}
      <footer className="h-20 border-t border-slate-800/80 px-6 flex items-center justify-between bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="bg-slate-800/60 px-3 py-1.5 rounded-md border border-slate-700/40 flex items-center gap-1.5">
            <span className="text-slate-400">Eye Contact:</span>
            <span className={candidateMetrics.eyeContact === "Good" ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
              {candidateMetrics.eyeContact}
            </span>
          </div>
          <div className="bg-slate-800/60 px-3 py-1.5 rounded-md border border-slate-700/40 flex items-center gap-1.5">
            <span className="text-slate-400">Head Pose:</span>
            <span className="text-indigo-300 font-semibold">{candidateMetrics.headPose}</span>
          </div>
          <div className="bg-slate-800/60 px-3 py-1.5 rounded-md border border-slate-700/40 flex items-center gap-1.5">
            <span className="text-slate-400">Confidence:</span>
            <span className="text-emerald-400 font-semibold">{candidateMetrics.confidenceScore}%</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsMicOn(!isMicOn)}
            className={`p-3.5 rounded-full border transition-all ${
              isMicOn
                ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                : "bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30"
            }`}
            title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
          >
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setIsVideoOn(!isVideoOn)}
            className={`p-3.5 rounded-full border transition-all ${
              isVideoOn
                ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                : "bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30"
            }`}
            title={isVideoOn ? "Turn Off Camera" : "Turn On Camera"}
          >
            {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isProcessing ? "bg-amber-400" : "bg-emerald-400"
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isProcessing ? "bg-amber-500" : "bg-emerald-500"
              }`}
            ></span>
          </span>
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
            {isProcessing ? "Sophia Listening & Nodding..." : "Pipeline Live (Port 8005)"}
          </span>
        </div>
      </footer>
    </div>
  );
}