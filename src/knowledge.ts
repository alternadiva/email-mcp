import { fileURLToPath } from "url";
import * as path from "path";
import * as fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KNOWLEDGE_DIR = path.join(__dirname, "..", "knowledge");

/* provide knowledge context for Claude */
export async function getKnowledgeContext() {
  try {
    const files = await fs.readdir(KNOWLEDGE_DIR);
    const markdownFiles = files.filter((f) => f.endsWith(".md"));

    if (markdownFiles.length === 0) {
      return "No knowledge found";
    }

    const contents = await Promise.all(
      markdownFiles.map(async (file) => {
        const content = await fs.readFile(
          path.join(KNOWLEDGE_DIR, file),
          "utf-8",
        );
        return `${file}
${content}`;
      }),
    );

    return contents.join("\n\n");
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === "ENOENT"
    ) {
      return "Dir not found";
    }
    throw error;
  }
}
