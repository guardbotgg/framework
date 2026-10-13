import { createRoot, createClient, fakeInteraction, sleep, tick, waitFor } from './helpers.js';
import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import { Component } from '../../build/index.js';
import assert from 'node:assert/strict';

describe('components', () => {
  let root;
  before(() => {
    root = createRoot('components');
    root.write('components/exact.js', `export default framework.Component({ type: 'Button', customId: 'ticket:new', execute: () => calls.push(['exact']) });`);
    root.write('components/1-specific.js', `export default framework.Component({ type: 'Button', customId: /^ticket:(\\d+)$/g, execute: (c, i, match) => calls.push(['regex', match[1]]) });`);
    root.write('components/2-catchall.js', `export default framework.Component({ type: 'Button', customId: /^ticket:/, execute: () => calls.push(['catchall']) });`);
    root.write('components/modal.js', `export default framework.Component({ type: 'ModalSubmit', customId: 'ticket:new', guildOnly: false, execute: () => calls.push(['modal']) });`);
    root.write('components/fails.js', `export default framework.Component({ type: 'Button', customId: 'fails', execute: () => { throw new Error('component failed'); } });`);
    root.write('components/limited.js', `export default framework.Component({ type: 'Button', customId: 'limited', cooldown: 60000, execute: () => calls.push(['limited']) });`);
  });
  after(() => root.cleanup());
  beforeEach(() => { globalThis.calls = []; });

  const run = async (client, kind, customId, overrides) => {
    const interaction = fakeInteraction(kind, { customId, ...overrides });
    client.emit('interactionCreate', interaction);
    await tick();
    return interaction;
  };

  it('matches exact ids before RegExps, and RegExps in (alphabetical) load order with their match', async () => {
    const client = createClient(root.rootDir);
    await client.init();

    await run(client, 'button', 'ticket:new');
    await run(client, 'button', 'ticket:42');
    await run(client, 'button', 'ticket:42');
    await run(client, 'button', 'ticket:abc');
    await run(client, 'modal', 'ticket:new');
    assert.deepEqual(calls, [['exact'], ['regex', '42'], ['regex', '42'], ['catchall'], ['modal']]);
  });

  it('keeps RegExp priority in file order after a reload', async () => {
    const client = createClient(root.rootDir);
    await client.init();

    await client.componentsModule.reload('Button:/^ticket:(\\d+)$/');
    await run(client, 'button', 'ticket:42');
    assert.deepEqual(calls, [['regex', '42']]);
  });

  it('tells users guild-only components only work in servers, and runs the others', async () => {
    const client = createClient(root.rootDir);
    await client.init();

    const button = await run(client, 'button', 'ticket:new', { inCachedGuild: () => false });
    await run(client, 'modal', 'ticket:new', { inCachedGuild: () => false });
    assert.deepEqual(calls, [['modal']]);
    assert.deepEqual(button.replies, [{ content: 'This can only be used in servers Guard is in.', flags: 64 }]);
  });

  it('runs middleware before components', async () => {
    const seen = [];
    const client = createClient(root.rootDir, { hooks: { middleware: [
      (context, source) => { seen.push(source.id); return context.user.id !== 'blocked'; },
    ] } });
    await client.init();

    await run(client, 'button', 'ticket:new');
    await run(client, 'button', 'ticket:new', { user: { id: 'blocked' } });
    assert.deepEqual(seen, ['Button:ticket:new', 'Button:ticket:new']);
    assert.deepEqual(calls, [['exact']]);
  });

  it('applies component cooldowns, replying or calling onCooldown', async () => {
    const client = createClient(root.rootDir);
    await client.init();

    await run(client, 'button', 'limited');
    const limited = await run(client, 'button', 'limited');
    assert.deepEqual(calls, [['limited']]);
    assert.match(limited.replies[0].content, /^Slow down and try again \*\*<t:\d+:R>\*\*\.$/);

    const cooldowns = [];
    const custom = createClient(root.rootDir, { hooks: { onCooldown: (context, source, expiresAt) => cooldowns.push([source.id, expiresAt instanceof Date]) } });
    await custom.init();
    await run(custom, 'button', 'limited');
    await run(custom, 'button', 'limited');
    assert.deepEqual(cooldowns, [['Button:limited', true]]);
  });

  it('follows up instead of replying again when middleware already answered the interaction', async () => {
    const client = createClient(root.rootDir, { hooks: { middleware: [(context) => { context.deferred = true; return true; }] } });
    await client.init();
    const errors = [];
    client.on('error', (error) => errors.push(error.message));

    const replied = [];
    const followedUp = [];
    const overrides = { reply: async (payload) => { replied.push(payload); }, followUp: async (payload) => { followedUp.push(payload.content); } };
    await run(client, 'button', 'limited', overrides);
    await run(client, 'button', 'limited', overrides);
    assert.deepEqual(errors, []);
    assert.deepEqual(replied, []);
    assert.match(followedUp[0], /^Slow down and try again/);
  });

  it('emits unknown for unmatched ids', async () => {
    const client = createClient(root.rootDir);
    await client.init();

    const unknown = [];
    client.componentsModule.on('unknown', (interaction) => unknown.push(interaction.customId));
    await run(client, 'select', 'ticket:new');
    assert.deepEqual(unknown, ['ticket:new']);
  });

  it('emits errors and replies to the user', async () => {
    const client = createClient(root.rootDir);
    await client.init();

    const errors = [];
    client.componentsModule.on('error', ({ component, error }) => errors.push([component.id, error.message]));
    const interaction = await run(client, 'button', 'fails');
    assert.deepEqual(errors, [['Button:fails', 'component failed']]);
    assert.equal(interaction.replies.length, 1);
    assert.equal(interaction.replies[0].flags, 64);
  });

  it('validates options', () => {
    assert.throws(() => Component({ type: 'Link', customId: 'x', execute() {} }), (error) => error.code === 'InvalidValue');
    assert.throws(() => Component({ type: 'Button', customId: 5, execute() {} }), (error) => error.code === 'InvalidType');
  });
});


describe('component idle timeouts & multiple types', () => {
  let root;
  const idleCalls = [];
  before(() => {
    root = createRoot('components-idle');
    root.write('components/panel.js', `
      export default framework.Component({
        type: ['Button', 'SelectMenu'],
        customId: /^panel-/,
        idle: { timeout: 50, onIdle: (interaction) => globalThis.idleCalls.push([interaction.customId, interaction.deferred]) },
        execute: (client, interaction) => {
          calls.push([interaction.customId]);
          if (interaction.customId === 'panel-exit') client.componentsModule.cancelIdle(interaction.message.id);
        },
      });
    `);
    root.write('components/slow-panel.js', `
      export default framework.Component({
        type: 'Button',
        customId: /^slow-/,
        idle: { timeout: 300, onIdle: (interaction) => globalThis.idleCalls.push([interaction.customId, interaction.deferred]) },
        execute: (client, interaction) => { calls.push([interaction.customId]); },
      });
    `);
  });
  after(() => root.cleanup());
  beforeEach(() => { globalThis.calls = []; idleCalls.length = 0; globalThis.idleCalls = idleCalls; });

  const clients = [];
  afterEach(() => clients.splice(0).forEach(client => client.componentsModule.dispose()));
  const createIdleClient = () => {
    const client = createClient(root.rootDir);
    clients.push(client);
    return client;
  };

  const click = async (client, kind, customId, lastEdited = Date.now()) => {
    const interaction = fakeInteraction(kind, { customId, message: { id: 'm1', createdTimestamp: lastEdited, editedTimestamp: null } });
    client.emit('interactionCreate', interaction);
    await tick();
    return interaction;
  };

  it('handles every listed type', async () => {
    const client = createIdleClient();
    await client.init();

    await click(client, 'button', 'panel-a');
    await click(client, 'select', 'panel-b');
    await click(client, 'modal', 'panel-c');
    assert.deepEqual(calls, [['panel-a'], ['panel-b']]);
  });

  it('closes messages that have been idle when clicked, without running the handler', async () => {
    const client = createIdleClient();
    await client.init();

    await click(client, 'button', 'panel-a', Date.now() - 1000);
    assert.deepEqual(calls, []);
    assert.deepEqual(idleCalls, [['panel-a', true]]);
  });

  it('closes messages once the idle timer runs out, and restarts it on every use', async () => {
    const client = createIdleClient();
    await client.init();

    await click(client, 'button', 'panel-a');
    await sleep(30);
    await click(client, 'button', 'panel-b');
    await sleep(30);
    assert.deepEqual(idleCalls, []);
    await waitFor(() => idleCalls.length === 1);
    assert.deepEqual(idleCalls, [['panel-b', false]]);
  });

  it('keeps a message open while it is used, even when clicks don\'t edit it', async () => {
    const client = createIdleClient();
    await client.init();

    const sent = Date.now();
    await click(client, 'button', 'slow-a', sent);
    await sleep(200);
    await click(client, 'button', 'slow-b', sent);
    await sleep(200);
    await click(client, 'button', 'slow-c', sent);
    assert.deepEqual(calls, [['slow-a'], ['slow-b'], ['slow-c']]);
    assert.deepEqual(idleCalls, []);
  });

  it('waits for the next click to close the message when the interaction expired before the timer', async () => {
    const client = createIdleClient();
    await client.init();

    const message = { id: 'm1', createdTimestamp: Date.now(), editedTimestamp: null };
    client.emit('interactionCreate', fakeInteraction('button', { customId: 'panel-a', message, createdTimestamp: Date.now() - 15 * 60_000 }));
    await sleep(100);
    assert.deepEqual(idleCalls, []);

    await click(client, 'button', 'panel-b', message.createdTimestamp);
    assert.deepEqual(idleCalls, [['panel-b', true]]);
  });

  it('lets handlers cancel the idle timer', async () => {
    const client = createIdleClient();
    await client.init();

    await click(client, 'button', 'panel-exit');
    await sleep(100);
    assert.deepEqual(idleCalls, []);
  });

  it('cancels idle timers when the client is destroyed', async () => {
    const client = createIdleClient();
    await client.init();

    await click(client, 'button', 'panel-a');
    await client.destroy();
    await sleep(100);
    assert.deepEqual(idleCalls, []);
  });

  it('validates idle options', () => {
    assert.throws(() => Component({ type: 'Button', customId: 'x', idle: { timeout: 0, onIdle() {} }, execute() {} }), (error) => error.code === 'InvalidType');
    assert.throws(() => Component({ type: 'Button', customId: 'x', idle: { timeout: 10 }, execute() {} }), (error) => error.code === 'InvalidOption');
    assert.throws(() => Component({ type: [], customId: 'x', execute() {} }), (error) => error.code === 'InvalidOption');
    assert.throws(() => Component({ type: 'Button', customId: 'x', idle: { timeout: 2 ** 31, onIdle() {} }, execute() {} }), (error) => error.code === 'InvalidType');

    const client = createClient(root.rootDir);
    assert.throws(() => client.componentsModule.trackIdle('m1', fakeInteraction('button'), { timeout: -1, onIdle() {} }), (error) => error.code === 'InvalidType');
  });
});
