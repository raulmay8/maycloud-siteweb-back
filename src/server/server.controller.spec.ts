import { Test, type TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../common/auth/auth.constants';
import { DirectoryBrowserService } from './directory-browser.service';
import { DockerService } from './docker.service';
import { ServerOverviewService } from './server-overview.service';
import { ServerController } from './server.controller';

describe('ServerController', () => {
  let controller: ServerController;
  const getOverview = jest.fn();
  const getDockerOverview = jest.fn();
  const getContainers = jest.fn();
  const getContainer = jest.fn();
  const getContainerStats = jest.fn();
  const getContainerLogs = jest.fn();
  const getContainerAudit = jest.fn();
  const listDirectories = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServerController],
      providers: [
        { provide: ServerOverviewService, useValue: { getOverview } },
        {
          provide: DockerService,
          useValue: {
            getOverview: getDockerOverview,
            getContainers,
            getContainer,
            getContainerStats,
            getContainerLogs,
            getContainerAudit,
          },
        },
        {
          provide: DirectoryBrowserService,
          useValue: { list: listDirectories },
        },
      ],
    }).compile();
    controller = module.get(ServerController);
  });

  it('delegates overview collection to the service', async () => {
    const expected = { hostname: 'vps-01' };
    getOverview.mockResolvedValue(expected);

    await expect(controller.overview()).resolves.toBe(expected);
  });

  it('requires the server overview permission', () => {
    const reflector = new Reflector();
    const overviewHandler = Object.getOwnPropertyDescriptor(
      ServerController.prototype,
      'overview',
    )?.value as (...args: unknown[]) => unknown;

    expect(reflector.get<string[]>(PERMISSIONS_KEY, overviewHandler)).toEqual([
      'server.overview.read',
    ]);
  });

  it.each(['dockerOverview', 'containers', 'container', 'containerStats'])(
    'requires the container read permission for %s',
    (method) => {
      const reflector = new Reflector();
      const handler = Object.getOwnPropertyDescriptor(
        ServerController.prototype,
        method,
      )?.value as (...args: unknown[]) => unknown;

      expect(reflector.get<string[]>(PERMISSIONS_KEY, handler)).toEqual([
        'server.containers.read',
      ]);
    },
  );

  it('requires the container logs permission for logs', () => {
    const reflector = new Reflector();
    const handler = Object.getOwnPropertyDescriptor(
      ServerController.prototype,
      'containerLogs',
    )?.value as (...args: unknown[]) => unknown;

    expect(reflector.get<string[]>(PERMISSIONS_KEY, handler)).toEqual([
      'server.containers.logs',
    ]);
  });

  it('requires the container read permission for audit', () => {
    const reflector = new Reflector();
    const handler = Object.getOwnPropertyDescriptor(
      ServerController.prototype,
      'containerAudit',
    )?.value as (...args: unknown[]) => unknown;

    expect(reflector.get<string[]>(PERMISSIONS_KEY, handler)).toEqual([
      'server.containers.read',
    ]);
  });

  it('requires the directory read permission for the explorer', () => {
    const reflector = new Reflector();
    const handler = Object.getOwnPropertyDescriptor(
      ServerController.prototype,
      'directories',
    )?.value as (...args: unknown[]) => unknown;

    expect(reflector.get<string[]>(PERMISSIONS_KEY, handler)).toEqual([
      'server.directories.read',
    ]);
  });
});
