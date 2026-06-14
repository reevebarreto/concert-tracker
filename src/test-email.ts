import dotenv from "dotenv";
import { EmailNotifier } from "./notifiers/email";
import { Concert } from "./database/schema";

// Load environment variables
dotenv.config();

async function testEmailNotification() {
  console.log("🧪 Testing Email Notification...\n");

  // Initialize email notifier
  const emailNotifier = new EmailNotifier({
    service: process.env.EMAIL_SERVICE || "gmail",
    user: process.env.EMAIL_USER || "",
    password: process.env.EMAIL_PASSWORD || "",
    to: process.env.EMAIL_TO || process.env.EMAIL_USER || "",
  });

  // Test connection first
  console.log("1️⃣ Testing email connection...");
  const connectionOk = await emailNotifier.testConnection();

  if (!connectionOk) {
    console.error("\n❌ Email connection failed!");
    console.log("Please check your .env file:");
    console.log("  - EMAIL_USER should be your Gmail address");
    console.log("  - EMAIL_PASSWORD should be your app-specific password");
    console.log(
      "  - Get app password from: https://myaccount.google.com/apppasswords\n",
    );
    process.exit(1);
  }

  console.log("✅ Email connection successful!\n");

  // Create sample concert data
  console.log("2️⃣ Creating sample concert notifications...");

  const sampleConcerts: Concert[] = [
    {
      artistName: "Arctic Monkeys",
      venueName: "3Arena",
      venueCity: "Dublin",
      venueCountry: "Ireland",
      eventDate: "2026-09-15",
      eventUrl: "https://www.3arena.ie/events/arctic-monkeys",
      ticketUrl: "https://www.ticketmaster.ie/arctic-monkeys-tickets",
      source: "test",
      sourceId: "test-1",
      announcedDate: new Date().toISOString().split("T")[0],
      notified: 0,
    },
    {
      artistName: "The Strokes",
      venueName: "Olympia Theatre",
      venueCity: "Dublin",
      venueCountry: "Ireland",
      eventDate: "2026-09-23",
      eventUrl: "https://www.olympia.ie/events/the-strokes",
      source: "test",
      sourceId: "test-2",
      announcedDate: new Date().toISOString().split("T")[0],
      notified: 0,
    },
    {
      artistName: "Radiohead",
      venueName: "Vicar Street",
      venueCity: "Dublin",
      venueCountry: "Ireland",
      eventDate: "2026-10-05",
      eventUrl: "https://www.vicarstreet.ie/events/radiohead",
      ticketUrl: "https://www.ticketmaster.ie/radiohead-tickets",
      source: "test",
      sourceId: "test-3",
      announcedDate: new Date().toISOString().split("T")[0],
      notified: 0,
    },
  ];

  console.log(`✅ Created ${sampleConcerts.length} sample concerts\n`);

  // Send test email
  console.log("3️⃣ Sending test email notification...");

  try {
    await emailNotifier.sendConcertNotification(sampleConcerts);

    console.log("\n✅ SUCCESS! Test email sent!\n");
    console.log(
      "📧 Check your inbox at:",
      process.env.EMAIL_TO || process.env.EMAIL_USER,
    );
    console.log("\nThe email should contain:");
    console.log("  - Subject: 🎵 3 New Concerts Announced!");
    console.log("  - 3 concert listings with details");
    console.log("  - Links to event pages and tickets");
    console.log("  - Beautiful HTML formatting\n");

    console.log(
      "💡 If you received the email, your notification system is working perfectly!",
    );
    console.log("💡 If not, check your spam folder or email configuration.\n");
  } catch (error: any) {
    console.error("\n❌ Failed to send test email!");
    console.error("Error:", error.message);
    console.log("\nTroubleshooting:");
    console.log("  1. Verify EMAIL_USER is correct in .env");
    console.log("  2. Verify EMAIL_PASSWORD is an app-specific password");
    console.log("  3. Check that 2FA is enabled on your Google account");
    console.log("  4. Try generating a new app password\n");
    process.exit(1);
  }
}

// Run the test
testEmailNotification().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

// Made with Bob
