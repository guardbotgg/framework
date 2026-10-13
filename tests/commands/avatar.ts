import { MessageFlags } from 'discord.js';
import { ContextCommand } from '../framework';

export default ContextCommand({
  name: 'avatar',
  commandType: 'ContextUser',

  async execute(client, interaction) {
    const user = interaction.targetUser;
    await interaction.reply({ content: `Avatar of ${user.tag}: ${user.displayAvatarURL()}`, flags: MessageFlags.Ephemeral });
  },
});
