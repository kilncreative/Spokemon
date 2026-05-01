import React from 'react';

type PotionColor = 'green' | 'blue' | 'purple' | 'orange' | 'empty';

interface PotionBottleProps {
  color: PotionColor;
  className?: string;
}

export const PotionBottle: React.FC<PotionBottleProps> = ({ color, className }) => {
  const isEmpty = color === 'empty';
  
  // Map logic colors to hex values
  const colorMap: Record<string, string> = {
    green: '#4ade80', // green-400
    blue: '#60a5fa',  // blue-400
    purple: '#c084fc', // purple-400
    orange: '#fb923c', // orange-400
    empty: 'transparent'
  };

  const liquidColor = colorMap[color] || 'transparent';
  const liquidOpacity = isEmpty ? 0 : 0.8;

  return (
    <svg 
      viewBox="0 0 100 100" 
      className={`drop-shadow-md ${className || 'w-10 h-10'}`}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Bottle Outline */}
      <path 
        d="M35 15 H65 V25 C65 25 85 35 85 65 C85 85 75 95 50 95 C25 95 15 85 15 65 C15 35 35 25 35 25 V15 Z" 
        stroke="#e2e8f0" 
        strokeWidth="4" 
        fill={isEmpty ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.2)"}
      />
      
      {/* Liquid */}
      {!isEmpty && (
        <path 
          d="M20 65 C20 40 38 35 38 35 L62 35 C62 35 80 40 80 65 C80 82 72 91 50 91 C28 91 20 82 20 65 Z" 
          fill={liquidColor} 
          opacity={liquidOpacity}
        >
          <animate attributeName="d" values="M20 65 C20 40 38 35 38 35 L62 35 C62 35 80 40 80 65 C80 82 72 91 50 91 C28 91 20 82 20 65 Z; M20 63 C20 38 38 33 38 33 L62 33 C62 33 80 38 80 63 C80 82 72 91 50 91 C28 91 20 82 20 63 Z; M20 65 C20 40 38 35 38 35 L62 35 C62 35 80 40 80 65 C80 82 72 91 50 91 C28 91 20 82 20 65 Z" dur="3s" repeatCount="indefinite" />
        </path>
      )}

      {/* Cork */}
      <path d="M35 15 H65 V10 C65 8 60 5 50 5 C40 5 35 8 35 10 V15 Z" fill="#92400e" />
      
      {/* Shine/Reflection */}
      <path d="M25 60 Q 25 40 40 35" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
      <circle cx="65" cy="55" r="3" fill="white" opacity="0.4" />
    </svg>
  );
};