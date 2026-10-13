# Changelog

## 3.0.0
Version 3.0.0 adds components, subcommand handlers, extensions, watch mode, and sharding support. Hooks are now set in the constructor, interaction types follow your command options, and errors in your code don't crash the bot anymore.


### Migrating from 2.x
1. **`rootDir` is now required.** The folder must exist. It no longer falls back to `./src`, which could load `.ts` files in production.
   ```diff
   - new FrameworkClient({ clientOptions })
   + new FrameworkClient({ clientOptions, rootDir: __dirname }) // or import.meta.dirname
   ```
2. **Command registration options have changed.** You can register global commands now too.
   ```diff
   - registerOnStart: true,
   - guildsToRegister: ['123'],
   + registerCommands: { guilds: ['123'] }, // and/or `global: true`
   ```
   `commandsModule.registerOnStart(ids)` is now `publishGuilds(ids)`, and it throws if any guild fails. `publishGlobal()` throws if the client isn't ready yet, instead of returning `false`.
3. **Hooks have moved to the constructor.** `middleware` is now a list.
   ```diff
   - client.commandsModule.setMiddleware(fn);
   - client.commandsModule.setHandler('onCooldown', fn);
   + new FrameworkClient({ ..., hooks: { middleware: [fn], onCooldown: fn } })
   ```
   Middleware now runs after the guild cache check, so it only sees commands that are going to run. It runs for components too, and so does `onCooldown`. Their second argument is the command or component.
4. **Interaction types follow `commandContexts` and `integrationTypes`.** Commands that can be used in DMs or through user installs get `ChatInputCommandInteraction<CacheType>` instead of `'cached'`. Use `interaction.inCachedGuild()` to narrow it. `MessageCommand` also types `message` from `contexts`.
5. **Autocompleters are guild-only by default.** Set `guildOnly: false` to answer in DMs. Autocompleters with `commands` now have ids like `ban|kick:reason`, so use those with `reload()` and `unload()`.
6. **Interactions get a reply when a command or component throws.** The user gets an ephemeral "Something went wrong" reply, or the deferred reply is edited to say so. Change it with `hooks.onError`.
7. **Only components made with the builders are loaded.** Files that export anything else are skipped, like helper files. A component in the wrong folder, such as a listener in `commands/`, is reported as `ComponentTypeMismatch`.
8. **`cooldown` must be a finite number, 0 or more.**
9. **Event types have changed.** `CommandEvents` and `AutocompleterEvents` use the shape of Node's typed `EventEmitter` (`execute: [context]`), since `tiny-typed-emitter` was removed. `listener._execute` was removed too.


### Added
- **Components:** `Component()` handles buttons, select menus, and modals, matched by custom id or RegExp. It supports a `cooldown`, and `idle` closes unused messages, even across restarts.
- **Subcommand handlers:** `subcommands` takes a handler for each slash subcommand, and `execute` runs the rest. Builder function `options` can add subcommands.
- **Quoted arguments:** Set `quotedArgs` on message commands to keep `"quoted text"` together as one argument.
- **Command categories:** Every command gets a `category`, which defaults to its top folder. Handy for help commands.
- **Shared option names:** Several autocompleters can use the same option name for different commands. The one for the command is used before one without `commands`.
- **Guild-only replies:** Guild-only commands and components now reply when used outside the bot's servers, instead of doing nothing. Change the reply with `hooks.onGuildOnly`. A `debug` message also tells you when the guild isn't cached.
- **`reply(context, content)`:** Replies to a message, or ephemerally to an interaction, and edits the reply of a deferred command. Handy in middleware and hooks, which can get either.
- **Watch mode:** Set `watch: true` to reload files as they change. Changed application commands are registered again to your dev guilds a minute after the last change.
- **Extensions:** `Extension()` adds methods, getters, and default values to any class, typed with `ExtensionMembers`. Files in `extensions/` load first.
- **Custom clients:** The `Register` interface types every handler's `client` as your own client class.
- **More hooks:** New `hooks.onError`. `hooks.middleware` takes a list of functions, and you can add more later.
- **Global commands:** `registerCommands.global` registers global commands, and `commandsModule.publishGuilds()` registers to several guilds at once.
- **Sharding support:** New `client.isPrimaryShard` and `client.broadcastReload()`, and a `cooldownStore` option to share cooldowns between processes.
- **Cleanup:** Every module has `unload()` and `dispose()`. `client.destroy()` also stops the framework's file watchers and timers.
- **Debugging:** The client's `debug` event logs `[Framework]` messages, `success` and `error` events include a `duration`, and every `FrameworkError` has a `code`.
- **More exports:** The error classes, `MemoryCooldownStore`, and the option and event types are exported now.


### Fixed
- Errors from commands and listeners crashed the process when nothing listened for `error`. A module event listener that threw, like one for metrics, could also stop a command or mark it as failed. Both now go to an `error` event.
- Commands with capital letters or spaces in their names never ran. Slash and context commands also didn't run in DMs, even when they allowed them.
- Prefixes with capital letters never matched, prefix changes at runtime were ignored, and a command name followed by a new line didn't match.
- Aliases skipped cooldowns, were case-sensitive, and stayed registered after unloading. An alias used by two commands now logs a `debug` message.
- Cooldowns of 1 second or less were ignored, and those over about 24.8 days ended almost immediately.
- Autocompleter `commands` filters were ignored, and slash `options` given as a builder function could be dropped.
- Slash and context `clientPermissions` were checked against guild-wide permissions when the channel wasn't cached. They now use the permissions Discord sends with the interaction.
- Reloading threw in the ESM build and didn't work with relative paths. It also lost the command when the new version failed to load or stopped exporting it. `load(file, true)` ran listeners twice and missed changes to CommonJS files.
- Errors while registering guild commands weren't handled. `publishGuild()` also fetched the guild first, which was an extra request and added guilds from other shards to the cache.
- Permission names in the default replies split acronyms, such as `Send T T S Messages`.
- `.d.ts` files were loaded as components. `.mjs`, `.cjs`, `.mts`, and `.cts` files are now loaded too.
- CommonJS users got ESM type declarations.
- The `discord.js` peer dependency is now `^14.22.0`, the first version with the `clientReady` event.
- The package didn't include its MIT license.
