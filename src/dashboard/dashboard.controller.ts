import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { DashboardService } from './dashboard.service';
import { CrmDashboardQueryDto } from './dto/crm-dashboard-query.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('crm')
  @RequirePermissions('dashboard.crm.read')
  @ApiOkResponse({
    description: 'Resumen de seguimiento y actividad comercial del CRM',
  })
  getCrmDashboard(
    @Query() query: CrmDashboardQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dashboard.getCrmDashboard(query, user.id);
  }
}
