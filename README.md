![Framework](https://raw.githubusercontent.com/guardbotgg/.github/master/assets/framework.png)

<br/>
<p align="center">
  <img src="https://raw.githubusercontent.com/guardbotgg/assets/master/made-with-typescript.svg" alt="badge" />
  <img src="https://raw.githubusercontent.com/guardbotgg/assets/master/made-with-love.svg" alt="badge" />
</p>
<br/>

# @guardbot/framework
> **A simple framework made for building discord bots with discord.js.**

## **📦 Installation**
```sh
$ npm install @guardbot/framework # via npm
$ yarn add @guardbot/framework # yarn
$ pnpm add @guardbot/framework # pnpm
```

## **✨ Features**
- Easy to use.
- Beginner friendly.
- Supports Intellisense.

## **🪴 Quick Start**

### 1. Initialize the Client
Create your main entry file (e.g., `index.ts`) and initialize the `FrameworkClient`.

```typescript
import { FrameworkClient } from '@guardbot/framework';
import { GatewayIntentBits } from 'discord.js';
import path from 'path';

const client = new FrameworkClient({
  clientOptions: {
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  },
  rootDir: path.join(__dirname),
  registerOnStart: true, 
  prefix: '!', 
});

client.login('DISCORD_BOT_TOKEN');
```

### 2. Create a Slash Command
Create a file in your commands directory (e.g., `src/commands/general/ping.ts`).

```typescript
import { SlashCommand } from '@guardbot/framework';

export default SlashCommand({
  name: 'ping',
  description: 'Replies with Pong!',
  commandScope: 'default',
  cooldown: 5000,

  async execute(client, interaction) {
    await interaction.reply({ content: `Pong! 🏓 (${client.ws.ping}ms)` });
  },
});
```

### 3. Create a Message Command
Create a file for prefix-based commands (e.g., `src/commands/general/ping.ts`).

```typescript
import { MessageCommand } from '@guardbot/framework';

export default MessageCommand({
  name: 'ping',
  description: 'Replies with Pong!',
  aliases: ['latency'],
  cooldown: 5000,

  async execute(client, message, args) {
    await message.reply({ content: `Pong! 🏓 (${client.ws.ping}ms)` });
  },
});
```

### 4. Create an Event Listener
Create an event file (e.g., `src/listeners/client/ready.ts`).

```typescript
import { Listener } from '@guardbot/framework';

export default Listener({
  name: 'clientReady',
  once: true,

  async execute(client) {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log(`Loaded ${client.commands.size} commands.`);
    return true;
  }
})
```

## **🎐 Support Server**
<a href="https://discord.gg/invite/GaczkwfgV9"><img src="https://invidget.switchblade.xyz/GaczkwfgV9" alt="Discord"></a>