import {
  Controller,
  Get,
  Header,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from './metrics.service';

@SkipThrottle()
@Controller()
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private metricsService: MetricsService,
  ) {}

  // Liveness: the process is up. Deliberately does not touch the database — a
  // database outage should not make Kubernetes restart an otherwise healthy pod.
  @Get('health')
  health() {
    return { status: 'ok', uptime: process.uptime() };
  }

  // Readiness: only report ready once the database actually answers.
  @Get('health/ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
      });
    }
    return { status: 'ok', database: 'up' };
  }

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  getMetrics() {
    return this.metricsService.registry.metrics();
  }
}
