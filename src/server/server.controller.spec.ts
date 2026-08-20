import { Test, type TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../common/auth/auth.constants';
import { ServerOverviewService } from './server-overview.service';
import { ServerController } from './server.controller';

describe('ServerController', () => {
  let controller: ServerController;
  const getOverview = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServerController],
      providers: [
        { provide: ServerOverviewService, useValue: { getOverview } },
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
});
