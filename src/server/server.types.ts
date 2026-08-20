export interface ServerOverview {
  hostname: string;
  platform: NodeJS.Platform;
  distribution: {
    name: string;
    version: string;
    prettyName: string;
  } | null;
  kernel: string;
  architecture: string;
  uptimeSeconds: number;
  bootedAt: string;
  cpu: {
    model: string;
    cores: number;
    usagePercent: number;
    loadAverage: {
      oneMinute: number;
      fiveMinutes: number;
      fifteenMinutes: number;
    };
  };
  memory: ServerMemory;
  disks: ServerDisk[];
  collectedAt: string;
}

export interface ServerDisk {
  filesystem: string;
  mount: string;
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  usagePercent: number;
}

export interface ServerMemory {
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  freeBytes: number;
  cachedBytes: number | null;
  buffersBytes: number | null;
  activeBytes: number | null;
  inactiveBytes: number | null;
  usagePercent: number;
  swap: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    usagePercent: number;
  } | null;
}
