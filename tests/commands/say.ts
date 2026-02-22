import { MessageCommand } from '../framework';

export default MessageCommand({
  name: 'say',
  description: 'Echo the user message',
  aliases: ['echo'],

  async execute(client, message, args) {
    if (!args.length) return message.reply('Provide something to say!');
    await message.reply(args.join(' '));
  },
});