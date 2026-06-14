import nodemailer from "nodemailer";
import { Concert } from "../database/schema";
import { ArtistInfoService, ArtistInfo } from "../services/artist-info";

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
  private artistInfoService: ArtistInfoService;

  constructor(config: EmailConfig) {
    this.to = config.to;
    this.fromEmail = config.user;
    this.artistInfoService = new ArtistInfoService();
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

    // Get unique artist names
    const uniqueArtists = [...new Set(concerts.map((c) => c.artistName))];

    console.log("🎨 Fetching artist information...");
    const artistInfoMap =
      await this.artistInfoService.getMultipleArtistInfo(uniqueArtists);

    const subject = `🎵 ${concerts.length} New Concert${concerts.length > 1 ? "s" : ""} Announced!`;
    const html = this.generateEmailHTML(concerts, artistInfoMap);

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

  private generateEmailHTML(
    concerts: Concert[],
    artistInfoMap: Map<string, ArtistInfo>,
  ): string {
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
      const artistInfo = artistInfoMap.get(artist);

      // Artist header with image and links
      html += `
        <div style="margin-top: 40px; padding: 20px; background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="display: flex; align-items: center; margin-bottom: 20px;">
            ${
              artistInfo?.imageUrl
                ? `
              <img src="${artistInfo.imageUrl}"
                   alt="${artist}"
                   style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-right: 20px; border: 3px solid #1DB954;">
            `
                : `
              <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #1DB954 0%, #1ed760 100%); margin-right: 20px; display: flex; align-items: center; justify-content: center; font-size: 32px; color: white; font-weight: bold;">
                ${artist.charAt(0).toUpperCase()}
              </div>
            `
            }
            <div style="flex: 1;">
              <h2 style="margin: 0 0 10px 0; color: #191414;">${artist}</h2>
              <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                ${
                  artistInfo?.youtubeUrl
                    ? `
                  <a href="${artistInfo.youtubeUrl}"
                     style="display: inline-flex; align-items: center; padding: 6px 12px; background: #FF0000; color: white; text-decoration: none; border-radius: 4px; font-size: 12px;">
                    ▶️ YouTube Music
                  </a>
                `
                    : ""
                }
                ${
                  artistInfo?.websiteUrl
                    ? `
                  <a href="${artistInfo.websiteUrl}"
                     style="display: inline-flex; align-items: center; padding: 6px 12px; background: #666; color: white; text-decoration: none; border-radius: 4px; font-size: 12px;">
                    🌐 Website
                  </a>
                `
                    : ""
                }
                ${
                  artistInfo?.spotifyUrl
                    ? `
                  <a href="${artistInfo.spotifyUrl}"
                     style="display: inline-flex; align-items: center; padding: 6px 12px; background: #1DB954; color: white; text-decoration: none; border-radius: 4px; font-size: 12px;">
                    🎵 Spotify
                  </a>
                `
                    : ""
                }
              </div>
            </div>
          </div>
      `;

      for (const concert of artistConcerts) {
        // Handle date formatting - check if it's a valid date or "TBD"
        let formattedDate = "Date TBD";

        if (concert.eventDate && concert.eventDate !== "TBD") {
          try {
            const eventDate = new Date(concert.eventDate);
            // Check if date is valid
            if (!isNaN(eventDate.getTime())) {
              formattedDate = eventDate.toLocaleDateString("en-IE", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              });
            }
          } catch (e) {
            // If date parsing fails, keep "Date TBD"
          }
        }

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

      html += `</div>`; // Close artist section
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
