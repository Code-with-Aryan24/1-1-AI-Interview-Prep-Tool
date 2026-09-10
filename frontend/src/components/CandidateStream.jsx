import React, { useEffect, useRef, useState } from "react";
import { VideoOff, Eye, Activity } from "lucide-react";

export default function CandidateStream({ isVideoOn, onMetricsUpdate }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const faceMeshRef = useRef(null);

  const [eyeContact, setEyeContact] = useState("Good");
  const [headPose, setHeadPose] = useState("Centered");
  const [confidenceScore, setConfidenceScore] = useState(85);

  useEffect(() => {
    let isCancelled = false;

    // Helper to dynamically load external scripts without bundler errors
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src = src;
        script.crossOrigin = "anonymous";
        script.onload = () => resolve();
        script.onerror = reject;
        document.body.appendChild(script);
      });
    };

    const initMediaPipe = async () => {
      try {
        await Promise.all([
          loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"),
          loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js"),
        ]);

        if (isCancelled || !window.FaceMesh || !window.Camera) return;

        const faceMesh = new window.FaceMesh({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });

        faceMeshRef.current = faceMesh;

        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        faceMesh.onResults((results) => {
          if (!canvasRef.current || !results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            return;
          }

          const canvasCtx = canvasRef.current.getContext("2d");
          canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

          const landmarks = results.multiFaceLandmarks[0];

          // Key landmark indices
          const noseTip = landmarks[1];
          const leftEye = landmarks[33];
          const rightEye = landmarks[263];

          // 1. Calculate Head Yaw / Eye Contact
          const eyeCenterDist = Math.abs(leftEye.x - rightEye.x);
          const noseToEyeRatio = Math.abs(noseTip.x - leftEye.x) / (eyeCenterDist || 1);

          let currentEyeContact = "Good";
          let currentHeadPose = "Centered";

          if (noseToEyeRatio < 0.3 || noseToEyeRatio > 0.7) {
            currentEyeContact = "Looking Away";
            currentHeadPose = noseToEyeRatio < 0.3 ? "Turned Left" : "Turned Right";
          }

          // 2. Calculate Confidence / Posture metric baseline
          const calculatedScore = Math.min(
            100,
            Math.max(50, Math.round(85 + (0.5 - Math.abs(0.5 - noseToEyeRatio)) * 30))
          );

          setEyeContact(currentEyeContact);
          setHeadPose(currentHeadPose);
          setConfidenceScore(calculatedScore);

          if (onMetricsUpdate) {
            onMetricsUpdate({
              eyeContact: currentEyeContact,
              headPose: currentHeadPose,
              confidenceScore: calculatedScore,
            });
          }

          // 3. Draw key landmarks overlay
          canvasCtx.fillStyle = "#818cf8";
          [1, 33, 263, 13, 14].forEach((idx) => {
            const point = landmarks[idx];
            canvasCtx.beginPath();
            canvasCtx.arc(
              point.x * canvasRef.current.width,
              point.y * canvasRef.current.height,
              3,
              0,
              2 * Math.PI
            );
            canvasCtx.fill();
          });
        });

        if (videoRef.current && isVideoOn) {
          cameraRef.current = new window.Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && faceMeshRef.current) {
                await faceMeshRef.current.send({ image: videoRef.current });
              }
            },
            width: 640,
            height: 480,
          });
          cameraRef.current.start();
        }
      } catch (err) {
        console.error("Failed to load MediaPipe from CDN:", err);
      }
    };

    if (isVideoOn) {
      initMediaPipe();
    } else {
      if (cameraRef.current) cameraRef.current.stop();
    }

    return () => {
      isCancelled = true;
      if (cameraRef.current) cameraRef.current.stop();
    };
  }, [isVideoOn]);

  return (
    <div className="relative w-full h-full rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden">
      {isVideoOn ? (
        <>
          <video
            ref={videoRef}
            className="w-full h-full object-cover transform -scale-x-100"
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 pointer-events-none"
          />

          {/* Real-Time Live Analytics Overlay */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
            <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2 text-xs">
              <Eye className={`w-3.5 h-3.5 ${eyeContact === "Good" ? "text-emerald-400" : "text-amber-400"}`} />
              <span className="text-slate-400">Eye Contact:</span>
              <span className="font-semibold text-slate-200">{eyeContact}</span>
            </div>

            <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2 text-xs">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400">Confidence:</span>
              <span className="font-semibold text-slate-200">{confidenceScore}%</span>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center p-6">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-slate-800 flex items-center justify-center">
            <VideoOff className="w-6 h-6 text-slate-500" />
          </div>
          <p className="text-slate-500 text-xs">Camera is switched off</p>
        </div>
      )}

      {/* Candidate Tag */}
      <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-800 z-10">
        <span className="text-xs font-medium text-slate-200">You (Candidate)</span>
      </div>
    </div>
  );
}