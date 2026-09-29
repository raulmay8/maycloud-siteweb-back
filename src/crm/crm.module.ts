import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';

@Module({
  imports: [MailModule],
  controllers: [CrmController],
  providers: [CrmService],
})
export class CrmModule {}
