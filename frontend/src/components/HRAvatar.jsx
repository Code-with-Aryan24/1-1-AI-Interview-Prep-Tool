import React, { useEffect, useRef, useState } from "react";
import { TalkingHead } from "@talkinghead/talkinghead";
import { Loader2, UserCheck } from "lucide-react";

export default function HRAvatar({ hrGender = "female", currentResponse = "", isProcessing = false }) {
  const avatarContainerRef = useRef(null);
  const headRef = useRef(null);
  const [isLoadingModel, setIsLoadingModel] = useState(true);

  // Ready Player Me GLB Avatar URLs (Free public avatars)
  const avatarUrls = {
    female: "https://models.readyplayer.me/64b7a9f77f59868e82a32194.glb",
    male: "https://models.readyplayer.me/64b7a9f77f59868e82a3219e.glb",
  };

  useEffect(() => {
    if (!avatarContainerRef.current) return;

    setIsLoadingModel(true);

    // Initialize TalkingHead Engine on the Container Element
    const head = new TalkingHead(avatarContainerRef.current, {
      ttsEndpoint: null, // We handle TTS via backend / Web Speech
      cameraView: "upper", // Upper body framing for interview setting
      cameraDistance: 0.6,
    });

    headRef.current = head;

    // Load selected avatar model
    const selectedUrl = avatarUrls[hrGender] || avatarUrls.female;
    head
      .showAvatar({
        url: selectedUrl,
        body: "F",
        avatarMood: "neutral",
      })
      .then(() => {
        setIsLoadingModel(false);
      })
      .catch((err) => {
        console.error("Failed to load 3D Ready Player Me Avatar:", err);
        setIsLoadingModel(false);
      });

    return () => {
      if (headRef.current) {
        headRef.current.stopSpeaking();
      }
    };
  }, [hrGender]);

  // Trigger speech / lip animation whenever new response text arrives
  useEffect(() => {
    if (headRef.current && currentResponse && !isLoadingModel) {
      try {
        headRef.current.speakText(currentResponse);
      } catch (err) {
        console.warn("TalkingHead text playback notice:", err);
      }
    }
  }, [currentResponse, isLoadingModel]);

  return (
    <div className="relative w-full h-full rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* 3D WebGL Canvas Container */}
      <div
        ref={avatarContainerRef}
        className="w-full h-full min-h-[320px] flex items-center justify-center"
      />

      {/* Loading Overlay */}
      {(isLoadingModel || isProcessing) && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          <p className="text-xs text-slate-300 font-medium">
            {isLoadingModel ? "Rendering 3D HR Avatar..." : "Sophia is thinking..."}
          </p>
        </div>
      )}

      {/* Overlay Dialog Bubble */}
      <div className="absolute top-4 left-4 right-4 z-20 bg-slate-950/80 border border-slate-800 backdrop-blur-md p-3 rounded-xl shadow-xl">
        <p className="text-[10px] text-indigo-400 font-mono uppercase tracking-wider mb-1">
          {hrGender === "female" ? "Sophia (HR Manager)" : "Alex (HR Manager)"}
        </p>
        <p className="text-xs text-slate-200 leading-relaxed line-clamp-3">
          {currentResponse || "Listening..."}
        </p>
      </div>

      {/* Profile Tag */}
      <div className="absolute bottom-3 left-3 z-20 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-800 flex items-center gap-2">
        <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
        <span className="text-xs font-medium text-slate-200">
          {hrGender === "female" ? "Sophia (AI Host)" : "Alex (AI Host)"}
        </span>
      </div>
    </div>
  );
}