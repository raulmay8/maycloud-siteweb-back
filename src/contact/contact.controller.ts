import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../common/auth/public.decorator';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { ApiMessages } from '../common/messages/api.messages';
import { ApiErrorResponse } from '../common/responses/api-response.model';
import { ResponseMessage } from '../common/responses/response-message.decorator';
import { ContactService } from './contact.service';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { ListContactMessagesQueryDto } from './dto/list-contact-messages-query.dto';
import { UpdateContactMessageStatusDto } from './dto/update-contact-message-status.dto';

@ApiTags('Contacto')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Get()
  @ApiBearerAuth()
  @RequirePermissions('contact_messages.read')
  @ApiOkResponse({ description: 'Listado paginado de mensajes de contacto' })
  findAll(@Query() query: ListContactMessagesQueryDto) {
    return this.contactService.findAll(query);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @RequirePermissions('contact_messages.update')
  @ResponseMessage('Estado del mensaje actualizado correctamente')
  @ApiOkResponse({ description: 'Mensaje marcado como nuevo o leído' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactMessageStatusDto,
  ) {
    return this.contactService.updateStatus(id, dto.status);
  }

  @Public()
  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ResponseMessage(ApiMessages.contact.created)
  @ApiCreatedResponse({ description: 'Mensaje recibido correctamente' })
  @ApiBadRequestResponse({ type: ApiErrorResponse })
  create(@Body() dto: CreateContactMessageDto, @Req() request: Request) {
    return this.contactService.create(dto, request.ip);
  }
}
