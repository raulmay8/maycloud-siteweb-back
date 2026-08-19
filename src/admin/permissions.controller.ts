import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { ResponseMessage } from '../common/responses/response-message.decorator';
import { AccessControlService } from './access-control.service';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
} from './dto/create-permission.dto';

@ApiTags('Administración - Permisos')
@ApiBearerAuth()
@Controller('admin/permissions')
export class PermissionsController {
  constructor(private readonly accessControl: AccessControlService) {}

  @Get()
  @RequirePermissions('permissions.read')
  findAll() {
    return this.accessControl.findPermissions();
  }

  @Post()
  @RequirePermissions('permissions.create')
  @ResponseMessage('Permiso creado correctamente')
  create(@Body() dto: CreatePermissionDto) {
    return this.accessControl.createPermission(dto);
  }

  @Patch(':id')
  @RequirePermissions('permissions.update')
  @ResponseMessage('Permiso actualizado correctamente')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePermissionDto,
  ) {
    return this.accessControl.updatePermission(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('permissions.delete')
  @ResponseMessage('Permiso eliminado correctamente')
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<null> {
    await this.accessControl.deletePermission(id);
    return null;
  }
}
