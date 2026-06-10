import nlp from "compromise";
import { Concert } from "../database/schema";

export interface FilterSettings {
  interestingKeywords: string[];
  excludeKeywords: string[];
  locations: string[];
}

export class ConcertProcessor {
  private settings: FilterSettings;

  constructor(settings: FilterSettings) {
    this.settings = settings;
  }

  /**
   * Filter concerts based on location preferences
   */
  filterByLocation(concerts: Concert[]): Concert[] {
    if (this.settings.locations.length === 0) {
      return concerts;
    }

    return concerts.filter((concert) => {
      const locationText =
        `${concert.venueCity} ${concert.venueCountry}`.toLowerCase();
      return this.settings.locations.some((location) =>
        locationText.includes(location.toLowerCase()),
      );
    });
  }

  /**
   * Check if concert description contains interesting keywords
   */
  isInteresting(concert: Concert, description?: string): boolean {
    if (!description) {
      // If no description, consider all concerts interesting
      return true;
    }

    const text = description.toLowerCase();

    // First check for exclusion keywords
    for (const keyword of this.settings.excludeKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        console.log(`Excluding concert: contains "${keyword}"`);
        return false;
      }
    }

    // Then check for interesting keywords
    for (const keyword of this.settings.interestingKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        return true;
      }
    }

    // If no interesting keywords found but also no exclusions, still consider it
    return true;
  }

  /**
   * Analyze text to detect concert announcements
   */
  detectAnnouncement(text: string): {
    isAnnouncement: boolean;
    confidence: number;
    details: string[];
  } {
    const doc = nlp(text);
    const details: string[] = [];
    let confidence = 0;

    // Check for announcement phrases
    const announcementPhrases = [
      "just announced",
      "announcing",
      "coming to",
      "tour dates",
      "on sale",
      "tickets available",
      "presale",
      "live in",
      "performing at",
      "concert at",
    ];

    for (const phrase of announcementPhrases) {
      if (text.toLowerCase().includes(phrase)) {
        confidence += 0.2;
        details.push(`Found phrase: "${phrase}"`);
      }
    }

    // Check for dates - using simple regex since compromise dates() may not be available
    const datePattern =
      /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b/gi;
    const dateMatches = text.match(datePattern);
    if (dateMatches && dateMatches.length > 0) {
      confidence += 0.3;
      details.push(`Found ${dateMatches.length} date(s)`);
    }

    // Check for places - using simple text matching
    const placeKeywords = [
      "dublin",
      "cork",
      "galway",
      "belfast",
      "london",
      "manchester",
      "ireland",
      "uk",
    ];
    const foundPlaces = placeKeywords.filter((place) =>
      text.toLowerCase().includes(place),
    );
    if (foundPlaces.length > 0) {
      confidence += 0.2;
      details.push(`Found location(s): ${foundPlaces.join(", ")}`);
    }

    // Check for venue-related words
    const venueWords = [
      "venue",
      "arena",
      "stadium",
      "hall",
      "theater",
      "theatre",
      "club",
    ];
    for (const word of venueWords) {
      if (text.toLowerCase().includes(word)) {
        confidence += 0.1;
        details.push(`Found venue keyword: "${word}"`);
        break;
      }
    }

    const isAnnouncement = confidence >= 0.4;

    return {
      isAnnouncement,
      confidence: Math.min(confidence, 1.0),
      details,
    };
  }

  /**
   * Sort concerts by relevance (date, location match, etc.)
   */
  sortByRelevance(concerts: Concert[]): Concert[] {
    return concerts.sort((a, b) => {
      // First, sort by date (sooner concerts first)
      const dateA = new Date(a.eventDate).getTime();
      const dateB = new Date(b.eventDate).getTime();

      if (dateA !== dateB) {
        return dateA - dateB;
      }

      // Then by location preference
      const aLocationMatch = this.settings.locations.some((loc) =>
        `${a.venueCity} ${a.venueCountry}`
          .toLowerCase()
          .includes(loc.toLowerCase()),
      );
      const bLocationMatch = this.settings.locations.some((loc) =>
        `${b.venueCity} ${b.venueCountry}`
          .toLowerCase()
          .includes(loc.toLowerCase()),
      );

      if (aLocationMatch && !bLocationMatch) return -1;
      if (!aLocationMatch && bLocationMatch) return 1;

      return 0;
    });
  }

  /**
   * Get a summary of concerts grouped by artist
   */
  getSummary(concerts: Concert[]): string {
    const grouped = concerts.reduce(
      (acc, concert) => {
        if (!acc[concert.artistName]) {
          acc[concert.artistName] = [];
        }
        acc[concert.artistName].push(concert);
        return acc;
      },
      {} as Record<string, Concert[]>,
    );

    let summary = `Found ${concerts.length} concert(s) for ${Object.keys(grouped).length} artist(s):\n\n`;

    for (const [artist, artistConcerts] of Object.entries(grouped)) {
      summary += `${artist}: ${artistConcerts.length} concert(s)\n`;
      for (const concert of artistConcerts) {
        summary += `  - ${concert.eventDate} in ${concert.venueCity}, ${concert.venueCountry}\n`;
      }
    }

    return summary;
  }

  /**
   * Check if concert is within acceptable date range
   */
  isWithinDateRange(
    concert: Concert,
    minDaysNotice: number = 7,
    maxDaysAhead: number = 365,
  ): boolean {
    const now = new Date();
    const eventDate = new Date(concert.eventDate);
    const daysUntilEvent = Math.floor(
      (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    return daysUntilEvent >= minDaysNotice && daysUntilEvent <= maxDaysAhead;
  }
}

// Made with Bob
