import {
  APIApplicationCommandOption, ApplicationCommandOptionType, ApplicationIntegrationType, ChatInputCommandInteraction, GuildMember, GuildTextBasedChannel,
  InteractionContextType, PermissionsBitField, SlashCommandBuilder,
} from 'discord.js';
import { CommandType, CommandContext, IntegrationType, SlashOptionsInput } from '../types';


export function normalizeCommandName(name: string, type: CommandType): string {
  if (type === 'ContextUser' || type === 'ContextMessage') return name;
  return name.trim().toLowerCase().replace(/\s+/g, '-');
}

export function normalizeOptions(options: SlashOptionsInput | undefined): APIApplicationCommandOption[] {
  if (!options) return [];
  if (typeof options === 'function') return options(new SlashCommandBuilder()).options.map(o => o.toJSON());
  return options.map(o => ('toJSON' in o ? o.toJSON() : o));
}

export function resolveCommandContexts(contexts?: readonly CommandContext[]) {
  return contexts?.length
    ? contexts.map(c => (typeof c === 'string' ? InteractionContextType[c] : c))
    : [InteractionContextType.Guild];
}

export function resolveIntegrationTypes(types?: readonly IntegrationType[]) {
  return types?.length
    ? types.map(t => (typeof t === 'string' ? ApplicationIntegrationType[t] : t))
    : [ApplicationIntegrationType.GuildInstall];
}

export function requiresCachedGuild(command: { commandContexts?: readonly CommandContext[]; integrationTypes?: readonly IntegrationType[] }) {
  return (
    resolveCommandContexts(command.commandContexts).every(c => c === InteractionContextType.Guild) &&
    resolveIntegrationTypes(command.integrationTypes).every(t => t === ApplicationIntegrationType.GuildInstall)
  );
}

export function getSubcommandNames(options: readonly APIApplicationCommandOption[]): string[] {
  return options.flatMap((option) => {
    if (option.type === ApplicationCommandOptionType.Subcommand) return [option.name];
    if (option.type === ApplicationCommandOptionType.SubcommandGroup) return (option.options ?? []).map(sub => `${option.name} ${sub.name}`);
    return [];
  });
}

export function getSubcommandName(interaction: ChatInputCommandInteraction): string | null {
  const subcommand = interaction.options.getSubcommand(false);
  const group = interaction.options.getSubcommandGroup(false);
  return subcommand && group ? `${group} ${subcommand}` : subcommand;
}

export function getSubcommandHandler<T>(subcommands: Record<string, T>, name: string): T | undefined {
  return Object.hasOwn(subcommands, name) ? subcommands[name] : undefined;
}

export function createPrefixRegex(userId: string, prefix?: string) {
  const escapedPrefix = prefix?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^(<@!?${userId}>${escapedPrefix ? `|${escapedPrefix}` : ''})\\s*`, 'i');
}

export function parseArgs(text: string, quoted: boolean = false): string[] {
  if (!quoted) return text.length ? text.split(/ +/) : [];
  return Array.from(text.matchAll(/["“]([^"“”]*)["”](?=\s|$)|\S+/g), match => match[1] ?? match[0]);
}

export function resolvePermissions(member: GuildMember, channel?: GuildTextBasedChannel | null): PermissionsBitField {
  return (channel && member.permissionsIn(channel)) ?? member.permissions;
}
