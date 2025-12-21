
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphData, WikiNode, WikiLink } from '../types';
import { Tooltip } from './Tooltip';

interface NetworkGraphProps {
  data: GraphData;
  width: number;
  height: number;
  onNodeClick: (node: WikiNode | null) => void;
  focusedNodeId?: string | null;
  hoveredNodeId?: string | null;
  onNodeHover?: (nodeId: string | null) => void;
  searchTerm?: string;
  showSubNodes?: boolean;
  resetViewTrigger?: number;
}

export const NetworkGraph: React.FC<NetworkGraphProps> = ({ 
  data, 
  width, 
  height, 
  onNodeClick, 
  focusedNodeId, 
  hoveredNodeId, 
  onNodeHover,
  searchTerm,
  showSubNodes = true,
  resetViewTrigger = 0
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const currentTransformRef = useRef<d3.ZoomTransform | null>(null);
  const isInitializedRef = useRef(false);
  
  const [tooltipState, setTooltipState] = useState<{ x: number; y: number; content: string; visible: boolean }>({
    x: 0,
    y: 0,
    content: '',
    visible: false,
  });

  // --- Main D3 Initialization & Update Effect ---
  useEffect(() => {
    if (!svgRef.current || data.nodes.length === 0) return;

    // Filter nodes based on visibility setting (Main only vs All)
    const visibleNodes = showSubNodes ? data.nodes : data.nodes.filter(n => n.group === 'main');
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
    
    // Filter links to ensure both endpoints are visible
    const visibleLinks = data.links.filter(l => {
        const sid = typeof l.source === 'object' ? l.source.id : l.source as string;
        const tid = typeof l.target === 'object' ? l.target.id : l.target as string;
        return visibleNodeIds.has(sid) && visibleNodeIds.has(tid);
    });

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render for clean slate update
    const g = svg.append("g");

    // Clear focus on background click
    svg.on("click", (event) => {
      // Check if clicked directly on SVG or a non-node element
      if (event.target === svg.node()) {
        onNodeClick(null);
      }
    });

    // --- Zoom Behavior Setup ---
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        currentTransformRef.current = event.transform;

        // Semantic Zoom: Adjust label visibility/size based on zoom level
        const k = event.transform.k;
        g.selectAll('.node-label')
          .attr('opacity', (d: any) => {
            if (d.group === 'main') return 1; 
            return k > 1.2 ? 1 : 0; // Hide sub-node labels when zoomed out
          })
          .attr('font-size', (d: any) => {
            const size = d.group === 'main' ? 12 : 10;
            return `${size / k}px`; // Keep text size relatively consistent visually
          })
          .attr("dy", (d: any) => {
             if (d.group === 'main') return 14 + (10 / k); 
             return 7 + (8 / k);
          });
      });
    
    zoomRef.current = zoom;
    svg.call(zoom);
    
    // Restore or initialize zoom transform
    if (currentTransformRef.current) {
      svg.call(zoom.transform, currentTransformRef.current);
    } else {
      const initialTransform = d3.zoomIdentity.translate(width / 2, height / 2).scale(0.5);
      svg.call(zoom.transform, initialTransform);
      currentTransformRef.current = initialTransform;
    }

    isInitializedRef.current = true;

    // --- Force Simulation Configuration ---
    const simulation = d3.forceSimulation<WikiNode>(visibleNodes)
      .force("link", d3.forceLink<WikiNode, WikiLink>(visibleLinks)
        .id(d => d.id)
        .distance((d) => {
           const source = d.source as WikiNode;
           const target = d.target as WikiNode;
           // Main-to-Main connections are longer to separate clusters
           if (source.group === 'main' && target.group === 'main') {
             return 350; 
           }
           return 120; // Main-to-Sub connections are tighter
        })
      )
      .force("charge", d3.forceManyBody<WikiNode>()
        .strength((d) => d.group === 'main' ? -1500 : -250) // Stronger repulsion for main nodes
      )
      .force("collide", d3.forceCollide<WikiNode>().radius((d) => d.group === 'main' ? 50 : 18)) // Prevent overlap
      .force("x", d3.forceX(0).strength(0.01)) // Gentle gravity to center
      .force("y", d3.forceY(0).strength(0.01));

    const isMainConnection = (d: WikiLink) => {
      const s = d.source as WikiNode;
      const t = d.target as WikiNode;
      return s.group === 'main' && t.group === 'main';
    };

    // --- Drawing Links ---
    const link = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(visibleLinks)
      .enter().append("line")
      .attr("id", d => {
        const s = typeof d.source === 'object' ? d.source.id : d.source;
        const t = typeof d.target === 'object' ? d.target.id : d.target;
        return `link-${s}-${t}`; 
      })
      .attr("stroke", "#000")
      .attr("stroke-opacity", d => isMainConnection(d) ? 0.6 : 0.1) 
      .attr("stroke-width", d => isMainConnection(d) ? 2 : 0.5);

    // --- Drawing Nodes ---
    const nodeGroup = g.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(visibleNodes)
      .enter().append("g")
      .attr("class", "node-group")
      .attr("id", d => `node-${d.id.replace(/\s+/g, '-')}`) 
      .attr("cursor", "pointer")
      .call(d3.drag<SVGGElement, WikiNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
      );

    // Node Ring (Highlight indicator)
    nodeGroup.append("circle")
      .attr("class", "node-ring")
      .attr("r", d => d.group === 'main' ? 20 : 0)
      .attr("fill", "#fafaf9") 
      .attr("stroke", "#000")
      .attr("stroke-width", 3)
      .attr("opacity", 0); 

    // Node Core (Visible circle)
    nodeGroup.append("circle")
      .attr("class", "node-core")
      .attr("r", d => d.group === 'main' ? 12 : 5)
      .attr("fill", d => d.group === 'main' ? "#000" : "#fff") 
      .attr("stroke", "#000")
      .attr("stroke-width", d => d.group === 'main' ? 0 : 1.5);

    const initialK = currentTransformRef.current ? currentTransformRef.current.k : 0.5;

    // --- Drawing Labels ---
    const label = g.append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(visibleNodes)
      .enter().append("text")
      .attr("class", "node-label")
      .text(d => d.id)
      .attr("text-anchor", "middle")
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("font-weight", d => d.group === 'main' ? "bold" : "normal")
      .attr("fill", "#000")
      .attr("pointer-events", "none") 
      .attr("font-size", d => {
        const size = d.group === 'main' ? 12 : 10;
        return `${size / initialK}px`;
      })
      .attr("dy", d => d.group === 'main' ? 14 + (10 / initialK) : 7 + (8 / initialK))
      .attr("opacity", d => d.group === 'main' ? 1 : (initialK > 1.2 ? 1 : 0));

    // --- Event Listeners ---
    nodeGroup
      .on("mouseover", (event, d) => {
        setTooltipState({
            x: event.clientX,
            y: event.clientY,
            content: d.id,
            visible: true
        });
        if (onNodeHover) onNodeHover(d.id);
      })
      .on("mouseout", () => {
         setTooltipState(prev => ({ ...prev, visible: false }));
         if (onNodeHover) onNodeHover(null);
      })
      .on("click", (event, d) => {
          event.stopPropagation();
          onNodeClick(d);
      });

    // --- Simulation Tick (Animation Loop) ---
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as WikiNode).x!)
        .attr("y1", d => (d.source as WikiNode).y!)
        .attr("x2", d => (d.target as WikiNode).x!)
        .attr("y2", d => (d.target as WikiNode).y!);

      nodeGroup.attr("transform", d => `translate(${d.x!},${d.y!})`);
      label.attr("x", d => d.x!).attr("y", d => d.y!);
    });

    // --- Drag Handlers ---
    function dragstarted(event: any, d: WikiNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: WikiNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: WikiNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [data, height, width, onNodeClick, showSubNodes]); 

  // --- View Reset Effect ---
  useEffect(() => {
    if (resetViewTrigger > 0 && svgRef.current && zoomRef.current) {
      const visibleNodes = showSubNodes ? data.nodes : data.nodes.filter(n => n.group === 'main');
      if (visibleNodes.length === 0) return;
      
      // Calculate bounding box of all nodes
      const xExtent = d3.extent(visibleNodes, d => d.x) as [number, number];
      const yExtent = d3.extent(visibleNodes, d => d.y) as [number, number];
      if (xExtent[0] === undefined || yExtent[0] === undefined) return;
      
      const padding = 100;
      const dx = xExtent[1] - xExtent[0] || 100;
      const dy = yExtent[1] - yExtent[0] || 100;
      const x = (xExtent[0] + xExtent[1]) / 2;
      const y = (yExtent[0] + yExtent[1]) / 2;
      
      // Determine scale to fit everything
      const scale = Math.min(4, 0.9 / Math.max(dx / (width - padding * 2), dy / (height - padding * 2))) || 0.5;
      
      // Animate zoom
      d3.select(svgRef.current).transition().duration(1000).call(zoomRef.current.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(scale).translate(-x, -y));
    }
  }, [resetViewTrigger, data, width, height, showSubNodes]);

  // --- Focus Node Effect ---
  useEffect(() => {
    if (focusedNodeId && svgRef.current && zoomRef.current) {
       const focusNode = data.nodes.find(n => n.id === focusedNodeId);
       if (focusNode) {
         const currentScale = currentTransformRef.current ? currentTransformRef.current.k : 0.6;
         const targetScale = Math.max(currentScale, 0.6); // Don't zoom out too much, maintain at least 0.6
         d3.select(svgRef.current).transition().duration(1000).call(zoomRef.current.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(targetScale).translate(-(focusNode.x || 0), -(focusNode.y || 0)));
       }
    }
  }, [focusedNodeId, data, width, height]);

  // --- Highlight/Hover Interactions (Without D3 re-render) ---
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const nodeCores = svg.selectAll<SVGCircleElement, WikiNode>(".node-core");
    const nodeRings = svg.selectAll<SVGCircleElement, WikiNode>(".node-ring");
    const links = svg.selectAll<SVGLineElement, WikiLink>(".links line");

    const isMainConnection = (d: WikiLink) => {
        const s = d.source as WikiNode;
        const t = d.target as WikiNode;
        return s?.group === 'main' && t?.group === 'main';
    };

    const isNodeHighlighted = (nodeId: string) => {
        if (nodeId === hoveredNodeId) return true;
        if (searchTerm && nodeId.toLowerCase().includes(searchTerm.toLowerCase())) return true;
        return false;
    };

    // Animate Node Rings
    nodeRings.transition().duration(200).attr("opacity", d => (isNodeHighlighted(d.id) && d.group === 'main') ? 1 : 0);
    
    // Scale Node Cores
    nodeCores.transition().duration(200)
      .attr("r", d => isNodeHighlighted(d.id) ? (d.group === 'main' ? 12 : 9) : (d.group === 'main' ? 12 : 5))
      .attr("stroke-width", d => isNodeHighlighted(d.id) ? (d.group === 'main' ? 0 : 3) : (d.group === 'main' ? 0 : 1.5));

    // Highlight Links connected to hovered node
    links.transition().duration(200)
      .attr("stroke-opacity", d => {
          const s = d.source as WikiNode;
          const t = d.target as WikiNode;
          if (s.id === hoveredNodeId || t.id === hoveredNodeId) return 1;
          return isMainConnection(d) ? 0.6 : 0.1;
      })
      .attr("stroke-width", d => {
          const s = d.source as WikiNode;
          const t = d.target as WikiNode;
          if (s.id === hoveredNodeId || t.id === hoveredNodeId) return 3;
          return isMainConnection(d) ? 2 : 0.5;
      });
  }, [hoveredNodeId, searchTerm]);

  return (
    <>
      <svg ref={svgRef} width={width} height={height} className="block bg-stone-50" />
      <Tooltip {...tooltipState} />
    </>
  );
};