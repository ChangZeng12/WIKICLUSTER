import React from 'react';

interface TooltipProps {
  x: number;
  y: number;
  content: string;
  visible: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({ x, y, content, visible }) => {
  if (!visible) return null;

  return (
    <div
      className="fixed z-50 pointer-events-none bg-white border-2 border-black p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
      style={{
        left: x + 16,
        top: y + 16,
        maxWidth: '300px'
      }}
    >
      <p className="text-black text-sm font-mono font-bold">
        {content}
      </p>
    </div>
  );
};