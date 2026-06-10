# 🚀 Quick Start Guide

Get your concert tracker running in 5 minutes!

## Step 1: Setup Environment

Copy the example environment file:

```bash
cd /Users/reeve/p/concert-tracker
cp .env.example .env
```

## Step 2: Configure Gmail (Free Email Service)

1. **Enable 2-Factor Authentication** on your Google account
2. **Create an App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Name it "Concert Tracker"
   - Copy the 16-character password

3. **Edit your `.env` file**:

```bash
nano .env
```

Update these lines:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
EMAIL_TO=your-email@gmail.com
```

## Step 3: Test Your Setup

```bash
npm run dev -- --test
```

You should see:

- ✅ Email service connection verified
- ✅ Bandsintown API working
- ✅ Songkick API working (if you added a key)

## Step 4: Check for Concerts Now

```bash
npm run dev -- --check-now
```

This will:

- Search for concerts from your favorite artists
- Filter by Ireland locations
- Show you what it found
- Send an email if new concerts are discovered

## Step 5: Run the Bot

```bash
npm start
```

The bot will:

- Check immediately
- Then check daily at 9:00 AM
- Send email notifications for new concerts
- Keep running until you stop it (Ctrl+C)

## Optional: Get Songkick API Key

For better results, add a Songkick API key:

1. Request a key: https://www.songkick.com/api_key_requests/new
2. Add to `.env`:

```env
SONGKICK_API_KEY=your-api-key-here
```

## Troubleshooting

### Email not working?

- Make sure you created an **App Password**, not your regular password
- Verify 2FA is enabled on your Google account
- Check EMAIL_USER and EMAIL_PASSWORD in `.env`

### No concerts found?

- This is normal! Not all artists have upcoming concerts
- The bot will keep checking daily
- You'll get notified when concerts are announced

### Want to add more artists?

Edit `config/artists.json` and add your favorite artists!

## Running in Background

To keep the bot running even after closing the terminal:

```bash
# Using nohup
nohup npm start > concert-tracker.log 2>&1 &

# Or using screen
screen -S concert-tracker
npm start
# Press Ctrl+A then D to detach
```

## Need Help?

Check the full README.md for detailed documentation!
