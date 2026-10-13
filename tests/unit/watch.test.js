import { createRoot, createClient, sleep, waitFor, FRAMEWORK_CJS, WATCHER_STARTUP } from './helpers.js';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';

const command = (description, { name = 'ping', body = '' } = {}) => (
  `export default framework.SlashCommand({ name: '${name}', description: ${JSON.stringify(description)}, execute() { ${body} } });`
);

describe('watch mode', () => {
  let root, client;
  const errors = [];
  before(async () => {
    root = createRoot('watch');
    root.write('commands/ping.js', command('v1'));
    client = createClient(root.rootDir, { watch: true, registerCommands: { guilds: ['1'] } });
    client.on('error', (error) => errors.push(error.code));
    await client.init();
    await sleep(WATCHER_STARTUP);
  });
  after(async () => {
    await client.destroy();
    root.cleanup();
  });

  it('reloads changed files', async () => {
    root.write('commands/ping.js', command('v2'));
    await waitFor(() => client.commands.get('Slash:ping')?.description === 'v2');
  });

  it('keeps the previous version when a change fails to load', async () => {
    root.write('commands/ping.js', `throw new Error('mid-edit');`);
    await waitFor(() => errors.includes('ComponentLoadError'));
    assert.equal(client.commands.get('Slash:ping').description, 'v2');
    root.write('commands/ping.js', command('v2'));
  });

  it('loads new files and unloads deleted ones', async () => {
    const file = root.write('commands/nested/pong.js', command('pong', { name: 'pong' }));
    await waitFor(() => client.commands.has('Slash:pong'));

    fs.rmSync(file);
    await waitFor(() => !client.commands.has('Slash:pong'));
  });

  it('re-registers commands only when their definition changes', async () => {
    const published = [];
    client.isReady = () => true;
    client.commandsModule.republishDelay = 200;
    client.commandsModule.publishGuilds = async (guilds) => { published.push(guilds); };

    root.write('commands/ping.js', command('v2', { body: 'return 2;' }));
    await sleep(1300);
    assert.deepEqual(published, []);

    root.write('commands/ping.js', command('v3'));
    await waitFor(() => published.length === 1, 4000);
    assert.deepEqual(published, [['1']]);
  });

  it('ignores non-module files', async () => {
    fs.writeFileSync(path.join(root.rootDir, 'commands/notes.md'), '# notes');
    fs.writeFileSync(path.join(root.rootDir, 'commands/types.d.ts'), 'export {};');
    await sleep(300);
    assert.deepEqual([...client.commands.keys()], ['Slash:ping']);
  });

  it('handles a save that arrives while the previous one is still loading', async () => {
    const slow = (description) => `await new Promise(resolve => setTimeout(resolve, 500));\n${command(description, { name: 'slow' })}`;
    root.write('commands/slow.js', slow('v1'));
    await waitFor(() => client.commands.has('Slash:slow'), 4000);
    const errorCount = errors.length;

    root.write('commands/slow.js', slow('v2'));
    await sleep(250);
    root.write('commands/slow.js', slow('v3'));
    await waitFor(() => client.commands.get('Slash:slow')?.description === 'v3', 4000);
    assert.equal(errors.length, errorCount);
  });
});


describe('watch mode with CommonJS files', () => {
  let root, client;
  const filepath = (file) => path.join(root.rootDir, 'commands', file);
  const writeCommand = (file, description) => fs.writeFileSync(filepath(file), [
    `const framework = require(${JSON.stringify(FRAMEWORK_CJS)});`,
    `module.exports = framework.SlashCommand({ name: '${path.parse(file).name}', description: ${JSON.stringify(description)}, execute() {} });`,
  ].join('\n'));

  before(async () => {
    root = createRoot('watch-cjs');
    fs.mkdirSync(path.join(root.rootDir, 'commands'));
    writeCommand('ping.cjs', 'v1');
    client = createClient(root.rootDir, { watch: true });
    await client.init();
    await sleep(WATCHER_STARTUP);
  });
  after(async () => {
    await client.destroy();
    root.cleanup();
  });

  it('loads the new version of a file that was deleted and restored (e.g. switching git branches)', async () => {
    fs.rmSync(filepath('ping.cjs'));
    await waitFor(() => !client.commands.has('Slash:ping'));
    writeCommand('ping.cjs', 'restored');
    await waitFor(() => client.commands.get('Slash:ping')?.description === 'restored');
  });

  it('loads a new file that the editor saved empty first', async () => {
    fs.writeFileSync(filepath('pong.cjs'), '');
    await sleep(300);
    writeCommand('pong.cjs', 'pong');
    await waitFor(() => client.commands.has('Slash:pong'));
  });
});
