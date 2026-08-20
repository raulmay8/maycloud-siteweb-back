import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { ServerOverviewService } from './server-overview.service';

@ApiTags('Servidor')
@ApiBearerAuth()
@Controller('server')
export class ServerController {
  constructor(private readonly overviewService: ServerOverviewService) {}

  @Get('overview')
  @RequirePermissions('server.overview.read')
  @ApiOkResponse({ description: 'Estado general actual del servidor' })
  overview() {
    return this.overviewService.getOverview();
  }
}
