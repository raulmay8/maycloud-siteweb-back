import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

interface CpuOverview {
  model: string;
  cores: number;
  usagePercent: number;
}

@Injectable()
export class ServerOverviewService {
  private cachedOverview?: { value: ServerOverview; expiresAt: number };
  private pendingOverview?: Promise<ServerOverview>;
  private readonly hostRoot: string;

  constructor(private readonly configService: ConfigService) {
    this.hostRoot = (
      this.configService.get<string>('SERVER_HOST_ROOT') ?? ''
    ).replace(/[\\/]+$/, '');
  }

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
    const [host, distribution, kernel, uptimeSeconds, cpu, memory, disks] =
      await Promise.all([
        this.getHostname(),
        this.getLinuxDistribution(),
        this.getKernel(),
        this.getUptimeSeconds(),
        this.getCpu(),
        this.getMemory(),
        this.getDisks(),
      ]);
    const [oneMinute, fiveMinutes, fifteenMinutes] =
      await this.getLoadAverage();

    return {
      hostname: host,
      platform: platform(),
      distribution,
      kernel,
      architecture: arch(),
      uptimeSeconds,
      bootedAt: new Date(
        collectedAt.getTime() - uptimeSeconds * 1_000,
      ).toISOString(),
      cpu: {
        ...cpu,
        loadAverage: { oneMinute, fiveMinutes, fifteenMinutes },
      },
      memory,
      disks,
      collectedAt: collectedAt.toISOString(),
    };
  }

  private async getHostname(): Promise<string> {
    if (platform() !== 'linux') return hostname();
    try {
      return (await this.readHostFile('/etc/hostname')).trim();
    } catch (error) {
      return this.fallbackOrThrow(hostname(), error);
    }
  }

  private async getKernel(): Promise<string> {
    if (platform() !== 'linux') return release();
    try {
      return (await this.readHostFile('/proc/sys/kernel/osrelease')).trim();
    } catch (error) {
      return this.fallbackOrThrow(release(), error);
    }
  }

  private async getUptimeSeconds(): Promise<number> {
    if (platform() !== 'linux') return Math.floor(uptime());
    try {
      const value = Number.parseFloat(
        (await this.readHostFile('/proc/uptime')).split(/\s+/)[0],
      );
      if (!Number.isFinite(value)) throw new Error('Uptime inválido');
      return Math.floor(value);
    } catch (error) {
      return this.fallbackOrThrow(Math.floor(uptime()), error);
    }
  }

  private async getLoadAverage(): Promise<number[]> {
    if (platform() !== 'linux') return loadavg();
    try {
      const values = (await this.readHostFile('/proc/loadavg'))
        .trim()
        .split(/\s+/)
        .slice(0, 3)
        .map(Number);
      if (
        values.length !== 3 ||
        values.some((value) => !Number.isFinite(value))
      )
        throw new Error('Carga promedio inválida');
      return values;
    } catch (error) {
      return this.fallbackOrThrow(loadavg(), error);
    }
  }

  private async getCpu(): Promise<CpuOverview> {
    if (platform() !== 'linux') return this.getPortableCpu();

    try {
      const [cpuInfo, before] = await Promise.all([
        this.readHostFile('/proc/cpuinfo'),
        this.readHostCpuTimes(),
      ]);
      await new Promise((resolve) =>
        setTimeout(resolve, CPU_SAMPLE_DURATION_MS),
      );
      const after = await this.readHostCpuTimes();
      return {
        model:
          /^model name\s*:\s*(.+)$/m.exec(cpuInfo)?.[1].trim() ?? 'Unknown',
        cores: (cpuInfo.match(/^processor\s*:/gm) ?? []).length,
        usagePercent: this.calculateCpuUsage(before, after),
      };
    } catch (error) {
      if (this.hostRoot) throw this.hostDataUnavailable(error);
      return this.getPortableCpu();
    }
  }

  private async getPortableCpu(): Promise<CpuOverview> {
    const cpuList = cpus();
    const before = this.readPortableCpuTimes();
    await new Promise((resolve) => setTimeout(resolve, CPU_SAMPLE_DURATION_MS));
    return {
      model: cpuList[0]?.model.trim() ?? 'Unknown',
      cores: cpuList.length,
      usagePercent: this.calculateCpuUsage(before, this.readPortableCpuTimes()),
    };
  }

  private async readHostCpuTimes(): Promise<CpuTimes> {
    const line = (await this.readHostFile('/proc/stat')).split('\n')[0];
    const values = line.trim().split(/\s+/).slice(1).map(Number);
    if (!values.length || values.some((value) => !Number.isFinite(value)))
      throw new Error('Contadores de CPU inválidos');
    return {
      idle: (values[3] ?? 0) + (values[4] ?? 0),
      total: values.reduce((sum, value) => sum + value, 0),
    };
  }

  private readPortableCpuTimes(): CpuTimes {
    return cpus().reduce<CpuTimes>(
      (result, cpu) => {
        result.idle += cpu.times.idle;
        result.total += Object.values(cpu.times).reduce(
          (sum, value) => sum + value,
          0,
        );
        return result;
      },
      { idle: 0, total: 0 },
    );
  }

  private calculateCpuUsage(before: CpuTimes, after: CpuTimes): number {
    const totalDelta = after.total - before.total;
    const idleDelta = after.idle - before.idle;
    return totalDelta > 0 ? this.round(100 * (1 - idleDelta / totalDelta)) : 0;
  }

  private async getMemory(): Promise<ServerMemory> {
    if (platform() === 'linux') {
      try {
        const memory = parseLinuxMemory(
          await this.readHostFile('/proc/meminfo'),
        );
        if (!memory) throw new Error('Información de memoria inválida');
        return memory;
      } catch (error) {
        if (this.hostRoot) throw this.hostDataUnavailable(error);
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

  private async getLinuxDistribution(): Promise<
    ServerOverview['distribution']
  > {
    if (platform() !== 'linux') return null;
    try {
      const content = await this.readHostFile('/etc/os-release');
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
    } catch (error) {
      return this.fallbackOrThrow(
        { name: 'Linux', version: '', prettyName: 'Linux' },
        error,
      );
    }
  }

  private async getDisks(): Promise<ServerDisk[]> {
    if (platform() === 'win32') return [];
    try {
      const target = this.hostRoot ? this.hostPath('/etc/os-release') : '/';
      const { stdout } = await execFileAsync('df', ['-Pk', target], {
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
          mount: '/',
        }))
        .filter(
          (disk) =>
            Number.isFinite(disk.totalBytes) &&
            Number.isFinite(disk.usagePercent),
        );
    } catch (error) {
      if (this.hostRoot) throw this.hostDataUnavailable(error);
      return [];
    }
  }

  private readHostFile(path: string): Promise<string> {
    return readFile(this.hostPath(path), 'utf8');
  }

  private hostPath(path: string): string {
    return this.hostRoot ? `${this.hostRoot}${path}` : path;
  }

  private fallbackOrThrow<T>(fallback: T, error: unknown): T {
    if (this.hostRoot) throw this.hostDataUnavailable(error);
    return fallback;
  }

  private hostDataUnavailable(error: unknown): ServiceUnavailableException {
    return new ServiceUnavailableException(
      'No fue posible leer la información del VPS',
      { cause: error },
    );
  }

  private percentage(value: number, total: number): number {
    return total > 0 ? this.round((value / total) * 100) : 0;
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
