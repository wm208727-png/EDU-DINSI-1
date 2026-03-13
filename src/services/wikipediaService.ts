export interface WikipediaSummary {
  title: string;
  extract: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  content_urls: {
    desktop: {
      page: string;
    };
  };
}

export async function fetchWikipediaSummary(title: string): Promise<WikipediaSummary | null> {
  try {
    const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Wikipedia fetch error:", error);
    return null;
  }
}

export async function searchWikipedia(query: string): Promise<string[]> {
  try {
    const response = await fetch(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=10&namespace=0&format=json&origin=*`);
    const data = await response.json();
    return data[1] || [];
  } catch (error) {
    console.error("Wikipedia search error:", error);
    return [];
  }
}
