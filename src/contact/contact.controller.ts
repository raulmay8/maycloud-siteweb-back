import { Body, Controller, Post, Req } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../common/auth/public.decorator';
import { ApiMessages } from '../common/messages/api.messages';
import { ApiErrorResponse } from '../common/responses/api-response.model';
import { ResponseMessage } from '../common/responses/response-message.decorator';
import { ContactService } from './contact.service';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';

@ApiTags('Contacto')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

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
