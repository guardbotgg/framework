import { GuildMember, GuildTextBasedChannel, PermissionResolvable, PermissionsBitField } from 'discord.js';


export function isPermissionResolvable(option: any): option is PermissionResolvable {
  try {
    PermissionsBitField.resolve(option);
    return true;
  } catch { return false; };
}

export function resolvePermissions(member: GuildMember, channel?: GuildTextBasedChannel | null): PermissionsBitField {
  return (channel && member.permissionsIn(channel)) ?? member.permissions;
}

export function formatPermissions(perms: string[]): string {
  return perms.map(
    p =>`\`${p.replace(/([A-Z])/g, (m, l, i) => (i === 0 ? l : ` ${l}`))}\``
  ).join(', ');
}