import path from 'node:path';
import url from 'node:url';
import fs from 'node:fs';


export async function listFiles(dir: string): Promise<string[]> {
  if (!fs.existsSync(dir)) return [];
  
  const files: string[] = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) files.push(...(await listFiles(fullPath)));
    else if (item.name.endsWith('.js') || item.name.endsWith('.ts')) files.push(fullPath);
  }
  return files;
}

export function assertDir(dir: string, name: string) {
  if (!fs.existsSync(dir)) {
    throw new Error(`Invalid ${name}: ${dir} does not exist`);
  }
}

export function dirExists(dir: string) {
  return fs.existsSync(dir);
}

export function resolvePath(...paths: string[]) {
  return path.resolve(...paths);
}

export function pathToFileURL(filepath: string) {
  return url.pathToFileURL(filepath);
}