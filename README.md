# @guardbot/framework
> **A simple framework made for building discord bots with discord.js.**

<div>
  <img src="https://raw.githubusercontent.com/guardbotgg/assets/master/made-with-typescript.svg" alt="badge" />
  <img src="https://raw.githubusercontent.com/guardbotgg/assets/master/made-with-love.svg" alt="badge" />
</div >


## 📦 Installation
```bash
$ npm install @guardbot/framework # via npm
$ yarn add @guardbot/framework    # via yarn
$ pnpm add @guardbot/framework    # via pnpm
```

## 🪴 Getting Started

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
  prefix: '!', 
  rootDir: path.join(__dirname),
  registerOnStart: true, 
  guildsToRegister: [],
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
Create a file for prefix-based commands (e.g., `src/commands/legacy/ping.ts`).
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
  }
})
```

### 5. Recommended Project Structure
```bash
src/
├─ commands/
│  └─ general/
│     └─ ping.ts
├─ listeners/
│  └─ client/
│     └─ ready.ts
└─ index.ts
```


## 🪴 Support Server
<a href="https://discord.gg/invite/GaczkwfgV9" target="_blank">
  <img src="https://discordwidgets.vercel.app/widgets/invite/GaczkwfgV9?theme=dark" alt="Invite" />
</a>