# Contributing
Thanks for wanting to contribute to `@guardbot/framework`! Bug fixes, docs changes and new ideas are all welcome.

If you have a question, ask in the [support server](https://discord.gg/invite/GaczkwfgV9). For bugs and feature requests, open an [issue on GitHub](https://github.com/guardbotgg/framework/issues).


## Getting Started
You need Node.js 22.12+ and Yarn 1.
```bash
git clone https://github.com/guardbotgg/framework.git
cd framework
yarn install
```

### Available Scripts
| Command              | Description                                                |
| -------------------- | ---------------------------------------------------------- |
| `yarn build`         | Builds `src/` into `build/` (ESM, CommonJS and types).     |
| `yarn typecheck`     | Type checks `src/` and `tests/`, including the type tests. |
| `yarn lint`          | Runs ESLint.                                               |
| `yarn test`          | Builds and runs the unit tests.                            |
| `yarn check:package` | Checks the package can be imported from ESM and CommonJS.  |
| `yarn dev`           | Runs the example bot in `tests/` straight from `src/`.     |

Run the type checker, linter and tests before you open a pull request.


### Running the Example Bot
`yarn dev` needs a bot token in a `.env` file in the project root:
```env
DISCORD_TOKEN=your-bot-token
DEV_GUILD_ID=your-test-server-id # Optional, registers the example slash commands there
```


## Project Structure
```bash
src/
├── core/        # FrameworkClient, FrameworkError, and MemoryCooldownStore
├── modules/     # Loading, reloading, and running each kind of component
├── builders/    # SlashCommand(), Component(), Listener(), and the other builders
├── extensions/  # The built-in Message extension
├── types/       # Public types
└── utils/       # Validation, replies, checks, and file helpers

tests/
├── unit/        # Unit tests using node:test, run against the build
├── types/       # Type tests checked by yarn typecheck
└── index.ts     # Example bot used by yarn dev
```


## Guidelines
- **Never crash the bot:** Errors from a bot's own code should end up on an `error` event, not as an unhandled rejection.
- **No logging:** Use `emitDebug()` or `emitClientError()` instead of `console` in `src/`. The only exception is `console.error` when nothing listens for errors.
- **Errors have codes:** Add the message to `src/core/FrameworkError.ts` and throw a `FrameworkError`, or a `FrameworkTypeError` for invalid options.
- **Private internals:** Keep `FrameworkClient`'s internals in `#private` fields, so subclasses can use any name.
- **Test your changes:** Add tests for bug fixes and new behavior. `tests/unit/helpers.js` has helpers to write component files to a temp folder and fake interactions.
- **Update the docs:** Update `README.md` and `CHANGELOG.md`, with a migration note for breaking changes.


## Pull Requests
- Branch off `master` and keep each PR focused on one change.
- Add tests and update documentation where needed.
- Run the checks before pushing:
  ```bash
  yarn typecheck && yarn lint && yarn test
  ```
- Fill in the PR template, and say what changed and why.
