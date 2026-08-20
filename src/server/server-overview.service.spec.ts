import { platform } from 'node:os';
import { ConfigService } from '@nestjs/config';
import { ServerOverviewService } from './server-overview.service';

describe('ServerOverviewService', () => {
  let service: ServerOverviewService;

  beforeEach(() => {
    service = new ServerOverviewService(new ConfigService());
  });

  it('returns current read-only system information', async () => {
    const overview = await service.getOverview();

    expect(overview.hostname).toEqual(expect.any(String));
    expect(overview.platform).toBe(platform());
    expect(overview.kernel).toEqual(expect.any(String));
    expect(overview.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(overview.cpu.cores).toBeGreaterThan(0);
    expect(overview.cpu.usagePercent).toBeGreaterThanOrEqual(0);
    expect(overview.cpu.usagePercent).toBeLessThanOrEqual(100);
    expect(overview.memory.totalBytes).toBeGreaterThan(0);
    expect(overview.memory.usedBytes).toBeGreaterThanOrEqual(0);
    expect(overview.memory.availableBytes).toBeGreaterThanOrEqual(0);
    expect(overview.memory.freeBytes).toBeGreaterThanOrEqual(0);
    expect(overview.memory.usagePercent).toBeGreaterThanOrEqual(0);
    expect(overview.disks).toEqual(expect.any(Array));
    expect(new Date(overview.collectedAt).toString()).not.toBe('Invalid Date');
  });

  it('reuses the cached snapshot during the cache window', async () => {
    const first = await service.getOverview();
    const second = await service.getOverview();

    expect(second).toBe(first);
  });
});
