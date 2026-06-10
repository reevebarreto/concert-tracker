import dotenv from "dotenv";
import cron from "node-cron";
import fs from "fs";
import path from "path";
import { ConcertDatabase, Concert } from "./database/schema";
import { RSSFeedCollector } from "./collectors/rss-feeds";
import { WebScraper } from "./collectors/web-scraper";
import { EmailNotifier } from "./notifiers/email";
import { ConcertProcessor } from "./processors/nlp";

// Load environment variables
dotenv.config();

interface ArtistConfig {
  name: string;
  songkickId?: number | null;
  bandsintownId?: string;
}

interface Config {
  artists: ArtistConfig[];
  locations: Array<{ country: string; cities: string[] }>;
}

interface Settings {
  filters: {
    interestingKeywords: string[];
    excludeKeywords: string[];
  };
  notificationPreferences: {
    minDaysNotice: number;
  };
}

class ConcertTrackerV2 {
  private db: ConcertDatabase;
  private rssCollector: RSSFeedCollector;
  private webScraper: WebScraper;
  private emailNotifier: EmailNotifier;
  private processor: ConcertProcessor;
  private config: Config;
  private settings: Settings;

  constructor() {
    // Load configuration
    const configPath = path.join(__dirname, "../config/artists.json");
    const settingsPath = path.join(__dirname, "../config/settings.json");

    this.config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    this.settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));

    // Initialize database
    const dbPath = process.env.DB_PATH || "./data/concerts.db";
    this.db = new ConcertDatabase(dbPath);

    // Initialize collectors
    this.rssCollector = new RSSFeedCollector();
    this.webScraper = new WebScraper();

    // Initialize email notifier
    this.emailNotifier = new EmailNotifier({
      service: process.env.EMAIL_SERVICE || "gmail",
      user: process.env.EMAIL_USER || "",
      password: process.env.EMAIL_PASSWORD || "",
      to: process.env.EMAIL_TO || process.env.EMAIL_USER || "",
    });

    // Initialize processor
    const allLocations = this.config.locations.flatMap((loc) => [
      loc.country,
      ...loc.cities,
    ]);
    this.processor = new ConcertProcessor({
      interestingKeywords: this.settings.filters.interestingKeywords,
      excludeKeywords: this.settings.filters.excludeKeywords,
      locations: allLocations,
    });
  }

  async checkForConcerts(): Promise<void> {
    console.log("\n🎵 Starting concert check (Web Scraping Mode)...");
    console.log(`📅 ${new Date().toLocaleString("en-IE")}\n`);

    const artistNames = this.config.artists.map((a) => a.name);
    const newAnnouncements: Array<{
      artist: string;
      title: string;
      link: string;
      source: string;
      content: string;
    }> = [];

    // 1. Check RSS feeds from music news sites
    console.log("📰 Checking music news RSS feeds...");
    const rssResults = await this.rssCollector.checkAllFeeds(artistNames);

    for (const result of rssResults) {
      // Analyze with NLP to determine if it's a real announcement
      const analysis = this.processor.detectAnnouncement(result.content);

      if (analysis.isAnnouncement && analysis.confidence > 0.4) {
        console.log(
          `  ✨ Found: ${result.title} (confidence: ${(analysis.confidence * 100).toFixed(0)}%)`,
        );
        newAnnouncements.push({
          artist: result.matchedArtists.join(", "),
          title: result.title,
          link: result.link,
          source: result.source,
          content: result.content,
        });
      }
    }

    // 2. Scrape venue websites
    console.log("\n🏛️  Checking venue websites...");
    const venueResults = await this.webScraper.scrapeAllVenues(artistNames);

    for (const result of venueResults) {
      console.log(`  ✨ Found: ${result.artist} at ${result.venue}`);
      newAnnouncements.push({
        artist: result.artist,
        title: `${result.artist} at ${result.venue}`,
        link: result.url,
        source: result.venue,
        content: result.text,
      });
    }

    // 3. Google search for each artist (optional, can be rate-limited)
    if (process.env.ENABLE_GOOGLE_SEARCH === "true") {
      console.log("\n🔍 Searching Google for tour announcements...");
      for (const artist of artistNames) {
        const links = await this.webScraper.searchGoogle(artist, "Ireland");
        console.log(`  Found ${links.length} links for ${artist}`);

        // Scrape top results
        for (const link of links.slice(0, 3)) {
          const pageResults = await this.webScraper.scrapePage(link, [artist]);
          for (const result of pageResults) {
            const analysis = this.processor.detectAnnouncement(result.text);
            if (analysis.isAnnouncement) {
              newAnnouncements.push({
                artist: result.artist,
                title: `${result.artist} tour announcement`,
                link: result.url,
                source: "Google Search",
                content: result.text,
              });
            }
          }
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    // Process and notify
    console.log(
      `\n📊 Summary: Found ${newAnnouncements.length} potential announcements`,
    );

    if (newAnnouncements.length > 0) {
      // Create a summary email
      const emailContent = this.generateAnnouncementEmail(newAnnouncements);

      try {
        await this.emailNotifier.sendConcertNotification([]);
        console.log("✅ Notification sent!");
      } catch (error) {
        console.error("❌ Failed to send notification:", error);
      }

      // Store in database (simplified - store as text records)
      for (const announcement of newAnnouncements) {
        const concert: Concert = {
          artistName: announcement.artist,
          venueName: "TBD",
          venueCity: "Ireland",
          venueCountry: "Ireland",
          eventDate: new Date().toISOString().split("T")[0],
          eventUrl: announcement.link,
          source: "web-scraping",
          sourceId: `web-${Date.now()}-${Math.random()}`,
          announcedDate: new Date().toISOString().split("T")[0],
          notified: 1,
        };

        this.db.addConcert(concert);
      }
    } else {
      console.log("✅ No new announcements found");
    }

    console.log("\n✅ Concert check complete!\n");
  }

  private generateAnnouncementEmail(
    announcements: Array<{
      artist: string;
      title: string;
      link: string;
      source: string;
      content: string;
    }>,
  ): string {
    let html = `
      <h1>🎵 New Concert Announcements Found!</h1>
      <p>Found ${announcements.length} potential concert announcement(s):</p>
    `;

    for (const announcement of announcements) {
      html += `
        <div style="border-left: 4px solid #1DB954; padding: 15px; margin: 15px 0; background: #f8f9fa;">
          <h3>${announcement.artist}</h3>
          <p><strong>${announcement.title}</strong></p>
          <p><em>Source: ${announcement.source}</em></p>
          <p>${announcement.content.substring(0, 300)}...</p>
          <a href="${announcement.link}" style="background: #1DB954; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 10px;">
            Read More
          </a>
        </div>
      `;
    }

    return html;
  }

  async testSetup(): Promise<void> {
    console.log("🧪 Testing setup...\n");

    // Test email connection
    console.log("Testing email service...");
    const emailOk = await this.emailNotifier.testConnection();

    if (!emailOk) {
      console.log("\n⚠️  Email service not configured properly.");
      console.log("Please check your .env file.");
    }

    console.log("\n✅ Setup test complete!\n");
  }

  startScheduler(): void {
    const schedule = process.env.CRON_SCHEDULE || "0 9 * * *";

    console.log(`🕐 Scheduler started with cron: ${schedule}`);
    console.log("   (Default: Daily at 9:00 AM)\n");

    cron.schedule(schedule, async () => {
      try {
        await this.checkForConcerts();
      } catch (error) {
        console.error("❌ Error during scheduled check:", error);
      }
    });

    console.log("✅ Bot is running! Press Ctrl+C to stop.\n");
  }

  close(): void {
    this.db.close();
  }
}

// Main execution
async function main() {
  const tracker = new ConcertTrackerV2();

  const args = process.argv.slice(2);

  if (args.includes("--test")) {
    await tracker.testSetup();
    tracker.close();
  } else if (args.includes("--check-now")) {
    await tracker.checkForConcerts();
    tracker.close();
  } else {
    await tracker.checkForConcerts();
    tracker.startScheduler();
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n\n👋 Shutting down gracefully...");
  process.exit(0);
});

// Run the application
main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

// Made with Bob
