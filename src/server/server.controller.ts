import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { DockerService } from './docker.service';
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
}
