import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { UsersService } from './users.service';
import { AssignRolesDto } from '../admin/dto/assign-ids.dto';
import { UpdateUserStatusDto } from '../admin/dto/update-user-status.dto';
import { ResponseMessage } from '../common/responses/response-message.decorator';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';

@ApiTags('Usuarios')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('users.read')
  @ApiOkResponse({ description: 'Listado de usuarios' })
  findAll() {
    return this.usersService.findAll();
  }

  @Patch(':id/status')
  @RequirePermissions('users.update')
  @ResponseMessage('Estado del usuario actualizado correctamente')
  setActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.setActive(id, dto.isActive, actor.id);
  }

  @Put(':id/roles')
  @RequirePermissions('users.assign_roles')
  @ResponseMessage('Roles asignados correctamente')
  assignRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRolesDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.assignRoles(id, dto.roleIds, actor.id);
  }
}
