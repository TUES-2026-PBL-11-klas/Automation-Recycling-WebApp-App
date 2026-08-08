// Availability is a calendar date, not an instant. Mixing the two is what made
// the scheduler read a customer's Monday as Sunday: the booking calendar built
// local midnight and serialised it with toISOString(), which rolls back a day at
// any positive UTC offset, while route dates were built at local noon and did
// not. Both sides now agree on a UTC key, and slots arrive as plain YYYY-MM-DD
// (parsed as UTC midnight) so the server's own timezone never enters into it.

export function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// A day offset from today, fixed at 12:00 UTC so the key cannot drift across a
// date boundary from daylight saving or a timezone change.
export function utcDayFromToday(offsetDays: number): Date {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + offsetDays,
      12,
      0,
      0,
      0,
    ),
  );
}
