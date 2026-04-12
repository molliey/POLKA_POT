/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, RefObject, MouseEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info, RefreshCw, Camera, CameraOff, Hand } from 'lucide-react';
import { Hands, Results } from '@mediapipe/hands';
import { Camera as MPCamera } from '@mediapipe/camera_utils';

// Configuration constants
const DOT_SPACING = 60; // Increased spacing
const DOT_RADIUS = 8;  // Fixed size
const MOUSE_RADIUS = 150;
const MOUSE_PUSH_STRENGTH = 8;
const RETURN_SPEED = 0.05;
const FRICTION = 0.9;

const GOOGLE_COLORS = [
  '#4285F4', // Blue
  '#EA4335', // Red
  '#FBBC05', // Yellow
  '#34A853'  // Green
];

class Dot {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number = 0;
  vy: number = 0;
  color: string;
  radius: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.baseX = x;
    this.baseY = y;
    this.color = color;
    this.radius = DOT_RADIUS;
  }

  update(mouseX: number | null, mouseY: number | null) {
    if (mouseX !== null && mouseY !== null) {
      const dx = mouseX - this.x;
      const dy = mouseY - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < MOUSE_RADIUS) {
        const force = (MOUSE_RADIUS - distance) / MOUSE_RADIUS;
        const forceDirectionX = dx / distance;
        const forceDirectionY = dy / distance;
        
        const directionX = forceDirectionX * force * MOUSE_PUSH_STRENGTH;
        const directionY = forceDirectionY * force * MOUSE_PUSH_STRENGTH;

        this.vx -= directionX;
        this.vy -= directionY;
      }
    }

    // Spring physics back to base
    this.vx += (this.baseX - this.x) * RETURN_SPEED;
    this.vy += (this.baseY - this.y) * RETURN_SPEED;

    // Apply friction
    this.vx *= FRICTION;
    this.vy *= FRICTION;

    this.x += this.vx;
    this.y += this.vy;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const interactionPointRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;

    const initDots = (width: number, height: number) => {
      const dots: Dot[] = [];
      const cols = Math.ceil(width / DOT_SPACING) + 1;
      const rows = Math.ceil(height / DOT_SPACING) + 1;
      
      const offsetX = (width - (cols - 1) * DOT_SPACING) / 2;
      const offsetY = (height - (rows - 1) * DOT_SPACING) / 2;

      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          const x = offsetX + j * DOT_SPACING;
          const y = offsetY + i * DOT_SPACING;
          const color = GOOGLE_COLORS[Math.floor(Math.random() * GOOGLE_COLORS.length)];
          dots.push(new Dot(x, y, color));
        }
      }
      dotsRef.current = dots;
    };

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        initDots(width, height);
      }
    });

    resizeObserver.observe(container);

    const render = () => {
      ctx.fillStyle = '#ffffff'; // White background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const { x, y } = interactionPointRef.current;
      
      dotsRef.current.forEach(dot => {
        dot.update(x, y);
        dot.draw(ctx);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Hand Tracking Setup
  useEffect(() => {
    if (!isCameraActive || !videoRef.current) return;

    setIsLoading(true);
    setError(null);

    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    hands.onResults((results: Results) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        
        // Interaction point (index finger tip)
        const tip = landmarks[8];
        const x = (1 - tip.x) * (containerRef.current?.clientWidth || 0);
        const y = tip.y * (containerRef.current?.clientHeight || 0);
        interactionPointRef.current = { x, y };
      } else {
        interactionPointRef.current = { x: null, y: null };
      }
    });

    const camera = new MPCamera(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current) {
          await hands.send({ image: videoRef.current });
        }
      },
      width: 640,
      height: 480
    });

    camera.start()
      .then(() => {
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Camera failed:", err);
        setError("Failed to access camera. Please ensure you have given permission.");
        setIsCameraActive(false);
        setIsLoading(false);
      });

    return () => {
      camera.stop();
      hands.close();
    };
  }, [isCameraActive]);

  const toggleCamera = () => {
    setIsCameraActive(!isCameraActive);
    if (isCameraActive) {
      interactionPointRef.current = { x: null, y: null };
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isCameraActive) return; // Ignore mouse if camera is active
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      interactionPointRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const handleMouseLeave = () => {
    if (isCameraActive) return;
    interactionPointRef.current = { x: null, y: null };
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full bg-white select-none touch-none overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
      />

      {/* Hidden Video for MediaPipe */}
      <video
        ref={videoRef}
        className="hidden"
        playsInline
      />

      {/* UI Overlay */}
      <div className="absolute top-6 left-6 flex flex-col gap-4 z-10 pointer-events-none">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/90 backdrop-blur-md border border-zinc-200 p-5 rounded-2xl shadow-xl pointer-events-auto"
        >
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-[#4285F4]" />
              <div className="w-2 h-2 rounded-full bg-[#EA4335]" />
              <div className="w-2 h-2 rounded-full bg-[#FBBC05]" />
              <div className="w-2 h-2 rounded-full bg-[#34A853]" />
            </div>
            <h1 className="text-zinc-900 font-bold text-xl tracking-tight">
              Polka Dot Motion
            </h1>
          </div>
          <p className="text-zinc-500 text-sm mt-1 font-medium flex items-center gap-2">
            {isCameraActive ? (
              <span className="flex items-center gap-1.5 text-blue-600">
                <Hand className="w-4 h-4" /> Hand Tracking Active
              </span>
            ) : (
              "Interactive Fluid Physics"
            )}
          </p>
        </motion.div>

        <AnimatePresence>
          {showInfo && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/90 backdrop-blur-md border border-zinc-200 p-5 rounded-2xl shadow-xl max-w-xs pointer-events-auto"
            >
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-zinc-700 text-sm leading-relaxed">
                    {isCameraActive 
                      ? "Wave your hand! The dots react to your index finger."
                      : "Click the camera icon below to enable hand tracking, or use your mouse to interact with the dots."}
                  </p>
                  <button 
                    onClick={() => setShowInfo(false)}
                    className="mt-3 text-xs font-bold text-zinc-400 hover:text-zinc-600 transition-colors uppercase tracking-wider"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 border border-red-200 p-4 rounded-xl shadow-lg max-w-xs pointer-events-auto"
          >
            <p className="text-red-600 text-sm font-medium">{error}</p>
          </motion.div>
        )}
      </div>

      {/* Floating Controls */}
      <div className="absolute bottom-8 right-8 flex gap-3 z-10">
        <button 
          onClick={toggleCamera}
          disabled={isLoading}
          className={`p-4 rounded-full transition-all shadow-xl pointer-events-auto group relative ${
            isCameraActive 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-white text-zinc-600 hover:bg-zinc-50 border border-zinc-200'
          }`}
          title={isCameraActive ? "Disable Camera" : "Enable Camera Hand Tracking"}
        >
          {isLoading ? (
            <RefreshCw className="w-6 h-6 animate-spin" />
          ) : isCameraActive ? (
            <CameraOff className="w-6 h-6" />
          ) : (
            <Camera className="w-6 h-6" />
          )}
          {isLoading && (
            <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
              Loading AI Model...
            </span>
          )}
        </button>

        <button 
          onClick={() => window.location.reload()}
          className="p-4 bg-white border border-zinc-200 rounded-full text-zinc-600 hover:bg-zinc-50 transition-all shadow-xl pointer-events-auto group"
          title="Reset Dots"
        >
          <RefreshCw className="w-6 h-6 group-active:rotate-180 transition-transform duration-500" />
        </button>
      </div>

      {/* Camera Preview (Small) */}
      <AnimatePresence>
        {isCameraActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-8 left-8 w-48 aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border-2 border-white pointer-events-none z-20"
          >
            <video
              ref={(el) => {
                if (el && videoRef.current) {
                  el.srcObject = videoRef.current.srcObject;
                  el.play();
                }
              }}
              className="w-full h-full object-cover scale-x-[-1]"
              autoPlay
              muted
              playsInline
            />
            <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-blue-600 text-[8px] text-white font-bold rounded uppercase tracking-widest">
              Live Feed
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Cursor (only when camera is off) */}
      {!isCameraActive && <Cursor interactionPointRef={interactionPointRef} />}
    </div>
  );
}

function Cursor({ interactionPointRef }: { interactionPointRef: RefObject<{ x: number | null; y: number | null }> }) {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const moveCursor = () => {
      if (cursorRef.current && interactionPointRef.current) {
        const { x, y } = interactionPointRef.current;
        if (x !== null && y !== null) {
          cursorRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
          cursorRef.current.style.opacity = '1';
        } else {
          cursorRef.current.style.opacity = '0';
        }
      }
      requestAnimationFrame(moveCursor);
    };
    moveCursor();
  }, [interactionPointRef]);

  return (
    <div 
      ref={cursorRef}
      className="fixed top-0 left-0 w-10 h-10 -ml-5 -mt-5 border-2 border-blue-500/30 rounded-full pointer-events-none z-50 transition-opacity duration-300 ease-out flex items-center justify-center"
    >
      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
    </div>
  );
}
