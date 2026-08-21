import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DirectoryBrowserService } from './directory-browser.service';

describe('DirectoryBrowserService', () => {
  it('lists only immediate directories inside the configured root', async () => {
    const service = new DirectoryBrowserService(
      new ConfigService({
        SERVER_DIRECTORIES_ROOT: process.cwd(),
        SERVER_DIRECTORIES_NAME: 'Test',
      }),
    );

    const listing = await service.list('/src');

    expect(listing.rootName).toBe('Test');
    expect(listing.path).toBe('/src');
    expect(listing.parentPath).toBe('/');
    expect(listing.directories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'server', path: '/src/server' }),
      ]),
    );
    expect(listing.directories.some(({ name }) => name.endsWith('.ts'))).toBe(
      false,
    );
  });

  it('rejects traversal outside the configured root', async () => {
    const service = new DirectoryBrowserService(
      new ConfigService({ SERVER_DIRECTORIES_ROOT: process.cwd() }),
    );

    await expect(service.list('/../')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('is unavailable when no operational root is configured', async () => {
    const service = new DirectoryBrowserService(new ConfigService());

    await expect(service.list()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
