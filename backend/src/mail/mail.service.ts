import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  // The Resend constructor throws on a missing key. Notifications are not
  // essential to serving the API, so run without them rather than refusing
  // to boot when the key is absent.
  private readonly resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;
  private readonly from =
    process.env.FROM_EMAIL ?? 'EcoRecycle <noreply@ecorecycle.bg>';

  // Values that originate from user input (names, free-text notes) are escaped
  // before interpolation so a display name cannot inject markup into the email.
  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Sends a reminder queued as a Notification row. Returns whether it was sent,
  // so the worker can record SENT or FAILED rather than assuming success.
  async sendReminder(
    to: string,
    name: string,
    message: string,
  ): Promise<boolean> {
    if (!this.resend) {
      this.logger.warn(`RESEND_API_KEY not set — skipped reminder to ${to}`);
      return false;
    }
    try {
      const { error } = await this.resend.emails.send({
        from: this.from,
        to: [to],
        subject: 'Напомняне за вземане – EcoRecycle',
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:auto">
            <h2 style="color:#16a34a">Здравейте, ${this.escapeHtml(name)}!</h2>
            <p>${this.escapeHtml(message)}</p>
            <br/>
            <p style="color:#6b7280">С уважение,<br/>Екипът на EcoRecycle</p>
          </div>
        `,
      });
      if (error) {
        this.logger.error(`Reminder to ${to} rejected by Resend`, error);
        return false;
      }
      return true;
    } catch (e) {
      this.logger.error(`Failed to send reminder to ${to}`, e);
      return false;
    }
  }

  async sendPickupConfirmation(
    to: string,
    data: {
      name: string;
      requestId: string;
      address: string;
      scheduledDate: Date;
      timeFrom?: string | null;
      timeTo?: string | null;
    },
  ) {
    const dateStr = data.scheduledDate.toLocaleDateString('bg-BG', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const timeRow =
      data.timeFrom && data.timeTo
        ? `<p>Времеви прозорец: <strong>${data.timeFrom} – ${data.timeTo}</strong></p>`
        : '';

    if (!this.resend) {
      this.logger.warn(
        `RESEND_API_KEY not set — skipped confirmation to ${to}`,
      );
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.from,
        to: [to],
        subject: 'Потвърждение за вземане – EcoRecycle',
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:auto">
            <h2 style="color:#16a34a">Здравейте, ${this.escapeHtml(data.name)}!</h2>
            <p>Заявката ви <strong>#${data.requestId.slice(0, 8).toUpperCase()}</strong> е насрочена за вземане.</p>
            <p>📅 Дата: <strong>${dateStr}</strong></p>
            ${timeRow}
            <p>📍 Адрес: <strong>${this.escapeHtml(data.address)}</strong></p>
            <p>Моля, осигурете достъп до техниката на посочения адрес.</p>
            <br/>
            <p style="color:#6b7280">С уважение,<br/>Екипът на EcoRecycle</p>
          </div>
        `,
      });
    } catch (e) {
      this.logger.error(`Failed to send pickup confirmation to ${to}`, e);
    }
  }

  async sendReserveActivated(
    to: string,
    data: {
      name: string;
      requestId: string;
      address: string;
      scheduledDate: Date;
      timeFrom?: string | null;
      timeTo?: string | null;
    },
  ) {
    const dateStr = data.scheduledDate.toLocaleDateString('bg-BG', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const timeRow =
      data.timeFrom && data.timeTo
        ? `<p>Времеви прозорец: <strong>${data.timeFrom} – ${data.timeTo}</strong></p>`
        : '';

    if (!this.resend) {
      this.logger.warn(
        `RESEND_API_KEY not set — skipped reserve activation to ${to}`,
      );
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.from,
        to: [to],
        subject: 'Вземането ви е потвърдено – EcoRecycle',
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:auto">
            <h2 style="color:#16a34a">Здравейте, ${this.escapeHtml(data.name)}!</h2>
            <p>Радваме се да ви информираме, че заявката ви <strong>#${data.requestId.slice(0, 8).toUpperCase()}</strong> вече е активно насрочена.</p>
            <p>📅 Дата: <strong>${dateStr}</strong></p>
            ${timeRow}
            <p>📍 Адрес: <strong>${this.escapeHtml(data.address)}</strong></p>
            <br/>
            <p style="color:#6b7280">С уважение,<br/>Екипът на EcoRecycle</p>
          </div>
        `,
      });
    } catch (e) {
      this.logger.error(`Failed to send reserve activation email to ${to}`, e);
    }
  }

  async sendCancellationNotice(
    to: string,
    data: { name: string; requestId: string },
  ) {
    if (!this.resend) {
      this.logger.warn(
        `RESEND_API_KEY not set — skipped cancellation notice to ${to}`,
      );
      return;
    }

    try {
      await this.resend.emails.send({
        from: this.from,
        to: [to],
        subject: 'Заявката ви е отменена – EcoRecycle',
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:auto">
            <h2 style="color:#dc2626">Здравейте, ${this.escapeHtml(data.name)},</h2>
            <p>Заявката ви <strong>#${data.requestId.slice(0, 8).toUpperCase()}</strong> беше отменена.</p>
            <p>Ако желаете, можете да подадете нова заявка по всяко време от платформата.</p>
            <br/>
            <p style="color:#6b7280">С уважение,<br/>Екипът на EcoRecycle</p>
          </div>
        `,
      });
    } catch (e) {
      this.logger.error(`Failed to send cancellation notice to ${to}`, e);
    }
  }
}
