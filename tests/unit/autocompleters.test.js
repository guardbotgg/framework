import { createRoot, createClient, fakeInteraction, tick } from './helpers.js';
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

describe('autocompleters', () => {
  let root;
  before(() => {
    root = createRoot('autocompleters');
    for (const name of ['search', 'lookup', 'other']) {
      root.write(`commands/${name}.js`, `export default framework.SlashCommand({ name: '${name}', description: 'd', execute() {} });`);
    }
    root.write('commands/find.js', `export default framework.SlashCommand({ name: 'find', description: 'd', execute() {}, autocomplete: () => calls.push('find') });`);
    root.write('autocompleters/any.js', `export default framework.Autocompleter({ name: 'query', execute: (c, i, command, value) => calls.push(\`any:\${command.name}:\${value}\`) });`);
    root.write('autocompleters/search.js', `export default framework.Autocompleter({ name: 'query', commands: ['search'], execute: () => calls.push('search') });`);
    root.write('autocompleters/lookup.js', `export default framework.Autocompleter({ name: 'query', commands: ['Lookup'], execute: () => calls.push('lookup') });`);
    root.write('autocompleters/reason.js', `export default framework.Autocompleter({ name: 'reason', commands: ['search'], execute: () => calls.push('reason') });`);
  });
  after(() => root.cleanup());
  beforeEach(() => { globalThis.calls = []; });

  const run = async (client, commandName, option, overrides) => {
    const interaction = fakeInteraction('autocomplete', { commandName, options: { getFocused: () => ({ name: option, value: 'x' }) }, ...overrides });
    client.emit('interactionCreate', interaction);
    await tick();
    return interaction;
  };

  it('loads several autocompleters for the same option', async () => {
    const client = createClient(root.rootDir);
    await client.init();
    assert.deepEqual([...client.autocompleters.keys()].sort(), ['lookup:query', 'query', 'search:query', 'search:reason']);
  });

  it('uses the one for the command over the one for every command', async () => {
    const client = createClient(root.rootDir);
    await client.init();

    await run(client, 'search', 'query');
    await run(client, 'lookup', 'query');
    await run(client, 'other', 'query');
    await run(client, 'find', 'query');
    assert.deepEqual(calls, ['search', 'lookup', 'any:other:x', 'any:find:x']);
  });

  it('falls back to the command\'s own autocomplete', async () => {
    const client = createClient(root.rootDir);
    await client.init();

    await run(client, 'find', 'reason');
    assert.deepEqual(calls, ['find']);
  });

  it('emits unknown when nothing can answer', async () => {
    const client = createClient(root.rootDir);
    await client.init();

    const unknown = [];
    client.autocompletersModule.on('unknown', (interaction) => unknown.push(interaction.commandName));
    await run(client, 'other', 'reason');
    await run(client, 'missing', 'query');
    assert.deepEqual(unknown, ['other', 'missing']);
    assert.deepEqual(calls, []);
  });

  it('only answers in cached guilds by default', async () => {
    const client = createClient(root.rootDir);
    await client.init();

    await run(client, 'search', 'query', { inCachedGuild: () => false });
    assert.deepEqual(calls, []);
  });
});
