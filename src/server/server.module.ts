import { Module } from '@nestjs/common';
import { ServerOverviewService } from './server-overview.service';
import { ServerController } from './server.controller';

@Module({
  controllers: [ServerController],
  providers: [ServerOverviewService],
})
export class ServerModule {}
