import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { DockerService } from './docker.service';
import {
  ContainerAuditQueryDto,
  ContainerLogsQueryDto,
} from './dto/container-activity-query.dto';
import { ServerOverviewService } from './server-overview.service';

@ApiTags('Servidor')
@ApiBearerAuth()
@Controller('server')
export class ServerController {
  constructor(
    private readonly overviewService: ServerOverviewService,
    private readonly dockerService: DockerService,
  ) {}

  @Get('overview')
  @RequirePermissions('server.overview.read')
  @ApiOkResponse({ description: 'Estado general actual del servidor' })
  overview() {
    return this.overviewService.getOverview();
  }

  @Get('docker/overview')
  @RequirePermissions('server.containers.read')
  @ApiOkResponse({ description: 'Estado general actual de Docker' })
  dockerOverview() {
    return this.dockerService.getOverview();
  }

  @Get('containers')
  @RequirePermissions('server.containers.read')
  @ApiOkResponse({
    description: 'Contenedores de Docker, incluidos los detenidos',
  })
  containers() {
    return this.dockerService.getContainers();
  }

  @Get('containers/:id')
  @RequirePermissions('server.containers.read')
  @ApiOkResponse({ description: 'Información detallada de un contenedor' })
  container(@Param('id') id: string) {
    return this.dockerService.getContainer(id);
  }

  @Get('containers/:id/stats')
  @RequirePermissions('server.containers.read')
  @ApiOkResponse({ description: 'Métricas actuales de un contenedor' })
  containerStats(@Param('id') id: string) {
    return this.dockerService.getContainerStats(id);
  }

  @Get('containers/:id/logs')
  @RequirePermissions('server.containers.logs')
  @ApiOkResponse({ description: 'Logs recientes y limitados de un contenedor' })
  containerLogs(
    @Param('id') id: string,
    @Query() query: ContainerLogsQueryDto,
  ) {
    return this.dockerService.getContainerLogs(
      id,
      query.tail,
      query.sinceMinutes,
    );
  }

  @Get('containers/:id/audit')
  @RequirePermissions('server.containers.read')
  @ApiOkResponse({
    description: 'Eventos recientes del ciclo de vida de un contenedor',
  })
  containerAudit(
    @Param('id') id: string,
    @Query() query: ContainerAuditQueryDto,
  ) {
    return this.dockerService.getContainerAudit(id, query.sinceMinutes);
  }
}
