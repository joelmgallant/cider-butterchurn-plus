type NowPlayingLike = {
  id?: unknown;
  attributes?: {
    name?: unknown;
    artistName?: unknown;
    playParams?: { id?: unknown };
  };
} | null | undefined;

/** Stable identity for the now-playing item, or null when nothing is playing. */
export function trackKey(item: NowPlayingLike): string | null {
  if (!item) return null;
  const id = item.id ?? item.attributes?.playParams?.id;
  if (id !== undefined && id !== null && id !== "") return `id:${String(id)}`;
  const name = item.attributes?.name;
  if (typeof name === "string" && name.length > 0) {
    const artist = typeof item.attributes?.artistName === "string" ? item.attributes.artistName : "";
    return `meta:${name}|${artist}`;
  }
  return null;
}
