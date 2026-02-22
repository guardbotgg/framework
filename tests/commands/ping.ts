import { SlashCommand } from '../framework';

export default SlashCommand({
  name: 'ping',
  description: 'Ping test command',
  commandScope: 'default',
  options(builder) {
    return builder.addStringOption(op => op.setName('input').setDescription('Input to echo back').setRequired(false));
  },

  async execute(client, interaction) {
    const text = interaction.options.getString('input') || 'No input provided';
    await interaction.reply({ content: `🏓 Pong from slash command! \nInput: ${text}` });
  },
});