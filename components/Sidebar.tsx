
import React, { useMemo, useEffect, useState, useRef } from 'react';
import { 
  ArrowRight, 
  MagnifyingGlass, 
  CircleNotch, 
  X, 
  CrosshairSimple, 
  Plus, 
  ArrowCounterClockwise,
  ToggleLeft,
  ToggleRight,
  Trash
} from '@phosphor-icons/react';
import { WikiNode, WikiLink } from '../types';
import { KnobControl } from './KnobControl';
import { Logo } from './Logo';

interface SidebarProps {
  onSearchSubmit: (url: string) => void;
  isLoading: boolean;
  error: string | null;
  nodes: WikiNode[];
  links: WikiLink[];
  hoveredNodeId: string | null;
  focusedNodeId: string | null;
  onHoverNode: (id: string | null) => void;
  onFocusNode: (id: string | null) => void;
  onDeleteNode: (id: string) => void;
  linkLimit: number;
  onLinkLimitChange: (limit: number) => void;
  onClearAll: () => void;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  showSubNodes: boolean;
  onToggleSubNodes: () => void;
  onResetView: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onSearchSubmit,
  isLoading,
  error,
  nodes,
  links,
  hoveredNodeId,
  focusedNodeId,
  onHoverNode,
  onFocusNode,
  onDeleteNode,
  linkLimit,
  onLinkLimitChange,
  onClearAll,
  searchTerm,
  onSearchTermChange,
  showSubNodes,
  onToggleSubNodes,
  onResetView
}) => {
  const [inputVal, setInputVal] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Handle auto-scroll to focused card
  useEffect(() => {
    if (focusedNodeId && scrollContainerRef.current) {
      const timeout = setTimeout(() => {
        const element = document.getElementById(`sidebar-card-${focusedNodeId}`);
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [focusedNodeId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onSearchSubmit(inputVal.trim());
      setInputVal(''); 
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputVal(val);
      onSearchTermChange(val); 
  };

  const handleClearInput = () => {
    setInputVal('');
    onSearchTermChange('');
  };

  const mainNodes = useMemo(() => nodes.filter(n => n.group === 'main'), [nodes]);

  const getNodeStats = (nodeId: string) => {
    const connectedSubNodes = new Set<string>();
    const connectedMainNodes = new Set<string>();

    links.forEach(l => {
      const sourceId = typeof l.source === 'object' ? (l.source as WikiNode).id : l.source as string;
      const targetId = typeof l.target === 'object' ? (l.target as WikiNode).id : l.target as string;
      
      if (sourceId === nodeId || targetId === nodeId) {
        const otherId = sourceId === nodeId ? targetId : sourceId;
        const otherNode = nodes.find(n => n.id === otherId);
        
        if (otherNode) {
          if (otherNode.group === 'main') {
            connectedMainNodes.add(otherNode.id);
          } else {
            connectedSubNodes.add(otherNode.id);
          }
        }
      }
    });

    return { 
        subNodeCount: connectedSubNodes.size, 
        mainConnectionCount: connectedMainNodes.size 
    };
  };

  const sliderValue = linkLimit === Infinity ? 2000 : linkLimit;
  const hasNodes = nodes.length > 0;

  // Global settings for main icons
  const ICON_WEIGHT = "regular";
  const ICON_SIZE = 18;
  
  // Specific tool icon settings
  const TOOL_ICON_SIZE = 12;

  return (
    <aside className="w-full h-full flex flex-col bg-stone-50 border-r border-black z-20 shadow-none font-sans text-black box-border">
      {/* 1. Title Section - 使用新的 Logo 组件 */}
      <div className="px-6 py-8 border-b border-black bg-stone-50 flex flex-col justify-center shrink-0">
        <Logo />
      </div>

      {/* 2. Search Box Section */}
      <form onSubmit={handleSubmit} className="flex w-full border-b border-black h-[35px] shrink-0 group relative z-30 mb-0">
        <div className="flex-1 flex items-center px-3 bg-stone-50 overflow-hidden">
          <MagnifyingGlass size={ICON_SIZE} weight={ICON_WEIGHT} className="text-black mr-2 shrink-0" />
          <input 
            type="text" 
            placeholder=": /wiki title"
            className="flex-1 bg-transparent outline-none text-xs font-normal placeholder:text-gray-400 font-mono h-full min-w-0"
            value={inputVal}
            onChange={handleInputChange}
            disabled={isLoading}
          />
          {inputVal && (
            <button
              type="button"
              onClick={handleClearInput}
              className="ml-2 text-black hover:text-stone-500 transition-colors shrink-0"
            >
              <Trash size={ICON_SIZE} weight={ICON_WEIGHT} />
            </button>
          )}
        </div>
        <button 
          type="submit" 
          disabled={isLoading}
          className="h-full aspect-square bg-black text-white hover:bg-stone-800 transition-colors flex items-center justify-center border-l border-black disabled:opacity-80 shrink-0"
        >
          {isLoading ? (
            <CircleNotch size={ICON_SIZE} weight={ICON_WEIGHT} className="animate-spin" />
          ) : hasNodes ? (
            <Plus size={ICON_SIZE} weight={ICON_WEIGHT} />
          ) : (
            <ArrowRight size={ICON_SIZE} weight={ICON_WEIGHT} />
          )}
        </button>
      </form>

      {/* 3. Tool Section Grid */}
      <div className="flex border-b border-black h-[200px] shrink-0 mt-0">
           <div className="flex-1 min-w-0 border-r border-black relative bg-stone-50 flex items-center justify-center">
              <KnobControl 
                 value={sliderValue}
                 min={150}
                 max={2000}
                 step={50}
                 onChange={(val) => {
                     if (val >= 2000) onLinkLimitChange(Infinity);
                     else onLinkLimitChange(val);
                 }}
              />
           </div>

           <div className="w-[96px] flex flex-col shrink-0">
               <div className="flex-1 border-b border-black bg-stone-50"></div>
               
               {/* Reset View Button */}
               <button 
                  onClick={onResetView}
                  className="relative h-[60px] border-b border-black flex flex-col justify-end items-start p-[6px] bg-stone-50 text-black hover:bg-stone-200 transition-colors shrink-0 font-sans text-[10px] font-normal leading-tight"
               >
                  <ArrowCounterClockwise size={TOOL_ICON_SIZE} weight="regular" className="absolute top-[6px] right-[6px]" />
                  <span>RESET</span>
                  <span>VIEW</span>
               </button>

               {/* Toggle Subnodes */}
               <button 
                  onClick={onToggleSubNodes}
                  className={`
                    relative h-[60px] border-b border-black flex flex-col justify-end items-start p-[6px] transition-colors shrink-0 font-sans text-[10px] font-normal leading-tight
                    ${!showSubNodes ? 'bg-black text-white' : 'bg-stone-50 text-black hover:bg-stone-200'}
                  `}
               >
                  {showSubNodes ? (
                    <>
                        <ToggleLeft size={TOOL_ICON_SIZE} weight="regular" className="absolute top-[6px] right-[6px]" />
                        <span>HIDE</span>
                        <span>SUBNODES</span>
                    </>
                  ) : (
                    <>
                        <ToggleRight size={TOOL_ICON_SIZE} weight="fill" color="white" className="absolute top-[6px] right-[6px]" />
                        <span>SHOW</span>
                        <span>SUBNODES</span>
                    </>
                  )}
               </button>

               {/* Clear All */}
               <button 
                  onClick={onClearAll}
                  className="relative h-[60px] flex flex-col justify-end items-start p-[6px] bg-stone-50 text-black hover:bg-red-100 hover:text-red-600 transition-colors shrink-0 font-sans text-[10px] font-normal leading-tight"
               >
                  <X size={TOOL_ICON_SIZE} weight="regular" className="absolute top-[6px] right-[6px]" />
                  <span>CLEAR</span>
                  <span>ALL NODES</span>
               </button>
           </div>
      </div>

      {error && (
          <div className="p-3 bg-red-50 border-b border-black text-[10px] font-mono text-red-600 shrink-0">
              Error: {error}
          </div>
      )}

      {/* Main Node List */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto bg-stone-50 custom-scrollbar scroll-smooth"
      >
        {mainNodes.length === 0 && !isLoading && (
           <div className="h-full flex flex-col items-center justify-center opacity-30 p-8 text-center">
              <div className="w-16 h-16 border border-black rounded-full mb-4 flex items-center justify-center">
                  <div className="w-2 h-2 bg-black rounded-full" />
              </div>
              <p className="font-mono text-[10px] uppercase">
                Awaiting Input
              </p>
           </div>
        )}

        {mainNodes.map((node, index) => {
          const stats = getNodeStats(node.id);
          const isHovered = hoveredNodeId === node.id || (searchTerm && node.id.toLowerCase().includes(searchTerm.toLowerCase()));
          const isFocused = focusedNodeId === node.id;
          
          return (
            <div 
              key={node.id}
              id={`sidebar-card-${node.id}`}
              className={`
                group relative border-b border-black transition-colors duration-200
                ${isFocused ? 'bg-stone-300 border-l-[6px] border-l-black' : isHovered ? 'bg-stone-200' : 'bg-stone-50 hover:bg-stone-200'}
              `}
              onMouseEnter={() => onHoverNode(node.id)}
              onMouseLeave={() => onHoverNode(null)}
              onClick={() => {
                // If the user clicks a card that is NOT the focused one, clear focus
                if (!isFocused) {
                  onFocusNode(null);
                }
              }}
            >
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-gray-400">
                    {String(index + 1).padStart(2, '0')}
                    </span>
                    <h3 className="font-bold text-sm leading-none uppercase break-all line-clamp-1">
                        {node.id}
                    </h3>
                </div>
                
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card onClick from clearing what we just set
                      onFocusNode(node.id);
                    }} 
                    className="p-1.5 hover:bg-black hover:text-white rounded-sm transition-colors"
                    title="navigate to this node"
                   >
                      <CrosshairSimple size={16} weight="regular" />
                   </button>
                   <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNode(node.id);
                    }} 
                    className="p-1.5 hover:bg-red-600 hover:text-white rounded-sm transition-colors"
                    title="remove node"
                   >
                      <X size={16} weight="regular" />
                   </button>
                </div>
              </div>

              <div className="px-4 pb-4">
                 {node.description && (
                  <p className="text-[11px] text-gray-500 mb-3 leading-relaxed line-clamp-2">
                    {node.description}
                  </p>
                )}
                
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-[9px] text-gray-400 uppercase tracking-wider">Sub-Nodes</span>
                        <span className="font-mono text-xs">{stats.subNodeCount}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] text-gray-400 uppercase tracking-wider">Connects</span>
                        <span className="font-mono text-xs">{stats.mainConnectionCount}</span>
                    </div>
                    <a 
                        href={node.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="ml-auto text-[10px] uppercase font-bold border-b border-black pb-0.5 hover:text-blue-600 hover:border-blue-600 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                    >
                        Wiki Link
                    </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
