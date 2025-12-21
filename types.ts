
export interface WikiNode {
  id: string; // The article title, serves as the unique identifier
  group: 'main' | 'sub'; // 'main': User-searched or expanded nodes (black); 'sub': purely linked nodes (white)
  url: string; // Full Wikipedia URL
  source?: string; // The ID of the node that spawned this one, or 'ROOT' for the initial search
  description?: string; // Short description extracted from Wikipedia API
  
  // D3 Force Layout internal properties (optional because they are added by D3)
  x?: number;
  y?: number;
  fx?: number | null; // Fixed X position (used during dragging)
  fy?: number | null; // Fixed Y position (used during dragging)
  vx?: number; // Velocity X
  vy?: number; // Velocity Y
}

export interface WikiLink {
  source: string | WikiNode; // Reference to source node ID or object (D3 transforms this to object)
  target: string | WikiNode; // Reference to target node ID or object
  value: number; // Strength/Weight of the link (currently mostly 1)
}

export interface GraphData {
  nodes: WikiNode[];
  links: WikiLink[];
}

// Typing for the MediaWiki API response structure
export interface WikiAPIResponse {
  query?: {
    pages?: {
      [key: string]: {
        title: string;
        links?:Array<{ ns: number; title: string }>;
      };
    };
  };
}