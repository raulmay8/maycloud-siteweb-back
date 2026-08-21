export interface DockerOverview {
  engine: {
    version: string;
    apiVersion: string;
    minimumApiVersion: string;
    gitCommit: string;
    operatingSystem: string;
    architecture: string;
    kernelVersion: string;
    storageDriver: string;
    dockerRootDirectory: string;
  };
  resources: {
    cpus: number;
    memoryBytes: number;
  };
  containers: {
    total: number;
    running: number;
    paused: number;
    stopped: number;
  };
  images: number;
  diskUsage: {
    imagesBytes: number;
    containersBytes: number;
    volumesBytes: number;
    buildCacheBytes: number;
  };
  collectedAt: string;
}

export interface DockerContainerSummary {
  id: string;
  shortId: string;
  names: string[];
  image: string;
  imageId: string;
  command: string;
  createdAt: string;
  state: string;
  status: string;
  ports: DockerPort[];
  networks: DockerNetwork[];
  sizeBytes: number | null;
  rootFilesystemSizeBytes: number | null;
}

export interface DockerContainerDetail extends DockerContainerSummary {
  hostname: string;
  startedAt: string | null;
  finishedAt: string | null;
  exitCode: number;
  error: string | null;
  pid: number;
  restartCount: number;
  health: {
    status: string;
    failingStreak: number;
  } | null;
  restartPolicy: string;
  mounts: Array<{
    type: string;
    name: string | null;
    destination: string;
    mode: string;
    readOnly: boolean;
  }>;
  limits: {
    memoryBytes: number | null;
    nanoCpus: number | null;
    cpuShares: number | null;
    pids: number | null;
  };
}

export interface DockerContainerStats {
  id: string;
  name: string;
  cpu: { usagePercent: number; onlineCpus: number };
  memory: {
    usedBytes: number;
    limitBytes: number;
    usagePercent: number;
  };
  network: { receivedBytes: number; transmittedBytes: number };
  blockIo: { readBytes: number; writtenBytes: number };
  processes: number;
  collectedAt: string;
}

export interface DockerContainerLog {
  timestamp: string | null;
  stream: 'stdout' | 'stderr' | 'combined';
  message: string;
}

export interface DockerContainerAudit {
  id: string;
  since: string;
  until: string;
  events: Array<{
    action: string;
    timestamp: string;
  }>;
  collectedAt: string;
}

export interface DockerPort {
  privatePort: number;
  publicPort: number | null;
  address: string | null;
  type: string;
}

export interface DockerNetwork {
  name: string;
  networkId: string;
  ipAddress: string;
  gateway: string;
  macAddress: string;
}
