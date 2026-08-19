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
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { ResponseMessage } from '../common/responses/response-message.decorator';
import { CreateMenuDto, UpdateMenuDto } from './dto/create-menu.dto';
import { MenusService, type NavigationItem } from './menus.service';

@ApiTags('Administración - Menús')
@ApiBearerAuth()
@Controller('admin/menus')
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  @Get()
  @RequirePermissions('menus.read')
  findAll() {
    return this.menusService.findAll();
  }

  @Post()
  @RequirePermissions('menus.create')
  @ResponseMessage('Menú creado correctamente')
  create(@Body() dto: CreateMenuDto) {
    return this.menusService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('menus.update')
  @ResponseMessage('Menú actualizado correctamente')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMenuDto) {
    return this.menusService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('menus.delete')
  @ResponseMessage('Menú eliminado correctamente')
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<null> {
    await this.menusService.delete(id);
    return null;
  }
}

@ApiTags('Administración - Navegación')
@ApiBearerAuth()
@Controller('admin/navigation')
export class NavigationController {
  constructor(private readonly menusService: MenusService) {}

  @Get()
  getNavigation(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NavigationItem[]> {
    return this.menusService.navigation(user);
  }
}
