import { SlashCommand, MessageCommand, ContextCommand, Autocompleter, Listener, FrameworkError } from '../../build/index.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('builders', () => {
  it('derives command ids from the normalized name', () => {
    const command = SlashCommand({ name: 'User Info', description: 'd', execute() {} });
    assert.equal(command.name, 'user-info');
    assert.equal(command.id, 'Slash:user-info');
  });

  it('keeps context menu names as-is', () => {
    const command = ContextCommand({ name: 'Show Avatar', commandType: 'ContextUser', execute() {} });
    assert.equal(command.id, 'ContextUser:Show Avatar');
  });

  it('normalizes and dedupes message command aliases', () => {
    const command = MessageCommand({ name: 'Say', description: 'd', aliases: ['Echo', 'echo', ' ECHO2 ', 'Echo Three'], execute() {} });
    assert.equal(command.id, 'Message:say');
    assert.deepEqual(command.aliases, ['echo', 'echo2', 'echo-three']);
  });

  it('builds options from a builder function regardless of its arity', () => {
    const command = SlashCommand({
      name: 'p', description: 'd', execute() {},
      options: (builder = null) => builder.addStringOption(o => o.setName('x').setDescription('y')),
    });
    assert.equal(command.options.length, 1);
  });

  it('keeps the autocompleter command filter', () => {
    const completer = Autocompleter({ name: 'reason', commands: ['Ban', 'kick'], execute() {} });
    assert.deepEqual(completer.commands, ['ban', 'kick']);
  });

  it('throws FrameworkError on missing options', () => {
    for (const builder of [SlashCommand, MessageCommand, ContextCommand, Autocompleter, Listener]) {
      assert.throws(() => builder(), (error) => error instanceof FrameworkError && error.code === 'NoOptions');
    }
  });

  it('rejects cooldowns that are negative or not finite', () => {
    for (const cooldown of [-1, NaN, Infinity, '5000']) {
      assert.throws(() => SlashCommand({ name: 'p', description: 'd', cooldown, execute() {} }), (error) => error.code === 'InvalidType');
    }
  });

  it('validates slash command options', () => {
    assert.throws(() => SlashCommand({ name: 'p', description: 'd', options: {}, execute() {} }), (error) => error.code === 'InvalidType');
  });

  it('defaults commandScope to default', () => {
    assert.equal(SlashCommand({ name: 'p', description: 'd', execute() {} }).commandScope, 'default');
    assert.equal(ContextCommand({ name: 'P', commandType: 'ContextUser', execute() {} }).commandScope, 'default');
    assert.equal(SlashCommand({ name: 'p', description: 'd', commandScope: 'guild', execute() {} }).commandScope, 'guild');
  });

  it('checks every subcommand can be handled', () => {
    const options = (builder) => builder
      .addSubcommand(sub => sub.setName('add').setDescription('d'))
      .addSubcommandGroup(group => group.setName('roles').setDescription('d').addSubcommand(sub => sub.setName('remove').setDescription('d')));
    const command = (handlers) => SlashCommand({ name: 'p', description: 'd', options, ...handlers });

    assert.doesNotThrow(() => command({ subcommands: { 'add': () => {}, 'roles remove': () => {} } }));
    assert.doesNotThrow(() => command({ subcommands: { add() {} }, execute() {} }));

    assert.throws(() => command({}), (error) => error.code === 'InvalidOption' && error.message === 'No "execute" or "subcommands" option was provided.');
    assert.throws(() => command({ subcommands: { add() {} } }), (error) => error.code === 'InvalidOption' && error.message.includes('"subcommands.roles remove" or "execute"'));
    assert.throws(() => command({ subcommands: { ad() {} }, execute() {} }), (error) => error.code === 'UnknownSubcommand' && error.message.includes('"add" | "roles remove"'));
    assert.throws(() => SlashCommand({ name: 'p', description: 'd', subcommands: { add() {} } }), (error) => error.code === 'UnknownSubcommand' && error.message.endsWith('as it has none.'));
    assert.throws(() => SlashCommand({ name: 'p', description: 'd', subcommands: {} }), (error) => error.code === 'InvalidOption' && error.message === 'No "execute" option was provided.');
    const proto = (builder) => builder.addSubcommand(sub => sub.setName('constructor').setDescription('d'));
    assert.throws(() => SlashCommand({ name: 'p', description: 'd', options: proto, subcommands: {} }), (error) => error.message.includes('"subcommands.constructor" or "execute"'));
  });

  it('defaults quotedArgs to false, and validates it', () => {
    assert.equal(MessageCommand({ name: 'p', description: 'd', execute() {} }).quotedArgs, false);
    assert.throws(() => MessageCommand({ name: 'p', description: 'd', quotedArgs: 'yes', execute() {} }), (error) => error.code === 'InvalidType');
  });
});
