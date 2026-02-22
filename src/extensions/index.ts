import { Message } from 'discord.js';
import * as MessageExtensions from './Message';

Object.defineProperties(Message.prototype, {
  prefix: { get: MessageExtensions.prefix, configurable: true },
  isDeveloper: { value: MessageExtensions.isDeveloper, writable: true, configurable: true },
  awaitMemberResponse: { value: MessageExtensions.awaitMemberResponse, writable: true, configurable: true },
  createModalSubmitCollector: { value: MessageExtensions.createModalSubmitCollector, writable: true, configurable: true },
  awaitModalSubmitComponent: { value: MessageExtensions.awaitModalSubmitComponent, writable: true, configurable: true },
});