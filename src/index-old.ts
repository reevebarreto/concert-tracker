import dotenv from "dotenv";
import cron from "node-cron";
import fs from "fs";
import path from "path";
import { ConcertDatabase, Concert } from "./database/schema";
import { BandsintownCollector } from "./collectors/bandsintown";
import { SongkickCollector } from "./collectors/songkick";
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

class ConcertTracker {
  private db: ConcertDatabase;
  private bandsintownCollector: BandsintownCollector;
  private songkickCollector?: SongkickCollector;
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
    const bandsintownAppId =
      process.env.BANDSINTOWN_APP_ID || "concert-tracker";
    this.bandsintownCollector = new BandsintownCollector(bandsintownAppId);

    const songkickApiKey = process.env.SONGKICK_API_KEY;
    if (songkickApiKey) {
      this.songkickCollector = new SongkickCollector(songkickApiKey);
    } else {
      console.log(
        "⚠️  Songkick API key not provided, skipping Songkick collector",
      );
    }

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
    console.log("\n🎵 Starting concert check...");
    console.log(`📅 ${new Date().toLocaleString("en-IE")}\n`);

    const allConcerts: Concert[] = [];

    // Collect from Bandsintown
    console.log("🔍 Checking Bandsintown...");
    const artistNames = this.config.artists.map(
      (a) => a.bandsintownId || a.name,
    );
    const locationNames = this.config.locations.flatMap((loc) => loc.cities);

    const bandsintownConcerts =
      await this.bandsintownCollector.getEventsForMultipleArtists(
        artistNames,
        locationNames,
      );
    allConcerts.push(...bandsintownConcerts);
    console.log(
      `✅ Found ${bandsintownConcerts.length} concerts on Bandsintown\n`,
    );

    // Collect from Songkick if available
    if (this.songkickCollector) {
      console.log("🔍 Checking Songkick...");
      const songkickConcerts =
        await this.songkickCollector.getEventsForMultipleArtists(
          this.config.artists,
        );
      allConcerts.push(...songkickConcerts);
      console.log(`✅ Found ${songkickConcerts.length} concerts on Songkick\n`);
    }

    // Filter concerts
    console.log("🔍 Filtering concerts...");
    let filteredConcerts = this.processor.filterByLocation(allConcerts);

    // Filter by date range
    const minDaysNotice = this.settings.notificationPreferences.minDaysNotice;
    filteredConcerts = filteredConcerts.filter((concert) =>
      this.processor.isWithinDateRange(concert, minDaysNotice),
    );

    console.log(
      `✅ ${filteredConcerts.length} concerts match your preferences\n`,
    );

    // Store new concerts and collect ones to notify about
    const newConcerts: Concert[] = [];

    for (const concert of filteredConcerts) {
      const existing = this.db.getConcertBySourceId(concert.sourceId);

      if (!existing) {
        const added = this.db.addConcert(concert);
        if (added) {
          newConcerts.push(concert);
          console.log(
            `✨ New concert: ${concert.artistName} - ${concert.venueCity} (${concert.eventDate})`,
          );
        }
      }
    }

    // Send notifications for new concerts
    if (newConcerts.length > 0) {
      console.log(
        `\n📧 Sending notification for ${newConcerts.length} new concert(s)...`,
      );

      const sortedConcerts = this.processor.sortByRelevance(newConcerts);

      try {
        await this.emailNotifier.sendConcertNotification(sortedConcerts);

        // Mark as notified
        for (const concert of newConcerts) {
          const stored = this.db.getConcertBySourceId(concert.sourceId);
          if (stored?.id) {
            this.db.markAsNotified(stored.id);
          }
        }
      } catch (error) {
        console.error("❌ Failed to send notification:", error);
      }
    } else {
      console.log("\n✅ No new concerts found");
    }

    console.log("\n" + this.processor.getSummary(filteredConcerts));
    console.log("✅ Concert check complete!\n");
  }

  async testSetup(): Promise<void> {
    console.log("🧪 Testing setup...\n");

    // Test email connection
    console.log("Testing email service...");
    const emailOk = await this.emailNotifier.testConnection();

    if (!emailOk) {
      console.log("\n⚠️  Email service not configured properly.");
      console.log("Please check your .env file and ensure:");
      console.log("  - EMAIL_USER is set to your Gmail address");
      console.log("  - EMAIL_PASSWORD is set to your app-specific password");
      console.log("  - You have enabled 2FA and created an app password at:");
      console.log("    https://myaccount.google.com/apppasswords\n");
    }

    // Test API connections
    console.log("\nTesting Bandsintown API...");
    const testArtist = this.config.artists[0];
    const testConcerts = await this.bandsintownCollector.getArtistEvents(
      testArtist.bandsintownId || testArtist.name,
    );
    console.log(
      `✅ Bandsintown API working (found ${testConcerts.length} events for ${testArtist.name})`,
    );

    if (this.songkickCollector) {
      console.log("\nTesting Songkick API...");
      const artistId = await this.songkickCollector.searchArtist(
        testArtist.name,
      );
      if (artistId) {
        console.log(`✅ Songkick API working (found artist ID: ${artistId})`);
      }
    }

    console.log("\n✅ Setup test complete!\n");
  }

  startScheduler(): void {
    const schedule = process.env.CRON_SCHEDULE || "0 9 * * *"; // Default: 9 AM daily

    console.log(`🕐 Scheduler started with cron: ${schedule}`);
    console.log("   (Default: Daily at 9:00 AM)\n");

    cron.schedule(schedule, async () => {
      try {
        await this.checkForConcerts();
      } catch (error) {
        console.error("❌ Error during scheduled check:", error);
      }
    });

    // Keep the process running
    console.log("✅ Bot is running! Press Ctrl+C to stop.\n");
  }

  close(): void {
    this.db.close();
  }
}

// Main execution
async function main() {
  const tracker = new ConcertTracker();

  // Check command line arguments
  const args = process.argv.slice(2);

  if (args.includes("--test")) {
    await tracker.testSetup();
    tracker.close();
  } else if (args.includes("--check-now")) {
    await tracker.checkForConcerts();
    tracker.close();
  } else {
    // Run once immediately, then start scheduler
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
