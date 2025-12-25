
import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlass, 
  Trash, 
  ArrowRight, 
  CircleNotch,
  ArrowCounterClockwise,
  ToggleLeft,
  ToggleRight,
  X,
  CaretUp,
  CaretDown
} from '@phosphor-icons/react';
import { WikiNode, WikiLink } from '../types';

interface MobileControlsProps {
  onSearchSubmit: (url: string) => void;
  isLoading: boolean;
  nodes: WikiNode[];
  links: WikiLink[];
  linkLimit: number;
  onLinkLimitChange: (limit: number) => void;
  onClearAll: () => void;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  showSubNodes: boolean;
  onToggleSubNodes: () => void;
  onResetView: () => void;
  hoveredNodeId: string | null;
  focusedNodeId: string | null;
  onHoverNode: (id: string | null) => void;
  onFocusNode: (id: string | null) => void;
  onDeleteNode: (id: string) => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onSearchSubmit,
  isLoading,
  nodes,
  links,
  linkLimit,
  onLinkLimitChange,
  onClearAll,
  searchTerm,
  onSearchTermChange,
  showSubNodes,
  onToggleSubNodes,
  onResetView,
  focusedNodeId,
  onFocusNode,
  onDeleteNode
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const sliderValue = linkLimit === Infinity ? 2000 : linkLimit;

  // Sync internal input with prop
  useEffect(() => {
     if (searchTerm !== inputVal) setInputVal(searchTerm);
  }, [searchTerm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onSearchSubmit(inputVal.trim());
      setInputVal('');
      setIsOpen(false); // Close drawer on search to see result
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (val >= 2000) onLinkLimitChange(Infinity);
    else onLinkLimitChange(val);
  };

  const mainNodes = nodes.filter(n => n.group === 'main');
  
  // Calculate stats for list items
  const getNodeStats = (nodeId: string) => {
    let sub = 0;
    let main = 0;
    links.forEach(l => {
      const s = typeof l.source === 'object' ? (l.source as WikiNode).id : l.source as string;
      const t = typeof l.target === 'object' ? (l.target as WikiNode).id : l.target as string;
      if (s === nodeId || t === nodeId) {
        const otherId = s === nodeId ? t : s;
        const otherNode = nodes.find(n => n.id === otherId);
        if (otherNode) {
            otherNode.group === 'main' ? main++ : sub++;
        }
      }
    });
    return { sub, main };
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col pointer-events-none md:hidden">
      
      {/* Drawer (Slide Up Panel) */}
      <div 
        className={`
            bg-stone-50 border-t border-black w-full pointer-events-auto transition-all duration-300 ease-in-out flex flex-col
            ${isOpen ? 'h-[60vh] opacity-100 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]' : 'h-0 opacity-0 overflow-hidden'}
        `}
      >
        <div className="flex-1 overflow-y-auto p-0 custom-scrollbar">
             {mainNodes.length === 0 && (
                 <div className="p-8 text-center opacity-40 font-mono text-xs uppercase">No Nodes Active</div>
             )}
             {mainNodes.map((node, idx) => {
                 const stats = getNodeStats(node.id);
                 const isFocused = focusedNodeId === node.id;
                 return (
                    <div 
                        key={node.id}
                        className={`
                            border-b border-black p-4 flex flex-col gap-2
                            ${isFocused ? 'bg-stone-200' : 'bg-stone-50 active:bg-stone-100'}
                        `}
                        onClick={() => {
                            onFocusNode(node.id);
                            setIsOpen(false);
                        }}
                    >
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] text-gray-400">{String(idx + 1).padStart(2, '0')}</span>
                                <span className="font-bold text-sm uppercase truncate max-w-[200px]">{node.id}</span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); onDeleteNode(node.id); }} className="p-1 hover:text-red-600">
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                        {node.description && <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">{node.description}</p>}
                        <div className="flex gap-4 text-[10px] font-mono text-gray-400 mt-1">
                            <span>SUB: {stats.sub}</span>
                            <span>CON: {stats.main}</span>
                        </div>
                    </div>
                 );
             })}
        </div>
      </div>

      {/* Main Toolbar Wrapper (Relative for Absolute Button Positioning) */}
      <div className="relative pointer-events-auto z-10">
        
        {/* Toggle Button - Absolutely Positioned on Top */}
        <div className="absolute left-0 right-0 bottom-full z-20 translate-y-[1px]">
             <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full h-8 bg-stone-50 border-b border-black flex items-center justify-center transition-colors
                    ${isOpen ? 'border-t-0' : 'border-t hover:bg-stone-100 active:bg-stone-200'}
                `}
             >
                {isOpen ? <CaretDown size={14} weight="bold"/> : <CaretUp size={14} weight="bold"/>}
             </button>
        </div>

        {/* Main Toolbar Content */}
        <div className="bg-stone-50 border-t border-black shadow-[0_-2px_10px_rgba(0,0,0,0.05)] relative z-10">
            {/* Row 1: Search - Added mb-0 to ensure no browser default margin */}
            <form onSubmit={handleSubmit} className="flex h-10 border-b border-black mb-0">
                <div className="flex-1 flex items-center px-3 gap-2 bg-stone-50">
                    <MagnifyingGlass size={16} />
                    <input 
                        type="text" 
                        className="flex-1 bg-transparent outline-none text-xs font-mono h-full"
                        placeholder=": /wiki title"
                        value={inputVal}
                        onChange={(e) => {
                            setInputVal(e.target.value);
                            onSearchTermChange(e.target.value);
                        }}
                    />
                    {inputVal && <button type="button" onClick={() => { setInputVal(''); onSearchTermChange(''); }}><Trash size={16} /></button>}
                </div>
                <button type="submit" disabled={isLoading} className="aspect-square h-full bg-black text-white flex items-center justify-center border-l border-black">
                    {isLoading ? <CircleNotch size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                </button>
            </form>

            {/* Row 2: Controls */}
            <div className="flex h-12">
                {/* Slider Section */}
                {/* Border-r handles the divider line */}
                <div className="flex-1 flex flex-row items-center px-4 border-r border-black bg-stone-50 min-w-0 gap-[10px]">
                    <div className="flex flex-col justify-center gap-[1px]">
                        <span className="font-sans text-[8px] font-normal leading-none text-black uppercase">NODE</span>
                        <span className="font-sans text-[8px] font-normal leading-none text-black uppercase">LIMIT</span>
                    </div>
                    
                    <div className="font-sans text-[12px] font-normal text-black w-[24px] text-center">
                        {sliderValue >= 2000 ? '∞' : sliderValue}
                    </div>

                    <input 
                        type="range" 
                        min="150" 
                        max="2000" 
                        step="50"
                        value={sliderValue}
                        onChange={handleSliderChange}
                        className="
                            flex-1 h-6 bg-transparent appearance-none cursor-pointer
                            [&::-webkit-slider-runnable-track]:h-[2px] 
                            [&::-webkit-slider-runnable-track]:bg-black 
                            [&::-webkit-slider-thumb]:appearance-none 
                            [&::-webkit-slider-thumb]:h-[10px] 
                            [&::-webkit-slider-thumb]:w-[10px] 
                            [&::-webkit-slider-thumb]:rounded-full 
                            [&::-webkit-slider-thumb]:bg-white 
                            [&::-webkit-slider-thumb]:border-[1px] 
                            [&::-webkit-slider-thumb]:border-solid
                            [&::-webkit-slider-thumb]:border-black 
                            [&::-webkit-slider-thumb]:-mt-[4px]
                            
                            [&::-moz-range-track]:h-[2px] 
                            [&::-moz-range-track]:bg-black 
                            [&::-moz-range-thumb]:h-[10px] 
                            [&::-moz-range-thumb]:w-[10px] 
                            [&::-moz-range-thumb]:rounded-full 
                            [&::-moz-range-thumb]:bg-white 
                            [&::-moz-range-thumb]:border-[1px] 
                            [&::-moz-range-thumb]:border-solid
                            [&::-moz-range-thumb]:border-black
                        "
                    />
                </div>

                {/* Square Buttons */}
                <div className="flex shrink-0">
                    {/* NO border-l here. Separator is provided by slider's border-r */}
                    <button 
                        onClick={onResetView}
                        className="h-full w-12 flex items-center justify-center hover:bg-stone-200 active:bg-stone-300"
                        title="Reset View"
                    >
                        <ArrowCounterClockwise size={20} />
                    </button>
                    {/* Border-l is present here to separate the buttons */}
                    <button 
                        onClick={onToggleSubNodes}
                        className={`h-full w-12 border-l border-black flex items-center justify-center transition-colors ${!showSubNodes ? 'bg-black text-white' : 'bg-stone-50 hover:bg-stone-200 active:bg-stone-300'}`}
                        title="Toggle Subnodes"
                    >
                        {showSubNodes ? <ToggleLeft size={20} /> : <ToggleRight size={20} weight="fill" />}
                    </button>
                    <button 
                        onClick={onClearAll}
                        className="h-full w-12 border-l border-black flex items-center justify-center hover:bg-red-50 text-black hover:text-red-600 active:bg-red-100"
                        title="Clear All"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
