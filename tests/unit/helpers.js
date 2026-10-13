import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FrameworkClient } from '../../build/index.js';

const FRAMEWORK = path.resolve(import.meta.dirname, '../../build/index.js');
export const FRAMEWORK_CJS = path.resolve(import.meta.dirname, '../../build/index.cjs');
export const tick = () => new Promise(resolve => setImmediate(resolve));
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
export const WATCHER_STARTUP = 300;

export function createRoot(prefix) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), `framework-${prefix}-`));
  return {
    rootDir,
    write(file, body) {
      const filepath = path.join(rootDir, file);
      fs.mkdirSync(path.dirname(filepath), { recursive: true });
      fs.writeFileSync(filepath, `import * as framework from ${JSON.stringify(FRAMEWORK)};\n${body}`);
      return filepath;
    },
    cleanup: () => fs.rmSync(rootDir, { recursive: true, force: true }),
  };
}

export function createClient(rootDir, { clientOptions, ...options } = {}) {
  const client = new FrameworkClient({ rootDir, clientOptions: { intents: [], ...clientOptions }, ...options });
  Object.defineProperty(client, 'user', { value: { id: '100', displayName: 'Guard' } });
  return client;
}

export function fakeInteraction(kind, overrides = {}) {
  const replies = [];
  const is = (k) => () => kind === k;
  return {
    replies, edits: [], user: { id: '200' }, replied: false, deferred: false, createdTimestamp: Date.now(),
    isCommand: is('slash'), isChatInputCommand: is('slash'), isContextMenuCommand: () => false, isAutocomplete: is('autocomplete'),
    isButton: is('button'), isAnySelectMenu: is('select'), isModalSubmit: is('modal'),
    isRepliable: () => true, inCachedGuild: () => true, inGuild() { return this.inCachedGuild(); },
    reply: async (payload) => { replies.push(payload); }, followUp: async (payload) => { replies.push(payload); },
    async editReply(payload) { this.edits.push(payload); this.replied = true; },
    async deferUpdate() { this.deferred = true; },
    ...overrides,
  };
}

export async function waitFor(condition, timeout = 3000) {
  const started = Date.now();
  while (!(await condition())) {
    if (Date.now() - started > timeout) throw new Error('Timed out waiting for condition');
    await sleep(20);
  }
}

export function fakeMessage(content, overrides = {}) {
  return {
    content, author: { id: '200', bot: false }, inGuild: () => false,
    reply: async () => ({ delete: async () => {} }),
    ...overrides,
  };
}
