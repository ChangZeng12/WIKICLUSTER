
import React from 'react';

interface TooltipProps {
  x: number;
  y: number;
  content: string;
  visible: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({ x, y, content, visible }) => {
  if (!visible) return null;

  // Check if close to right edge (320px buffer covering maxWidth 300px + margin)
  const isNearRightEdge = typeof window !== 'undefined' && (window.innerWidth - x) < 320;

  return (
    <div
      className="fixed z-50 pointer-events-none bg-white border-2 border-black p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
      style={{
        top: y + 16,
        // If near right edge, anchor to left of mouse and translate -100% to flip it leftwards
        left: isNearRightEdge ? x - 16 : x + 16,
        transform: isNearRightEdge ? 'translateX(-100%)' : 'none',
        maxWidth: '300px'
      }}
    >
      <p className="text-black text-sm font-mono font-bold break-words">
        {content}
      </p>
    </div>
  );
};
