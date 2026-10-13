import { Message, MessageCollector, InteractionCollector, InteractionType, ModalSubmitInteraction } from 'discord.js';
import { AwaitMemberResponseOptions, ModalCollectorOptions } from '../types/discord';
import { Extension } from '../builders/extensions/Extension';


export const MessageExtension = Extension(Message, {
  /** The prefix for message commands */
  get prefix(): string {
    return this.client.prefix;
  },

  /** Whether the author is one of the developers */
  isDeveloper(): boolean {
    return this.client.developers.includes(this.author.id);
  },

  /** Waits for the next message from the author in this channel */
  awaitMemberResponse(options: AwaitMemberResponseOptions = {}): Promise<Message> {
    return new Promise((resolve, reject) => {
      if (!this.channel) return reject(new Error('Channel not available for this message.'));

      const collector = new MessageCollector(this.channel, {
        time: 60000,
        filter: (m) => m.author.id === this.author.id && Boolean(m.content),
        ...options,
        max: 1,
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
    });
  },

  /** Creates a collector for modal submits from this message's components */
  createModalSubmitCollector(options: ModalCollectorOptions = {}): InteractionCollector<ModalSubmitInteraction> {
    return new InteractionCollector<ModalSubmitInteraction>(this.client, {
      ...options,
      interactionType: InteractionType.ModalSubmit,
      message: this,
    });
  },

  /** Waits for the author's next modal submit from this message's components */
  awaitModalSubmitComponent(options: ModalCollectorOptions = {}): Promise<ModalSubmitInteraction> {
    return new Promise((resolve, reject) => {
      const collector = new InteractionCollector<ModalSubmitInteraction>(this.client, {
        time: 60000,
        filter: (i) => i.user.id === this.author.id,
        ...options,
        interactionType: InteractionType.ModalSubmit,
        message: this,
        max: 1,
      });

      collector.on('end', (interactions, reason) => {
        const interaction = interactions.first();
        if (interaction) resolve(interaction);
        else reject(new Error(reason));
      });
    });
  },
});
