import { Module } from '@nestjs/common';
import { DockerService } from './docker.service';
import { ServerOverviewService } from './server-overview.service';
import { ServerController } from './server.controller';

@Module({
  controllers: [ServerController],
  providers: [ServerOverviewService, DockerService],
})
export class ServerModule {}
