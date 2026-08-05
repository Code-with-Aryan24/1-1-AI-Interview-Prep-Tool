import React, { useState, useEffect } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Sparkles } from "lucide-react";
import HRAvatar from "./HRAvatar";
import CandidateStream from "./CandidateStream";

export default function InterviewRoom({ onEndInterview }) {
  // State variables for interview settings and controls
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [hrGender, setHrGender] = useState("female"); // "female" | "male"
  const [aiResponse, setAiResponse] = useState(
    "Hello! Welcome to your AI technical interview. I'm Sophia, your interviewer today. When you are ready, please give a brief introduction about yourself and your technical background."
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");

  // Candidate Metrics (updated live via CandidateStream)
  const [candidateMetrics, setCandidateMetrics] = useState({
    eyeContact: 85,
    headPose: "Centered",
    expression: "Neutral",
  });

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* 1. Header Bar */}
      <header className="h-16 border-b border-slate-800/80 px-6 flex items-center justify-between bg-slate-900/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-100 leading-tight">
              AI Technical Interview
            </h1>
            <p className="text-xs text-slate-400">Live Session • Local WebGL & Vision Engine</p>
          </div>
        </div>

        {/* HR Avatar Gender Selector */}
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
            onClick={onEndInterview}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-md transition-all"
          >
            <PhoneOff className="w-4 h-4" />
            End Session
          </button>
        </div>
      </header>

      {/* 2. Main Meeting Grid */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 min-h-0 overflow-hidden">
        {/* Left Side: 3D AI HR Avatar */}
        <div className="h-full w-full relative">
          <HRAvatar
            hrGender={hrGender}
            currentResponse={aiResponse}
            isProcessing={isProcessing}
          />
        </div>

        {/* Right Side: Candidate Stream + Local Face Tracking */}
        <div className="h-full w-full relative">
          <CandidateStream
            isVideoOn={isVideoOn}
            isMicOn={isMicOn}
            onMetricsUpdate={setCandidateMetrics}
            onTranscriptUpdate={setTranscript}
          />
        </div>
      </main>

      {/* 3. Bottom Meeting Control Bar */}
      <footer className="h-20 border-t border-slate-800/80 px-6 flex items-center justify-between bg-slate-900/60 backdrop-blur-md">
        {/* Analytics Quick View */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="bg-slate-800/60 px-3 py-1.5 rounded-md border border-slate-700/40">
            <span className="text-slate-400">Eye Contact: </span>
            <span className={candidateMetrics.eyeContact > 70 ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
              {candidateMetrics.eyeContact}%
            </span>
          </div>
          <div className="bg-slate-800/60 px-3 py-1.5 rounded-md border border-slate-700/40">
            <span className="text-slate-400">Pose: </span>
            <span className="text-indigo-300 font-semibold">{candidateMetrics.headPose}</span>
          </div>
        </div>

        {/* Media Controls */}
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
            title={isVideoOn ? "Turn Camera Off" : "Turn Camera On"}
          >
            {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>
        </div>

        {/* Live Status Indicator */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
            {isProcessing ? "HR Thinking..." : "Live Connection"}
          </span>
        </div>
      </footer>
    </div>
  );
}