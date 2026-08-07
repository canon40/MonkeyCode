import type { LogItem } from "./types";

const LOCAL_URL = /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?[^\s<>"'`，。；！？（）]*/gi;

export function normalizePreviewUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function latestPreviewUrl(items: LogItem[]): string | null {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (item.kind !== "agent") continue;
    const matches = item.text.match(LOCAL_URL);
    if (!matches) continue;
    for (let matchIndex = matches.length - 1; matchIndex >= 0; matchIndex -= 1) {
      const candidate = matches[matchIndex].replace(/[*)_,.;:!?\]}]+$/, "");
      const previewUrl = normalizePreviewUrl(candidate);
      if (previewUrl) return previewUrl;
    }
  }
  return null;
}
