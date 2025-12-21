
import { WikiAPIResponse, GraphData, WikiNode, WikiLink } from '../types';

const WIKI_API_URL = 'https://en.wikipedia.org/w/api.php';

const EXCLUDED_NAMESPACES = new Set([
  'User', 'Talk', 'Template', 'Wikipedia', 'File', 'Image', 
  'MediaWiki', 'Help', 'Category', 'Portal', 'Book', 'Draft', 
  'TimedText', 'Module', 'Special', 'Media'
]);

/**
 * Extracts the title from a standard Wikipedia URL.
 */
export const extractTitleFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    if (!urlObj.hostname.includes('wikipedia.org')) return null;
    
    // Path usually /wiki/Title
    const parts = urlObj.pathname.split('/');
    const titlePart = parts[parts.length - 1];
    return decodeURIComponent(titlePart);
  } catch (e) {
    return null;
  }
};

/**
 * Helper to normalize wiki titles for deduplication.
 */
const normalizeTitle = (title: string): string => {
  let t = title.trim().replace(/_/g, ' ');
  if (t.length > 0) {
    t = t.charAt(0).toUpperCase() + t.slice(1);
  }
  return t;
};

/**
 * Checks if a title belongs to an excluded namespace.
 */
const isExcludedNamespace = (title: string): boolean => {
  const parts = title.split(':');
  if (parts.length > 1) {
    const prefix = parts[0].trim();
    if (EXCLUDED_NAMESPACES.has(prefix)) return true;
    const lowerPrefix = prefix.toLowerCase();
    for (const ns of EXCLUDED_NAMESPACES) {
        if (ns.toLowerCase() === lowerPrefix) return true;
    }
  }
  return false;
};

/**
 * Fetches links for a specific Wikipedia page title.
 */
export const fetchWikiLinks = async (title: string, maxLinks: number = 150): Promise<GraphData> => {
  const params = new URLSearchParams({
    action: 'query',
    titles: title,
    prop: 'revisions|description',
    rvprop: 'content',
    format: 'json',
    origin: '*',
    redirects: '1',
  });

  const response = await fetch(`${WIKI_API_URL}?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch from Wikipedia');
  }

  const data: any = await response.json();
  if (data.error) throw new Error(data.error.info);

  const pages = data.query?.pages;
  if (!pages) throw new Error('No pages found');

  const pageId = Object.keys(pages)[0];
  const pageData = pages[pageId];

  if (!pageData || pageId === '-1') {
     throw new Error('Page not found');
  }

  const canonicalTitle = pageData.title;
  const description = pageData.description; 
  let content = pageData.revisions?.[0]?.['*'] || '';

  if (!content) {
      return { nodes: [], links: [] };
  }

  // --- EXTRACT UNIQUE LINKS ONLY ---
  const linkRegex = /\[\[([^|\]#\n]+)(?:#[^|\]]*)?(?:\|[^\]]*)?\]\]/g;
  const uniqueLinks = new Set<string>();
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
      const normalizedTarget = normalizeTitle(match[1]);
      if (normalizedTarget !== canonicalTitle && !isExcludedNamespace(normalizedTarget)) {
          uniqueLinks.add(normalizedTarget);
      }
  }

  let finalLinkList = Array.from(uniqueLinks);
  if (maxLinks !== Infinity) {
    finalLinkList = finalLinkList.slice(0, maxLinks);
  }

  const centerNode: WikiNode = {
    id: canonicalTitle,
    group: 'main',
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(canonicalTitle)}`,
    description: description,
  };

  const childNodes: WikiNode[] = finalLinkList.map(linkTitle => ({
    id: linkTitle,
    group: 'sub',
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(linkTitle)}`,
  }));

  const links: WikiLink[] = childNodes.map(child => ({
    source: centerNode.id,
    target: child.id,
    value: 1
  }));

  return {
    nodes: [centerNode, ...childNodes],
    links: links
  };
};