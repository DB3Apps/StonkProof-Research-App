import React from 'react';
import { cn } from "@/lib/utils";

export const SKETCH_PATHS = {
  skull: "M12 2C7.5 2 4 5.5 4 10C4 12.5 5.5 14.5 7.5 15.5L7 19C7 20.5 8.5 22 10 22H14C15.5 22 17 20.5 17 19L16.5 15.5C18.5 14.5 20 12.5 20 10C20 5.5 16.5 2 12 2ZM9 8C9.5 8 10 8.5 10 9C10 9.5 9.5 10 9 10C8.5 10 8 9.5 8 9C8 8.5 8.5 8 9 8ZM15 8C15.5 8 16 8.5 16 9C16 9.5 15.5 10 15 10C14.5 10 14 9.5 14 9C14 8.5 14.5 8 15 8ZM10 16H14M10 19H14",
  star: "M12 2L15 9H22L16 14L18 21L12 17L6 21L8 14L2 9H9L12 2Z",
  ghost: "M12 2C8 2 4 5 4 10V20L7 18L10 20L13 18L16 20L20 22V10C20 5 16 2 12 2ZM8 9C8.5 9 9 9.5 9 10C9 10.5 8.5 11 8 11C7.5 11 7 10.5 7 10C7 9.5 7.5 9 8 9ZM16 9C16.5 9 17 9.5 17 10C17 10.5 16.5 11 16 11C15.5 11 15 10.5 15 10C15 9.5 15.5 9 16 9Z",
  eyeX: "M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12ZM12 15C13.6 15 15 13.6 15 12C15 10.4 13.6 9 12 9C10.4 9 9 10.4 9 12C9 13.6 10.4 15 12 15ZM10 10L14 14M14 10L10 14",
  flame: "M12 22C16.4 22 20 18.4 20 14C20 9.6 12 2 12 2C12 2 4 9.6 4 14C4 18.4 7.6 22 12 22ZM12 18C13.6 18 15 16.6 15 15C15 13.4 12 10 12 10C12 10 9 13.4 9 15C9 16.6 10.4 18 12 18Z",
  cloud: "M17 19C19.2 19 21 17.2 21 15C21 13.1 19.6 11.4 17.8 11.1C17.3 8.2 14.9 6 12 6C10.1 6 8.4 6.9 7.3 8.3C6.9 8.1 6.4 8 6 8C4.3 8 3 9.3 3 11C3 11.2 3 11.5 3.1 11.8C1.8 12.8 1 14.3 1 16C1 18.2 2.8 20 5 20L17 19ZM8 22L7 25M13 22L12 25M18 22L17 25",
  mushroom: "M12 2C7 2 3 6 3 10C3 11 6 11 6 11V18C6 20 8 22 10 22H14C16 22 18 20 18 18V11C18 11 21 11 21 10C21 6 17 2 12 2ZM8 7C8.5 7 9 7.5 9 8C9 8.5 8.5 9 8 9C7.5 9 7 8.5 7 8C7 7.5 7.5 7 8 7ZM15 5C15.5 5 16 5.5 16 6C16 6.5 15.5 7 15 7C14.5 7 14 6.5 14 6C14 5.5 14.5 5 15 5Z",
  bolt: "M13 2L3 14H12L11 22L21 10H12L13 2Z",
  heart: "M12 21L10 19C6 15 2 12 2 8C2 5 4 2 8 2C10 2 11 3 12 4C13 3 14 2 16 2C20 2 22 5 22 8C22 12 18 15 14 19L12 21Z",
  smile: "M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z M9 9C9.5 9 10 10 M15 9C15.5 9 16 10 M8 15C9 17 10 18 12 18C14 18 15 17 16 15",
  pizza: "M12 2L4 18H20L12 2ZM10 12C10.6 12 11 11.6 11 11M14 14C14.6 14 15 13.6 15 13M9 16C9.6 16 10 15.6 10 15",
  soda: "M6 6V18C6 20.2 8.7 22 12 22C15.3 22 18 20.2 18 18V6M6 6C6 3.8 8.7 2 12 2C15.3 2 18 3.8 18 6M6 6C6 8.2 8.7 10 12 10C15.3 10 18 8.2 18 6",
  cat: "M12 13C10 13 8 14 8 16C8 18 10 20 12 20C14 20 16 18 16 16C16 14 14 13 12 13ZM12 13V15M8 16H6M16 16H18M7 8L4 4V10M17 8L20 4V10",
  bat: "M12 12C12 12 10 9 7 9C4 9 2 11 2 13C2 15 4 17 7 17C10 17 12 14 12 14C12 14 14 17 17 17C20 17 22 15 22 13C22 11 20 9 17 9C14 9 12 12 12 12Z",
  dice: "M4 4H20V20H4V4ZM8 8H8.1M16 16H16.1M12 12H12.1",
  pin: "M16 4L4 16M4 16C3 17 3 19 4 20C5 21 7 21 8 20C8 20 18 10 20 8C22 6 22 4 20 2C18 0 16 0 14 2L6 10",
  skateboard: "M4 14H20M6 14V17M18 14V17M3 13C6 11 18 11 21 13",
  crown: "M3 14L6 4L9 10L12 4L15 10L18 4L21 14Z",
  mountain: "M3 14L6 4L6.5 4.5L7 4L9 10L12 4L12.5 4.5L13 4L15 10L18 4L18.5 4.5L19 4L21 14"
};

export const HandDrawnFilter = () => (
  <svg aria-hidden="true" style={{ width: 0, height: 0, position: 'absolute', pointerEvents: 'none' }}>
    <defs>
      <filter id="hand-drawn">
        <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" />
      </filter>
    </defs>
  </svg>
);

export const HandDrawnDoodle = ({ type, size, className, style, strokeWidth = 1.8 }: { type: keyof typeof SKETCH_PATHS, size: number, className?: string, style?: any, strokeWidth?: number }) => {
  const path = SKETCH_PATHS[type];
  if (!path) return null;

  return (
    <svg 
      viewBox="0 0 24 24" 
      width={size} 
      height={size} 
      className={className}
      style={style}
      fill="none" 
      stroke="currentColor" 
      strokeWidth={strokeWidth}
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d={path} opacity="0.3" transform="translate(0.5, 0.5)" />
      <path d={path} />
    </svg>
  );
};

export const DoodleField = React.memo(({ density = 8, opacity = 1.0, seed = 1 }: { density?: number, opacity?: number, seed?: number }) => {
  const types = Object.keys(SKETCH_PATHS) as (keyof typeof SKETCH_PATHS)[];
  
  const seededRandom = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0" style={{ opacity }}>
      {[...Array(density)].map((_, i) => {
        const type = types[i % types.length];
        const s = seed + i * 13.5;
        const zoneRand = seededRandom(s);
        let top, left;
        
        const randX = seededRandom(s + 1);
        const randY = seededRandom(s + 2);
        
        // Prevent doodles from overlapping central interactive elements
        if (zoneRand < 0.35) {
          // Left margin
          left = randX * 15 + 2;
          top = randY * 92 + 4;
        } else if (zoneRand < 0.70) {
          // Right margin
          left = 83 + randX * 15;
          top = randY * 92 + 4;
        } else if (zoneRand < 0.85) {
          // Top margin
          left = 20 + randX * 60;
          top = randY * 15 + 2;
        } else {
          // Bottom margin
          left = 20 + randX * 60;
          top = 83 + randY * 15;
        }
        
        const rotate = seededRandom(s + 3) * 360;
        const size = 24 + seededRandom(s + 4) * 32;
        
        return (
          <HandDrawnDoodle 
            key={i}
            type={type}
            size={size}
            className="absolute pencil-doodle"
            style={{
              top: `${top}%`,
              left: `${left}%`,
              transform: `rotate(${rotate}deg)`
            }}
          />
        );
      })}
    </div>
  );
});

export const SPRLogo = React.memo(({ size = 48, className = "", innerClassName = "" }: { size?: number, className?: string, innerClassName?: string }) => {
  const p = size * 0.35;
  const fs = size * 0.4;
  const strokeScale = Math.max(1, size / 48);
  
  return (
    <div 
      className={cn("bg-white doodle-border rotate-2 shadow-xl border !border-slate-900 overflow-hidden relative inline-block", className)}
      style={{ padding: `${p}px` }}
    >
      <div 
        className="absolute opacity-40" 
        style={{ 
          top: `${p * 0.15}px`, 
          right: `${p * 0.15}px`,
          width: `${fs}px`,
          height: `${fs}px`,
          transform: `scale(${strokeScale})`
        }}
      >
        <HandDrawnDoodle type="flame" size={fs} className={cn("pencil-doodle", innerClassName)} strokeWidth={1.8 * Math.min(1.5, strokeScale)} />
      </div>
      <div className="relative z-10">
        <HandDrawnDoodle type="skull" size={size} className={cn("pencil-doodle", innerClassName)} strokeWidth={1.8 * Math.min(1.5, strokeScale)} />
      </div>
    </div>
  );
});
