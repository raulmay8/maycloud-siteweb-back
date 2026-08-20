import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { UsersService } from './users.service';
import { AssignRolesDto } from '../admin/dto/assign-ids.dto';
import { UpdateUserStatusDto } from '../admin/dto/update-user-status.dto';
import { ResponseMessage } from '../common/responses/response-message.decorator';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';

@ApiTags('Usuarios')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions('users.create')
  @ResponseMessage('Usuario creado correctamente')
  @ApiCreatedResponse({ description: 'Usuario administrativo creado' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.createByAdmin(dto);
  }

  @Get()
  @RequirePermissions('users.read')
  @ApiOkResponse({ description: 'Listado de usuarios' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @RequirePermissions('users.read')
  @ApiOkResponse({ description: 'Detalle, roles y permisos del usuario' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('users.update')
  @ResponseMessage('Usuario actualizado correctamente')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
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
