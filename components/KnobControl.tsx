
import React, { useState, useEffect, useRef, useCallback } from 'react';

interface KnobControlProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
}

export const KnobControl: React.FC<KnobControlProps> = ({ value, min, max, step, onChange }) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const knobRef = useRef<HTMLDivElement>(null);

  // Configuration
  const startAngle = -140; // SVG degrees
  const endAngle = 140;
  
  // Geometry
  // Optimized for 200px container
  const viewBoxSize = 200;
  const center = viewBoxSize / 2;
  
  // No offset needed with 200px box
  const knobDiameter = 95;
  const knobRadius = knobDiameter / 2;
  
  // Ticks Config
  const tickGap = 6;
  const tickInnerRadius = knobRadius + tickGap;
  const tickLength = 8;
  const tickHoverLength = 14; 
  // Loop based on steps to avoid duplicates
  const totalSteps = Math.floor((max - min) / step);

  // Value to Angle Conversion
  // Maps linear range [min, max] to radial range [startAngle, endAngle]
  const valueToAngle = (val: number) => {
    const effectiveVal = val >= 2000 ? max : val;
    const clamped = Math.min(Math.max(effectiveVal, min), max);
    const range = max - min;
    const angleRange = endAngle - startAngle;
    return startAngle + ((clamped - min) / range) * angleRange;
  };

  const currentAngle = valueToAngle(value);

  // Calculate Value from Mouse Position using ArcTangent (Math.atan2)
  const calculateValueFromPointer = (clientX: number, clientY: number) => {
    if (!knobRef.current) return value;
    const rect = knobRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    
    // 0 degrees is UP in our logic.
    // atan2(y,x) gives 0=Right. So +90 to make 0=Up.
    let angleDeg = (Math.atan2(dy, dx) * 180 / Math.PI) + 90;
    
    if (angleDeg > 180) angleDeg -= 360;
    
    // Clamp to valid regions (skip the bottom gap)
    let clampedAngle = angleDeg;
    if (angleDeg > endAngle && angleDeg < 180) clampedAngle = endAngle;
    if (angleDeg < startAngle && angleDeg > -180) clampedAngle = startAngle;

    clampedAngle = Math.min(Math.max(clampedAngle, startAngle), endAngle);
    
    const angleRange = endAngle - startAngle;
    const valueRange = max - min;
    const rawValue = min + ((clampedAngle - startAngle) / angleRange) * valueRange;
    
    // Snap to nearest step
    const steppedValue = Math.round(rawValue / step) * step;
    return Math.min(Math.max(steppedValue, min), max);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPressed(true);
    // Do NOT set isDragging to true yet. This allows the initial "jump" to be animated.
    // isDragging will be set in mouseMove.
    const newValue = calculateValueFromPointer(e.clientX, e.clientY);
    onChange(newValue);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isPressed) {
      e.preventDefault();
      // If we are moving while pressed, we are dragging.
      // We set this to true so we can disable the transition for 1:1 tracking.
      setIsDragging(true);
      const newValue = calculateValueFromPointer(e.clientX, e.clientY);
      onChange(newValue);
    }
  }, [isPressed, min, max, step, onChange]);

  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isPressed) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPressed, handleMouseMove, handleMouseUp]);

  // Generate ticks
  const ticks = [];
  
  // Iterate strictly by steps to prevent duplicates
  for (let i = 0; i <= totalSteps; i++) {
    const realTickValue = min + i * step;
    
    // Calculate angle for this specific value
    const fraction = i / totalSteps;
    const angle = startAngle + fraction * (endAngle - startAngle);
    
    const isRed = i === totalSteps; // The last one is "Unlimited"
    
    // Logic for hover scaling
    let currentLen = tickLength;
    if (i === hoverIndex) {
        currentLen = tickHoverLength;
    } else if (hoverIndex !== null && Math.abs(hoverIndex - i) === 1) {
        // Neighbors grow by half the extra amount
        // tickLength=8, tickHoverLength=14. Delta=6. Half=3. Result=11.
        currentLen = tickLength + (tickHoverLength - tickLength) / 2;
    }

    const isHovered = i === hoverIndex;

    // SVG Rotation: 0 is Right. Our Logic: 0 is Up. Correction: -90.
    const rad = (angle - 90) * (Math.PI / 180);
    
    // Inner point (Fixed)
    const x1 = center + tickInnerRadius * Math.cos(rad);
    const y1 = center + tickInnerRadius * Math.sin(rad);
    
    // Calculate MAX outer point (for max possible length = tickHoverLength)
    // We use stroke-dasharray to reveal only the currentLen part
    // The line is drawn from Inner -> Outwards
    const x2_max = center + (tickInnerRadius + tickHoverLength) * Math.cos(rad);
    const y2_max = center + (tickInnerRadius + tickHoverLength) * Math.sin(rad);
    
    // Hit Area (Invisible)
    const hitRadius = tickInnerRadius + 25;
    const hitX = center + hitRadius * Math.cos(rad);
    const hitY = center + hitRadius * Math.sin(rad);

    if (isRed) {
        // Red dot for unlimited
        const dotDist = tickInnerRadius + 4;
        const dotX = center + dotDist * Math.cos(rad);
        const dotY = center + dotDist * Math.sin(rad);
        
        ticks.push(
            <g key={realTickValue} 
               className="cursor-pointer"
               onClick={(e) => { e.stopPropagation(); onChange(2000); }}
               onMouseEnter={() => setHoverIndex(i)}
               onMouseLeave={() => setHoverIndex(null)}
            >
                <circle cx={dotX} cy={dotY} r={12} fill="transparent" />
                
                {/* Animated Red Border Effect */}
                <circle 
                    cx={dotX} 
                    cy={dotY} 
                    r={4} // r=4 with stroke=2 covers area from 3px to 5px from center.
                    fill="none" 
                    stroke="rgba(255, 0, 0, 0.5)" 
                    strokeWidth={2}
                    className={`transition-opacity duration-300 ease-out ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                />

                <circle cx={dotX} cy={dotY} r={3} fill="#FF0000" />
            </g>
        );
    } else {
        // Label Position
        const labelDist = tickInnerRadius + tickHoverLength + 10;
        const lx = center + labelDist * Math.cos(rad);
        const ly = center + labelDist * Math.sin(rad);

        ticks.push(
          <g key={realTickValue}
             className="cursor-pointer"
             onClick={(e) => { e.stopPropagation(); onChange(realTickValue); }}
             onMouseEnter={() => setHoverIndex(i)}
             onMouseLeave={() => setHoverIndex(null)}
          >
             {/* Invisible Hit Line */}
             <line x1={x1} y1={y1} x2={hitX} y2={hitY} stroke="transparent" strokeWidth="8" />
             
             {/* Visible Tick with Animation */}
             <line
                x1={x1}
                y1={y1}
                x2={x2_max}
                y2={y2_max}
                stroke="black"
                strokeWidth="1"
                strokeDasharray={`${currentLen} 20`}
                className="transition-[stroke-dasharray] duration-200 ease-out" 
             />

             {/* Hover Value Label */}
             <text 
                x={lx} 
                y={ly} 
                textAnchor="middle" 
                dominantBaseline="middle"
                className={`
                    text-[10px] font-mono font-bold fill-black pointer-events-none transition-opacity duration-200
                    ${isHovered ? 'opacity-100' : 'opacity-0'}
                `}
             >
                {realTickValue}
             </text>
          </g>
        );
    }
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full select-none relative" ref={knobRef}>
        {/* Use responsive width/height to prevent layout overflow in tight spaces */}
        <div className="relative flex items-center justify-center w-full h-full max-w-[200px] max-h-[200px]">
            <svg width="100%" height="100%" viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} className="overflow-visible">
                {ticks}
                
                <circle 
                    cx={center} 
                    cy={center} 
                    r={knobRadius} 
                    fill="#fafaf9" 
                    stroke="black" 
                    strokeWidth="1"
                    className="cursor-grab active:cursor-grabbing"
                    onMouseDown={handleMouseDown}
                />
                
                {/* 
                   Apply transition ONLY when NOT dragging. 
                   When just pressed (click) or idle, it animates.
                   When dragging (mouse move), it is instant.
                */}
                <g 
                    transform={`translate(${center}, ${center}) rotate(${currentAngle})`}
                    className={!isDragging ? "transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1)" : ""}
                >
                    <path 
                        d="M 0 -39.5 L 5 -30.84 L -5 -30.84 Z" 
                        fill="black"
                    />
                </g>
            </svg>
            
            <div 
                className="absolute bottom-[10px] flex flex-col items-center pointer-events-none left-0 right-0"
            >
                 <span className="text-2xl font-bold font-sans tracking-tighter tabular-nums leading-none">
                    {value >= 2000 ? "∞" : value}
                 </span>
                 <span className="text-[10px] font-sans font-normal uppercase text-gray-500 mt-1 leading-none">
                    Node Limit
                 </span>
            </div>
        </div>
    </div>
  );
};