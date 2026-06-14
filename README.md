# 🎵 Concert Tracker Bot

An automated bot that monitors concert announcements for your favorite artists and sends email notifications when new concerts are announced in your area.

## Features

- ✅ **Multi-source tracking**: Monitors Bandsintown and Songkick APIs
- 📧 **Email notifications**: Get notified immediately when concerts are announced
- 🗄️ **SQLite database**: Tracks concerts to avoid duplicate notifications
- 🔍 **Smart filtering**: Filter by location, date range, and keywords
- 📅 **Scheduled checks**: Runs automatically once per day (configurable)
- 🎯 **NLP processing**: Detects interesting announcements using natural language processing

## Prerequisites

- Node.js 18+ and npm
- Gmail account (for sending notifications)
- Bandsintown API access (free)
- Songkick API key (optional, free tier available)

## Installation

1. **Navigate to the project directory:**

   ```bash
   cd /Users/reeve/p/concert-tracker
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Create your environment file:**

   ```bash
   cp .env.example .env
   ```

4. **Configure your `.env` file:**

   ```bash
   nano .env
   ```

   Update the following values:
   - `EMAIL_USER`: Your Gmail address
   - `EMAIL_PASSWORD`: Your Gmail app-specific password (see below)
   - `EMAIL_TO`: Email address to receive notifications (can be same as EMAIL_USER)
   - `BANDSINTOWN_APP_ID`: Use "concert-tracker" or register at https://www.bandsintown.com/api/overview
   - `SONGKICK_API_KEY`: (Optional) Get from https://www.songkick.com/api_key_requests/new

## Gmail Setup (Free Email Service)

To use Gmail for notifications, you need to create an **App Password**:

1. Enable 2-Factor Authentication on your Google account
2. Go to https://myaccount.google.com/apppasswords
3. Select "Mail" and "Other (Custom name)"
4. Name it "Concert Tracker"
5. Copy the generated 16-character password
6. Use this password in your `.env` file as `EMAIL_PASSWORD`

**Note:** Never use your regular Gmail password!

## Configuration

### Artists Configuration

Edit `config/artists.json` to add/remove artists:

```json
{
  "artists": [
    {
      "name": "Arctic Monkeys"
    }
  ],
  "locations": [
    {
      "country": "Ireland",
      "cities": ["Dublin", "Cork", "Galway"]
    }
  ]
}
```

### Settings Configuration

Edit `config/settings.json` to customize behavior:

```json
{
  "checkFrequency": "daily",
  "notificationPreferences": {
    "email": true,
    "minDaysNotice": 7
  },
  "filters": {
    "interestingKeywords": ["tour announcement", "tickets on sale"],
    "excludeKeywords": ["tribute", "cover band"]
  }
}
```

## Usage

### Import Artists from CSV (Optional):

If you have a YouTube Music CSV export from Google Takeout:

```bash
npm run import-csv "music library songs.csv"
```

See [CSV-IMPORT-GUIDE.md](CSV-IMPORT-GUIDE.md) for complete setup instructions.

### Build the project:

```bash
npm run build
```

### Test your setup:

```bash
npm run dev -- --test
```

This will verify:

- Email service connection
- API connectivity
- Configuration validity

### Check for concerts immediately:

```bash
npm run dev -- --check-now
```

### Run the bot with scheduler:

```bash
npm start
```

The bot will:

1. Check for concerts immediately
2. Schedule daily checks at 9:00 AM (configurable via `CRON_SCHEDULE` in `.env`)
3. Send email notifications for new concerts
4. Keep running until you stop it (Ctrl+C)

### Development mode:

```bash
npm run dev
```

## Cron Schedule Configuration

The default schedule is `0 9 * * *` (daily at 9:00 AM). You can customize this in your `.env` file:

```bash
# Check every 6 hours
CRON_SCHEDULE=0 */6 * * *

# Check twice daily (9 AM and 9 PM)
CRON_SCHEDULE=0 9,21 * * *

# Check every day at 10:30 AM
CRON_SCHEDULE=30 10 * * *
```

Cron format: `minute hour day month weekday`

## Running as a Background Service

### On macOS/Linux:

1. **Using nohup:**

   ```bash
   nohup npm start > concert-tracker.log 2>&1 &
   ```

2. **Using screen:**

   ```bash
   screen -S concert-tracker
   npm start
   # Press Ctrl+A then D to detach
   # Reattach with: screen -r concert-tracker
   ```

3. **Using pm2 (recommended):**
   ```bash
   npm install -g pm2
   pm2 start npm --name "concert-tracker" -- start
   pm2 save
   pm2 startup
   ```

## Database

The bot uses SQLite to store concert information in `data/concerts.db`. This prevents duplicate notifications.

To view the database:

```bash
sqlite3 data/concerts.db
sqlite> SELECT * FROM concerts;
sqlite> .quit
```

## Troubleshooting

### Email not sending:

- Verify your Gmail app password is correct
- Check that 2FA is enabled on your Google account
- Ensure `EMAIL_USER` and `EMAIL_PASSWORD` are set in `.env`
- Run `npm run dev -- --test` to verify email connection

### No concerts found:

- Check that artist names in `config/artists.json` match exactly
- Verify your location settings in `config/artists.json`
- Try running with `--check-now` to see detailed logs
- Some artists may not have upcoming concerts

### API errors:

- Bandsintown: Usually works without authentication
- Songkick: Verify your API key is valid
- Check for rate limiting (bot waits 1 second between requests)

## Data Sources

### Bandsintown (Free)

- No API key required for basic use
- Good coverage of concerts worldwide
- Real-time updates

### Songkick (Optional)

- Free tier available: https://www.songkick.com/api_key_requests/new
- Comprehensive concert database
- Artist tracking features

## Project Structure

```
concert-tracker/
├── config/
│   ├── artists.json      # Your favorite artists
│   └── settings.json     # Bot configuration
├── data/
│   └── concerts.db       # SQLite database (auto-created)
├── src/
│   ├── collectors/       # API integrations
│   │   ├── bandsintown.ts
│   │   └── songkick.ts
│   ├── database/         # Database schema
│   │   └── schema.ts
│   ├── notifiers/        # Notification services
│   │   └── email.ts
│   ├── processors/       # NLP and filtering
│   │   └── nlp.ts
│   └── index.ts          # Main application
├── .env                  # Your configuration (create from .env.example)
├── package.json
└── README.md
```

## Tips

1. **Start with a test**: Run `npm run dev -- --test` before scheduling
2. **Check immediately first**: Use `--check-now` to verify everything works
3. **Monitor logs**: Check output for any errors or warnings
4. **Adjust filters**: Customize `config/settings.json` to reduce noise
5. **Location matters**: Add your preferred cities to get relevant results

## Example Notification Email

When concerts are found, you'll receive an email like:

```
🎵 New Concert Announcements!

Arctic Monkeys
📅 Friday, 15 September 2026
🎪 3Arena
📍 Dublin, Ireland
[View Event Details] [Get Tickets]

The Strokes
📅 Saturday, 23 September 2026
🎪 Olympia Theatre
📍 Dublin, Ireland
[View Event Details]
```

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review the logs for error messages
3. Verify your configuration files
4. Test API connections with `--test` flag

## License

MIT

## Contributing

Feel free to submit issues or pull requests!

---

**Happy concert hunting! 🎸🎤🎹**
