import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

const BATCH_SIZE = 50;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  // The admin route flow queues Notification rows with a scheduledFor 24h before
  // the pickup; nothing sent them until now. Runs every minute so a due reminder
  // goes out promptly without a heavy poll.
  @Cron(CronExpression.EVERY_MINUTE)
  async dispatchDue() {
    const due = await this.prisma.notification.findMany({
      where: {
        status: 'SCHEDULED',
        type: 'EMAIL',
        scheduledFor: { lte: new Date() },
      },
      include: { user: { select: { email: true, name: true } } },
      orderBy: { scheduledFor: 'asc' },
      take: BATCH_SIZE,
    });
    if (due.length === 0) return;

    let sent = 0;
    let failed = 0;

    for (const n of due) {
      // Claim the row by flipping it out of SCHEDULED in a single guarded
      // update. With two backend replicas both run this cron; whichever updates
      // first gets count 1 and the other gets 0 and skips, so a reminder is
      // never sent twice.
      const claim = await this.prisma.notification.updateMany({
        where: { id: n.id, status: 'SCHEDULED' },
        data: { status: 'SENT', sentAt: new Date() },
      });
      if (claim.count === 0) continue;

      const ok = await this.mail.sendReminder(
        n.user.email,
        n.user.name,
        n.message,
      );

      if (ok) {
        sent++;
      } else {
        // Send failed after the claim — record FAILED so it is visible and not
        // silently retried forever.
        failed++;
        await this.prisma.notification.update({
          where: { id: n.id },
          data: { status: 'FAILED' },
        });
      }
    }

    this.logger.log(`Reminders dispatched: ${sent} sent, ${failed} failed`);
  }
}
