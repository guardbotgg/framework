import { createRoot, createClient, fakeInteraction, tick } from './helpers.js';
import { describe, it, before, after, beforeEach } from 'node:test';
import { SlashCommand } from '../../build/index.js';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';

describe('loading components', () => {
  let root;
  before(() => {
    root = createRoot('loading');
    root.write('commands/ping.js', `export default framework.SlashCommand({ name: 'ping', description: 'd', execute: () => calls.push('ping') });`);
    root.write('commands/helper.js', `export const format = (value) => String(value);`);
    root.write('commands/named-listener.js', `export const listener = framework.Listener({ name: 'misplaced', execute() {} });`);
    root.write('components/misplaced.js', `export default framework.SlashCommand({ name: 'misplaced', description: 'd', execute() {} });`);
    root.write('components/real.js', `export default framework.Component({ type: 'Button', customId: 'real', execute: () => calls.push('real') });`);
    root.write('listeners/custom.js', `export default framework.Listener({ name: 'custom', execute: () => calls.push('custom') });`);
  });
  after(() => root.cleanup());
  beforeEach(() => { globalThis.calls = []; });

  it('skips helper files, and rejects components of another kind without breaking the rest', async () => {
    const client = createClient(root.rootDir);
    const errors = [];
    const debug = [];
    client.on('error', (error) => errors.push(`${error.code} (${error.cause?.code}): ${path.basename(error.message.match(/from "(.+?)"/)[1])}`));
    client.on('debug', (message) => debug.push(message));
    await client.init();

    assert.deepEqual([...client.commands.keys()], ['Slash:ping']);
    assert.deepEqual([...client.components.keys()], ['Button:real']);
    assert.deepEqual(errors, [
      'ComponentLoadError (ComponentTypeMismatch): misplaced.js',
      'ComponentLoadError (ComponentTypeMismatch): named-listener.js',
    ]);
    assert.ok(debug.some(message => message.includes('helper.js') && message.includes(`doesn't export a command`)));

    client.emit('interactionCreate', fakeInteraction('button', { customId: 'real' }));
    await tick();
    assert.deepEqual(calls, ['real']);
  });

  it('keeps the previous version when a reload finds no component, and unloads it once disabled', async () => {
    const client = createClient(root.rootDir);
    await client.init();
    const file = root.write('commands/temp.js', `export default framework.SlashCommand({ name: 'temp', description: 'v1', execute() {} });`);
    await client.commandsModule.load(file);

    root.write('commands/temp.js', `export const unrelated = true;`);
    await assert.rejects(client.commandsModule.reload('Slash:temp'), (error) => error.code === 'InvalidComponent');
    assert.equal(client.commands.get('Slash:temp').description, 'v1');

    root.write('commands/temp.js', `export default framework.SlashCommand({ name: 'temp', description: 'v2', disabled: true, execute() {} });`);
    await client.commandsModule.reload('Slash:temp');
    assert.equal(client.commands.has('Slash:temp'), false);
    fs.rmSync(file);
  });

  it('reloads & unloads components loaded from a relative path, or added by hand', async () => {
    const client = createClient(root.rootDir);
    await client.init();
    const file = root.write('commands/relative.js', `export default framework.SlashCommand({ name: 'relative', description: 'd', execute() {} });`);

    await client.commandsModule.load(path.relative(process.cwd(), file));
    assert.equal(client.commands.get('Slash:relative').filepath, file);
    await client.commandsModule.reload('Slash:relative');
    client.commandsModule.unload('Slash:relative');
    assert.equal(client.commands.has('Slash:relative'), false);
    fs.rmSync(file);

    const manual = SlashCommand({ name: 'manual', description: 'd', execute() {} });
    client.commands.set(manual.id, manual);
    client.commandsModule.unload(manual.id);
    assert.equal(client.commands.has(manual.id), false);
  });

  it('replaces a component with load(file, true) without leaving its old listener attached', async () => {
    const client = createClient(root.rootDir);
    await client.init();
    await client.listenersModule.load(client.events.get('Client:custom').filepath, true);

    client.emit('custom');
    await tick();
    assert.equal(client.listenerCount('custom'), 1);
    assert.deepEqual(calls, ['custom']);
  });

  it('keeps commands working when module event listeners throw', async () => {
    const client = createClient(root.rootDir);
    await client.init();
    const errors = [];
    client.on('error', (error) => errors.push(error.message));
    client.commandsModule.on('execute', () => { throw new Error('execute listener'); });
    client.commandsModule.on('success', () => { throw new Error('success listener'); });

    const interaction = fakeInteraction('slash', { commandName: 'ping' });
    client.emit('interactionCreate', interaction);
    await tick();
    assert.deepEqual(calls, ['ping']);
    assert.deepEqual(interaction.replies, []);
    assert.deepEqual(errors, ['execute listener', 'success listener']);
  });
});
