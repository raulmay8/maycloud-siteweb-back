import { Module } from '@nestjs/common';
import { PublicFormsSecurityModule } from '../common/security/public-forms-security.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';

@Module({
  imports: [NotificationsModule, MailModule, PublicFormsSecurityModule],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
