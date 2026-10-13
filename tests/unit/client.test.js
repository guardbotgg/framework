import { createRoot, createClient, fakeInteraction, fakeMessage, tick } from './helpers.js';
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

describe('FrameworkClient', () => {
  let root;
  before(() => {
    root = createRoot('client');
    root.write('commands/say.js', `export default framework.MessageCommand({ name: 'Say', description: 'd', aliases: ['Echo'], contexts: ['BotDM'], cooldown: 60000, execute: (c, m, args) => { calls.push(['say', args]); } });`);
    root.write('commands/boom.js', `export default framework.MessageCommand({ name: 'boom', description: 'd', contexts: ['BotDM'], execute: () => { throw new Error('boom'); } });`);
    root.write('commands/dm.js', `export default framework.SlashCommand({ name: 'DM', description: 'd', commandContexts: ['Guild', 'BotDM'], execute: () => { calls.push(['dm']); } });`);
    root.write('commands/guild.js', `export default framework.SlashCommand({ name: 'guild', description: 'd', execute: () => { calls.push(['guild']); } });`);
    root.write('commands/types.d.ts', `export {};`);
    root.write('listeners/custom.js', `export default framework.Listener({ name: 'custom', execute: async () => { throw new Error('listener failed'); } });`);
  });
  after(() => root.cleanup());
  beforeEach(() => { globalThis.calls = []; });

  const createPrefixedClient = () => createClient(root.rootDir, { prefix: 'G!' });

  it('loads components recursively (once), skipping declaration files', async () => {
    const client = createPrefixedClient();
    await client.init();
    await client.init();
    assert.deepEqual([...client.commands.keys()].sort(), ['Message:boom', 'Message:say', 'Slash:dm', 'Slash:guild']);
    assert.equal(client.aliases.get('echo'), 'Message:say');
  });

  it('reports what it loaded and reloaded on the debug event', async () => {
    const client = createPrefixedClient();
    const messages = [];
    client.on('debug', (message) => { if (message.startsWith('[Framework]')) messages.push(message.replace(root.rootDir, '<root>')); });
    await client.init();
    await client.commandsModule.reload('Slash:guild');

    assert.deepEqual(messages, [
      '[Framework] Loaded 1 listener(s) from "<root>/listeners"',
      '[Framework] Loaded 0 autocompleter(s) from "<root>/autocompleters"',
      '[Framework] Loaded 0 component(s) from "<root>/components"',
      '[Framework] Loaded 4 command(s) from "<root>/commands"',
      '[Framework] Reloaded command "Slash:guild"',
    ]);
  });

  it('matches the prefix case-insensitively and applies cooldowns across aliases', async () => {
    const client = createPrefixedClient();
    await client.init();

    client.emit('messageCreate', fakeMessage('g!SAY hello\nworld  there'));
    await tick();
    client.emit('messageCreate', fakeMessage('G!echo again'));
    await tick();
    assert.deepEqual(calls, [['say', ['hello\nworld', 'there']]]);
  });

  it('does not crash when a command throws without an error listener', async () => {
    const client = createPrefixedClient();
    await client.init();

    const errors = [];
    client.on('error', (error) => errors.push(error.message));
    client.emit('messageCreate', fakeMessage('G!boom'));
    await tick();
    assert.deepEqual(errors, ['boom']);
  });

  it('routes async listener errors to the client error event', async () => {
    const client = createPrefixedClient();
    await client.init();

    const errors = [];
    client.on('error', (error) => errors.push(error.message));
    client.emit('custom');
    await tick();
    assert.deepEqual(errors, ['listener failed']);
  });

  it('runs multi-context slash commands outside guilds but not guild-only ones', async () => {
    const client = createPrefixedClient();
    await client.init();

    client.emit('interactionCreate', fakeInteraction('slash', { commandName: 'dm', inCachedGuild: () => false }));
    client.emit('interactionCreate', fakeInteraction('slash', { commandName: 'guild', inCachedGuild: () => false }));
    await tick();
    assert.deepEqual(calls, [['dm']]);
  });

  it('reloads and unloads commands in ESM, keeping the old version on failure', async () => {
    const client = createPrefixedClient();
    await client.init();

    const file = root.write('commands/temp.js', `export default framework.MessageCommand({ name: 'temp', description: 'v1', aliases: ['t'], execute() {} });`);
    await client.commandsModule.load(file);
    root.write('commands/temp.js', `export default framework.MessageCommand({ name: 'temp', description: 'v2', execute() {} });`);
    await client.commandsModule.reload('Message:temp');
    assert.equal(client.commands.get('Message:temp').description, 'v2');
    assert.equal(client.aliases.has('t'), false);

    root.write('commands/temp.js', `throw new Error('syntax');`);
    await assert.rejects(client.commandsModule.reload('Message:temp'));
    assert.equal(client.commands.get('Message:temp').description, 'v2');

    client.commandsModule.unload('Message:temp');
    assert.equal(client.commands.has('Message:temp'), false);
  });
});
