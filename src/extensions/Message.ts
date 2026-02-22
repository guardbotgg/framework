import { Message, MessageCollector, Message as DiscordMessage, InteractionCollector, InteractionType, ModalSubmitInteraction } from 'discord.js';
import { AwaitMemberResponseOptions, ModalCollectorOptions } from '../types';

export function prefix(this: Message) {
  return this.client.prefix;
}

export function isDeveloper(this: Message) {
  return this.client.developers.includes(this.author.id);
}

export function awaitMemberResponse(this: Message, options: AwaitMemberResponseOptions = {}) {
  return new Promise<DiscordMessage>((resolve, reject) => {
    if (!this.channel) {
      return reject(new Error('Channel not available for this message.'));
    }

    const collector = new MessageCollector(this.channel, {
      time: 60000,
      filter: (m) => m.author.id === this.author.id && (m.content || '').length > 0,
      ...options,
      max: 1
    });

    collector.on('end', (messages, reason) => {
      const message = messages.first();
      if (message) {
        if (options.deleteMessage) message.delete().catch(() => null);
        resolve(message);
      } else {
        reject(new Error(reason));
      }
    });
  })
}

export function createModalSubmitCollector(this: Message, options: ModalCollectorOptions = {}) {
  return new InteractionCollector<ModalSubmitInteraction>(this.client, { 
    ...options, 
    interactionType: InteractionType.ModalSubmit, 
    message: this
  });
}

export function awaitModalSubmitComponent(this: Message, options: ModalCollectorOptions = {}) {
  return new Promise<ModalSubmitInteraction>((resolve, reject) => {
    const collector = new InteractionCollector<ModalSubmitInteraction>(this.client, {
      time: 60000, 
      filter: (i) => i.user.id === this.author.id, 
      ...options, 
      interactionType: InteractionType.ModalSubmit, 
      message: this, 
      max: 1
    });

    collector.on('end', (interactions, reason) => {
      const interaction = interactions.first();
      if (interaction) resolve(interaction);
      else reject(new Error(reason));
    })
  })
}