import { FrameworkClient } from './framework';
import { GatewayIntentBits } from 'discord.js';


const client = new FrameworkClient({
  prefix: '!',
  rootDir: import.meta.dirname,
  clientOptions: {
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  },
  registerCommands: process.env.DEV_GUILD_ID ? { guilds: [process.env.DEV_GUILD_ID] } : undefined,
});

client.on('error', console.error);
client.start(process.env.DISCORD_TOKEN!);
