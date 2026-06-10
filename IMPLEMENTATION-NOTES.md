# Implementation Notes - Web Scraping Approach

## Why Web Scraping?

**Problem**: Bandsintown and Songkick APIs are no longer freely available:

- Bandsintown API is only for artists/venues, not for fans
- Songkick has stopped approving new API applications

**Solution**: Use web scraping and RSS feeds to gather concert information from public sources.

## Data Sources Implemented

### 1. RSS Feeds (Primary Source)

**File**: `src/collectors/rss-feeds.ts`

**Sources**:

- NME (https://www.nme.com/feed)
- Pitchfork (https://pitchfork.com/rss/news/)
- Stereogum (https://www.stereogum.com/feed/)
- Consequence (https://consequenceofsound.net/feed/)
- Brooklyn Vegan (https://www.brooklynvegan.com/feed/)

**How it works**:

1. Parses RSS feeds using `rss-parser`
2. Searches for articles mentioning your artists
3. Filters for concert-related keywords
4. Returns relevant articles with metadata

**Advantages**:

- ✅ Reliable and structured
- ✅ Real-time updates
- ✅ No rate limiting issues
- ✅ Easy to add more feeds

### 2. Venue Website Scraping (Secondary Source)

**File**: `src/collectors/web-scraper.ts`

**Venues**:

- 3Arena (Dublin)
- Olympia Theatre (Dublin)
- Vicar Street (Dublin)

**How it works**:

1. Uses `axios` + `cheerio` to scrape HTML
2. Searches event listings for artist names
3. Extracts event details and links

**Advantages**:

- ✅ Direct from source
- ✅ Accurate event information
- ✅ Can add any venue

**Challenges**:

- ⚠️ Websites may change structure
- ⚠️ Requires maintenance
- ⚠️ Slower than APIs

### 3. Google Search (Optional)

**File**: `src/collectors/web-scraper.ts` (searchGoogle method)

**How it works**:

1. Searches Google for "[Artist] tour Ireland 2026"
2. Extracts top result URLs
3. Scrapes those pages for concert info

**Advantages**:

- ✅ Comprehensive coverage
- ✅ Finds announcements anywhere

**Challenges**:

- ⚠️ Google may block automated searches
- ⚠️ Requires careful rate limiting
- ⚠️ Disabled by default

## NLP Processing

**File**: `src/processors/nlp.ts`

**Purpose**: Determine if scraped content is actually a concert announcement

**How it works**:

1. Analyzes text for announcement phrases
2. Looks for dates and locations
3. Checks for venue-related keywords
4. Calculates confidence score (0-1)

**Confidence Threshold**: 0.4 (40%)

- Below 40%: Ignored
- Above 40%: Considered a real announcement

## Architecture

```
User Request
    ↓
Main App (index-v2.ts)
    ↓
    ├─→ RSS Feed Collector → Parse feeds → Filter by artists
    ├─→ Web Scraper → Scrape venues → Find artist matches
    └─→ Google Search (optional) → Search → Scrape results
    ↓
NLP Processor → Analyze content → Calculate confidence
    ↓
Database → Store new announcements
    ↓
Email Notifier → Send notification
```

## Files Created/Modified

### New Files (Web Scraping):

- `src/collectors/rss-feeds.ts` - RSS feed parser
- `src/collectors/web-scraper.ts` - Web scraping utilities
- `src/index-v2.ts` - Updated main application
- `README-WEBSCRAPING.md` - Documentation for web scraping approach
- `IMPLEMENTATION-NOTES.md` - This file

### Original Files (API-based):

- `src/collectors/bandsintown.ts` - ❌ No longer usable
- `src/collectors/songkick.ts` - ❌ No longer usable
- `src/index.ts` - ❌ Original API-based version

### Shared Files (Still Used):

- `src/database/schema.ts` - ✅ Database structure
- `src/notifiers/email.ts` - ✅ Email notifications
- `src/processors/nlp.ts` - ✅ NLP analysis (updated)
- `config/artists.json` - ✅ Artist configuration
- `config/settings.json` - ✅ Bot settings

## Dependencies Added

```json
{
  "cheerio": "^1.0.0-rc.12", // HTML parsing
  "rss-parser": "^3.13.0", // RSS feed parsing
  "puppeteer": "^21.6.0" // Browser automation (optional)
}
```

## Usage

### Using Web Scraping Version:

```bash
# Test setup
npm run dev -- --test

# Check now (web scraping)
ts-node src/index-v2.ts --check-now

# Run continuously
ts-node src/index-v2.ts
```

### Using Original API Version (won't work):

```bash
npm run dev -- --check-now  # Uses index.ts (APIs)
```

## Performance Comparison

| Method        | Speed              | Reliability | Coverage     | Cost                |
| ------------- | ------------------ | ----------- | ------------ | ------------------- |
| APIs (old)    | ⚡ Fast (5-10s)    | ✅ High     | ✅ Excellent | 💰 Paid/Unavailable |
| RSS Feeds     | 🐢 Medium (10-30s) | ✅ High     | ⚠️ Good      | ✅ Free             |
| Web Scraping  | 🐌 Slow (10-20s)   | ⚠️ Medium   | ⚠️ Good      | ✅ Free             |
| Google Search | 🐌 Slow (30-60s)   | ⚠️ Low      | ✅ Excellent | ⚠️ May be blocked   |

## Recommendations

### For Best Results:

1. **Use RSS feeds as primary source** - Most reliable
2. **Add venue scraping for local events** - Direct from source
3. **Avoid Google search** - Too risky for automation
4. **Run once daily** - Respectful and sufficient
5. **Monitor logs** - Watch for errors or blocks

### To Improve:

1. Add more RSS feeds (artist-specific, local blogs)
2. Add more Irish venues (Cork, Galway, Belfast)
3. Implement Puppeteer for JavaScript-heavy sites
4. Add social media monitoring (Twitter API v2)
5. Create a web dashboard for results

## Limitations & Risks

### Technical Limitations:

- Slower than APIs
- Less structured data
- Requires NLP to interpret
- May miss some announcements

### Legal/Ethical Risks:

- Web scraping legality varies
- May violate Terms of Service
- Could be blocked by websites
- Should only be for personal use

### Mitigation:

- Respect robots.txt
- Use delays between requests
- Don't overwhelm servers
- Only for personal, non-commercial use

## Future Alternatives

If web scraping becomes problematic:

1. **Spotify API** - Has concert data for some artists
2. **Setlist.fm API** - Concert setlists and dates
3. **MusicBrainz API** - Open music database
4. **Last.fm API** - Event data (limited)
5. **Manual RSS feeds** - Artist/venue specific
6. **Email newsletters** - Parse concert announcement emails
7. **Social media APIs** - Twitter, Instagram (requires auth)

## Conclusion

The web scraping approach is a viable alternative to unavailable APIs, but requires:

- More maintenance
- Careful rate limiting
- Regular monitoring
- Ethical usage

It's best suited for personal use with daily checks rather than real-time monitoring.
