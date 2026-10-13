import { MessageFlags } from 'discord.js';
import { ContextCommand } from '../framework';

export default ContextCommand({
  name: 'quote',
  commandType: 'ContextMessage',

  async execute(client, interaction) {
    const message = interaction.targetMessage;
    await interaction.reply({ content: `> ${message.content || '*No text content*'}\n— ${message.author.tag}`, flags: MessageFlags.Ephemeral });
  },
});
