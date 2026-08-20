import type { ServerMemory } from './server.types';

const KIBIBYTE = 1024;

export function parseLinuxMemory(content: string): ServerMemory | null {
  const values = new Map<string, number>();
  for (const line of content.split('\n')) {
    const match = /^(\w+):\s+(\d+)\s+kB$/.exec(line.trim());
    if (match) values.set(match[1], Number(match[2]) * KIBIBYTE);
  }

  const totalBytes = values.get('MemTotal');
  const freeBytes = values.get('MemFree');
  if (totalBytes === undefined || freeBytes === undefined) return null;

  const cachedBytes =
    (values.get('Cached') ?? 0) + (values.get('SReclaimable') ?? 0);
  const buffersBytes = values.get('Buffers') ?? 0;
  const availableBytes = Math.min(
    values.get('MemAvailable') ?? freeBytes + cachedBytes + buffersBytes,
    totalBytes,
  );
  const usedBytes = Math.max(totalBytes - availableBytes, 0);
  const swapTotalBytes = values.get('SwapTotal') ?? 0;
  const swapFreeBytes = Math.min(values.get('SwapFree') ?? 0, swapTotalBytes);
  const swapUsedBytes = swapTotalBytes - swapFreeBytes;

  return {
    totalBytes,
    usedBytes,
    availableBytes,
    freeBytes,
    cachedBytes,
    buffersBytes,
    activeBytes: values.get('Active') ?? null,
    inactiveBytes: values.get('Inactive') ?? null,
    usagePercent: percentage(usedBytes, totalBytes),
    swap: {
      totalBytes: swapTotalBytes,
      usedBytes: swapUsedBytes,
      freeBytes: swapFreeBytes,
      usagePercent: percentage(swapUsedBytes, swapTotalBytes),
    },
  };
}

function percentage(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 10_000) / 100 : 0;
}
