import axios from "axios";
import * as cheerio from "cheerio";
import { Concert } from "../database/schema";

export interface VenueConfig {
  name: string;
  url: string;
  city: string;
  country: string;
  selectors?: {
    eventList?: string;
    eventTitle?: string;
    eventDate?: string;
    eventLink?: string;
  };
}

export class WebScraper {
  private venues: VenueConfig[];

  constructor() {
    // Irish venues
    this.venues = [
      {
        name: "3Arena",
        url: "https://www.3arena.ie/events",
        city: "Dublin",
        country: "Ireland",
      },
      {
        name: "Olympia Theatre",
        url: "https://www.olympia.ie/events",
        city: "Dublin",
        country: "Ireland",
      },
      {
        name: "Vicar Street",
        url: "https://www.vicarstreet.ie/events",
        city: "Dublin",
        country: "Ireland",
      },
    ];
  }

  addVenue(venue: VenueConfig): void {
    this.venues.push(venue);
  }

  /**
   * Scrape a generic webpage for concert information
   */
  async scrapePage(
    url: string,
    artistNames: string[],
  ): Promise<
    Array<{
      artist: string;
      text: string;
      url: string;
    }>
  > {
    try {
      const response = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const results: Array<{
        artist: string;
        text: string;
        url: string;
      }> = [];

      // Get all text content
      const pageText = $("body").text().toLowerCase();

      // Check for artist mentions
      for (const artist of artistNames) {
        if (pageText.includes(artist.toLowerCase())) {
          // Try to find relevant sections
          const relevantSections: string[] = [];

          // Look for event listings, articles, etc.
          $(
            'article, .event, .show, .concert, [class*="event"], [class*="show"]',
          ).each((_, elem) => {
            const text = $(elem).text();
            if (text.toLowerCase().includes(artist.toLowerCase())) {
              relevantSections.push(text.substring(0, 500)); // Limit text length
            }
          });

          if (relevantSections.length > 0) {
            results.push({
              artist,
              text: relevantSections.join("\n\n"),
              url,
            });
          } else {
            // Fallback: get surrounding context
            const sentences = pageText.split(/[.!?]\s+/);
            const relevantSentences = sentences
              .filter((s) => s.includes(artist.toLowerCase()))
              .slice(0, 3);

            if (relevantSentences.length > 0) {
              results.push({
                artist,
                text: relevantSentences.join(". "),
                url,
              });
            }
          }
        }
      }

      return results;
    } catch (error: any) {
      console.error(`Error scraping ${url}:`, error.message);
      return [];
    }
  }

  /**
   * Scrape venue websites for upcoming events
   */
  async scrapeVenue(
    venue: VenueConfig,
    artistNames: string[],
  ): Promise<
    Array<{
      artist: string;
      venue: string;
      city: string;
      country: string;
      text: string;
      url: string;
    }>
  > {
    try {
      console.log(`  Scraping ${venue.name}...`);

      const response = await axios.get(venue.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const results: Array<{
        artist: string;
        venue: string;
        city: string;
        country: string;
        text: string;
        url: string;
      }> = [];

      // Generic event selectors
      const eventSelectors = [
        ".event",
        ".show",
        ".concert",
        '[class*="event"]',
        '[class*="show"]',
        "article",
        ".listing",
      ];

      for (const selector of eventSelectors) {
        $(selector).each((_, elem) => {
          const text = $(elem).text();
          const link = $(elem).find("a").first().attr("href") || venue.url;

          for (const artist of artistNames) {
            if (text.toLowerCase().includes(artist.toLowerCase())) {
              results.push({
                artist,
                venue: venue.name,
                city: venue.city,
                country: venue.country,
                text: text.substring(0, 500),
                url: link.startsWith("http")
                  ? link
                  : `${new URL(venue.url).origin}${link}`,
              });
            }
          }
        });
      }

      return results;
    } catch (error: any) {
      console.error(`Error scraping venue ${venue.name}:`, error.message);
      return [];
    }
  }

  /**
   * Scrape all configured venues
   */
  async scrapeAllVenues(artistNames: string[]): Promise<
    Array<{
      artist: string;
      venue: string;
      city: string;
      country: string;
      text: string;
      url: string;
    }>
  > {
    const allResults: Array<{
      artist: string;
      venue: string;
      city: string;
      country: string;
      text: string;
      url: string;
    }> = [];

    console.log(`\n🔍 Scraping ${this.venues.length} venue websites...`);

    for (const venue of this.venues) {
      const results = await this.scrapeVenue(venue, artistNames);
      allResults.push(...results);

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log(`✅ Found ${allResults.length} potential matches\n`);
    return allResults;
  }

  /**
   * Search Google for artist tour announcements
   */
  async searchGoogle(
    artistName: string,
    location: string = "Ireland",
  ): Promise<string[]> {
    try {
      const query = encodeURIComponent(`${artistName} tour ${location} 2026`);
      const url = `https://www.google.com/search?q=${query}`;

      const response = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const links: string[] = [];

      // Extract search result links
      $("a").each((_, elem) => {
        const href = $(elem).attr("href");
        if (href && href.includes("/url?q=")) {
          const url = href.split("/url?q=")[1]?.split("&")[0];
          if (url && !url.includes("google.com")) {
            try {
              links.push(decodeURIComponent(url));
            } catch (e) {
              // Skip invalid URLs
            }
          }
        }
      });

      return links.slice(0, 10); // Return top 10 results
    } catch (error: any) {
      console.error(`Error searching Google for ${artistName}:`, error.message);
      return [];
    }
  }
}

// Made with Bob
