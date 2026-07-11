import React, { useState, useEffect, useRef } from 'react';

export default function InterviewRoom({ sessionId, interviewData, onEnd }) {
  const [messages, setMessages] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [alexStatus, setAlexStatus] = useState('Idle');

  const recognitionRef = useRef(null);
  const latestTranscriptRef = useRef('');

  // Generate tailored initial opening question based on selected niche
  const getInitialGreeting = () => {
    const name = interviewData?.userName || "Candidate";
    const niche = interviewData?.niche || "technical";
    
    if (niche === 'technical') {
      return `Welcome ${name}. Let's jump straight in. Can you explain how you handle state management and asynchronous data flow in modern applications?`;
    } else if (niche === 'marketing') {
      return `Welcome ${name}. Let's get started. How do you analyze market signals to scale organic user acquisition for a new product?`;
    } else {
      return `Welcome ${name}. To begin our session, tell me about a time you had to lead a project under tight deadlines with conflicting priorities.`;
    }
  };

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
        if (latestTranscriptRef.current.trim()) {
          sendToAlex(latestTranscriptRef.current);
        }
      };

      recognitionRef.current = recognition;
    } else {
      alert("Browser does not support Speech Recognition. Please use Chrome.");
    }

    // Set and speak the tailored opening question immediately!
    const openingMsg = getInitialGreeting();
    setMessages([{ sender: 'alex', text: openingMsg }]);
    triggerAlexResponse(openingMsg);
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      latestTranscriptRef.current = '';
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const sendToAlex = async (userText) => {
    if (!userText.trim()) return;

    const userMsg = { sender: 'candidate', text: userText };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setAlexStatus('Thinking...');

    try {
      const response = await fetch('http://127.0.0.1:8005/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          user_text: userText
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      
      // Grab response from FastAPI payload
      const alexText = data.response || data.text || data.reply;
      
      if (!alexText) {
        throw new Error("Empty response payload from server.");
      }

      const alexMsg = { sender: 'alex', text: alexText };
      setMessages((prev) => [...prev, alexMsg]);
      triggerAlexResponse(alexText);

    } catch (err) {
      console.error("Backend Error:", err);
      const errorMsg = "SYSTEM ERROR: Check your Python terminal for Groq API key or FastAPI backend logs.";
      setMessages((prev) => [...prev, { sender: 'alex', text: errorMsg }]);
    } finally {
      setLoading(false);
      setTranscript('');
      latestTranscriptRef.current = '';
    }
  };

  const triggerAlexResponse = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setAlexStatus('Speaking...');
      utterance.onend = () => setAlexStatus('Listening / Idle');
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 font-sans text-white">
      {/* HEADER HUD */}
      <div className="flex justify-between items-center bg-zinc-950 p-4 border border-zinc-800 rounded mb-6 font-mono">
        <div>
          <span className="text-xs text-zinc-500 uppercase block">Candidate</span>
          <span className="text-cyan-400 font-bold">{interviewData?.userName || "Aryan"}</span>
        </div>
        <div className="text-center">
          <span className="text-xs text-zinc-500 uppercase block">Alex Status</span>
          <span className={`text-xs px-2 py-1 rounded font-bold ${alexStatus === 'Speaking...' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'bg-zinc-900 text-zinc-400'}`}>
            {alexStatus}
          </span>
        </div>
        <button 
          onClick={onEnd}
          className="bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800 px-3 py-1 rounded text-xs transition-all cursor-pointer"
        >
          End Interview
        </button>
      </div>

      {/* CHAT CONTAINER */}
      <div className="bg-zinc-950 border border-zinc-900 rounded p-4 h-[400px] overflow-y-auto space-y-4 mb-6">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.sender === 'candidate' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] p-3 rounded text-sm font-mono ${
              msg.sender === 'candidate' 
                ? 'bg-cyan-950/60 border border-cyan-800 text-cyan-200' 
                : 'bg-zinc-900 border border-zinc-800 text-zinc-200'
            }`}>
              <span className="text-[10px] block opacity-50 uppercase mb-1">{msg.sender}</span>
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-900 border border-zinc-800 p-3 rounded text-sm font-mono text-cyan-400 animate-pulse">
              Alex is processing response via Llama 3.3...
            </div>
          </div>
        )}
      </div>

      {/* SPEECH CONTROL PANEL */}
      <div className="bg-zinc-950 border border-zinc-800 p-4 rounded flex flex-col items-center space-y-4">
        <div className="w-full bg-black border border-zinc-900 p-3 rounded min-h-[50px] font-mono text-xs text-zinc-400">
          {transcript || (isListening ? "Listening... Speak now..." : "Press microphone button and answer Alex...")}
        </div>

        <button
          onClick={startListening}
          disabled={isListening || loading}
          className={`font-mono font-bold px-8 py-4 rounded uppercase tracking-wider transition-all cursor-pointer ${
            isListening 
              ? 'bg-orange-500 text-black animate-pulse' 
              : 'bg-cyan-400 hover:bg-cyan-500 text-black'
          }`}
        >
          {isListening ? "🎙️ Recording... (Pause to Send)" : "🎤 Push To Speak"}
        </button>
      </div>
    </div>
  );
}