export function fileBackedSlugsToRetire(
  existingSlugs: readonly string[],
  publishedSlugs: ReadonlySet<string>,
): string[] {
  return existingSlugs.filter((slug) => !publishedSlugs.has(slug));
}
