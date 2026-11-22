import { Module } from '@nestjs/common';

import { PublicFormsSecurityModule } from '../common/security/public-forms-security.module';
import { MailModule } from '../mail/mail.module';
import { PartnersController } from './partners.controller';
import { PartnersPublicService } from './partners-public.service';
import { PartnersService } from './partners.service';

@Module({
  imports: [PublicFormsSecurityModule, MailModule],
  controllers: [PartnersController],
  providers: [PartnersService, PartnersPublicService],
  exports: [PartnersService],
})
export class PartnersModule {}
