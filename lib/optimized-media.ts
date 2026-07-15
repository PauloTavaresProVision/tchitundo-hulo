const optimizedStaticMedia = new Set([
  "community-guide",
  "community-portrait",
  "community-portrait-vertical",
  "community-rock",
  "community-women",
  "engraving-circles",
  "gallery-rock-01",
  "gallery-rock-02",
  "gallery-rock-03",
  "gallery-rock-04",
  "gallery-rock-05",
  "hero-aerial",
  "hero-sunset-portal",
  "rock-silhouette-vertical",
  "tchitundo-hulo-lettering-transparent",
]);

export function optimizedMediaUrl(value: string) {
  const match = /^\/media\/([^/?#]+)\.(?:jpe?g|png|webp)([?#].*)?$/i.exec(value);
  if (!match || !optimizedStaticMedia.has(match[1])) return value;
  return `/media/optimized/${match[1]}.webp${match[2] ?? ""}`;
}
