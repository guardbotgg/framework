import type { FrameworkClient } from '../core/FrameworkClient';


/**
 * Lets you register your own client type with the framework
 *
 * @example
 * declare module '@guardbot/framework' {
 *   interface Register {
 *     client: MyClient<true>;
 *   }
 * }
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Register {};

/** The client handlers get. Your registered client, or `FrameworkClient<true>` */
export type RegisteredClient = Register extends { client: infer C } ? C : FrameworkClient<true>;
