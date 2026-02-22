import { ContextCommand } from '../framework';

export default ContextCommand({
  name: 'quote',
  description: 'Quote a message',
  commandType: 'ContextMessage',
  commandScope: 'default',

  async execute(client, interaction) {
    const msg = interaction.targetMessage;

    return await interaction.reply({
      content: `> ${msg.content || '*No text content*'}\n— ${msg.author.tag}`,
      flags: 64
    });
  },
});