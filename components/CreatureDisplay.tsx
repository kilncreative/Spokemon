import React, { useState } from 'react';

export type EvolutionPhase = 'idle' | 'charging' | 'flashing' | 'celebrating';

interface CreatureDisplayProps {
  imageUrl: string | null;
  level: number;
  evolutionPhase: EvolutionPhase;
  name?: string;
  onClick?: () => void;
}

const MysticEgg = ({ className }: { className?: string }) => (
    <svg 
      viewBox="0 0 200 250" 
      className={`drop-shadow-2xl overflow-visible ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Main Egg Body Gradient - Creamy with 3D shading */}
        <radialGradient id="eggBody3D" cx="40%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#fffbeb" /> {/* Cream Light */}
          <stop offset="50%" stopColor="#fef3c7" /> {/* Cream Mid */}
          <stop offset="100%" stopColor="#d6d3d1" /> {/* Shadow */}
        </radialGradient>

        {/* Green Spot Gradient - Vibrant but integrated */}
        <radialGradient id="greenSpot3D" cx="30%" cy="30%" r="90%">
             <stop offset="0%" stopColor="#86efac" /> {/* Light Green */}
             <stop offset="100%" stopColor="#22c55e" /> {/* Dark Green */}
        </radialGradient>
        
        {/* Soft Shadow Filter */}
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
             <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#000000" floodOpacity="0.2"/>
        </filter>
      </defs>

      <g filter="url(#softShadow)">
          {/* Egg Shape */}
          <path 
            d="M100 20
               C 155 20, 195 90, 195 160
               C 195 225, 160 250, 100 250
               C 40 250, 5 225, 5 160
               C 5 90, 45 20, 100 20
               Z" 
            fill="url(#eggBody3D)"
          />
          
          {/* Spots - Classic Tri-Cluster */}
          {/* Top Left */}
          <path d="M60 110 Q 75 100 90 110 Q 95 125 80 135 Q 65 140 55 125 Z" fill="url(#greenSpot3D)" opacity="0.9" />
          
          {/* Middle Right */}
          <path d="M130 140 Q 150 135 165 150 Q 160 170 140 175 Q 120 170 130 140 Z" fill="url(#greenSpot3D)" opacity="0.9" />
          
          {/* Bottom Center */}
          <path d="M85 185 Q 105 180 115 195 Q 110 215 90 220 Q 70 210 85 185 Z" fill="url(#greenSpot3D)" opacity="0.9" />

          {/* Rim Light / Edge Highlight for 3D effect */}
          <path 
            d="M100 23
               C 152 23, 190 91, 190 160
               C 190 220, 158 245, 100 245"
            fill="none"
            stroke="white"
            strokeWidth="2"
            opacity="0.3"
            strokeLinecap="round"
          />

          {/* Specular Highlight */}
          <ellipse cx="65" cy="70" rx="15" ry="25" fill="white" opacity="0.5" transform="rotate(-20 65 70)" />
      </g>
    </svg>
);

export const CreatureDisplay: React.FC<CreatureDisplayProps> = ({ imageUrl, level, evolutionPhase, name, onClick }) => {
  const [imgError, setImgError] = useState(false);
  
  // Reset error state when image changes
  React.useEffect(() => {
      setImgError(false);
  }, [imageUrl]);

  // Determine animation class based on phase
  let animClass = "animate-breathe"; // Default idle
  
  if (evolutionPhase === 'charging') {
    animClass = "animate-charge"; // Intense shake and brightness increase
  } else if (evolutionPhase === 'flashing') {
    animClass = "opacity-0"; // Hide creature during the white flash (it swaps while hidden)
  } else if (evolutionPhase === 'celebrating') {
    animClass = "animate-bounce drop-shadow-[0_0_50px_rgba(255,255,255,0.8)]"; // Happy bounce
  }

  return (
    <div 
        onClick={onClick}
        className={`relative w-full h-full flex items-center justify-center transition-all duration-300 group 
          ${onClick ? 'cursor-pointer' : ''}`}
      >
        
        {/* Loading / Evolving State */}
        {evolutionPhase === 'charging' && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center text-white pointer-events-none">
             {/* Optional: Add particle sparks here if needed */}
          </div>
        )}

        {/* Creature Image or Mystery Egg */}
        {imageUrl && !imgError ? (
          <img 
            src={imageUrl} 
            alt="Your Creature" 
            className={`w-full h-full object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] z-10 transition-all duration-300 ${animClass}`}
            style={{ imageRendering: 'pixelated' }}
            onError={() => setImgError(true)}
          />
        ) : (
          <MysticEgg className={`w-full h-full max-h-full z-10 transition-all duration-300 ${animClass}`} />
        )}
      </div>
  );
};