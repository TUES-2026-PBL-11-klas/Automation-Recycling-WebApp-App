import { SchedulerService } from './scheduler.service';
import { utcDateKey, utcDayFromToday } from './date-key';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

// The packing and availability logic is pure, so it is exercised directly rather
// than through a database. Members are reached by index because they are private
// to callers but part of what actually needs pinning down.
type Testable = {
  calcEffectiveVolume: (r: Req[]) => number;
  calcTotalWeight: (r: Req[]) => number;
  packRequests: (pool: Req[], volumeCap: number, existing?: Req[]) => Req[];
  isAvailableOn: (r: Req, d: Date) => boolean;
  findBestRouteDate: (r: Req[]) => Date;
};

interface Item {
  quantity: number;
  estimatedVolume: number | null;
  estimatedWeight: number | null;
  electronicsItem: { isSmallItem: boolean };
}

interface Req {
  id: string;
  estimatedTotalWeight: number | null;
  items: Item[];
  availabilitySlots: Array<{ availableDate: Date; isFlexible: boolean }>;
}

function item(
  volume: number,
  weight: number,
  quantity = 1,
  isSmallItem = false,
): Item {
  return {
    quantity,
    estimatedVolume: volume,
    estimatedWeight: weight,
    electronicsItem: { isSmallItem },
  };
}

function req(id: string, items: Item[], dates: Date[] = []): Req {
  return {
    id,
    estimatedTotalWeight: items.reduce(
      (s, i) => s + (i.estimatedWeight ?? 0),
      0,
    ),
    items,
    availabilitySlots: dates.map((d) => ({
      availableDate: d,
      isFlexible: false,
    })),
  };
}

describe('SchedulerService', () => {
  let service: Testable;

  beforeEach(() => {
    service = new SchedulerService(
      {} as PrismaService,
      {} as MailService,
    ) as unknown as Testable;
  });

  describe('calcEffectiveVolume', () => {
    it('sums the volume of large items', () => {
      const requests = [req('a', [item(0.4, 60)]), req('b', [item(0.35, 70)])];
      expect(service.calcEffectiveVolume(requests)).toBeCloseTo(0.75);
    });

    it('charges nothing while small items are within the free allowance', () => {
      // 5 phones, the allowance exactly
      const requests = [req('a', [item(0.001, 0.3, 5, true)])];
      expect(service.calcEffectiveVolume(requests)).toBe(0);
    });

    it('charges only the units beyond the allowance, not all of them', () => {
      // 6 phones at 0.001 m3 each: one unit is chargeable, not six
      const requests = [req('a', [item(0.006, 1.8, 6, true)])];
      expect(service.calcEffectiveVolume(requests)).toBeCloseTo(0.001);
    });

    it('grows smoothly as small items are added, with no cliff', () => {
      const volumes = [5, 6, 7, 8].map((qty) =>
        service.calcEffectiveVolume([
          req('a', [item(0.001 * qty, 0.3 * qty, qty, true)]),
        ]),
      );
      // Each step adds exactly one unit of volume
      expect(volumes[1] - volumes[0]).toBeCloseTo(0.001);
      expect(volumes[2] - volumes[1]).toBeCloseTo(0.001);
      expect(volumes[3] - volumes[2]).toBeCloseTo(0.001);
    });

    it('keeps large and small item accounting separate', () => {
      const requests = [req('a', [item(0.4, 60), item(0.002, 0.6, 2, true)])];
      // Large counts fully, 2 small items are inside the allowance
      expect(service.calcEffectiveVolume(requests)).toBeCloseTo(0.4);
    });
  });

  describe('packRequests', () => {
    it('stops at the volume cap', () => {
      const pool = [
        req('a', [item(3, 10)]),
        req('b', [item(3, 10)]),
        req('c', [item(3, 10)]),
      ];
      const packed = service.packRequests(pool, 7);
      expect(packed.map((r) => r.id)).toEqual(['a', 'b']);
    });

    it('stops at the weight cap even when volume still fits', () => {
      // 15 washing machines: 5.25 m3 clears the volume threshold, 1050 kg does not
      const pool = Array.from({ length: 15 }, (_, i) =>
        req(`w${i}`, [item(0.35, 70)]),
      );
      const packed = service.packRequests(pool, 7);

      expect(service.calcEffectiveVolume(packed)).toBeLessThanOrEqual(7);
      expect(service.calcTotalWeight(packed)).toBeLessThanOrEqual(1000);
      expect(packed.length).toBeLessThan(15);
    });

    it('preserves pool order, so earlier requests are served first', () => {
      const pool = [
        req('first', [item(1, 10)]),
        req('second', [item(1, 10)]),
        req('third', [item(1, 10)]),
      ];
      expect(service.packRequests(pool, 7).map((r) => r.id)).toEqual([
        'first',
        'second',
        'third',
      ]);
    });

    it('never packs the same request twice', () => {
      const duplicate = req('a', [item(1, 10)]);
      const packed = service.packRequests([duplicate, duplicate], 7);
      expect(packed).toHaveLength(1);
    });

    it('accounts for already-packed requests when extending a route', () => {
      const existing = [req('a', [item(5, 10)])];
      const pool = [req('b', [item(3, 10)]), req('c', [item(1, 10)])];
      // Only 2 m3 of headroom left, so b cannot fit but c can
      expect(service.packRequests(pool, 7, existing).map((r) => r.id)).toEqual([
        'c',
      ]);
    });

    it('carries the small-item allowance across requests while packing', () => {
      // Three phones each in three requests: 9 small items total, past the
      // allowance of 5. The incremental pack must charge the same as scoring
      // the whole set at once, not per request in isolation (where each would
      // be under the allowance and count as zero volume).
      const pool = [
        req('a', [item(0.003, 0.9, 3, true)]),
        req('b', [item(0.003, 0.9, 3, true)]),
        req('c', [item(0.003, 0.9, 3, true)]),
      ];
      const packed = service.packRequests(pool, 7);
      expect(packed).toHaveLength(3);
      // 9 small items, 4 chargeable beyond the free 5, at 0.001 m3 each
      expect(service.calcEffectiveVolume(packed)).toBeCloseTo(0.004);
    });
  });

  describe('availability dates', () => {
    it('treats a calendar day as the same day regardless of clock time', () => {
      // This is the off-by-one that shipped: midnight and noon on the same
      // calendar day must produce the same key.
      expect(utcDateKey(new Date(Date.UTC(2026, 7, 9, 0, 0, 0)))).toBe(
        '2026-08-09',
      );
      expect(utcDateKey(new Date(Date.UTC(2026, 7, 9, 12, 0, 0)))).toBe(
        '2026-08-09',
      );
    });

    it('parses a plain YYYY-MM-DD slot to the date the customer picked', () => {
      expect(utcDateKey(new Date('2026-08-09'))).toBe('2026-08-09');
    });

    it('builds day offsets that keep their key', () => {
      const day = utcDayFromToday(3);
      expect(day.getUTCHours()).toBe(12);
      expect(utcDateKey(day)).toBe(day.toISOString().slice(0, 10));
    });

    it('matches a request to the day it declared available', () => {
      const day = utcDayFromToday(2);
      const r = req('a', [item(1, 10)], [new Date(utcDateKey(day))]);
      expect(service.isAvailableOn(r, day)).toBe(true);
    });

    it('excludes a request on a day it did not declare', () => {
      const r = req(
        'a',
        [item(1, 10)],
        [new Date(utcDateKey(utcDayFromToday(2)))],
      );
      expect(service.isAvailableOn(r, utcDayFromToday(5))).toBe(false);
    });

    it('treats a request with no slots as always available', () => {
      const r = req('a', [item(1, 10)]);
      expect(service.isAvailableOn(r, utcDayFromToday(1))).toBe(true);
    });
  });

  describe('findBestRouteDate', () => {
    it('picks the day the most requests can actually make', () => {
      const popular = utcDayFromToday(4);
      const quiet = utcDayFromToday(9);
      const requests = [
        req('a', [item(1, 10)], [new Date(utcDateKey(popular))]),
        req('b', [item(1, 10)], [new Date(utcDateKey(popular))]),
        req('c', [item(1, 10)], [new Date(utcDateKey(quiet))]),
      ];
      expect(utcDateKey(service.findBestRouteDate(requests))).toBe(
        utcDateKey(popular),
      );
    });

    it('falls back to a fixed horizon when nobody stated a preference', () => {
      const requests = [req('a', [item(1, 10)]), req('b', [item(1, 10)])];
      expect(utcDateKey(service.findBestRouteDate(requests))).toBe(
        utcDateKey(utcDayFromToday(7)),
      );
    });
  });
});
