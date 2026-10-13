import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { SlashCommand } from '../framework';

export default SlashCommand({
  name: 'ping',
  description: 'Ping test command',
  options: (builder) => builder.addStringOption(option => option.setName('input').setDescription('Input to echo back')),

  async execute(client, interaction) {
    const text = interaction.options.getString('input') ?? 'No input provided';
    const confirm = new ButtonBuilder().setCustomId('confirm:ping').setLabel('Confirm').setStyle(ButtonStyle.Primary);

    await interaction.reply({
      content: `🏓 Pong! (${client.ws.ping}ms)\nInput: ${text}`,
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(confirm)],
    });
  },
});
