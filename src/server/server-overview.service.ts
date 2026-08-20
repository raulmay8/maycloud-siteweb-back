import { Injectable } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import {
  arch,
  cpus,
  freemem,
  hostname,
  loadavg,
  platform,
  release,
  totalmem,
  uptime,
} from 'node:os';
import { promisify } from 'node:util';
import { parseLinuxMemory } from './linux-memory.parser';
import type { ServerDisk, ServerMemory, ServerOverview } from './server.types';

const execFileAsync = promisify(execFile);
const CACHE_DURATION_MS = 5_000;
const CPU_SAMPLE_DURATION_MS = 100;

interface CpuTimes {
  idle: number;
  total: number;
}

@Injectable()
export class ServerOverviewService {
  private cachedOverview?: { value: ServerOverview; expiresAt: number };
  private pendingOverview?: Promise<ServerOverview>;

  getOverview(): Promise<ServerOverview> {
    const now = Date.now();
    if (this.cachedOverview && this.cachedOverview.expiresAt > now) {
      return Promise.resolve(this.cachedOverview.value);
    }
    if (this.pendingOverview) return this.pendingOverview;

    this.pendingOverview = this.collectOverview().then((value) => {
      this.cachedOverview = {
        value,
        expiresAt: Date.now() + CACHE_DURATION_MS,
      };
      return value;
    });
    return this.pendingOverview.finally(() => {
      this.pendingOverview = undefined;
    });
  }

  private async collectOverview(): Promise<ServerOverview> {
    const collectedAt = new Date();
    const uptimeSeconds = Math.floor(uptime());
    const cpuList = cpus();
    const [usagePercent, distribution, memory, disks] = await Promise.all([
      this.getCpuUsagePercent(),
      this.getLinuxDistribution(),
      this.getMemory(),
      this.getDisks(),
    ]);
    const [oneMinute, fiveMinutes, fifteenMinutes] = loadavg();

    return {
      hostname: hostname(),
      platform: platform(),
      distribution,
      kernel: release(),
      architecture: arch(),
      uptimeSeconds,
      bootedAt: new Date(
        collectedAt.getTime() - uptimeSeconds * 1_000,
      ).toISOString(),
      cpu: {
        model: cpuList[0]?.model.trim() ?? 'Unknown',
        cores: cpuList.length,
        usagePercent,
        loadAverage: { oneMinute, fiveMinutes, fifteenMinutes },
      },
      memory,
      disks,
      collectedAt: collectedAt.toISOString(),
    };
  }

  private async getMemory(): Promise<ServerMemory> {
    if (platform() === 'linux') {
      try {
        const memory = parseLinuxMemory(
          await readFile('/proc/meminfo', 'utf8'),
        );
        if (memory) return memory;
      } catch {
        // Fall back to the portable Node.js values below.
      }
    }

    const totalBytes = totalmem();
    const freeBytes = freemem();
    const usedBytes = Math.max(totalBytes - freeBytes, 0);
    return {
      totalBytes,
      usedBytes,
      availableBytes: freeBytes,
      freeBytes,
      cachedBytes: null,
      buffersBytes: null,
      activeBytes: null,
      inactiveBytes: null,
      usagePercent: this.percentage(usedBytes, totalBytes),
      swap: null,
    };
  }

  private async getCpuUsagePercent(): Promise<number> {
    const before = this.readCpuTimes();
    await new Promise((resolve) => setTimeout(resolve, CPU_SAMPLE_DURATION_MS));
    const after = this.readCpuTimes();
    const totalDelta = after.total - before.total;
    const idleDelta = after.idle - before.idle;
    return totalDelta > 0 ? this.round(100 * (1 - idleDelta / totalDelta)) : 0;
  }

  private readCpuTimes(): CpuTimes {
    return cpus().reduce<CpuTimes>(
      (result, cpu) => {
        const total = Object.values(cpu.times).reduce(
          (sum, value) => sum + value,
          0,
        );
        result.idle += cpu.times.idle;
        result.total += total;
        return result;
      },
      { idle: 0, total: 0 },
    );
  }

  private async getLinuxDistribution(): Promise<
    ServerOverview['distribution']
  > {
    if (platform() !== 'linux') return null;
    try {
      const content = await readFile('/etc/os-release', 'utf8');
      const values = new Map<string, string>();
      for (const line of content.split('\n')) {
        const separator = line.indexOf('=');
        if (separator < 1) continue;
        const key = line.slice(0, separator);
        const value = line.slice(separator + 1).replace(/^['"]|['"]$/g, '');
        values.set(key, value);
      }
      return {
        name: values.get('NAME') ?? 'Linux',
        version: values.get('VERSION_ID') ?? '',
        prettyName: values.get('PRETTY_NAME') ?? values.get('NAME') ?? 'Linux',
      };
    } catch {
      return { name: 'Linux', version: '', prettyName: 'Linux' };
    }
  }

  private async getDisks(): Promise<ServerDisk[]> {
    if (platform() === 'win32') return [];
    try {
      const { stdout } = await execFileAsync('df', ['-Pk'], {
        encoding: 'utf8',
        timeout: 3_000,
        maxBuffer: 1024 * 1024,
        windowsHide: true,
      });
      return stdout
        .trim()
        .split('\n')
        .slice(1)
        .map((line) => line.trim().split(/\s+/))
        .filter((columns) => columns.length >= 6)
        .map((columns) => ({
          filesystem: columns[0],
          totalBytes: Number(columns[1]) * 1024,
          usedBytes: Number(columns[2]) * 1024,
          availableBytes: Number(columns[3]) * 1024,
          usagePercent: Number.parseFloat(columns[4]),
          mount: columns.slice(5).join(' '),
        }))
        .filter(
          (disk) =>
            Number.isFinite(disk.totalBytes) &&
            Number.isFinite(disk.usagePercent),
        );
    } catch {
      return [];
    }
  }

  private percentage(value: number, total: number): number {
    return total > 0 ? this.round((value / total) * 100) : 0;
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
