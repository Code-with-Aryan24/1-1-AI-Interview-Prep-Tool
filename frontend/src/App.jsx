import React, { useState } from 'react';
import Lobby from './components/Lobby';
import InterviewRoom from './components/InterviewRoom';

function App() {
  const [screen, setScreen] = useState('lobby'); 
  const [sessionDetails, setSessionDetails] = useState(null);

  const handleStartInterview = (id, data) => {
    setSessionDetails({ id, ...data });
    setScreen('interview');
  };

  const handleEndInterview = () => {
    setScreen('lobby');
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500 selection:text-black">
      {/* GLOBAL HUD HEADER */}
      <header className="border-b border-zinc-900 bg-zinc-950/50 backdrop-blur py-4 px-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center font-mono">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-sm font-bold tracking-widest text-zinc-400">
              PROJECT // <span className="text-white">ALEX</span>
            </span>
          </div>
          <span className="text-xs text-zinc-600 border border-zinc-800 px-2 py-0.5 rounded bg-black">
            v1.0.0-MVP
          </span>
        </div>
      </header>

      {/* RENDER CONTROLLER */}
      <main className="pt-4">
        {screen === 'lobby' && (
          <Lobby onStart={handleStartInterview} />
        )}

        {screen === 'interview' && (
          <InterviewRoom 
            sessionId={sessionDetails?.id} 
            interviewData={sessionDetails} 
            onEnd={handleEndInterview} 
          />
        )}
      </main>
    </div>
  );
}

export default App;