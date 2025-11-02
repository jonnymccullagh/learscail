// Wikipedia API integration
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

// Check if we're in a Tauri context
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

// Use Tauri fetch if available, otherwise fall back to browser fetch
const fetchFn = isTauri ? tauriFetch : fetch;

/**
 * Normalize Irish characters with accents to their ASCII equivalents
 * This is needed because Wikipedia URLs don't use accented characters
 */
function normalizeIrishName(name: string): string {
  const replacements: { [key: string]: string } = {
    'á': 'a', 'Á': 'A',
    'é': 'e', 'É': 'E',
    'í': 'i', 'Í': 'I',
    'ó': 'o', 'Ó': 'O',
    'ú': 'u', 'Ú': 'U'
  };

  return name.replace(/[áÁéÉíÍóÓúÚ]/g, (match) => replacements[match] || match);
}

export interface WikipediaSummary {
  title: string;
  extract: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  content_urls?: {
    desktop: {
      page: string;
    };
    mobile: {
      page: string;
    };
  };
}

/**
 * Query Wikipedia for a page summary
 * @param pageName - The name of the Wikipedia page (e.g., "Dublin" or "Baile_Atha_Cliath")
 * @param language - Language code: 'en' for English, 'ga' for Irish
 * @returns WikipediaSummary or null if not found
 */
export async function queryWikipedia(
  pageName: string,
  language: 'en' | 'ga' = 'en'
): Promise<WikipediaSummary | null> {
  try {
    // Normalize Irish characters to ASCII (e.g., "Baile Átha Cliath" -> "Baile Atha Cliath")
    const normalizedName = normalizeIrishName(pageName);

    // Replace spaces with underscores for Wikipedia URLs
    const formattedPageName = normalizedName.replace(/\s+/g, '_');

    const url = `https://${language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(formattedPageName)}`;

    console.log('Wikipedia query:', {
      original: pageName,
      normalized: normalizedName,
      formatted: formattedPageName,
      url: url,
      language: language
    });

    const response = await fetchFn(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mappa/1.0',
        'Accept': 'application/json',
      },
    });

    console.log('Wikipedia response status:', response.status);

    if (!response.ok) {
      // 404 means page not found, which is not an error
      if (response.status === 404) {
        console.log('Wikipedia page not found (404)');
        return null;
      }
      throw new Error(`Wikipedia API error: ${response.status}`);
    }

    const data = await response.json();

    // Check if we have a valid extract
    if (!data.extract) {
      return null;
    }

    return {
      title: data.title,
      extract: data.extract,
      thumbnail: data.thumbnail,
      content_urls: data.content_urls
    };
  } catch (error) {
    console.error('Error querying Wikipedia:', error);
    return null;
  }
}
