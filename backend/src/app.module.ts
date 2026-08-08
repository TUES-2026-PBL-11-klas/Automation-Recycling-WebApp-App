import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DistrictsModule } from './districts/districts.module';
import { ElectronicsModule } from './electronics/electronics.module';
import { PickupRequestsModule } from './pickup-requests/pickup-requests.module';
import { AdminModule } from './admin/admin.module';
import { MailModule } from './mail/mail.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './health/metrics.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        // JSON in production for log aggregation; readable lines in development.
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true } },
        // Correlation id per request. Honours an inbound X-Request-Id so a trace
        // can span the frontend proxy and the backend.
        genReqId: (req, res) => {
          const existing = req.headers['x-request-id'];
          const id =
            (Array.isArray(existing) ? existing[0] : existing) ?? randomUUID();
          res.setHeader('x-request-id', id);
          return id;
        },
        // Never log credentials or session cookies.
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        // The probe and scrape traffic every few seconds would drown real logs.
        autoLogging: {
          ignore: (req) =>
            req.url === '/health' ||
            req.url === '/health/ready' ||
            req.url === '/metrics',
        },
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    MetricsModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    DistrictsModule,
    ElectronicsModule,
    PickupRequestsModule,
    MailModule,
    SchedulerModule,
    AdminModule,
    HealthModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
