/** Strips an IPv4-mapped-IPv6 prefix and any IPv6 zone id, e.g. "::ffff:10.0.0.5" -> "10.0.0.5". */
export function normalizeIp(ip: string): string {
  let v = ip.trim();
  const zoneIndex = v.indexOf('%');
  if (zoneIndex !== -1) v = v.slice(0, zoneIndex);
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(v);
  if (mapped) return mapped[1];
  return v;
}

function ipv4ToInt(ip: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return null;
  const bytes = [m[1], m[2], m[3], m[4]].map(Number);
  if (bytes.some((b) => b < 0 || b > 255)) return null;
  return (((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0);
}

function expandIpv6Groups(parts: string[]): string[] {
  if (parts.length === 0) return parts;
  const last = parts[parts.length - 1];
  if (last.includes('.')) {
    const v4 = ipv4ToInt(last);
    if (v4 === null) return parts;
    const hi = ((v4 >>> 16) & 0xffff).toString(16);
    const lo = (v4 & 0xffff).toString(16);
    return [...parts.slice(0, -1), hi, lo];
  }
  return parts;
}

function ipv6ToBigInt(ip: string): bigint | null {
  const doubleColon = ip.indexOf('::');
  let headParts: string[];
  let tailParts: string[];
  if (doubleColon !== -1) {
    if (ip.indexOf('::', doubleColon + 1) !== -1) return null; // more than one "::"
    const head = ip.slice(0, doubleColon);
    const tail = ip.slice(doubleColon + 2);
    headParts = expandIpv6Groups(head ? head.split(':') : []);
    tailParts = expandIpv6Groups(tail ? tail.split(':') : []);
  } else {
    headParts = expandIpv6Groups(ip.split(':'));
    tailParts = [];
  }

  const missing = 8 - (headParts.length + tailParts.length);
  let allParts: string[];
  if (doubleColon !== -1) {
    if (missing < 0) return null;
    allParts = [...headParts, ...Array(missing).fill('0'), ...tailParts];
  } else {
    if (missing !== 0) return null;
    allParts = headParts;
  }
  if (allParts.length !== 8) return null;

  let result = 0n;
  for (const part of allParts) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(part)) return null;
    result = (result << 16n) | BigInt(parseInt(part, 16));
  }
  return result;
}

export function isIpInCidr(ip: string, cidr: string): boolean {
  const normIp = normalizeIp(ip);
  const [range, prefixStr] = cidr.trim().split('/');
  if (!range) return false;
  const normRange = normalizeIp(range);

  const v4ip = ipv4ToInt(normIp);
  const v4range = ipv4ToInt(normRange);
  if (v4ip !== null && v4range !== null) {
    const prefix = prefixStr !== undefined ? Number(prefixStr) : 32;
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
    if (prefix === 0) return true;
    const mask = (~0 << (32 - prefix)) >>> 0;
    return (v4ip & mask) === (v4range & mask);
  }

  const v6ip = ipv6ToBigInt(normIp);
  const v6range = ipv6ToBigInt(normRange);
  if (v6ip !== null && v6range !== null) {
    const prefix = prefixStr !== undefined ? Number(prefixStr) : 128;
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 128) return false;
    if (prefix === 0) return true;
    const fullMask = (1n << 128n) - 1n;
    const mask = fullMask ^ ((1n << BigInt(128 - prefix)) - 1n);
    return (v6ip & mask) === (v6range & mask);
  }

  return false;
}

/** `list` is a comma/newline-separated set of IPs or CIDR ranges (IPv4 or IPv6). */
export function isIpAllowlisted(ip: string | null | undefined, list: string | null | undefined): boolean {
  if (!ip || !list) return false;
  const entries = list
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return entries.some((entry) => {
    try {
      return isIpInCidr(ip, entry);
    } catch {
      return false;
    }
  });
}
