import { readFile, writeFile } from "node:fs/promises";
import { tool } from "@openai/agents";
import { z } from "zod";
import type { AgentState } from "../agent.js";
import { getSafeProjectPath } from "./paths.js";

const editFileSchema = z.object({
  path: z.string().min(1),
  oldText: z.string().min(1),
  newText: z.string()
});

export const editFileTool = tool<typeof editFileSchema, AgentState>({
  name: "edit_file",
  description: "Edit one exact text block in a local project file.",
  parameters: editFileSchema,
  execute: async (input, context) => {
    const safePath = getSafeProjectPath(input.path);
    const content = await readFile(safePath, "utf8");
    const firstMatch = content.indexOf(input.oldText);

    if (firstMatch === -1) {
      return "Edit failed: oldText was not found in the file.";
    }

    if (content.indexOf(input.oldText, firstMatch + input.oldText.length) !== -1) {
      return "Edit failed: oldText appears more than once. Use a larger unique block.";
    }

    await writeFile(safePath, content.replace(input.oldText, () => input.newText), "utf8");

    if (context && !context.context.filesChanged.includes(input.path)) {
      context.context.filesChanged.push(input.path);
    }

    return `Edited ${input.path}`;
  }
});
