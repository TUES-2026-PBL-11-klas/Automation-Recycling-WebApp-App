import { Injectable, OnModuleInit } from '@nestjs/common';
import { collectDefaultMetrics, Counter, Gauge, Registry } from 'prom-client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();

  // Email delivery outcomes. MailService swallowed failures into a log line, so
  // sends could be failing for every customer with nothing to see it. This makes
  // the failure rate a metric an alert can watch.
  private readonly emails = new Counter({
    name: 'ecorecycle_emails_total',
    help: 'Emails by kind and outcome',
    labelNames: ['kind', 'outcome'],
    registers: [this.registry],
  });

  constructor(private prisma: PrismaService) {}

  recordEmail(kind: string, outcome: 'sent' | 'failed' | 'skipped') {
    this.emails.inc({ kind, outcome });
  }

  onModuleInit() {
    this.registry.setDefaultLabels({ app: 'ecorecycle-backend' });
    collectDefaultMetrics({ register: this.registry });

    // Captured in a local so the collect() callbacks keep `this` bound to their gauge
    const prisma = this.prisma;

    new Gauge({
      name: 'ecorecycle_pickup_requests',
      help: 'Pickup requests grouped by status',
      labelNames: ['status'],
      registers: [this.registry],
      async collect() {
        const rows = await prisma.pickupRequest.groupBy({
          by: ['status'],
          _count: true,
        });
        this.reset();
        for (const row of rows) this.set({ status: row.status }, row._count);
      },
    });

    new Gauge({
      name: 'ecorecycle_routes',
      help: 'Routes grouped by status',
      labelNames: ['status'],
      registers: [this.registry],
      async collect() {
        const rows = await prisma.route.groupBy({
          by: ['status'],
          _count: true,
        });
        this.reset();
        for (const row of rows) this.set({ status: row.status }, row._count);
      },
    });

    new Gauge({
      name: 'ecorecycle_users',
      help: 'Registered users',
      registers: [this.registry],
      async collect() {
        this.set(await prisma.user.count());
      },
    });

    // The scheduler only opens a route for a district once its confirmed, unrouted
    // requests reach UNDERLOAD_MIN * TRUCK_VOLUME, so this shows how close each
    // district is to being worth a truck.
    new Gauge({
      name: 'ecorecycle_pending_volume_cubic_meters',
      help: 'Volume of confirmed, unrouted requests awaiting scheduling, by district',
      labelNames: ['district'],
      registers: [this.registry],
      async collect() {
        const pending = await prisma.pickupRequest.findMany({
          where: { status: 'CONFIRMED', routeId: null },
          select: {
            estimatedTotalVolume: true,
            address: { select: { district: { select: { name: true } } } },
          },
        });

        const totals = new Map<string, number>();
        for (const request of pending) {
          const district = request.address.district.name;
          totals.set(
            district,
            (totals.get(district) ?? 0) + (request.estimatedTotalVolume ?? 0),
          );
        }

        this.reset();
        for (const [district, volume] of totals) this.set({ district }, volume);
      },
    });
  }
}
