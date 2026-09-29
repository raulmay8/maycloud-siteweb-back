import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../common/auth/authenticated-user.interface';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { ResponseMessage } from '../common/responses/response-message.decorator';
import { CrmService } from './crm.service';
import {
  CreateCrmActivityDto,
  CreateCrmLeadDto,
  CreateCrmNoteDto,
  CrmEmailDto,
  ListCrmLeadsQueryDto,
  UpdateCrmLeadDto,
} from './dto/crm-lead.dto';

@ApiTags('CRM')
@ApiBearerAuth()
@Controller('crm')
export class CrmController {
  constructor(private readonly crm: CrmService) {}

  @Get('catalogs')
  @RequirePermissions('crm.leads.read')
  getCatalogs() {
    return this.crm.getCatalogs();
  }

  @Get('leads')
  @RequirePermissions('crm.leads.read')
  @ApiOkResponse({ description: 'Listado paginado de prospectos' })
  findAll(@Query() query: ListCrmLeadsQueryDto) {
    return this.crm.findAll(query);
  }

  @Get('leads/:id')
  @RequirePermissions('crm.leads.read')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.crm.findOne(id);
  }

  @Post('leads')
  @RequirePermissions('crm.leads.create')
  @ResponseMessage('Prospecto creado correctamente')
  @ApiCreatedResponse()
  create(
    @Body() dto: CreateCrmLeadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.create(dto, user.id);
  }

  @Patch('leads/:id')
  @RequirePermissions('crm.leads.update')
  @ResponseMessage('Prospecto actualizado correctamente')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCrmLeadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.update(id, dto, user.id);
  }

  @Post('leads/:id/notes')
  @RequirePermissions('crm.notes.create')
  @ResponseMessage('Nota agregada correctamente')
  addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCrmNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.addNote(id, dto.content, user.id);
  }

  @Post('leads/:id/activities')
  @RequirePermissions('crm.activities.create')
  @ResponseMessage('Actividad registrada correctamente')
  addActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCrmActivityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.addActivity(id, dto, user.id);
  }

  @Post('leads/:id/emails/preview')
  @RequirePermissions('crm.emails.send')
  previewEmail(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CrmEmailDto,
  ) {
    return this.crm.previewEmail(id, dto);
  }

  @Post('leads/:id/emails/send')
  @RequirePermissions('crm.emails.send')
  @ResponseMessage('Correo enviado correctamente')
  sendEmail(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CrmEmailDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.crm.sendEmail(id, dto, user.id);
  }
}
