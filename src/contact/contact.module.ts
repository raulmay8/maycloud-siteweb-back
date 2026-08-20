import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { TurnstileService } from './turnstile.service';

@Module({
  imports: [NotificationsModule],
  controllers: [ContactController],
  providers: [ContactService, TurnstileService],
})
export class ContactModule {}
