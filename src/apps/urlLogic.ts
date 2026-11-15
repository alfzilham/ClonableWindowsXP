export const HOME = 'about:home';

/** Turn what the user typed into a navigable URL (or a search query). */
export function normalizeUrl(input: string): string {
  const text = input.trim();
  if (!text || text === HOME) return HOME;
  if (/^https?:\/\//i.test(text)) return text;
  if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(text)) return `https://${text}`;
  return `https://www.bing.com/search?q=${encodeURIComponent(text)}`;
}
