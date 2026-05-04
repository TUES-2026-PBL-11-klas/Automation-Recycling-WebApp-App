import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend = new Resend(process.env.RESEND_API_KEY);
  private readonly from =
    process.env.FROM_EMAIL ?? 'EcoRecycle <noreply@ecorecycle.bg>';

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

    try {
      await this.resend.emails.send({
        from: this.from,
        to: [to],
        subject: 'Потвърждение за вземане – EcoRecycle',
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:auto">
            <h2 style="color:#16a34a">Здравейте, ${data.name}!</h2>
            <p>Заявката ви <strong>#${data.requestId.slice(0, 8).toUpperCase()}</strong> е насрочена за вземане.</p>
            <p>📅 Дата: <strong>${dateStr}</strong></p>
            ${timeRow}
            <p>📍 Адрес: <strong>${data.address}</strong></p>
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

    try {
      await this.resend.emails.send({
        from: this.from,
        to: [to],
        subject: 'Вземането ви е потвърдено – EcoRecycle',
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:auto">
            <h2 style="color:#16a34a">Здравейте, ${data.name}!</h2>
            <p>Радваме се да ви информираме, че заявката ви <strong>#${data.requestId.slice(0, 8).toUpperCase()}</strong> вече е активно насрочена.</p>
            <p>📅 Дата: <strong>${dateStr}</strong></p>
            ${timeRow}
            <p>📍 Адрес: <strong>${data.address}</strong></p>
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
    try {
      await this.resend.emails.send({
        from: this.from,
        to: [to],
        subject: 'Заявката ви е отменена – EcoRecycle',
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:auto">
            <h2 style="color:#dc2626">Здравейте, ${data.name},</h2>
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
