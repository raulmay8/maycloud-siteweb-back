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
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { Public } from '../common/auth/public.decorator';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { ResponseMessage } from '../common/responses/response-message.decorator';

import { PartnersService } from './partners.service';
import { PartnersPublicService } from './partners-public.service';

import {
  CreatePartnerDto,
  ListPartnersQueryDto,
  UpdatePartnerDto,
  UpdatePartnerStatusDto,
} from './dto/partner.dto';
import { RegisterPartnerDto } from './dto/register-partner.dto';

@ApiTags('Partners')
@ApiBearerAuth()
@Controller('partners')
export class PartnersController {
  constructor(
    private readonly partners: PartnersService,
    private readonly partnersPublic: PartnersPublicService,
  ) {}

  // =========================================================
  // PUBLIC PARTNER REGISTRATION AND REFERRAL
  // =========================================================

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ResponseMessage('Recibimos correctamente tu recomendación')
  @ApiCreatedResponse({
    description: 'Registro y recomendación recibidos correctamente',
  })
  register(@Body() dto: RegisterPartnerDto, @Req() request: Request) {
    return this.partnersPublic.register(dto, request.ip);
  }

  // =========================================================
  // LIST PARTNERS
  // =========================================================

  @Get()
  @RequirePermissions('partners.read')
  @ApiOkResponse({
    description: 'Listado paginado de socios',
  })
  findAll(@Query() query: ListPartnersQueryDto) {
    return this.partners.findAll(query);
  }

  // =========================================================
  // GET PARTNER
  // =========================================================

  @Get(':id')
  @RequirePermissions('partners.read')
  @ApiOkResponse({
    description: 'Detalle de un socio',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.partners.findOne(id);
  }

  // =========================================================
  // CREATE PARTNER
  // =========================================================

  @Post()
  @RequirePermissions('partners.create')
  @ResponseMessage('Socio creado correctamente')
  @ApiCreatedResponse({
    description: 'Socio registrado correctamente',
  })
  create(@Body() dto: CreatePartnerDto) {
    return this.partners.create(dto);
  }

  // =========================================================
  // UPDATE PARTNER
  // =========================================================

  @Patch(':id')
  @RequirePermissions('partners.update')
  @ResponseMessage('Socio actualizado correctamente')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePartnerDto,
  ) {
    return this.partners.update(id, dto);
  }

  // =========================================================
  // UPDATE PARTNER STATUS
  // =========================================================

  @Patch(':id/status')
  @RequirePermissions('partners.status.update')
  @ResponseMessage('Estado del socio actualizado correctamente')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePartnerStatusDto,
  ) {
    return this.partners.updateStatus(id, dto);
  }
}
