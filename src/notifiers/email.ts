import nodemailer from "nodemailer";
import { Concert } from "../database/schema";

export interface EmailConfig {
  service: string;
  user: string;
  password: string;
  to: string;
}

export class EmailNotifier {
  private transporter: nodemailer.Transporter;
  private to: string;
  private fromEmail: string;

  constructor(config: EmailConfig) {
    this.to = config.to;
    this.fromEmail = config.user;
    this.transporter = nodemailer.createTransport({
      service: config.service,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });
  }

  async sendConcertNotification(concerts: Concert[]): Promise<void> {
    if (concerts.length === 0) {
      console.log("No new concerts to notify about");
      return;
    }

    const subject = `🎵 ${concerts.length} New Concert${concerts.length > 1 ? "s" : ""} Announced!`;
    const html = this.generateEmailHTML(concerts);

    try {
      await this.transporter.sendMail({
        from: `Concert Tracker <${this.fromEmail}>`,
        to: this.to,
        subject: subject,
        html: html,
      });

      console.log(
        `✅ Email notification sent for ${concerts.length} concert(s)`,
      );
    } catch (error: any) {
      console.error("❌ Error sending email notification:", error.message);
      throw error;
    }
  }

  private generateEmailHTML(concerts: Concert[]): string {
    const groupedByArtist = this.groupConcertsByArtist(concerts);

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          h1 {
            color: #1DB954;
            border-bottom: 3px solid #1DB954;
            padding-bottom: 10px;
          }
          h2 {
            color: #191414;
            margin-top: 30px;
          }
          .concert {
            background: #f8f9fa;
            border-left: 4px solid #1DB954;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
          }
          .concert-date {
            font-weight: bold;
            color: #1DB954;
            font-size: 1.1em;
          }
          .concert-venue {
            color: #666;
            margin: 5px 0;
          }
          .concert-location {
            color: #888;
            font-size: 0.9em;
          }
          .button {
            display: inline-block;
            background: #1DB954;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 4px;
            margin-top: 10px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #888;
            font-size: 0.9em;
          }
        </style>
      </head>
      <body>
        <h1>🎵 New Concert Announcements!</h1>
        <p>Great news! Your favorite artists have announced new concerts:</p>
    `;

    for (const [artist, artistConcerts] of Object.entries(groupedByArtist)) {
      html += `<h2>${artist}</h2>`;

      for (const concert of artistConcerts) {
        const eventDate = new Date(concert.eventDate);
        const formattedDate = eventDate.toLocaleDateString("en-IE", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        html += `
          <div class="concert">
            <div class="concert-date">📅 ${formattedDate}</div>
            <div class="concert-venue">🎪 ${concert.venueName}</div>
            <div class="concert-location">📍 ${concert.venueCity}, ${concert.venueCountry}</div>
            <a href="${concert.eventUrl}" class="button">View Event Details</a>
            ${concert.ticketUrl ? `<a href="${concert.ticketUrl}" class="button">Get Tickets</a>` : ""}
          </div>
        `;
      }
    }

    html += `
        <div class="footer">
          <p>This is an automated notification from your Concert Tracker bot.</p>
          <p>Source: ${concerts[0].source}</p>
        </div>
      </body>
      </html>
    `;

    return html;
  }

  private groupConcertsByArtist(
    concerts: Concert[],
  ): Record<string, Concert[]> {
    return concerts.reduce(
      (acc, concert) => {
        if (!acc[concert.artistName]) {
          acc[concert.artistName] = [];
        }
        acc[concert.artistName].push(concert);
        return acc;
      },
      {} as Record<string, Concert[]>,
    );
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log("✅ Email service connection verified");
      return true;
    } catch (error: any) {
      console.error("❌ Email service connection failed:", error.message);
      return false;
    }
  }
}

// Made with Bob
