// server/api/storage.ts
import fs from "fs/promises";
import path from "path";

const STORAGE_FILE = path.join(__dirname, "../data/children.json");

// Ensure the data folder exists
async function ensureDataFile() {
  try {
    await fs.mkdir(path.dirname(STORAGE_FILE), { recursive: true });
    await fs.access(STORAGE_FILE);
  } catch {
    // If file doesn't exist, create it with empty object
    await fs.writeFile(STORAGE_FILE, JSON.stringify({}), "utf-8");
  }
}

/**
 * Load all children from storage
 */
export async function loadChildren(): Promise<Record<string, any>> {
  await ensureDataFile();
  const data = await fs.readFile(STORAGE_FILE, "utf-8");
  return JSON.parse(data);
}

/**
 * Save all children to storage
 */
export async function saveChildren(children: Record<string, any>) {
  await ensureDataFile();
  await fs.writeFile(STORAGE_FILE, JSON.stringify(children, null, 2), "utf-8");
}

/**
 * Add a new child to storage and return its ID
 */
export async function addChild(childData: Record<string, any>): Promise<string> {
  const children = await loadChildren();
  const ids = Object.keys(children)
    .filter((id) => id.startsWith("child_"))
    .map((id) => parseInt(id.replace("child_", ""), 10))
    .filter((n) => !isNaN(n));
  const nextId = ids.length > 0 ? Math.max(...ids) + 1 : 1000; // start from 1000
  const childId = `child_${nextId}`;
  children[childId] = childData;
  await saveChildren(children);
  return childId;
}