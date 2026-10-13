import { existsSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';


const MODULE_EXTENSIONS = ['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts'];
const DECLARATION_FILE = /\.d\.[mc]?ts$/;

export function isModuleFile(filename: string) {
  return MODULE_EXTENSIONS.includes(path.extname(filename)) && !DECLARATION_FILE.test(filename);
}

export async function listFiles(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];

  const entries = await fs.readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter(entry => entry.isFile() && isModuleFile(entry.name))
    .map(entry => path.join(entry.parentPath, entry.name))
    .sort();
}

let importCounter = 0;
export function importFresh(filepath: string) {
  return import(`${pathToFileURL(filepath).href}?update=${Date.now()}-${importCounter++}`);
}

export function clearRequireCache(filepath: string) {
  if (!filepath) return;
  const absolute = path.resolve(filepath);

  const realpath = tryRealpath(absolute) ?? path.join(tryRealpath(path.dirname(absolute)) ?? path.dirname(absolute), path.basename(absolute));
  const { cache } = createRequire(absolute);
  delete cache[realpath];
  delete cache[absolute];
}

export function getTopFolder(directory: string, filepath: string): string | undefined {
  if (!filepath) return undefined;
  const relative = path.relative(directory, filepath);
  const [folder, ...rest] = relative.split(path.sep);
  return rest.length && folder !== '..' && !path.isAbsolute(relative) ? folder : undefined;
}

function tryRealpath(filepath: string) {
  try {
    return realpathSync(filepath);
  } catch {
    return null;
  }
}
