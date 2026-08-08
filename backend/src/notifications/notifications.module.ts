import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [PrismaModule, MailModule],
  providers: [NotificationsService],
})
export class NotificationsModule {}
