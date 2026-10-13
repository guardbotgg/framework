import { createRoot, createClient, fakeInteraction, tick } from './helpers.js';
import { describe, it, before, after, beforeEach } from 'node:test';
import { ClientApplication, PermissionsBitField } from 'discord.js';
import { FrameworkClient } from '../../build/index.js';
import assert from 'node:assert/strict';

describe('client options, hooks & command registration', () => {
  let root;
  before(() => {
    root = createRoot('hooks');
    root.write('commands/ping.js', `export default framework.SlashCommand({ name: 'ping', description: 'd', execute: () => calls.push('ping') });`);
    root.write('commands/fails.js', `export default framework.SlashCommand({ name: 'fails', description: 'd', execute: () => { throw new Error('command failed'); } });`);
    root.write('commands/speak.js', `export default framework.SlashCommand({ name: 'speak', description: 'd', clientPermissions: ['SendMessages', 'SendTTSMessages'], execute: () => calls.push('speak') });`);
  });
  after(() => root.cleanup());
  beforeEach(() => { globalThis.calls = []; });

  const run = async (client, commandName, overrides) => {
    const interaction = fakeInteraction('slash', { commandName, ...overrides });
    client.emit('interactionCreate', interaction);
    await tick();
    return interaction;
  };

  it('requires an existing rootDir', () => {
    assert.throws(() => new FrameworkClient({ clientOptions: { intents: [] } }), (error) => error.code === 'InvalidOption');
    assert.throws(() => new FrameworkClient({ rootDir: '/does/not/exist', clientOptions: { intents: [] } }), (error) => error.code === 'InvalidDirectory');
  });

  it('validates the options before discord.js sets the client up', () => {
    assert.throws(() => new FrameworkClient({ rootDir: root.rootDir }), (error) => error.code === 'InvalidOption' && error.message.includes('clientOptions'));
  });

  it('points at the wrong item in array options', () => {
    assert.throws(() => createClient(root.rootDir, { developers: ['1', 2] }), (error) => error.message === 'Expected "developers[1]" to be of type "string", but got "number".');
  });

  it('validates hooks', () => {
    assert.throws(() => createClient(root.rootDir, { hooks: { middleware: [1] } }), (error) => error.code === 'InvalidType');
    assert.throws(() => createClient(root.rootDir, { hooks: { onError: 'x' } }), (error) => error.code === 'InvalidType');
  });

  it('runs middleware in order and stops at the first that returns false', async () => {
    const order = [];
    const client = createClient(root.rootDir, { hooks: { middleware: [
      (context, command) => { order.push(`a:${command.name}`); return true; },
      async (context) => { order.push('b'); return context.user.id !== 'blocked'; },
      () => { order.push('c'); return true; },
    ] } });
    await client.init();

    await run(client, 'ping');
    await run(client, 'ping', { user: { id: 'blocked' } });
    assert.deepEqual(order, ['a:ping', 'b', 'c', 'a:ping', 'b']);
    assert.deepEqual(calls, ['ping']);
  });

  it('still runs commands when hooks are replaced without middleware (e.g. from JavaScript)', async () => {
    const client = createClient(root.rootDir);
    await client.init();
    client.hooks = { onError() {} };

    await run(client, 'ping');
    assert.deepEqual(calls, ['ping']);
  });

  it('reports how long commands took', async () => {
    const client = createClient(root.rootDir);
    await client.init();

    const durations = [];
    client.commandsModule.on('success', ({ duration }) => durations.push(['success', duration]));
    client.commandsModule.on('error', ({ duration }) => durations.push(['error', duration]));
    await run(client, 'ping');
    await run(client, 'fails');
    assert.deepEqual(durations.map(([event]) => event), ['success', 'error']);
    assert.ok(durations.every(([, duration]) => typeof duration === 'number' && duration >= 0));
  });

  it('replies ephemerally when a command throws, or uses onError', async () => {
    const client = createClient(root.rootDir);
    await client.init();
    client.commandsModule.on('error', () => {});

    const failed = await run(client, 'fails');
    assert.equal(failed.replies[0].flags, 64);

    const deferred = await run(client, 'fails', { deferred: true });
    assert.deepEqual(deferred.replies, []);
    assert.deepEqual(deferred.edits, [{ content: 'Something went wrong while running this. Please try again later.' }]);

    const handled = [];
    const custom = createClient(root.rootDir, { hooks: { onError: (context, error, source) => handled.push([source.id, error.message]) } });
    await custom.init();
    custom.commandsModule.on('error', () => {});
    const interaction = await run(custom, 'fails');
    assert.deepEqual(handled, [['Slash:fails', 'command failed']]);
    assert.equal(interaction.replies.length, 0);
  });

  it('checks the bot permissions that Discord sends with the interaction', async () => {
    const client = createClient(root.rootDir);
    await client.init();
    const guild = { members: { me: { displayName: 'Guard' } } };

    const denied = await run(client, 'speak', { guild, appPermissions: new PermissionsBitField(['SendMessages']) });
    assert.deepEqual(calls, []);
    assert.equal(denied.replies[0].content, 'Guard requires `Send TTS Messages` permission(s) to run this command.');

    await run(client, 'speak', { guild, appPermissions: new PermissionsBitField(['SendMessages', 'SendTTSMessages']) });
    assert.deepEqual(calls, ['speak']);
  });

  it('registers global and guild commands once ready', async () => {
    const client = createClient(root.rootDir, { registerCommands: { global: true, guilds: ['1', '2'] } });
    const published = [];
    client.commandsModule.publishGlobal = async () => { published.push('global'); };
    client.commandsModule.publishGuilds = async (ids) => { published.push(ids); };
    client.emit('clientReady', client);
    await tick();
    assert.deepEqual(published, ['global', ['1', '2']]);
  });

  it('registers guild commands even when registering global ones fails', async () => {
    const client = createClient(root.rootDir, { registerCommands: { global: true, guilds: ['1'] } });
    const published = [];
    const errors = [];
    client.on('error', (error) => errors.push(error.message));
    client.commandsModule.publishGlobal = async () => { throw new Error('global failed'); };
    client.commandsModule.publishGuilds = async (ids) => { published.push(ids); };
    client.emit('clientReady', client);
    await tick();
    assert.deepEqual(published, [['1']]);
    assert.deepEqual(errors, ['global failed']);
  });

  it('publishes to every guild and reports the ones that failed', async () => {
    const client = createClient(root.rootDir);
    const attempted = [];
    client.commandsModule.publishGuild = async (id) => {
      attempted.push(id);
      if (id !== '2') throw new Error(`guild ${id} failed`);
    };
    await assert.rejects(client.commandsModule.publishGuilds(['1', '2', '3']), (error) => (
      error.code === 'AppCommandRegister' && error.message.includes('"1", "3"') && error.cause.errors.length === 2
    ));
    assert.deepEqual(attempted, ['1', '2', '3']);
  });

  it('publishes to guilds that are not cached (e.g. on another shard) without fetching them', async () => {
    const client = createClient(root.rootDir);
    await client.init();
    client.application = new ClientApplication(client, { id: '999' });
    const requests = [];
    client.rest.put = async (route, { body }) => {
      requests.push(route);
      return body.map((command, i) => ({ ...command, id: String(i + 1), application_id: '999', guild_id: '123', version: '1' }));
    };

    const published = await client.commandsModule.publishGuild('123');
    assert.deepEqual(requests, ['/applications/999/guilds/123/commands']);
    assert.equal(published.size, 3);
    assert.equal(client.application.commands.cache.size, 0);
  });

  it('throws when publishing global commands before ready', async () => {
    const client = createClient(root.rootDir);
    await assert.rejects(client.commandsModule.publishGlobal(), (error) => error.code === 'ClientNotReady');
  });
});
