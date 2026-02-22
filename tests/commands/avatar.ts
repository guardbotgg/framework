import { ContextCommand } from '../framework';

export default ContextCommand({
  name: 'avatar',
  description: 'Show a user\'s avatar',
  commandType: 'ContextUser',
  commandScope: 'default',

  async execute(client, interaction) {
    const user = interaction.targetUser;
    
    return await interaction.reply({
      content: `Avatar of ${user.tag}: ${user.displayAvatarURL()}`,
      flags: 64
    });
  },
});