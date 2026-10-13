import { MessageFlags } from 'discord.js';
import { Component } from '../framework';

export default Component({
  type: 'Button',
  customId: /^confirm:(\w+)$/,

  async execute(client, interaction, match) {
    await interaction.reply({ content: `Confirmed **${match?.[1]}** in ${interaction.guild.name}.`, flags: MessageFlags.Ephemeral });
  },
});
