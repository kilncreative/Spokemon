import React from 'react';

interface ProgressBarProps {
  xp: number; // 0 to 100
  label?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ xp, label }) => {
  const validXp = Math.min(100, Math.max(0, xp));

  return (
    <div className="w-full flex flex-col items-center">
      {label && <div className="text-white font-black text-sm uppercase mb-1 drop-shadow-md tracking-wider">{label}</div>}
      
      <div className="w-full max-w-sm h-8 bg-black/40 rounded-full border-2 border-yellow-500/50 backdrop-blur-sm relative flex items-center p-1">
         {/* The Bar */}
         <div 
           className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(74,222,128,0.5)]"
           style={{ width: `${validXp}%` }}
         ></div>
         
         {/* Text inside bar */}
         <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md z-10">
            {Math.floor(validXp)}%
         </div>

         {/* Silhouette Icon on Right */}
         <div className="absolute -right-2 -top-2 w-12 h-12 bg-black rounded-full border-2 border-white flex items-center justify-center overflow-hidden shadow-lg">
             <div className="text-2xl grayscale brightness-50 opacity-50">🐉</div> 
         </div>
         
         {/* Current Creature Icon on Left */}
         <div className="absolute -left-2 -top-2 w-10 h-10 bg-green-600 rounded-full border-2 border-white flex items-center justify-center overflow-hidden shadow-lg">
            <div className="text-xl">🥚</div>
         </div>
      </div>
    </div>
  );
};