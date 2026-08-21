import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Dirent } from 'node:fs';
import { readdir, realpath } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

const MAX_DIRECTORIES_PER_LEVEL = 500;
const CACHE_DURATION_MS = 5_000;

export interface DirectoryListing {
  rootName: string;
  path: string;
  parentPath: string | null;
  directories: Array<{
    name: string;
    path: string;
    hasChildren: boolean;
  }>;
  truncated: boolean;
  collectedAt: string;
}

@Injectable()
export class DirectoryBrowserService {
  private readonly configuredRoot: string;
  private readonly rootName: string;
  private readonly cache = new Map<
    string,
    { value: DirectoryListing; expiresAt: number }
  >();

  constructor(config: ConfigService) {
    this.configuredRoot = (
      config.get<string>('SERVER_DIRECTORIES_ROOT') ?? ''
    ).replace(/[\\/]+$/, '');
    this.rootName = config.get<string>('SERVER_DIRECTORIES_NAME') ?? 'Servidor';
  }

  async list(path = '/'): Promise<DirectoryListing> {
    if (!this.configuredRoot) {
      throw new ServiceUnavailableException(
        'El explorador de directorios operativos no está configurado',
      );
    }
    const normalizedPath = this.normalizePath(path);
    const cached = this.cache.get(normalizedPath);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const [root, target] = await this.resolveSafeTarget(normalizedPath);
    let entries: Dirent[];
    try {
      entries = await readdir(target, { withFileTypes: true });
    } catch (error) {
      if (this.isMissing(error)) {
        throw new NotFoundException('Directorio no encontrado');
      }
      throw new ServiceUnavailableException(
        'No fue posible consultar el directorio',
        { cause: error },
      );
    }

    const directoryEntries = entries
      .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink())
      .sort((left, right) =>
        left.name.localeCompare(right.name, 'es', { sensitivity: 'base' }),
      );
    const selected = directoryEntries.slice(0, MAX_DIRECTORIES_PER_LEVEL);
    const directories = await Promise.all(
      selected.map(async (entry) => {
        const childPath = this.joinPublicPath(normalizedPath, entry.name);
        return {
          name: entry.name,
          path: childPath,
          hasChildren: await this.hasChildDirectories(
            resolve(target, entry.name),
            root,
          ),
        };
      }),
    );
    const value: DirectoryListing = {
      rootName: this.rootName,
      path: normalizedPath,
      parentPath: this.parentPath(normalizedPath),
      directories,
      truncated: directoryEntries.length > selected.length,
      collectedAt: new Date().toISOString(),
    };
    this.cache.set(normalizedPath, {
      value,
      expiresAt: Date.now() + CACHE_DURATION_MS,
    });
    return value;
  }

  private async resolveSafeTarget(path: string): Promise<[string, string]> {
    try {
      const root = await realpath(this.configuredRoot);
      const candidate = resolve(root, `.${path}`);
      const target = await realpath(candidate);
      if (target !== root && !target.startsWith(`${root}${sep}`)) {
        throw new BadRequestException(
          'La ruta está fuera de la raíz permitida',
        );
      }
      return [root, target];
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      if (this.isMissing(error)) {
        throw new NotFoundException('Directorio no encontrado');
      }
      throw new ServiceUnavailableException(
        'No fue posible acceder a la raíz operativa',
        { cause: error },
      );
    }
  }

  private async hasChildDirectories(
    path: string,
    root: string,
  ): Promise<boolean> {
    try {
      const target = await realpath(path);
      if (target !== root && !target.startsWith(`${root}${sep}`)) return false;
      const entries = await readdir(target, { withFileTypes: true });
      return entries.some(
        (entry) => entry.isDirectory() && !entry.isSymbolicLink(),
      );
    } catch {
      return false;
    }
  }

  private normalizePath(path: string): string {
    if (!path.startsWith('/') || path.includes('\0')) {
      throw new BadRequestException('Ruta de directorio inválida');
    }
    const segments = path.split('/').filter(Boolean);
    if (segments.some((segment) => segment === '..' || segment === '.')) {
      throw new BadRequestException('Ruta de directorio inválida');
    }
    return segments.length ? `/${segments.join('/')}` : '/';
  }

  private joinPublicPath(parent: string, name: string): string {
    return parent === '/' ? `/${name}` : `${parent}/${name}`;
  }

  private parentPath(path: string): string | null {
    if (path === '/') return null;
    const segments = path.split('/').filter(Boolean);
    segments.pop();
    return segments.length ? `/${segments.join('/')}` : '/';
  }

  private isMissing(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    );
  }
}
