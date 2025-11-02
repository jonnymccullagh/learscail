// Wiktionary API integration
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

const WIKTIONARY_API_URL = 'https://en.wiktionary.org/w/api.php';

// Check if we're in a Tauri context
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

// Use Tauri fetch if available, otherwise fall back to browser fetch
const fetchFn = isTauri ? tauriFetch : fetch;

export interface WiktionaryEntry {
  word: string;
  etymology?: string;
  pronunciation?: string;
  definitions?: string[];
  fullText: string;
}

// Extract the Irish language section from Wiktionary text
function extractIrishSection(text: string): string {
  // Find the Irish section
  const irishMatch = text.match(/== Irish ==([\s\S]*?)(?=\n==\s|\n\n==|$)/);
  if (irishMatch) {
    return irishMatch[1].trim();
  }
  return '';
}

// Parse etymology from Irish section
function parseEtymology(irishSection: string): string | undefined {
  const etymologyMatch = irishSection.match(/=== Etymology ===([\s\S]*?)(?=\n===|\n\n|$)/);
  if (etymologyMatch) {
    return etymologyMatch[1].trim();
  }
  return undefined;
}

// Parse pronunciation from Irish section
function parsePronunciation(irishSection: string): string | undefined {
  const pronunciationMatch = irishSection.match(/=== Pronunciation ===([\s\S]*?)(?=\n===|\n\n|$)/);
  if (pronunciationMatch) {
    return pronunciationMatch[1].trim();
  }
  return undefined;
}

// Parse definitions from Irish section
function parseDefinitions(irishSection: string): string[] {
  const definitions: string[] = [];

  // Look for adjective definitions
  const adjectiveMatch = irishSection.match(/=== Adjective ===([\s\S]*?)(?=\n===|\n\n====|$)/);
  if (adjectiveMatch) {
    const lines = adjectiveMatch[1].split('\n').filter(line => line.trim());
    lines.forEach(line => {
      if (line.trim() && !line.includes('===') && !line.includes('IPA') && !line.includes('genitive')) {
        definitions.push(`(adj) ${line.trim()}`);
      }
    });
  }

  // Look for noun definitions
  const nounMatch = irishSection.match(/=== Noun ===([\s\S]*?)(?=\n===|\n\n====|$)/);
  if (nounMatch) {
    const lines = nounMatch[1].split('\n').filter(line => line.trim());
    lines.forEach(line => {
      if (line.trim() && !line.includes('===') && !line.includes('IPA') && !line.includes('genitive') && !line.includes('nominative')) {
        definitions.push(`(noun) ${line.trim()}`);
      }
    });
  }

  // Look for verb definitions
  const verbMatch = irishSection.match(/=== Verb ===([\s\S]*?)(?=\n===|\n\n====|$)/);
  if (verbMatch) {
    const lines = verbMatch[1].split('\n').filter(line => line.trim());
    lines.forEach(line => {
      if (line.trim() && !line.includes('===') && !line.includes('IPA') && !line.includes('present') && !line.includes('future')) {
        definitions.push(`(verb) ${line.trim()}`);
      }
    });
  }

  // Look for interjection definitions
  const interjectionMatch = irishSection.match(/=== Interjection ===([\s\S]*?)(?=\n===|\n\n====|$)/);
  if (interjectionMatch) {
    const lines = interjectionMatch[1].split('\n').filter(line => line.trim());
    lines.forEach(line => {
      if (line.trim() && !line.includes('===')) {
        definitions.push(`(interjection) ${line.trim()}`);
      }
    });
  }

  return definitions;
}

export async function queryWiktionary(word: string): Promise<WiktionaryEntry | null> {
  try {
    const url = new URL(WIKTIONARY_API_URL);
    url.searchParams.append('action', 'query');
    url.searchParams.append('prop', 'extracts');
    url.searchParams.append('explaintext', '1');
    url.searchParams.append('format', 'json');
    url.searchParams.append('formatversion', '2');
    url.searchParams.append('titles', word);

    const response = await fetchFn(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Mappa/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Wiktionary API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.query?.pages || data.query.pages.length === 0) {
      return null;
    }

    const page = data.query.pages[0];
    if (!page.extract) {
      return null;
    }

    const fullText = page.extract;
    const irishSection = extractIrishSection(fullText);

    if (!irishSection) {
      // No Irish section found
      return null;
    }

    const etymology = parseEtymology(irishSection);
    const pronunciation = parsePronunciation(irishSection);
    const definitions = parseDefinitions(irishSection);

    return {
      word: page.title,
      etymology,
      pronunciation,
      definitions: definitions.length > 0 ? definitions : undefined,
      fullText: irishSection
    };
  } catch (error) {
    console.error('Error querying Wiktionary:', error);
    return null;
  }
}
