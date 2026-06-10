import Parser from "rss-parser";
import { Concert } from "../database/schema";

export interface RSSFeed {
  url: string;
  name: string;
  type: "music-news" | "venue" | "artist";
}

export class RSSFeedCollector {
  private parser: Parser;
  private feeds: RSSFeed[];

  constructor() {
    this.parser = new Parser({
      customFields: {
        item: ["description", "content", "content:encoded"],
      },
    });

    // Default music news RSS feeds
    this.feeds = [
      { url: "https://www.nme.com/feed", name: "NME", type: "music-news" },
      {
        url: "https://pitchfork.com/rss/news/",
        name: "Pitchfork",
        type: "music-news",
      },
      {
        url: "https://www.stereogum.com/feed/",
        name: "Stereogum",
        type: "music-news",
      },
      {
        url: "https://consequenceofsound.net/feed/",
        name: "Consequence",
        type: "music-news",
      },
      {
        url: "https://www.brooklynvegan.com/feed/",
        name: "Brooklyn Vegan",
        type: "music-news",
      },
    ];
  }

  addFeed(feed: RSSFeed): void {
    this.feeds.push(feed);
  }

  async checkFeed(
    feedUrl: string,
    artistNames: string[],
  ): Promise<
    Array<{
      title: string;
      link: string;
      pubDate: string;
      content: string;
      matchedArtists: string[];
    }>
  > {
    try {
      const feed = await this.parser.parseURL(feedUrl);
      const results: Array<{
        title: string;
        link: string;
        pubDate: string;
        content: string;
        matchedArtists: string[];
      }> = [];

      for (const item of feed.items) {
        const title = item.title?.toLowerCase() || "";
        const content = (
          item.content ||
          item["content:encoded"] ||
          item.description ||
          ""
        ).toLowerCase();
        const fullText = `${title} ${content}`;

        // Check if any artist is mentioned
        const matchedArtists = artistNames.filter((artist) =>
          fullText.includes(artist.toLowerCase()),
        );

        if (matchedArtists.length > 0) {
          // Check for concert-related keywords
          const concertKeywords = [
            "tour",
            "concert",
            "show",
            "live",
            "performing",
            "tickets",
            "announced",
            "dates",
            "venue",
            "festival",
            "gig",
          ];

          const hasConcertKeyword = concertKeywords.some((keyword) =>
            fullText.includes(keyword),
          );

          if (hasConcertKeyword) {
            results.push({
              title: item.title || "",
              link: item.link || "",
              pubDate: item.pubDate || new Date().toISOString(),
              content:
                item.content ||
                item["content:encoded"] ||
                item.description ||
                "",
              matchedArtists,
            });
          }
        }
      }

      return results;
    } catch (error: any) {
      console.error(`Error parsing RSS feed ${feedUrl}:`, error.message);
      return [];
    }
  }

  async checkAllFeeds(artistNames: string[]): Promise<
    Array<{
      title: string;
      link: string;
      pubDate: string;
      content: string;
      matchedArtists: string[];
      source: string;
    }>
  > {
    const allResults: Array<{
      title: string;
      link: string;
      pubDate: string;
      content: string;
      matchedArtists: string[];
      source: string;
    }> = [];

    console.log(`\n🔍 Checking ${this.feeds.length} RSS feeds...`);

    for (const feed of this.feeds) {
      console.log(`  Checking ${feed.name}...`);
      const results = await this.checkFeed(feed.url, artistNames);

      for (const result of results) {
        allResults.push({
          ...result,
          source: feed.name,
        });
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(`✅ Found ${allResults.length} relevant articles\n`);
    return allResults;
  }

  /**
   * Extract potential concert information from article content
   */
  extractConcertInfo(
    content: string,
    artistName: string,
  ): Array<{
    artist: string;
    venue?: string;
    city?: string;
    date?: string;
  }> {
    const results: Array<{
      artist: string;
      venue?: string;
      city?: string;
      date?: string;
    }> = [];

    // Simple extraction - look for patterns like "at [venue] in [city]"
    const venuePattern = /at\s+([A-Z][A-Za-z\s&]+?)(?:\s+in\s+([A-Z][a-z]+))/gi;
    const matches = content.matchAll(venuePattern);

    for (const match of matches) {
      results.push({
        artist: artistName,
        venue: match[1]?.trim(),
        city: match[2]?.trim(),
      });
    }

    return results;
  }
}

// Made with Bob
