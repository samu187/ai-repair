import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

type SavedConfig = {
  targetDir?: string;
};

const configPath = path.join(os.homedir(), ".ai-repair", "config.json");

export async function chooseTargetDir(): Promise<string> {
  const savedConfig = await readSavedConfig();
  const cwd = process.cwd();
  const rl = readline.createInterface({ input, output });
  rl.on("SIGINT", () => {
    rl.close();
    process.exit(130);
  });

  try {
    if (savedConfig.targetDir && existsSync(savedConfig.targetDir)) {
      console.log(`Saved application directory: ${savedConfig.targetDir}`);
      const answer = await rl.question("Use this directory? (Y/n): ");

      if (answer.trim().toLowerCase() !== "n") {
        return savedConfig.targetDir;
      }
    }

    console.log("Where is your application?");
    console.log(`1. Current directory: ${cwd}`);
    console.log("2. Another directory");

    const choice = await rl.question("Select 1 or 2: ");
    const targetDir = choice.trim() === "2"
      ? await rl.question("Application directory: ")
      : cwd;
    const resolvedTargetDir = path.resolve(targetDir.trim());

    if (!existsSync(resolvedTargetDir)) {
      throw new Error(`Directory does not exist: ${resolvedTargetDir}`);
    }

    await saveTargetDir(resolvedTargetDir);
    return resolvedTargetDir;
  } finally {
    rl.close();
  }
}

async function readSavedConfig(): Promise<SavedConfig> {
  try {
    return JSON.parse(await readFile(configPath, "utf8")) as SavedConfig;
  } catch {
    return {};
  }
}

async function saveTargetDir(targetDir: string): Promise<void> {
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify({ targetDir }, null, 2), "utf8");
}
