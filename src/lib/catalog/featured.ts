type SluggedCatalogEntry = {
  slug: string;
};

const DAY_IN_MILLISECONDS = 86_400_000;

function rotationScore(slug: string, day: number) {
  let hash = 2_166_136_261;
  const value = `${day}:${slug}`;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
}

export function getRotatingFeaturedEntries<T extends SluggedCatalogEntry>(
  entries: readonly T[],
  now = new Date(),
  limit = 12,
) {
  const day = Math.floor(now.getTime() / DAY_IN_MILLISECONDS);

  return [...entries]
    .sort((left, right) => {
      const scoreDifference = rotationScore(left.slug, day) - rotationScore(right.slug, day);
      return scoreDifference || left.slug.localeCompare(right.slug);
    })
    .slice(0, Math.max(0, limit));
}
