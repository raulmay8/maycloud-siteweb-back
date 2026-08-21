/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import {
  BadGatewayException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { request } from 'node:http';
import type {
  DockerContainerDetail,
  DockerContainerAudit,
  DockerContainerLog,
  DockerContainerStats,
  DockerContainerSummary,
  DockerNetwork,
  DockerOverview,
  DockerPort,
} from './docker.types';

const REQUEST_TIMEOUT_MS = 5_000;
const LIST_CACHE_MS = 3_000;
const OVERVIEW_CACHE_MS = 15_000;
const MAX_DOCKER_RESPONSE_BYTES = 5 * 1024 * 1024;

type DockerObject = Record<string, any>;

@Injectable()
export class DockerService {
  private readonly socketPath: string;
  private readonly cache = new Map<
    string,
    { value: unknown; expiresAt: number }
  >();

  constructor(config: ConfigService) {
    this.socketPath =
      config.get<string>('DOCKER_SOCKET_PATH') ?? '/var/run/docker.sock';
  }

  getContainers(): Promise<DockerContainerSummary[]> {
    return this.cached('containers', LIST_CACHE_MS, async () => {
      const containers = await this.dockerRequest<DockerObject[]>(
        '/containers/json?all=true&size=true',
      );
      return containers.map((container) => this.toSummary(container));
    });
  }

  async getContainer(id: string): Promise<DockerContainerDetail> {
    const container = await this.dockerRequest<DockerObject>(
      `/containers/${encodeURIComponent(id)}/json?size=true`,
    );
    const state = container.State ?? {};
    const hostConfig = container.HostConfig ?? {};
    return {
      ...this.toSummary(container),
      names: [this.cleanName(container.Name)].filter(Boolean),
      command: [container.Path, ...(container.Args ?? [])]
        .filter(Boolean)
        .join(' '),
      hostname: container.Config?.Hostname ?? '',
      startedAt: this.toNullableDate(state.StartedAt),
      finishedAt: this.toNullableDate(state.FinishedAt),
      exitCode: this.number(state.ExitCode),
      error: state.Error || null,
      pid: this.number(state.Pid),
      restartCount: this.number(container.RestartCount),
      health: state.Health
        ? {
            status: state.Health.Status ?? 'unknown',
            failingStreak: this.number(state.Health.FailingStreak),
          }
        : null,
      restartPolicy: hostConfig.RestartPolicy?.Name ?? 'no',
      mounts: (container.Mounts ?? []).map((mount: DockerObject) => ({
        type: mount.Type ?? '',
        name: mount.Name ?? null,
        destination: mount.Destination ?? '',
        mode: mount.Mode ?? '',
        readOnly: mount.RW === false,
      })),
      limits: {
        memoryBytes: this.positiveOrNull(hostConfig.Memory),
        nanoCpus: this.positiveOrNull(hostConfig.NanoCpus),
        cpuShares: this.positiveOrNull(hostConfig.CpuShares),
        pids: this.positiveOrNull(hostConfig.PidsLimit),
      },
    };
  }

  async getContainerStats(id: string): Promise<DockerContainerStats> {
    const stats = await this.dockerRequest<DockerObject>(
      `/containers/${encodeURIComponent(id)}/stats?stream=false&one-shot=true`,
    );
    const cpuDelta =
      this.number(stats.cpu_stats?.cpu_usage?.total_usage) -
      this.number(stats.precpu_stats?.cpu_usage?.total_usage);
    const systemDelta =
      this.number(stats.cpu_stats?.system_cpu_usage) -
      this.number(stats.precpu_stats?.system_cpu_usage);
    const onlineCpus =
      this.number(stats.cpu_stats?.online_cpus) ||
      (stats.cpu_stats?.cpu_usage?.percpu_usage?.length ?? 0);
    const memoryUsage = this.number(stats.memory_stats?.usage);
    const memoryCache = this.number(
      stats.memory_stats?.stats?.inactive_file ??
        stats.memory_stats?.stats?.cache,
    );
    const usedMemory = Math.max(memoryUsage - memoryCache, 0);
    const memoryLimit = this.number(stats.memory_stats?.limit);
    const network = Object.values<DockerObject>(stats.networks ?? {}).reduce<{
      receivedBytes: number;
      transmittedBytes: number;
    }>(
      (total, current) => ({
        receivedBytes: total.receivedBytes + this.number(current.rx_bytes),
        transmittedBytes:
          total.transmittedBytes + this.number(current.tx_bytes),
      }),
      { receivedBytes: 0, transmittedBytes: 0 },
    );
    const blockIo = (
      stats.blkio_stats?.io_service_bytes_recursive ?? []
    ).reduce(
      (
        total: { readBytes: number; writtenBytes: number },
        item: DockerObject,
      ) => {
        if (String(item.op).toLowerCase() === 'read')
          total.readBytes += this.number(item.value);
        if (String(item.op).toLowerCase() === 'write')
          total.writtenBytes += this.number(item.value);
        return total;
      },
      { readBytes: 0, writtenBytes: 0 },
    );
    return {
      id: stats.id ?? id,
      name: this.cleanName(stats.name),
      cpu: {
        usagePercent:
          systemDelta > 0
            ? this.round((cpuDelta / systemDelta) * onlineCpus * 100)
            : 0,
        onlineCpus,
      },
      memory: {
        usedBytes: usedMemory,
        limitBytes: memoryLimit,
        usagePercent:
          memoryLimit > 0 ? this.round((usedMemory / memoryLimit) * 100) : 0,
      },
      network,
      blockIo,
      processes: this.number(stats.pids_stats?.current),
      collectedAt: this.toNullableDate(stats.read) ?? new Date().toISOString(),
    };
  }

  async getContainerLogs(
    id: string,
    tail: number,
    sinceMinutes: number,
  ): Promise<DockerContainerLog[]> {
    const since = Math.floor(Date.now() / 1_000) - sinceMinutes * 60;
    const path =
      `/containers/${encodeURIComponent(id)}/logs` +
      `?stdout=true&stderr=true&timestamps=true&tail=${tail}&since=${since}`;
    const body = await this.dockerRequestBuffer(path);
    return this.decodeLogFrames(body).flatMap(({ stream, text }) =>
      text
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => {
          const match = /^(\d{4}-\d{2}-\d{2}T\S+)\s(.*)$/.exec(line);
          return {
            timestamp: match?.[1] ?? null,
            stream,
            message: match?.[2] ?? line,
          };
        }),
    );
  }

  async getContainerAudit(
    id: string,
    sinceMinutes: number,
  ): Promise<DockerContainerAudit> {
    const container = await this.getContainer(id);
    const untilSeconds = Math.floor(Date.now() / 1_000);
    const sinceSeconds = untilSeconds - sinceMinutes * 60;
    const filters = encodeURIComponent(
      JSON.stringify({ container: [container.id], type: ['container'] }),
    );
    const body = await this.dockerRequestBuffer(
      `/events?since=${sinceSeconds}&until=${untilSeconds}&filters=${filters}`,
    );
    const events = body
      .toString('utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as DockerObject)
      .map((event) => ({
        action: String(event.Action ?? event.status ?? 'unknown'),
        timestamp: new Date(
          this.number(event.timeNano)
            ? this.number(event.timeNano) / 1_000_000
            : this.number(event.time) * 1_000,
        ).toISOString(),
      }))
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp));
    return {
      id: container.id,
      since: new Date(sinceSeconds * 1_000).toISOString(),
      until: new Date(untilSeconds * 1_000).toISOString(),
      events,
      collectedAt: new Date().toISOString(),
    };
  }

  getOverview(): Promise<DockerOverview> {
    return this.cached('overview', OVERVIEW_CACHE_MS, async () => {
      const [version, info, disk] = await Promise.all([
        this.dockerRequest<DockerObject>('/version'),
        this.dockerRequest<DockerObject>('/info'),
        this.dockerRequest<DockerObject>('/system/df'),
      ]);
      return {
        engine: {
          version: version.Version ?? '',
          apiVersion: version.ApiVersion ?? '',
          minimumApiVersion: version.MinAPIVersion ?? '',
          gitCommit: version.GitCommit ?? '',
          operatingSystem: info.OperatingSystem ?? version.Os ?? '',
          architecture: info.Architecture ?? version.Arch ?? '',
          kernelVersion: info.KernelVersion ?? version.KernelVersion ?? '',
          storageDriver: info.Driver ?? '',
          dockerRootDirectory: info.DockerRootDir ?? '',
        },
        resources: {
          cpus: this.number(info.NCPU),
          memoryBytes: this.number(info.MemTotal),
        },
        containers: {
          total: this.number(info.Containers),
          running: this.number(info.ContainersRunning),
          paused: this.number(info.ContainersPaused),
          stopped: this.number(info.ContainersStopped),
        },
        images: this.number(info.Images),
        diskUsage: {
          imagesBytes: this.number(disk.LayersSize),
          containersBytes: this.sum(disk.Containers, 'SizeRw'),
          volumesBytes: (disk.Volumes ?? []).reduce(
            (total: number, volume: DockerObject) =>
              total + this.number(volume.UsageData?.Size),
            0,
          ),
          buildCacheBytes: this.sum(disk.BuildCache, 'Size'),
        },
        collectedAt: new Date().toISOString(),
      };
    });
  }

  private toSummary(container: DockerObject): DockerContainerSummary {
    const networkSettings = container.NetworkSettings ?? {};
    return {
      id: container.Id ?? '',
      shortId: String(container.Id ?? '').slice(0, 12),
      names: (container.Names ?? []).map((name: string) =>
        this.cleanName(name),
      ),
      image: container.Image ?? container.Config?.Image ?? '',
      imageId: container.ImageID ?? container.Image ?? '',
      command: container.Command ?? '',
      createdAt: this.toDate(container.Created),
      state: container.State?.Status ?? container.State ?? 'unknown',
      status: container.Status ?? container.State?.Status ?? 'unknown',
      ports: this.mapPorts(container.Ports ?? networkSettings.Ports),
      networks: this.mapNetworks(networkSettings.Networks),
      sizeBytes: this.nullableNumber(container.SizeRw),
      rootFilesystemSizeBytes: this.nullableNumber(container.SizeRootFs),
    };
  }

  private mapPorts(value: unknown): DockerPort[] {
    if (Array.isArray(value)) {
      return value.map((port: DockerObject) => ({
        privatePort: this.number(port.PrivatePort),
        publicPort: this.nullableNumber(port.PublicPort),
        address: port.IP ?? null,
        type: port.Type ?? '',
      }));
    }
    return Object.entries(value ?? {}).flatMap(([definition, bindings]) => {
      const [privatePort, type] = definition.split('/');
      const entries = (bindings as DockerObject[] | null) ?? [null];
      return entries.map((binding) => ({
        privatePort: this.number(privatePort),
        publicPort: binding ? this.number(binding.HostPort) : null,
        address: binding?.HostIp ?? null,
        type: type ?? '',
      }));
    });
  }

  private mapNetworks(value: unknown): DockerNetwork[] {
    return Object.entries(value ?? {}).map(([name, raw]) => {
      const network = raw as DockerObject;
      return {
        name,
        networkId: network.NetworkID ?? '',
        ipAddress: network.IPAddress ?? '',
        gateway: network.Gateway ?? '',
        macAddress: network.MacAddress ?? '',
      };
    });
  }

  private dockerRequest<T>(path: string): Promise<T> {
    return this.dockerRequestBuffer(path).then((body) => {
      try {
        return JSON.parse(body.toString('utf8')) as T;
      } catch (error) {
        throw new BadGatewayException(
          'Docker devolvió una respuesta inválida',
          {
            cause: error,
          },
        );
      }
    });
  }

  private dockerRequestBuffer(path: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const req = request(
        {
          socketPath: this.socketPath,
          path,
          method: 'GET',
          timeout: REQUEST_TIMEOUT_MS,
        },
        (response) => {
          const chunks: Buffer[] = [];
          let size = 0;
          response.on('data', (chunk: Buffer) => {
            size += chunk.length;
            if (size > MAX_DOCKER_RESPONSE_BYTES) {
              response.destroy(new Error('Docker response exceeds limit'));
              return;
            }
            chunks.push(chunk);
          });
          response.on('error', (error) =>
            reject(
              new BadGatewayException(
                'La respuesta de Docker excede el límite permitido',
                {
                  cause: error,
                },
              ),
            ),
          );
          response.on('end', () => {
            const body = Buffer.concat(chunks);
            if (response.statusCode === 404)
              return reject(new NotFoundException('Contenedor no encontrado'));
            if (!response.statusCode || response.statusCode >= 400) {
              return reject(
                new BadGatewayException('Docker no pudo completar la consulta'),
              );
            }
            resolve(body);
          });
        },
      );
      req.on('timeout', () => req.destroy(new Error('Docker request timeout')));
      req.on('error', (error) =>
        reject(
          new ServiceUnavailableException(
            'No fue posible conectar con Docker',
            { cause: error },
          ),
        ),
      );
      req.end();
    });
  }

  private decodeLogFrames(
    body: Buffer,
  ): Array<{ stream: DockerContainerLog['stream']; text: string }> {
    const frames: Array<{
      stream: DockerContainerLog['stream'];
      text: string;
    }> = [];
    let offset = 0;
    while (offset + 8 <= body.length) {
      const streamType = body[offset];
      const isHeader =
        (streamType === 1 || streamType === 2) &&
        body[offset + 1] === 0 &&
        body[offset + 2] === 0 &&
        body[offset + 3] === 0;
      if (!isHeader) break;
      const length = body.readUInt32BE(offset + 4);
      if (offset + 8 + length > body.length) break;
      frames.push({
        stream: streamType === 2 ? 'stderr' : 'stdout',
        text: body.subarray(offset + 8, offset + 8 + length).toString('utf8'),
      });
      offset += 8 + length;
    }
    if (frames.length && offset === body.length) return frames;
    return [{ stream: 'combined', text: body.toString('utf8') }];
  }

  private cached<T>(
    key: string,
    duration: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now())
      return Promise.resolve(cached.value as T);
    return factory().then((value) => {
      this.cache.set(key, { value, expiresAt: Date.now() + duration });
      return value;
    });
  }

  private sum(items: DockerObject[] | undefined, field: string): number {
    return (items ?? []).reduce(
      (total, item) => total + this.number(item[field]),
      0,
    );
  }

  private number(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private nullableNumber(value: unknown): number | null {
    return value === undefined || value === null ? null : this.number(value);
  }

  private positiveOrNull(value: unknown): number | null {
    const parsed = this.number(value);
    return parsed > 0 ? parsed : null;
  }

  private cleanName(value: unknown): string {
    return (typeof value === 'string' ? value : '').replace(/^\//, '');
  }

  private toNullableDate(value: unknown): string | null {
    if (typeof value !== 'string' || !value || value.startsWith('0001-'))
      return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  private toDate(value: unknown): string {
    if (typeof value === 'number') return new Date(value * 1_000).toISOString();
    return this.toNullableDate(value) ?? new Date(0).toISOString();
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
