import path from "node:path";

let targetDir: string | null = null;

export function setTargetDir(nextTargetDir: string): void {
  targetDir = nextTargetDir;
}

export function getTargetDir(): string {
  if (!targetDir) {
    throw new Error("Target application directory has not been set.");
  }

  return targetDir;
}

export function getSafeProjectPath(inputPath: string): string {
  const resolvedPath = path.resolve(getTargetDir(), inputPath);
  const relativePath = path.relative(getTargetDir(), resolvedPath);

  if (
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath) ||
    relativePath.includes("node_modules") ||
    relativePath.includes("dist") ||
    relativePath.startsWith(".")
  ) {
    throw new Error("Path is not allowed.");
  }

  return resolvedPath;
}
