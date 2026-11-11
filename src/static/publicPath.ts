/** Resolve bundled public assets and page links for both cPanel and the Pages preview. */
export function publicPath(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  const base = import.meta.env?.BASE_URL || "/";
  return `${base.replace(/\/$/, "")}${path}`;
}
