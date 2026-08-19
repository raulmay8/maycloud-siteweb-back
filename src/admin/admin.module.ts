import { Module } from '@nestjs/common';
import { AccessControlService } from './access-control.service';
import { MenusController, NavigationController } from './menus.controller';
import { MenusService } from './menus.service';
import { PermissionsController } from './permissions.controller';
import { RolesController } from './roles.controller';

@Module({
  controllers: [
    PermissionsController,
    RolesController,
    MenusController,
    NavigationController,
  ],
  providers: [AccessControlService, MenusService],
})
export class AdminModule {}
