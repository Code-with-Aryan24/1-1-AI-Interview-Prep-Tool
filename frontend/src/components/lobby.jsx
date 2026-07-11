import React, { useState } from 'react';

export default function Lobby({ onStart }) {
  const [userName, setUserName] = useState('');
  const [niche, setNiche] = useState('technical');
  const [vibe, setVibe] = useState('professional');
  const [loading, setLoading] = useState(false);

  const handleEnterCall = async () => {
    if (!userName.trim()) return alert("Please enter your name candidate.");
    setLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8005/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName, niche, vibe })
      });
      const data = await response.json();
      onStart(data.session_id, { userName, niche, vibe });
    } catch (err) {
      console.error("Connection loop failure:", err);
      alert("Alex's pipeline is offline. Ensure FastAPI is running on port 8005.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col text-foreground overflow-hidden font-sans bg-black min-h-[80vh]">
      <div className="container mx-auto px-4 py-12 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative">
          
          {/* DECORATIVE FUTURISTIC CORNER */}
          <div className="absolute -top-6 left-0 w-24 h-24 border-l-2 border-t-2 border-cyan-400/40 pointer-events-none" />

          {/* LEFT CONTENT CONTAINER: CONFIG PANEL */}
          <div className="lg:col-span-7 space-y-6 relative">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight uppercase font-mono text-white">
              Initialize <span className="text-cyan-400">Evaluation</span> Engine
            </h1>

            {/* THE GRADIENT LINE */}
            <div className="h-px w-full bg-gradient-to-r from-cyan-400 via-orange-500 to-cyan-400 opacity-50"></div>

            {/* INPUT FIELDS */}
            <div className="space-y-4 max-w-md pt-2">
              <div>
                <label className="block text-xs font-mono tracking-wider mb-2 uppercase text-zinc-500">Candidate Identity</label>
                <input 
                  type="text" 
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name..." 
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-400 px-4 py-3 text-white font-mono rounded outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono tracking-wider mb-2 uppercase text-zinc-500">Target Niche</label>
                  <select 
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-400 px-3 py-3 text-white font-mono rounded outline-none transition-all"
                  >
                    <option value="technical">Technical</option>
                    <option value="behavioral">Behavioral</option>
                    <option value="marketing">Growth/Marketing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono tracking-wider mb-2 uppercase text-zinc-500">Alex's Demeanor</label>
                  <select 
                    value={vibe}
                    onChange={(e) => setVibe(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-400 px-3 py-3 text-white font-mono rounded outline-none transition-all"
                  >
                    <option value="professional">Professional</option>
                    <option value="toxic">Stress Test</option>
                    <option value="friendly">Supportive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* METRICS PLATFORM */}
            <div className="flex items-center gap-6 py-4 font-mono border-t border-b border-zinc-900 w-fit">
              <div className="flex flex-col">
                <div className="text-xl text-cyan-400 font-bold">LLAMA 3.3</div>
                <div className="text-[10px] tracking-wider text-zinc-500">INFERENCE LAYER</div>
              </div>
              <div className="h-8 w-px bg-zinc-800"></div>
              <div className="flex flex-col">
                <div className="text-xl text-cyan-400 font-bold">GROQ LPU</div>
                <div className="text-[10px] tracking-wider text-zinc-500">0.05s LATENCY</div>
              </div>
            </div>

            {/* CORE ACTION TRIGGER */}
            <div className="pt-2">
              <button
                onClick={handleEnterCall}
                disabled={loading}
                className="w-full sm:w-auto font-mono bg-cyan-400 hover:bg-cyan-500 text-black px-8 py-4 rounded text-base font-bold uppercase tracking-wider transition-colors duration-200 cursor-pointer"
              >
                {loading ? "Establishing Secure Link..." : "Establish Live Feed ➔"}
              </button>
            </div>
          </div>

          {/* RIGHT CONTAINER: INTERVIEWER RADAR VISUALIZER */}
          <div className="lg:col-span-5 relative hidden lg:block">
            <div className="absolute -inset-4 pointer-events-none">
              <div className="absolute top-0 left-0 w-12 h-12 border-l border-t border-zinc-800" />
              <div className="absolute top-0 right-0 w-12 h-12 border-r border-t border-zinc-800" />
              <div className="absolute bottom-0 left-0 w-12 h-12 border-l border-b border-zinc-800" />
              <div className="absolute bottom-0 right-0 w-12 h-12 border-r border-b border-zinc-800" />
            </div>

            <div className="relative aspect-square max-w-sm mx-auto overflow-hidden rounded bg-zinc-950 border border-zinc-900 flex flex-col items-center justify-center">
              {/* TARGETING SIMULATOR LAYERS */}
              <div className="absolute inset-0 pointer-events-none z-20">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-cyan-400/20 rounded-full" />
                <div className="absolute top-1/2 left-0 w-1/6 h-px bg-cyan-400/30" />
                <div className="absolute top-1/2 right-0 w-1/6 h-px bg-cyan-400/30" />
              </div>

              {/* MOVING RADAR SCAN LINE */}
              <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,transparent_calc(50%-1px),#00e5ff_50%,transparent_calc(50%+1px),transparent_100%)] bg-[length:100%_12px] animate-scanline pointer-events-none opacity-40 z-10" />
              
              <div className="font-mono text-zinc-500 space-y-2 p-8 text-center select-none">
                <span className="text-cyan-400 animate-pulse text-sm font-bold block">FEED READY</span>
                <span className="text-[11px] text-zinc-600">AGENTIC RECRUITMENT ONLINE</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}