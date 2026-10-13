# @guardbot/framework
**A simple framework made for building Discord bots with discord.js.**

<div>
  <img src="https://readmebadges.netlify.app/badges/made-with-ts.svg" alt="Made with TypeScript" />
  <img src="https://readmebadges.netlify.app/badges/made-with-love.svg" alt="Made with love" />
</div>


## 📦 Installation
```bash
$ npm install @guardbot/framework discord.js # via npm
$ yarn add @guardbot/framework discord.js    # via yarn
$ pnpm add @guardbot/framework discord.js    # via pnpm
```
**Requirements:** Node.js 22.12 or newer and discord.js 14.22 or newer. <br/>
Upgrading from 2.x? See the [changelog](./CHANGELOG.md#300).


## 🪴 Getting Started
```ts
import { FrameworkClient } from '@guardbot/framework';
import { GatewayIntentBits } from 'discord.js';

const client = new FrameworkClient({
  clientOptions: {
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  },
  rootDir: import.meta.dirname, // or `__dirname` in CommonJS
  prefix: '!',
  developers: ['YOUR_USER_ID'],
  registerCommands: { guilds: ['YOUR_DEV_GUILD_ID'] },
});

client.on('error', console.error);
client.start(process.env.DISCORD_TOKEN!);
```

These folders are loaded from `rootDir` in this order. You only need the ones you use, and they can have subfolders.
```bash
src/
├── extensions/      # Methods and properties added to discord.js classes
├── listeners/       # Client event listeners
├── autocompleters/  # Autocomplete for slash command options
├── components/      # Buttons, select menus, and modals
├── commands/        # Slash, context menu, and message commands
└── index.ts
```


## 📌 Commands
```ts
import { SlashCommand } from '@guardbot/framework';

export default SlashCommand({
  name: 'echo',
  description: 'Repeats your text',
  cooldown: 5000,
  options: (builder) => builder
    .addStringOption(option => option.setName('text').setDescription('Text to repeat').setRequired(true)),

  async execute(client, interaction) {
    await interaction.reply(interaction.options.getString('text', true));
  },
});
```
Commands only work in servers by default, so `interaction.guild` is always there. To allow DMs or user installs, set `commandContexts: ['Guild', 'BotDM']` or `integrationTypes: ['GuildInstall', 'UserInstall']`, and check `interaction.inCachedGuild()` before using the guild.


### Subcommands
Subcommands can each have their own handler. Grouped subcommands include the group name, such as `'roles add'`. Subcommands without a handler run `execute`.
```ts
export default SlashCommand({
  name: 'tag',
  description: 'Manage tags',
  options: (builder) => builder
    .addSubcommand(sub => sub.setName('add').setDescription('Add a tag'))
    .addSubcommand(sub => sub.setName('remove').setDescription('Remove a tag')),

  subcommands: {
    async add(client, interaction) { /* ... */ },
    async remove(client, interaction) { /* ... */ },
  },
});
```


### Message Commands
```ts
import { MessageCommand } from '@guardbot/framework';

export default MessageCommand({
  name: 'say',
  description: 'Repeats your message',
  aliases: ['echo'],
  quotedArgs: true, // `!say "two words" three` gives ['two words', 'three']

  async execute(client, message, args) {
    await message.reply(args.join(' ') || 'Say something!');
  },
});
```


### Context Menu Commands
```ts
import { ContextCommand } from '@guardbot/framework';

export default ContextCommand({
  name: 'Avatar',
  commandType: 'ContextUser', // or 'ContextMessage'

  async execute(client, interaction) {
    await interaction.reply(interaction.targetUser.displayAvatarURL());
  },
});
```
Each command gets a `category` from its folder, such as `'moderation'` for `commands/moderation/ban.ts`.

With `registerCommands`, application commands are registered once the client is ready. You can also register them manually:
```ts
await client.commandsModule.publishGlobal();
await client.commandsModule.publishGuilds(['GUILD_ID']); // Throws if any guild fails
```


## 📌 Components
```ts
import { Component } from '@guardbot/framework';
import { MessageFlags } from 'discord.js';

export default Component({
  type: 'Button',  // or 'SelectMenu', 'ModalSubmit', or an array of types
  customId: /^ticket-close:(\d+)$/,

  async execute(client, interaction, match) {
    await interaction.reply({ content: `Closing ticket #${match?.[1]}`, flags: MessageFlags.Ephemeral });
  },
});
```
Exact IDs are checked before regular expressions. Components only work in servers by default, so set `guildOnly: false` to use them in DMs. <br/>
Like commands, components can have a `cooldown` and go through your middleware. Cooldowns are per user, and shared by every message the component is on.

Set `idle` to close a message once nobody has used it for a while. This keeps working after a restart.
```ts
idle: {
  timeout: 5 * 60_000,
  onIdle: (interaction) => interaction.editReply({ components: [] }),
},
```
The timer restarts on every click, so reply to clicks with `interaction.update()` if `onIdle` uses `editReply()`.  <br/>
To also close messages that nobody clicks, start the timer from the command that sent them with `client.componentsModule.trackIdle(message.id, interaction, idle)`, and stop it with `cancelIdle(message.id)`.


## 📌 Listeners and Autocompleters
```ts
import { Listener } from '@guardbot/framework';

export default Listener({
  name: 'clientReady',
  once: true,

  execute(client) {
    console.log(`Logged in as ${client.user.tag}`);
  },
});
```

### Autocompleters
An autocompleter answers every slash command option with the same `name`. Use `commands` to limit it to certain commands.
```ts
import { Autocompleter } from '@guardbot/framework';

export default Autocompleter({
  name: 'reason',
  commands: ['ban', 'kick'],

  async execute(client, interaction, command, value) {
    await interaction.respond([{ name: value, value }]);
  },
});
```
Several autocompleters can share an option name. The one made for the command is picked first, then one without `commands`, then the command's own `autocomplete`.


## 🧩 Extensions
Extensions add methods, getters, and default values to any class, and the types come from your code.
```ts
// src/extensions/Guild.ts
import { Extension, ExtensionMembers } from '@guardbot/framework';
import { Guild } from 'discord.js';

export const GuildExtension = Extension(Guild, {
  get isLarge(): boolean {
    return this.memberCount > 1000;
  },
});

declare module 'discord.js' {
  interface Guild extends ExtensionMembers<typeof GuildExtension> {}
}
```
Give getters and methods a return type, as TypeScript can't infer it when they use `this`. Replacing an existing member throws unless you pass `{ override: true }`.


### Custom Client Types
To type every handler's `client` as your own client class, register it:
```ts
export class BotClient<Ready extends boolean = boolean> extends FrameworkClient<Ready> {
  public database = new Database();
}

declare module '@guardbot/framework' {
  interface Register {
    client: BotClient<true>;
  }
}
```


## 🎐 Hooks and Events
```ts
const client = new FrameworkClient({
  // ...
  hooks: {
    middleware: [async (context, source) => !(await isBlacklisted(context))], // Return false to stop it
    onCooldown: (context, source, expiresAt) => { /* ... */ },
    onMemberPermissions: (message, command, missing) => { /* ... */ },
    onClientPermissions: (context, command, missing) => { /* ... */ },
    onGuildOnly: (interaction, source) => { /* ... */ },
    onError: (context, error, source) => { /* ... */ },
  },
});

client.commandsModule.on('error', ({ command, error, duration }) => {
  console.error(`${command.id} failed after ${duration}ms`, error);
});
```
Before `execute` runs, commands and components go through middleware, then permission checks (commands only), then cooldowns. <br/>
A middleware that stops an interaction should reply to it. `await reply(context, 'You are blacklisted.')` works for both messages and interactions, and replies to interactions ephemerally.

The command, component, and autocompleter modules emit `execute`, `success`, `error`, and `unknown` events. The `success` and `error` events include a `duration`. <br/>
The client's `debug` event logs what gets loaded, prefixed with `[Framework]`.

### Error Handling
Errors in your code won't crash the bot. If a command or component throws, the error goes to its module's `error` event and the user gets an ephemeral "Something went wrong" reply. Set `onError` to send your own reply instead.

Other errors go to the client's `error` event, or to the console if nothing listens for it. <br/>
Errors thrown by the framework itself are `FrameworkError`s and have a `code`.


## 🔄 Hot Reloading
```ts
await client.commandsModule.reload('Slash:ping'); // Keeps the old version if the new one fails to load
client.commandsModule.unload('Message:ping');
```
With `watch: true`, files reload as you save them. Changed application commands are registered again to `registerCommands.guilds` a minute after your last change, so you don't hit Discord's rate limits.
Only use watch mode in development, since every reload keeps the old file in memory.


## 🧱 Sharding
Internal sharding (`shards: 'auto'`) needs no changes.

When using `ShardingManager` or `discord-hybrid-sharding`:
- Commands are registered only by the process handling shard 0. Use `client.isPrimaryShard` for tasks that should run only once.
- `client.broadcastReload('commands', 'Slash:ping')` reloads a component in every process.
- Cooldowns are kept per process unless you pass a shared `cooldownStore`, such as one backed by Redis.
  ```ts
  const cooldownStore: CooldownStore = {
    async acquire(id, userId, duration) {
      const key = `cooldown:${id}:${userId}`;
      const started = await redis.set(key, Date.now() + duration, { condition: 'NX', expiration: { type: 'PX', value: duration } });
      return started ? null : Number(await redis.get(key)) || null; // `null` lets the command run
    },
  };
  ```


## 🚀 Production and Shutdown
Set `rootDir` with `import.meta.dirname` or `__dirname` in your entry file, so the compiled build loads the compiled files. Keep `watch` off and listen for the client's `error` event.

Call `client.destroy()` when shutting down. This also stops the framework's timers.
```ts
process.on('SIGTERM', async () => {
  await client.destroy();
  process.exit(0);
});
```


## 📘 Options

### Client
| Option | Default | Description |
| :---: | :---: | --- |
| `clientOptions` | *required* | The discord.js `ClientOptions`. |
| `rootDir` | *required* | The folder containing your component folders. |
| `commandsDir`, `listenersDir`, … | `'commands'`, `'listeners'`, … | Folder names, relative to `rootDir`. |
| `prefix` | `'!'` | Message command prefix. Use `''` to only allow mentions. |
| `developers` | `[]` | User ids allowed to use `devOnly` commands. |
| `registerCommands` |  | `{ guilds?: string[]; global?: boolean }` configuration. |
| `cooldownStore` | In memory | Where cooldowns are stored. |
| `hooks` |  | Middleware and custom replies. |
| `watch` | `false` | Reloads files when they change. |

### Commands
| Option | Commands | Description |
| :---: | :---: | --- |
| `cooldown` | All | Cooldown per user, in milliseconds. |
| `memberPermissions` | All | Permissions the user needs. Discord enforces these for slash and context commands. |
| `clientPermissions` | All | Permissions the bot needs to run the command. |
| `disabled` | All | Skips loading the command. |
| `category` | All | Defaults to the command's top folder. |
| `commandScope` | Slash, context | Registers it as both a guild and global command (`'default'`), or only `'guild'` or `'global'`. |
| `commandContexts` | Slash, context | `'Guild'` (**default**), `'BotDM'`, and `'PrivateChannel'`. |
| `integrationTypes` | Slash, context | `'GuildInstall'` (**default**) and `'UserInstall'`. |
| `options`, `autocomplete` | Slash | The command's options and a fallback autocomplete handler. |
| `subcommands` | Slash | A handler for each subcommand. `execute` is optional when this is set. |
| `aliases`, `contexts`, `devOnly`, `quotedArgs` | Message | `contexts` accepts `'Guild'` (**default**) and `'BotDM'`. |


## 🪴 Support
[![Discord](https://discordwidgets.vercel.app/widgets/invite/GaczkwfgV9?theme=dark)](https://discord.gg/invite/GaczkwfgV9)

Found a bug or want to contribute? See the [contributing guide](./.github/CONTRIBUTING.md). <br/>
Security issues should be reported through the [security policy](./.github/SECURITY.md).
