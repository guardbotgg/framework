import { Guild, GuildMember, Message, CacheType, ButtonInteraction, AnySelectMenuInteraction, ChatInputCommandInteraction } from 'discord.js';
import {
  SlashCommand, MessageCommand, ContextCommand, Component, Autocompleter, Extension, ExtensionMembers, FrameworkClient, Middleware, reply,
  CommandContextsInput, IntegrationTypesInput, SlashCommandOptions, SlashOptionsInput, CommandScope, AwaitMemberResponseOptions,
} from '../../src';

type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const assert = <T extends true>() => {};


class MyClient<Ready extends boolean = boolean> extends FrameworkClient<Ready> {
  public greeting = 'hello';
  public modules = {};
  public registerCommands() {}
  public initPromise = null;
}
declare module '../../src/types/register' {
  interface Register { client: MyClient<true> }
}


SlashCommand({
  name: 'guild-only', description: 'd',
  execute(client, interaction) {
    assert<Equals<typeof interaction, ChatInputCommandInteraction<'cached'>>>();
    const guild: Guild = interaction.guild;
    const greeting: string = client.greeting;
  },
});

SlashCommand({
  name: 'anywhere', description: 'd', commandContexts: ['Guild', 'BotDM'],
  execute(client, interaction) {
    assert<Equals<typeof interaction, ChatInputCommandInteraction<CacheType>>>();
    // @ts-expect-error the guild may be missing in DMs
    const guild: Guild = interaction.guild;
    if (interaction.inCachedGuild()) interaction.guild satisfies Guild;
  },
});

SlashCommand({
  name: 'user-install', description: 'd', integrationTypes: ['GuildInstall', 'UserInstall'],
  execute(client, interaction) {
    assert<Equals<typeof interaction, ChatInputCommandInteraction<CacheType>>>();
  },
});

SlashCommand({
  name: 'tags', description: 'd',
  options: (builder) => builder.addSubcommand(sub => sub.setName('add').setDescription('d')),
  subcommands: {
    add(client, interaction) { assert<Equals<typeof interaction, ChatInputCommandInteraction<'cached'>>>(); },
  },
});
// @ts-expect-error a slash command needs `execute` or `subcommands`
SlashCommand({ name: 'nothing', description: 'd' });

ContextCommand({
  name: 'Avatar', commandType: 'ContextUser',
  execute(client, interaction) {
    const member: GuildMember | null = interaction.targetMember;
  },
});

MessageCommand({ name: 'guild', description: 'd', execute(client, message) { assert<Equals<typeof message, Message<true>>>(); } });
MessageCommand({ name: 'dm', description: 'd', contexts: ['BotDM'], execute(client, message) { assert<Equals<typeof message, Message<false>>>(); } });
MessageCommand({ name: 'both', description: 'd', contexts: ['Guild', 'BotDM'], execute(client, message) { assert<Equals<typeof message, Message<boolean>>>(); } });


Component({
  type: 'Button', customId: /^ticket:(\d+)$/,
  execute(client, interaction, match) {
    assert<Equals<typeof interaction, ButtonInteraction<'cached'>>>();
    const ticketId: string | undefined = match?.[1];
  },
});
Component({
  type: 'SelectMenu', customId: 'roles', guildOnly: false,
  execute(client, interaction) {
    assert<Equals<typeof interaction, AnySelectMenuInteraction<CacheType>>>();
  },
});
Component({
  type: ['Button', 'SelectMenu'], customId: /^panel-/,
  idle: { timeout: 60_000, onIdle: (interaction) => interaction.editReply({ components: [] }) },
  execute(client, interaction) {
    assert<Equals<typeof interaction, ButtonInteraction<'cached'> | AnySelectMenuInteraction<'cached'>>>();
  },
});
// @ts-expect-error unknown component type
Component({ type: 'Link', customId: 'x', execute() {} });

Autocompleter({
  name: 'reason',
  execute(client, interaction) {
    const guild: Guild = interaction.guild;
  },
});


const GuildExtension = Extension(Guild, {
  get isLarge() { return this.memberCount > 1000; },
  async settingsKey(prefix: string) { return `${prefix}:${this.id}:${this.isLarge}`; },
});
const MemberExtension = Extension(GuildMember, {
  warnings: 0,
  lastMessageId: null as string | null,
  async guildKey() { return this.guild.settingsKey('member'); },
});
declare module 'discord.js' {
  interface Guild extends ExtensionMembers<typeof GuildExtension> {}
  interface GuildMember extends ExtensionMembers<typeof MemberExtension> {}
}

declare const member: GuildMember;
const key: Promise<string> = member.guildKey();
member.warnings++;
member.lastMessageId = '1';
// @ts-expect-error wrong type
member.lastMessageId = 1;
// @ts-expect-error getters without setters are read-only
member.guild.isLarge = true;

declare const message: Message;
const isDev: boolean = message.isDeveloper();
const prefix: string = message.prefix;

const blockBanned: Middleware = (context, source) => source.name !== 'banned';
declare const client: FrameworkClient;
client.hooks.middleware.push((context, command) => command.name !== 'blocked');

new FrameworkClient({
  rootDir: '.', clientOptions: { intents: [] },
  hooks: {
    middleware: [async (context, source) => { await reply(context, `${source.name} is disabled`); return false; }],
    onCooldown: (context, source, expiresAt) => reply(context, { content: `Try again at ${expiresAt.toISOString()}` }),
    onError: (context) => reply(context, 'Something broke'),
  },
});

function ModCommand<const C extends CommandContextsInput = undefined, const I extends IntegrationTypesInput = undefined>(
  options: Omit<SlashCommandOptions<C, I>, 'commandType' | 'memberPermissions'>,
) {
  return SlashCommand<C, I>({ ...options, memberPermissions: ['ModerateMembers'] } as never);
}
ModCommand({
  name: 'warn', description: 'd', commandContexts: ['Guild', 'BotDM'],
  execute(client, interaction) { assert<Equals<typeof interaction, ChatInputCommandInteraction<CacheType>>>(); },
});

const scope: CommandScope = 'guild';
const options: SlashOptionsInput = (builder) => builder.addSubcommand(sub => sub.setName('add').setDescription('d'));
const awaitOptions: AwaitMemberResponseOptions = { time: 30_000, deleteMessage: true };
