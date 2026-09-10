import React, { Suspense, useRef, Component } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment } from "@react-three/drei";
import { UserCheck, Sparkles } from "lucide-react";

// Reliable fallback / standard RPM model URLs
const AVATAR_URLS = {
  female: "https://models.readyplayer.me/64d9f697479633e791b79a55.glb",
  male: "https://models.readyplayer.me/64d9f64c479633e791b79a40.glb",
};

// React Error Boundary to catch network/GLTF load failures without crashing the page
class CanvasErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    console.warn("Avatar 3D load error intercepted, rendering procedural avatar:", error);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Procedural 3D Stylized Head Fallback (Works 100% offline with full nodding & speaking loops)
function ProceduralAvatar({ isSpeaking, isListening }) {
  const headRef = useRef();

  useFrame((state) => {
    if (!headRef.current) return;
    const t = state.clock.getElapsedTime();

    if (isListening) {
      headRef.current.rotation.x = Math.sin(t * 3.5) * 0.08; // Attentive nod
      headRef.current.rotation.y = Math.sin(t * 1.2) * 0.04;
    } else if (isSpeaking) {
      headRef.current.rotation.x = Math.sin(t * 4) * 0.03;
      headRef.current.rotation.y = Math.sin(t * 2.5) * 0.09;
    } else {
      headRef.current.rotation.x = 0;
      headRef.current.rotation.y = Math.sin(t * 0.8) * 0.04;
    }
  });

  return (
    <group ref={headRef} position={[0, -0.2, 0]}>
      {/* Head Sphere */}
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.3} metalness={0.2} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.18, 0.28, 0.48]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.18, 0.28, 0.48]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* Pupils */}
      <mesh position={[-0.18, 0.28, 0.55]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[0.18, 0.28, 0.55]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      {/* Torso */}
      <mesh position={[0, -0.85, 0]}>
        <cylinderGeometry args={[0.4, 0.7, 1, 32]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} />
      </mesh>
    </group>
  );
}

function ReadyPlayerMeModel({ url, isSpeaking, isListening }) {
  const { scene } = useGLTF(url);

  useFrame((state) => {
    if (scene) {
      const t = state.clock.getElapsedTime();
      if (isListening) {
        scene.rotation.x = Math.sin(t * 3) * 0.04;
        scene.rotation.y = Math.sin(t * 1.2) * 0.03;
      } else if (isSpeaking) {
        scene.rotation.x = Math.sin(t * 4) * 0.02;
        scene.rotation.y = Math.sin(t * 2) * 0.08;
      } else {
        scene.rotation.x = 0;
        scene.rotation.y = Math.sin(t * 0.8) * 0.03;
      }
      scene.position.y = -1.45 + Math.sin(t * 1.5) * 0.01;
    }
  });

  return <primitive object={scene} position={[0, -1.45, 0]} scale={1.2} />;
}

export default function HRAvatar({ hrGender = "female", currentResponse = "", isProcessing = false }) {
  const selectedAvatarUrl = AVATAR_URLS[hrGender] || AVATAR_URLS.female;
  const isSpeaking = !!currentResponse && !isProcessing;

  return (
    <div className="relative w-full h-full rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center p-4 overflow-hidden min-h-[350px]">
      <Canvas
        camera={{ position: [0, 0.2, 1.3], fov: 45 }}
        className="w-full h-full"
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[2, 3, 2]} intensity={1.3} />
        <directionalLight position={[-2, 1, -1]} intensity={0.5} color="#818cf8" />

        <CanvasErrorBoundary
          fallback={<ProceduralAvatar isSpeaking={isSpeaking} isListening={isProcessing} />}
        >
          <Suspense fallback={<ProceduralAvatar isSpeaking={isSpeaking} isListening={isProcessing} />}>
            <ReadyPlayerMeModel
              url={selectedAvatarUrl}
              isSpeaking={isSpeaking}
              isListening={isProcessing}
            />
            <Environment preset="city" />
          </Suspense>
        </CanvasErrorBoundary>

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 3}
        />
      </Canvas>

      {/* State Indicator Banner */}
      <div className="absolute top-4 left-4 right-4 z-20 bg-slate-950/85 border border-slate-800 backdrop-blur-md p-3 rounded-xl shadow-xl">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] text-indigo-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            {hrGender === "female" ? "Sophia (HR Specialist)" : "Alex (HR Specialist)"}
          </p>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
            isProcessing ? "bg-amber-500/20 text-amber-300" : isSpeaking ? "bg-indigo-500/20 text-indigo-300" : "bg-slate-800 text-slate-300"
          }`}>
            {isProcessing ? "Listening / Nodding..." : isSpeaking ? "Speaking..." : "Ready"}
          </span>
        </div>
        <p className="text-xs text-slate-200 leading-relaxed line-clamp-3">
          {currentResponse || "I'm ready. Please introduce yourself whenever you are comfortable."}
        </p>
      </div>

      <div className="absolute bottom-3 left-3 z-20 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-800 flex items-center gap-2">
        <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
        <span className="text-xs font-medium text-slate-200">
          {hrGender === "female" ? "Sophia (AI Host)" : "Alex (AI Host)"}
        </span>
      </div>
    </div>
  );
}