import { parseLinuxMemory } from './linux-memory.parser';

describe('parseLinuxMemory', () => {
  it('uses MemAvailable instead of treating cache as used memory', () => {
    const result = parseLinuxMemory(`MemTotal:        3858100 kB
MemFree:          293400 kB
MemAvailable:    2629500 kB
Buffers:           50000 kB
Cached:          2500000 kB
SReclaimable:     129500 kB
Active:           800000 kB
Inactive:        2200000 kB
SwapTotal:       1048576 kB
SwapFree:         786432 kB`);

    expect(result).toEqual({
      totalBytes: 3_950_694_400,
      usedBytes: 1_258_086_400,
      availableBytes: 2_692_608_000,
      freeBytes: 300_441_600,
      cachedBytes: 2_692_608_000,
      buffersBytes: 51_200_000,
      activeBytes: 819_200_000,
      inactiveBytes: 2_252_800_000,
      usagePercent: 31.84,
      swap: {
        totalBytes: 1_073_741_824,
        usedBytes: 268_435_456,
        freeBytes: 805_306_368,
        usagePercent: 25,
      },
    });
  });

  it('returns null when required totals are absent', () => {
    expect(parseLinuxMemory('Cached: 100 kB')).toBeNull();
  });
});
