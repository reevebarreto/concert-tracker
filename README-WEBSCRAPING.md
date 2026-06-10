# 🎵 Concert Tracker Bot - Web Scraping Edition

An automated bot that monitors concert announcements using **web scraping and RSS feeds** (no API keys required!).

## 🚨 Important Update

**Bandsintown and Songkick APIs are no longer freely available**, so this version uses:

- ✅ **RSS feeds** from music news sites (NME, Pitchfork, Stereogum, etc.)
- ✅ **Web scraping** of venue websites (3Arena, Olympia Theatre, Vicar Street, etc.)
- ✅ **Google search** (optional) for tour announcements
- ✅ **Natural Language Processing** to detect real concert announcements

## How It Works

### 1. RSS Feed Monitoring

The bot checks RSS feeds from major music news sites:

- NME
- Pitchfork
- Stereogum
- Consequence
- Brooklyn Vegan

It looks for articles mentioning your favorite artists AND concert-related keywords (tour, tickets, announced, etc.).

### 2. Venue Website Scraping

The bot scrapes Irish venue websites:

- 3Arena (Dublin)
- Olympia Theatre (Dublin)
- Vicar Street (Dublin)

It searches for your artists in their event listings.

### 3. NLP Analysis

Each potential announcement is analyzed using Natural Language Processing to determine:

- Is it really a concert announcement?
- Confidence level (0-100%)
- Relevant details (dates, locations, venues)

### 4. Smart Notifications

You only get notified when:

- A NEW announcement is found (no duplicates)
- The confidence level is high enough
- It matches your location preferences

## Installation

```bash
cd /Users/reeve/p/concert-tracker
npm install
```

## Configuration

### 1. Setup Email (Required)

```bash
cp .env.example .env
nano .env
```

Add your Gmail credentials (see QUICKSTART.md for details).

### 2. Configure Artists

Edit `config/artists.json` to add/remove artists.

### 3. Optional: Enable Google Search

Add to `.env`:

```env
ENABLE_GOOGLE_SEARCH=true
```

⚠️ **Warning**: Google may block automated searches. Use sparingly!

## Usage

### Test Setup

```bash
npm run dev -- --test
```

### Check for Concerts Now

```bash
npm run dev -- --check-now
```

### Run the Bot

```bash
npm start
```

## Advantages of Web Scraping Approach

✅ **No API keys required** - completely free
✅ **Multiple sources** - more comprehensive coverage
✅ **Real-time** - catches announcements as they're published
✅ **Flexible** - easy to add new sources

## Limitations

⚠️ **Slower** - web scraping takes more time than APIs
⚠️ **Less structured** - requires NLP to extract information
⚠️ **Fragile** - websites may change their structure
⚠️ **Rate limiting** - must be respectful of websites

## Adding New Sources

### Add an RSS Feed

Edit `src/collectors/rss-feeds.ts`:

```typescript
this.feeds.push({
  url: "https://example.com/feed",
  name: "Example Site",
  type: "music-news",
});
```

### Add a Venue

Edit `src/collectors/web-scraper.ts`:

```typescript
this.venues.push({
  name: "New Venue",
  url: "https://newvenue.com/events",
  city: "Cork",
  country: "Ireland",
});
```

## Best Practices

1. **Run daily** - Don't check too frequently to avoid being blocked
2. **Respect robots.txt** - The bot includes delays between requests
3. **Monitor logs** - Check for errors or blocked requests
4. **Update selectors** - Websites change; you may need to update scraping logic

## Troubleshooting

### No results found?

- Check that RSS feeds are still active
- Verify venue websites haven't changed structure
- Try enabling Google search (with caution)

### Getting blocked?

- Increase delays between requests
- Disable Google search
- Use a VPN or proxy (advanced)

### False positives?

- Adjust confidence threshold in code
- Add more exclusion keywords in `config/settings.json`

## Alternative Data Sources

If current sources aren't working well, consider:

1. **Artist Official Websites** - Many have RSS feeds
2. **Ticketing Sites** - Ticketmaster, See Tickets, etc.
3. **Social Media** - Twitter/X, Instagram (requires authentication)
4. **Reddit** - r/concerts, artist subreddits
5. **Local Event Calendars** - City tourism websites

## Legal & Ethical Considerations

- ✅ This bot is for **personal use only**
- ✅ Respects rate limits and robots.txt
- ✅ Does not bypass paywalls or authentication
- ⚠️ Web scraping legality varies by jurisdiction
- ⚠️ Always check a website's Terms of Service

## Performance

Expected check time:

- RSS feeds: ~10-30 seconds
- Venue scraping: ~10-20 seconds
- Google search (if enabled): ~30-60 seconds

Total: **~1-2 minutes per check**

## Future Improvements

Potential enhancements:

- [ ] Puppeteer for JavaScript-heavy sites
- [ ] Proxy rotation for better reliability
- [ ] Machine learning for better announcement detection
- [ ] Integration with Spotify/Apple Music APIs
- [ ] Discord/Slack notifications
- [ ] Mobile app notifications

## Support

For issues:

1. Check logs for error messages
2. Verify websites are still accessible
3. Test individual components with `--test` flag
4. Review NLP confidence scores

## License

MIT - Use at your own risk

---

**Remember**: This is a personal tool. Be respectful of websites and their resources!
