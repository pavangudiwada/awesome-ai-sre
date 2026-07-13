import path from "node:path";

// Next.js, the validator scripts, and operator CLIs all execute from the
// repository root. Keeping this boundary explicit prevents the build tracer
// from walking parent directories looking for a marker file.
const REPO_ROOT = process.cwd();

export function getRepoRoot(): string {
  return REPO_ROOT;
}

export function fromRepoRoot(...segments: string[]): string {
  return path.join(/* turbopackIgnore: true */ REPO_ROOT, ...segments);
}

export function toRepoRelative(absolutePath: string): string {
  return path.relative(REPO_ROOT, absolutePath).split(path.sep).join("/");
}
