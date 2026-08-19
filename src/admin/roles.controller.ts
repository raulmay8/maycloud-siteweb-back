import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { ResponseMessage } from '../common/responses/response-message.decorator';
import { AccessControlService } from './access-control.service';
import { AssignPermissionsDto } from './dto/assign-ids.dto';
import { CreateRoleDto, UpdateRoleDto } from './dto/create-role.dto';

@ApiTags('Administración - Roles')
@ApiBearerAuth()
@Controller('admin/roles')
export class RolesController {
  constructor(private readonly accessControl: AccessControlService) {}

  @Get()
  @RequirePermissions('roles.read')
  findAll() {
    return this.accessControl.findRoles();
  }

  @Post()
  @RequirePermissions('roles.create')
  @ResponseMessage('Rol creado correctamente')
  create(@Body() dto: CreateRoleDto) {
    return this.accessControl.createRole(dto);
  }

  @Patch(':id')
  @RequirePermissions('roles.update')
  @ResponseMessage('Rol actualizado correctamente')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoleDto) {
    return this.accessControl.updateRole(id, dto);
  }

  @Put(':id/permissions')
  @RequirePermissions('roles.assign_permissions')
  @ResponseMessage('Permisos asignados correctamente')
  assignPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.accessControl.assignPermissions(id, dto.permissionIds);
  }

  @Delete(':id')
  @RequirePermissions('roles.delete')
  @ResponseMessage('Rol eliminado correctamente')
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<null> {
    await this.accessControl.deleteRole(id);
    return null;
  }
}
