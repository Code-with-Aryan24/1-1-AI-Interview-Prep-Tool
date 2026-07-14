import React, { useState, useEffect, useRef } from 'react';

export default function InterviewRoom({ candidateName = "Aryan", onEndInterview }) {
  const [messages, setMessages] = useState([]);
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [alexStatus, setAlexStatus] = useState('Idle'); // 'Idle', 'Thinking...', 'Speaking...'

  const recognitionRef = useRef(null);
  const latestTranscriptRef = useRef('');

  // 1. Initial Opening Setup
  const getInitialGreeting = () => {
    return `Welcome ${candidateName}. Let's jump straight in. Can you explain how you handle state management and asynchronous data flow in modern applications?`;
  };

  // 2. Initialize Web Speech API for User Input (Ears)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        const current = event.resultIndex;
        const text = event.results[current][0].transcript;
        setTranscript(text);
        latestTranscriptRef.current = text;
      };

      recognition.onend = () => {
        setIsListening(false);
        // Automatically send response when candidate finishes speaking
        if (latestTranscriptRef.current.trim() !== '') {
          handleUserResponse(latestTranscriptRef.current);
        }
      };

      recognitionRef.current = recognition;
    } else {
      alert("Browser does not support Speech Recognition. Please use Chrome.");
    }

    // Set initial greeting text on mount
    const openingMsg = getInitialGreeting();
    setMessages([{ sender: 'alex', text: openingMsg }]);
  }, []);

  // 3. Start/Stop Microphone Controls
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      latestTranscriptRef.current = '';
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // 4. Send Response to FastAPI & Play ElevenLabs Audio Stream
  const handleUserResponse = async (userTranscript) => {
    if (!userTranscript || userTranscript.trim() === '') return;

    // Append Candidate message to UI
    setMessages((prev) => [...prev, { sender: 'candidate', text: userTranscript }]);
    setTranscript('');
    latestTranscriptRef.current = '';
    setAlexStatus('Thinking...');

    try {
      const response = await fetch("http://127.0.0.1:8005/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: "default_session",
          user_text: userTranscript,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Append Alex response to UI
        setMessages((prev) => [...prev, { sender: 'alex', text: data.response }]);

        // Play ElevenLabs Neural Voice if audio is returned
        if (data.audio) {
          setAlexStatus('Speaking...');
          const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
          
          audio.onended = () => {
            setAlexStatus('Idle');
          };

          audio.play().catch((err) => {
            console.error("Audio playback error:", err);
            setAlexStatus('Idle');
          });
        } else {
          setAlexStatus('Idle');
        }
      } else {
        console.error("Server returned error:", data);
        setMessages((prev) => [
          ...prev,
          { sender: 'alex', text: "SYSTEM ERROR: Check your Python terminal for Groq API key or FastAPI backend logs." }
        ]);
        setAlexStatus('Idle');
      }
    } catch (error) {
      console.error("Backend Connection Error:", error);
      setMessages((prev) => [
        ...prev,
        { sender: 'alex', text: "SYSTEM ERROR: Unable to connect to backend server on port 8005." }
      ]);
      setAlexStatus('Idle');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 flex flex-col justify-between font-mono">
      {/* Top Header */}
      <header className="flex justify-between items-center border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse" />
          <h1 className="text-xl font-bold tracking-wider">PROJECT // ALEX</h1>
        </div>
        <span className="text-xs text-neutral-500 border border-neutral-800 px-2 py-1 rounded">v1.0.0-MVP</span>
      </header>

      {/* Candidate / Alex Status Row */}
      <div className="grid grid-cols-2 gap-4 my-4">
        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-lg">
          <span className="text-xs text-neutral-500 block uppercase tracking-wider">Candidate</span>
          <span className="text-lg font-bold text-cyan-400">{candidateName}</span>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-lg flex justify-between items-center">
          <div>
            <span className="text-xs text-neutral-500 block uppercase tracking-wider">Alex Status</span>
            <span className="text-lg font-bold text-neutral-200">{alexStatus}</span>
          </div>
          {onEndInterview && (
            <button
              onClick={onEndInterview}
              className="px-3 py-1 bg-red-950 text-red-400 border border-red-800 rounded hover:bg-red-900 transition-colors text-sm"
            >
              End Interview
            </button>
          )}
        </div>
      </div>

      {/* Chat Messages Stream */}
      <div className="flex-1 overflow-y-auto space-y-4 my-4 pr-2 max-h-[50vh]">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex flex-col ${
              msg.sender === 'candidate' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-2xl p-4 rounded-lg border ${
                msg.sender === 'candidate'
                  ? 'bg-cyan-950/40 border-cyan-800/50 text-cyan-200'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-200'
              }`}
            >
              <span className="text-xs text-neutral-500 block mb-1 uppercase">
                {msg.sender === 'candidate' ? candidateName : 'Alex'}
              </span>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Mic Controls & Real-time Transcript */}
      <div className="border-t border-neutral-800 pt-4 space-y-4">
        <div className="bg-neutral-900 border border-neutral-800 p-3 rounded text-sm min-h-[48px] flex items-center text-neutral-400">
          {isListening ? (
            <span className="text-cyan-400 animate-pulse">Listening: {transcript || "..."}</span>
          ) : (
            <span>Press microphone button and answer Alex...</span>
          )}
        </div>

        <div className="flex justify-center">
          <button
            onClick={isListening ? stopListening : startListening}
            className={`w-full max-w-md py-4 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-2 ${
              isListening
                ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                : 'bg-cyan-500 hover:bg-cyan-400 text-neutral-950'
            }`}
          >
            🎤 {isListening ? 'STOP SPEAKING' : 'PUSH TO SPEAK'}
          </button>
        </div>
      </div>
    </div>
  );
}