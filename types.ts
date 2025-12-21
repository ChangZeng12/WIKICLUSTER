
export interface WikiNode {
  id: string; // The article title
  group: 'main' | 'sub';
  url: string;
  source?: string; // The ID of the node that spawned this one, or 'ROOT'
  description?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
}

export interface WikiLink {
  source: string | WikiNode;
  target: string | WikiNode;
  value: number;
}

export interface GraphData {
  nodes: WikiNode[];
  links: WikiLink[];
}

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