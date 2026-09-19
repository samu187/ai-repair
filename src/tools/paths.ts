import { realpathSync } from "node:fs";
import path from "node:path";

let targetDir: string | null = null;

export function setTargetDir(nextTargetDir: string): void {
  targetDir = realpathSync(nextTargetDir);
}

export function getTargetDir(): string {
  if (!targetDir) {
    throw new Error("Target application directory has not been set.");
  }

  return targetDir;
}

export function getSafeProjectPath(inputPath: string): string {
  const resolvedPath = realpathSync(path.resolve(getTargetDir(), inputPath));
  const relativePath = path.relative(getTargetDir(), resolvedPath);

  if (
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath) ||
    relativePath.split(path.sep).some((part) =>
      part === "node_modules" || part === "dist" || part.startsWith(".")
    )
  ) {
    throw new Error("Path is not allowed.");
  }

  return resolvedPath;
}
