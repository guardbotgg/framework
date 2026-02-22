import 'dotenv/config';
import { FrameworkClient } from './framework';
import { GatewayIntentBits } from 'discord.js';
import path from 'node:path';


const client = new FrameworkClient({
  prefix: '!',
  rootDir: path.join(__dirname),
  clientOptions: {
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  },
  registerOnStart: true,
  guildsToRegister: [],
});


client.start(process.env.DISCORD_TOKEN!);