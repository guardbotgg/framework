import { createRoot, createClient, fakeMessage, sleep, tick } from './helpers.js';
import { FrameworkError, MemoryCooldownStore } from '../../build/index.js';
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const fakeShardUtil = (clients) => ({
  broadcastEval: (script, { context }) => Promise.all(clients.map(c => new Function(`return (${script})`)()(c, JSON.parse(JSON.stringify(context))))),
});

describe('sharding', () => {
  let root;
  const createShardClient = (options) => createClient(root.rootDir, options);
  const writeCommand = (description) => root.write(
    'commands/temp.js',
    `export default framework.MessageCommand({ name: 'temp', description: ${JSON.stringify(description)}, contexts: ['BotDM'], cooldown: 60000, execute: () => { calls.push('temp'); } });`,
  );

  before(() => {
    root = createRoot('sharding');
    writeCommand('v1');
  });
  after(() => root.cleanup());
  beforeEach(() => { globalThis.calls = []; });

  it('only registers commands on the process that handles shard 0', () => {
    const registered = [];
    for (const shards of [[0], [1], [2, 3], undefined]) {
      const client = createShardClient({ registerCommands: { guilds: ['1'] }, clientOptions: shards ? { shards } : {} });
      client.commandsModule.publishGuilds = async () => { registered.push(shards); };
      client.emit('clientReady', client);
    }
    assert.deepEqual(registered, [[0], undefined]);
  });

  it('reloads a component on every shard', async () => {
    const shards = [createShardClient(), createShardClient()];
    await Promise.all(shards.map(c => c.init()));
    shards.forEach(c => { c.shard = fakeShardUtil(shards); });

    writeCommand('v2');
    await shards[0].broadcastReload('commands', 'Message:temp');
    assert.deepEqual(shards.map(c => c.commands.get('Message:temp').description), ['v2', 'v2']);
  });

  it('reports shards that failed to reload', async () => {
    const shards = [createShardClient(), createShardClient()];
    await Promise.all(shards.map(c => c.init()));
    shards.forEach(c => { c.shard = fakeShardUtil(shards); });
    shards[1].commandsModule.unload('Message:temp');

    await assert.rejects(shards[0].broadcastReload('commands', 'Message:temp'), (error) => error instanceof FrameworkError && error.code === 'ShardReload' && error.message.includes('1/2'));
  });

  it('reloads locally when not process-sharded', async () => {
    const client = createShardClient();
    await client.init();
    writeCommand('v3');
    await client.broadcastReload('commands', 'Message:temp');
    assert.equal(client.commands.get('Message:temp').description, 'v3');
  });

  it('uses a custom cooldown store shared between shards', async () => {
    const shared = new Map();
    const cooldownStore = {
      acquire(commandId, userId, duration) {
        const key = `${commandId}:${userId}`;
        if ((shared.get(key) ?? 0) > Date.now()) return shared.get(key);
        shared.set(key, Date.now() + duration);
        return null;
      },
    };
    const shards = [createShardClient({ cooldownStore }), createShardClient({ cooldownStore })];
    await Promise.all(shards.map(c => c.init()));

    shards[0].emit('messageCreate', fakeMessage('!temp'));
    await tick();
    shards[1].emit('messageCreate', fakeMessage('!temp'));
    await tick();
    assert.deepEqual(calls, ['temp']);
  });

  it('still runs commands when the cooldown store fails', async () => {
    const client = createShardClient({ cooldownStore: { acquire: async () => { throw new Error('redis down'); } } });
    await client.init();
    const errors = [];
    client.on('error', (error) => errors.push(error.message));

    client.emit('messageCreate', fakeMessage('!temp'));
    await tick();
    assert.deepEqual(calls, ['temp']);
    assert.deepEqual(errors, ['redis down']);
  });

  it('rejects an invalid cooldown store', () => {
    assert.throws(() => createShardClient({ cooldownStore: {} }), (error) => error.code === 'InvalidType');
  });

  it('enforces in-memory cooldowns longer than a timer can wait', async () => {
    const store = new MemoryCooldownStore();
    const month = 30 * 24 * 60 * 60 * 1000;
    assert.equal(store.acquire('Slash:daily', '200', month), null);
    await sleep(20);
    assert.ok(store.acquire('Slash:daily', '200', month) > Date.now());
  });
});
