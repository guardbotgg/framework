import { createRoot, createClient, fakeInteraction, fakeMessage, tick } from './helpers.js';
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

describe('commands', () => {
  let root;
  before(() => {
    root = createRoot('commands');
    root.write('commands/tag.js', `export default framework.SlashCommand({
      name: 'tag', description: 'd',
      options: (builder) => builder
        .addSubcommand(sub => sub.setName('add').setDescription('d'))
        .addSubcommand(sub => sub.setName('list').setDescription('d'))
        .addSubcommandGroup(group => group.setName('roles').setDescription('d').addSubcommand(sub => sub.setName('add').setDescription('d'))),
      subcommands: {
        add: () => calls.push('add'),
        'roles add': () => calls.push('roles add'),
      },
      execute: () => calls.push('execute'),
    });`);
    root.write('commands/strict.js', `export default framework.SlashCommand({
      name: 'strict', description: 'd',
      options: [{ type: 1, name: 'add', description: 'd' }],
      subcommands: { add: () => calls.push('strict add') },
    });`);
    root.write('commands/proto.js', `export default framework.SlashCommand({
      name: 'proto', description: 'd',
      options: (builder) => builder.addSubcommand(sub => sub.setName('constructor').setDescription('d')).addSubcommand(sub => sub.setName('driver').setDescription('d')),
      subcommands: { driver: () => calls.push('driver') },
      execute: () => calls.push('proto execute'),
    });`);
    root.write('commands/note.js', `export default framework.MessageCommand({ name: 'note', description: 'd', contexts: ['BotDM'], quotedArgs: true, execute: (c, m, args) => calls.push(args) });`);
    root.write('commands/moderation/ban.js', `export default framework.SlashCommand({ name: 'ban', description: 'd', execute: () => calls.push('ban') });`);
    root.write('commands/moderation/extra/fun.js', `export default framework.SlashCommand({ name: 'fun', description: 'd', category: 'games', execute() {} });`);
  });
  after(() => root.cleanup());
  beforeEach(() => { globalThis.calls = []; });

  const run = async (client, commandName, subcommand, group = null, overrides = {}) => {
    const options = { getSubcommand: () => subcommand, getSubcommandGroup: () => group };
    const interaction = fakeInteraction('slash', { commandName, options, ...overrides });
    client.emit('interactionCreate', interaction);
    await tick();
    return interaction;
  };

  it('runs the handler for the subcommand used, and falls back to execute', async () => {
    const client = createClient(root.rootDir);
    await client.init();

    await run(client, 'tag', 'add');
    await run(client, 'tag', 'add', 'roles');
    await run(client, 'tag', 'list');
    await run(client, 'proto', 'constructor');
    assert.deepEqual(calls, ['add', 'roles add', 'execute', 'proto execute']);
  });

  it('emits unknown for a subcommand nothing handles, e.g. one registered by an older version', async () => {
    const client = createClient(root.rootDir);
    await client.init();
    const unknown = [];
    client.commandsModule.on('unknown', (interaction) => unknown.push(interaction.commandName));

    await run(client, 'strict', 'removed');
    assert.deepEqual(calls, []);
    assert.deepEqual(unknown, ['strict']);
  });

  it('keeps quoted arguments together with quotedArgs', async () => {
    const client = createClient(root.rootDir);
    await client.init();

    client.emit('messageCreate', fakeMessage('!note "two words" three “curly quotes” say("hi") "unclosed'));
    await tick();
    client.emit('messageCreate', fakeMessage('!note "a title"\nsome text\n"multi\nline"'));
    await tick();
    assert.deepEqual(calls, [
      ['two words', 'three', 'curly quotes', 'say("hi")', '"unclosed'],
      ['a title', 'some', 'text', 'multi\nline'],
    ]);
  });

  it('gives commands the category of their top folder, unless they set one', async () => {
    const client = createClient(root.rootDir);
    await client.init();

    assert.equal(client.commands.get('Slash:ban').category, 'moderation');
    assert.equal(client.commands.get('Slash:fun').category, 'games');
    assert.equal(client.commands.get('Slash:tag').category, undefined);
  });

  it('tells users when a guild-only command is used outside the guilds the bot is in', async () => {
    const client = createClient(root.rootDir);
    await client.init();
    const debug = [];
    client.on('debug', (message) => debug.push(message));

    const inDM = await run(client, 'ban', null, null, { inCachedGuild: () => false });
    assert.deepEqual(inDM.replies, [{ content: 'This can only be used in servers Guard is in.', flags: 64 }]);
    await run(client, 'ban', null, null, { inCachedGuild: () => false, inGuild: () => true, guildId: '42' });
    assert.ok(debug.some(message => message.includes('"Slash:ban" was used in guild "42"')));
    assert.deepEqual(calls, []);

    const handled = [];
    const custom = createClient(root.rootDir, { hooks: { onGuildOnly: (interaction, source) => handled.push(source.id) } });
    await custom.init();
    const hooked = await run(custom, 'ban', null, null, { inCachedGuild: () => false });
    assert.deepEqual(handled, ['Slash:ban']);
    assert.deepEqual(hooked.replies, []);
  });
});


describe('message command aliases', () => {
  it('keeps the first command to claim an alias, and logs the one it skipped', async () => {
    const root = createRoot('aliases');
    root.write('commands/a.js', `export default framework.MessageCommand({ name: 'first', description: 'd', aliases: ['x'], execute() {} });`);
    root.write('commands/b.js', `export default framework.MessageCommand({ name: 'second', description: 'd', aliases: ['x'], execute() {} });`);
    const client = createClient(root.rootDir);
    const debug = [];
    client.on('debug', (message) => debug.push(message));
    await client.init();
    root.cleanup();

    assert.equal(client.aliases.get('x'), 'Message:first');
    assert.ok(debug.includes('[Framework] Skipped the alias "x" of "Message:second", as "Message:first" already uses it'));
  });
});
