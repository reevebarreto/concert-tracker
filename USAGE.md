# 🎵 Concert Tracker - Usage Guide

## Quick Commands

### Test Setup

```bash
cd /Users/reeve/p/concert-tracker
npm test
```

✅ Verifies email configuration

### Check for Concerts Now

```bash
npm run check
```

🔍 Runs immediately and shows results

### Run the Bot Continuously

```bash
npm run dev:v2
```

🤖 Checks now, then daily at 9 AM

### Build for Production

```bash
npm run build
npm run start:v2
```

🚀 Compiled version (faster)

## What Happens When You Run It

### 1. RSS Feed Check (10-30 seconds)

- Checks NME, Pitchfork, Stereogum, Consequence, Brooklyn Vegan
- Searches for articles mentioning your artists
- Filters for concert-related keywords

### 2. Venue Scraping (10-20 seconds)

- Scrapes 3Arena, Olympia Theatre, Vicar Street
- Looks for your artists in event listings
- Extracts event details

### 3. NLP Analysis

- Analyzes each finding
- Calculates confidence score
- Filters out false positives

### 4. Notification

- Sends email if new concerts found
- Stores in database to prevent duplicates
- Shows summary in console

## Expected Output

```
🎵 Starting concert check (Web Scraping Mode)...
📅 10/06/2026, 16:08:47

📰 Checking music news RSS feeds...
🔍 Checking 5 RSS feeds...
  Checking NME...
  Checking Pitchfork...
  Checking Stereogum...
  Checking Consequence...
  Checking Brooklyn Vegan...
✅ Found 3 relevant articles

🏛️  Checking venue websites...
🔍 Scraping 3 venue websites...
  Scraping 3Arena...
  Scraping Olympia Theatre...
  Scraping Vicar Street...
✅ Found 2 potential matches

📊 Summary: Found 5 potential announcements

📧 Sending notification for 5 new announcement(s)...
✅ Notification sent!

✅ Concert check complete!
```

## Configuration

### Your Artists

Edit `config/artists.json`:

```json
{
  "artists": [
    {
      "name": "Arctic Monkeys",
      "bandsintownId": "Arctic Monkeys"
    }
  ]
}
```

### Settings

Edit `config/settings.json`:

- `minDaysNotice`: Minimum days before event (default: 7)
- `interestingKeywords`: Words that indicate concerts
- `excludeKeywords`: Words to filter out

### Environment

Edit `.env`:

- `EMAIL_USER`: Your Gmail address
- `EMAIL_PASSWORD`: Gmail app password
- `CRON_SCHEDULE`: When to check (default: 9 AM daily)
- `ENABLE_GOOGLE_SEARCH`: true/false (default: false)

## Troubleshooting

### No results found?

- Normal! Not all artists have upcoming concerts
- Bot will keep checking daily
- Try enabling Google search (risky)

### Email not sending?

```bash
npm test  # Verify email setup
```

Check:

- EMAIL_USER is correct
- EMAIL_PASSWORD is app password (not regular password)
- 2FA is enabled on Google account

### Errors during scraping?

- Websites may be down temporarily
- Check internet connection
- Some sites may block automated access

### Too many false positives?

- Adjust confidence threshold in code
- Add more exclusion keywords
- Increase `minDaysNotice` in settings

## Performance Tips

### Faster Checks

- Disable Google search
- Remove slow RSS feeds
- Reduce number of venues

### Better Results

- Add more RSS feeds
- Add artist-specific sources
- Enable Google search (carefully)

### Reliability

- Run once daily (not more)
- Monitor logs for errors
- Update selectors if sites change

## Adding Sources

### Add RSS Feed

Edit `src/collectors/rss-feeds.ts`:

```typescript
this.feeds.push({
  url: "https://example.com/feed",
  name: "Example Site",
  type: "music-news",
});
```

### Add Venue

Edit `src/collectors/web-scraper.ts`:

```typescript
this.venues.push({
  name: "New Venue",
  url: "https://venue.com/events",
  city: "Cork",
  country: "Ireland",
});
```

## Running in Background

### Using nohup

```bash
nohup npm run dev:v2 > concert-tracker.log 2>&1 &
```

### Using screen

```bash
screen -S concert-tracker
npm run dev:v2
# Press Ctrl+A then D to detach
# Reattach: screen -r concert-tracker
```

### Using pm2 (recommended)

```bash
npm install -g pm2
pm2 start npm --name "concert-tracker" -- run dev:v2
pm2 save
pm2 startup
```

## Logs

View logs:

```bash
# If using nohup
tail -f concert-tracker.log

# If using pm2
pm2 logs concert-tracker
```

## Database

View stored concerts:

```bash
sqlite3 data/concerts.db
sqlite> SELECT artistName, venueCity, eventDate FROM concerts;
sqlite> .quit
```

## Support

If something isn't working:

1. Run `npm test` to verify setup
2. Check logs for error messages
3. Verify websites are accessible
4. Review configuration files

## Best Practices

✅ **DO:**

- Run once daily
- Monitor logs regularly
- Update when sites change
- Use for personal purposes only

❌ **DON'T:**

- Check too frequently (respect rate limits)
- Bypass authentication or paywalls
- Use for commercial purposes
- Overwhelm websites with requests

---

**Happy concert hunting! 🎸**
