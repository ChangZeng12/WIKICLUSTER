
import React, { useState, useEffect, useCallback } from 'react';
import { NetworkGraph } from './components/NetworkGraph';
import { Sidebar } from './components/Sidebar';
import { MobileControls } from './components/MobileControls';
import { Logo } from './components/Logo';
import { fetchWikiLinks } from './services/wikiService';
import { GraphData, WikiNode, WikiLink } from './types';

function App() {
  // Graph Data State
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Interaction State
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null); // For camera centering
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null); // For highlighting
  
  // Settings
  const [linkLimit, setLinkLimit] = useState<number>(150); // Max sub-nodes per fetch
  const [searchTerm, setSearchTerm] = useState<string>(''); // Current sidebar input filter
  const [showSubNodes, setShowSubNodes] = useState<boolean>(true); // Toggle visibility of white nodes
  const [resetViewTrigger, setResetViewTrigger] = useState(0); // Counter to trigger D3 zoom reset
  
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Handle Window Resize
  useEffect(() => {
    const handleResize = () => {
        // On mobile, we use full width. On desktop, subtract sidebar width (300px).
        const sidebarWidth = window.innerWidth >= 768 ? 300 : 0;
        setDimensions({ width: window.innerWidth - sidebarWidth, height: window.innerHeight });
    };
    // Initial call
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /**
   * Handles clicking a node in the graph.
   * - If 'main': Focus/Center on it.
   * - If 'sub': Fetch data for it, convert to 'main', and add its children.
   */
  const handleNodeClick = useCallback(async (node: WikiNode | null) => {
    if (!node) {
      setFocusedNodeId(null);
      return;
    }

    if (node.group === 'main') {
      setFocusedNodeId(node.id);
      return;
    }

    // --- Expanding a Sub Node ---
    if (node.group === 'sub') {
      setIsLoading(true);
      try {
        const newData = await fetchWikiLinks(node.id, linkLimit);
        
        setGraphData(prevData => {
          // Map for efficient lookup and deduplication
          const nodeMap = new Map<string, WikiNode>();
          prevData.nodes.forEach(n => nodeMap.set(n.id, n));
          
          // Upgrade the clicked node from sub -> main
          const expandingNode = nodeMap.get(node.id);
          if (expandingNode) {
            expandingNode.group = 'main';
            if (newData.nodes.length > 0) {
                expandingNode.description = newData.nodes[0].description;
            }
          }
          
          // Add new children (sub-nodes)
          const newChildren = newData.nodes.slice(1);
          newChildren.forEach(child => {
            if (!nodeMap.has(child.id)) {
              // Set initial position near parent for smooth animation
              if (expandingNode && expandingNode.x !== undefined && expandingNode.y !== undefined) {
                 child.x = expandingNode.x + (Math.random() - 0.5) * 50;
                 child.y = expandingNode.y + (Math.random() - 0.5) * 50;
              }
              child.source = node.id;
              nodeMap.set(child.id, child);
            }
          });

          // Rebuild Links
          const linkMap = new Map<string, WikiLink>();
          const getLinkId = (s: string, t: string) => `${s}->${t}`;

          // Keep existing valid links
          prevData.links.forEach(l => {
             const sid = (typeof l.source === 'object') ? l.source.id : l.source as string;
             const tid = (typeof l.target === 'object') ? l.target.id : l.target as string;
             if (nodeMap.has(sid) && nodeMap.has(tid)) {
                 linkMap.set(getLinkId(sid, tid), { source: sid, target: tid, value: l.value });
             }
          });

          // Add new links from the API response
          newData.links.forEach(l => {
             const targetId = (typeof l.target === 'object') ? (l.target as WikiNode).id : l.target as string;
             if (nodeMap.has(targetId)) {
                const id = getLinkId(node.id, targetId);
                if (!linkMap.has(id)) {
                  linkMap.set(id, { source: node.id, target: targetId, value: 1 });
                }
             }
          });

          // Check for connections between the new main node and EXISTING main nodes
          nodeMap.forEach((potentialTarget) => {
             if (potentialTarget.group === 'main' && potentialTarget.id !== node.id) {
                if (newData.nodes.some(n => n.id === potentialTarget.id)) {
                   const id = getLinkId(node.id, potentialTarget.id);
                   if (!linkMap.has(id)) {
                      linkMap.set(id, { source: node.id, target: potentialTarget.id, value: 1 });
                   }
                }
             }
         });

          return { nodes: Array.from(nodeMap.values()), links: Array.from(linkMap.values()) };
        });

        setFocusedNodeId(node.id);
      } catch (err: any) {
        console.error("Error expanding node:", err);
      } finally {
        setIsLoading(false);
      }
    }
  }, [linkLimit]);

  /**
   * Handles Search Input from Sidebar.
   * - If node exists: Focus/Expand it.
   * - If new: Fetch from API and create new cluster.
   */
  const handleSearchSubmit = useCallback(async (input: string) => {
    const rawInput = input.trim().replace(/\s+/g, '_');
    if (!rawInput) return;

    // Check if exists in graph already
    const existingNode = graphData.nodes.find(n => n.id.toLowerCase() === rawInput.toLowerCase().replace(/_/g, ' '));
    if (existingNode) {
        if (existingNode.group === 'sub') handleNodeClick(existingNode);
        else setFocusedNodeId(existingNode.id);
        setSearchTerm(''); 
        return;
    }

    setIsLoading(true);
    setError(null);
    setSearchTerm('');

    try {
      const data = await fetchWikiLinks(rawInput, linkLimit);
      if (data.nodes.length === 0) throw new Error("No data found");

      const newMainNode = data.nodes[0];
      if (graphData.nodes.length === 0) newMainNode.source = 'ROOT';

      setGraphData(prevData => {
         const nodeMap = new Map<string, WikiNode>();
         prevData.nodes.forEach(n => nodeMap.set(n.id, n));
         
         const existingCanonical = nodeMap.get(newMainNode.id);
         let centerNode: WikiNode;

         if (existingCanonical) {
             centerNode = existingCanonical;
             // Upgrade if it was sub
             if (centerNode.group === 'sub') {
                 centerNode.group = 'main';
                 centerNode.description = newMainNode.description;
             }
         } else {
             centerNode = newMainNode;
             centerNode.group = 'main';
             // Random start position if not first node
             if (prevData.nodes.length > 0) {
                 centerNode.x = (Math.random() - 0.5) * 200;
                 centerNode.y = (Math.random() - 0.5) * 200;
             }
             nodeMap.set(centerNode.id, centerNode);
         }

         // Add children
         data.nodes.slice(1).forEach(child => {
            if (!nodeMap.has(child.id)) {
                if (centerNode.x !== undefined) {
                    child.x = centerNode.x + (Math.random() - 0.5) * 50;
                    child.y = centerNode.y + (Math.random() - 0.5) * 50;
                }
                child.source = centerNode.id;
                nodeMap.set(child.id, child);
            }
         });

         // Rebuild Links
         const linkMap = new Map<string, WikiLink>();
         const getLinkId = (s: string, t: string) => `${s}->${t}`;

         // Preserve old links
         prevData.links.forEach(l => {
            const sid = (typeof l.source === 'object') ? l.source.id : l.source as string;
            const tid = (typeof l.target === 'object') ? l.target.id : l.target as string;
            if (nodeMap.has(sid) && nodeMap.has(tid)) {
                linkMap.set(getLinkId(sid, tid), { source: sid, target: tid, value: l.value });
            }
         });

         // Add new links
         data.links.forEach(l => {
            const targetId = (typeof l.target === 'object') ? (l.target as WikiNode).id : l.target as string;
            if (nodeMap.has(targetId)) {
                const id = getLinkId(centerNode.id, targetId);
                if (!linkMap.has(id)) linkMap.set(id, { source: centerNode.id, target: targetId, value: 1 });
            }
         });

         // Connect new main node to existing main nodes if related
         nodeMap.forEach((potentialTarget) => {
             if (potentialTarget.group === 'main' && potentialTarget.id !== centerNode.id) {
                 if (data.nodes.some(n => n.id === potentialTarget.id)) {
                     const id = getLinkId(centerNode.id, potentialTarget.id);
                     if (!linkMap.has(id)) linkMap.set(id, { source: centerNode.id, target: potentialTarget.id, value: 1 });
                 }
             }
         });

         return { nodes: Array.from(nodeMap.values()), links: Array.from(linkMap.values()) };
      });

      setFocusedNodeId(newMainNode.id);
    } catch (err: any) {
      if (err.message === 'Page not found') setError('WIKI PAGE NOT FOUND');
      else setError(err.message || 'FETCH_FAILED');
    } finally {
      setIsLoading(false);
    }
  }, [linkLimit, graphData.nodes, handleNodeClick]);

  const handleClearAll = useCallback(() => {
    setGraphData({ nodes: [], links: [] });
    setFocusedNodeId(null);
    setError(null);
    setSearchTerm('');
  }, []);

  /**
   * Deletes a node.
   * If a Main node is deleted, it might downgrade its children back to 'sub' nodes
   * or remove them if they are not connected to any other Main node.
   */
  const handleDeleteNode = useCallback((nodeId: string) => {
    setGraphData(prevData => {
      const targetNode = prevData.nodes.find(n => n.id === nodeId);
      if (!targetNode) return prevData;

      // Identify other main nodes to see if we need to keep connections
      const otherMainNodeIds = new Set(prevData.nodes.filter(n => n.group === 'main' && n.id !== nodeId).map(n => n.id));
      
      const isConnectedToOtherMain = prevData.links.some(l => {
        const sid = typeof l.source === 'object' ? l.source.id : l.source as string;
        const tid = typeof l.target === 'object' ? l.target.id : l.target as string;
        if (sid === nodeId) return otherMainNodeIds.has(tid);
        if (tid === nodeId) return otherMainNodeIds.has(sid);
        return false;
      });

      // If a main node is connected to another main node, we might just want to demote it to 'sub' instead of deleting
      const shouldDemote = targetNode.group === 'main' && isConnectedToOtherMain;
      
      // Filter out the node (unless demoting)
      const candidateNodes = prevData.nodes.map(n => n.id === nodeId ? (shouldDemote ? { ...n, group: 'sub' as const } : null) : n).filter((n): n is WikiNode => n !== null);
      
      const nodeMap = new Map<string, WikiNode>();
      candidateNodes.forEach(n => nodeMap.set(n.id, n));
      
      const currentMainNodeIds = new Set(candidateNodes.filter(n => n.group === 'main').map(n => n.id));
      
      // Cleanup: Remove nodes that are no longer connected to ANY main node
      const finalNodes = candidateNodes.filter(n => {
        if (n.group === 'main') return true;
        // Check if this sub-node has a link to a main node
        return prevData.links.some(l => {
          const sid = typeof l.source === 'object' ? l.source.id : l.source as string;
          const tid = typeof l.target === 'object' ? l.target.id : l.target as string;
          if (sid === n.id) return currentMainNodeIds.has(tid);
          if (tid === n.id) return currentMainNodeIds.has(sid);
          return false;
        });
      });

      const finalNodeIds = new Set(finalNodes.map(n => n.id));
      
      // Cleanup Links
      const finalLinks = prevData.links.map(l => ({
          source: typeof l.source === 'object' ? l.source.id : l.source as string,
          target: typeof l.target === 'object' ? l.target.id : l.target as string,
          value: l.value
        })).filter(l => {
            if (!finalNodeIds.has(l.source) || !finalNodeIds.has(l.target)) return false;
            const s = nodeMap.get(l.source);
            const t = nodeMap.get(l.target);
            // Only keep links where at least one end is a Main node (or two main nodes)
            return s?.group === 'main' || t?.group === 'main';
        });

      return { nodes: finalNodes, links: finalLinks };
    });
  }, []);

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-stone-50 relative">
      
      {/* Desktop Sidebar: Hidden on Mobile */}
      <div className="hidden md:flex w-[300px] flex-shrink-0 h-full">
         <Sidebar 
            onSearchSubmit={handleSearchSubmit}
            isLoading={isLoading}
            error={error}
            nodes={graphData.nodes}
            links={graphData.links}
            hoveredNodeId={hoveredNodeId}
            focusedNodeId={focusedNodeId}
            onHoverNode={setHoveredNodeId}
            onFocusNode={setFocusedNodeId}
            onDeleteNode={handleDeleteNode}
            linkLimit={linkLimit}
            onLinkLimitChange={setLinkLimit}
            onClearAll={handleClearAll}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            showSubNodes={showSubNodes}
            onToggleSubNodes={() => setShowSubNodes(!showSubNodes)}
            onResetView={() => {
                setResetViewTrigger(prev => prev + 1);
                setFocusedNodeId(null);
            }}
         />
      </div>

      <div className="flex-1 h-full relative">
        {/* Mobile Logo Overlay: Hidden on Desktop */}
        <div className="absolute top-6 left-6 z-10 pointer-events-none opacity-25 md:hidden">
            <Logo />
        </div>

        {graphData.nodes.length > 0 ? (
          <NetworkGraph 
            data={graphData} width={dimensions.width} height={dimensions.height} 
            onNodeClick={handleNodeClick} focusedNodeId={focusedNodeId} hoveredNodeId={hoveredNodeId}
            onNodeHover={setHoveredNodeId} searchTerm={searchTerm} showSubNodes={showSubNodes} resetViewTrigger={resetViewTrigger}
            onInteraction={() => setFocusedNodeId(null)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
            <div className="border-4 border-black w-64 h-64 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-black rounded-full"></div>
            </div>
          </div>
        )}
        
        {/* Footer text (Hidden on mobile if it overlaps heavily, but keeping standard layout) */}
        <div className="hidden md:flex absolute bottom-4 left-6 flex-col items-start gap-1 pointer-events-none z-0">
           <span className="text-[8px] font-mono opacity-40 uppercase">
              DESIGNED BY <a href="https://changz12.com/" target="_blank" rel="noopener noreferrer" className="underline pointer-events-auto hover:text-black">CHANG ZENG</a> WITH FIGMA AND GEMINI // <a href="https://changz12.com/" target="_blank" rel="noopener noreferrer" className="underline pointer-events-auto hover:text-black">CHECK MORE</a>
           </span>
           <span className="text-[8px] font-mono opacity-40 uppercase">
              RENDERING: D3.JS FORCE LAYOUT // CLICK SUB-NODE TO EXPAND // USE SIDEBAR TO MANAGE
           </span>
        </div>
      </div>

      {/* Mobile Controls: Hidden on Desktop */}
      <MobileControls 
        onSearchSubmit={handleSearchSubmit}
        isLoading={isLoading}
        nodes={graphData.nodes}
        links={graphData.links}
        linkLimit={linkLimit}
        onLinkLimitChange={setLinkLimit}
        onClearAll={handleClearAll}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        showSubNodes={showSubNodes}
        onToggleSubNodes={() => setShowSubNodes(!showSubNodes)}
        onResetView={() => {
            setResetViewTrigger(prev => prev + 1);
            setFocusedNodeId(null);
        }}
        hoveredNodeId={hoveredNodeId}
        focusedNodeId={focusedNodeId}
        onHoverNode={setHoveredNodeId}
        onFocusNode={setFocusedNodeId}
        onDeleteNode={handleDeleteNode}
      />
    </div>
  );
}

export default App;
