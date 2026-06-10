import axios from "axios";
import { Concert } from "../database/schema";

export interface SongkickEvent {
  id: number;
  displayName: string;
  type: string;
  uri: string;
  status: string;
  start: {
    date: string;
    datetime?: string;
  };
  performance: Array<{
    artist: {
      displayName: string;
    };
    billing: string;
  }>;
  venue: {
    displayName: string;
    metroArea: {
      displayName: string;
      country: {
        displayName: string;
      };
    };
  };
}

export class SongkickCollector {
  private apiKey: string;
  private baseUrl = "https://api.songkick.com/api/3.0";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchArtist(artistName: string): Promise<number | null> {
    try {
      const url = `${this.baseUrl}/search/artists.json`;
      const response = await axios.get(url, {
        params: {
          apikey: this.apiKey,
          query: artistName,
        },
      });

      const artists = response.data?.resultsPage?.results?.artist;
      if (!artists || artists.length === 0) {
        console.log(`Artist "${artistName}" not found on Songkick`);
        return null;
      }

      // Return the first match (usually the most relevant)
      return artists[0].id;
    } catch (error: any) {
      console.error(`Error searching for artist ${artistName}:`, error.message);
      return null;
    }
  }

  async getArtistEvents(
    artistId: number,
    artistName: string,
  ): Promise<Concert[]> {
    try {
      const url = `${this.baseUrl}/artists/${artistId}/calendar.json`;
      const response = await axios.get(url, {
        params: {
          apikey: this.apiKey,
        },
      });

      const events = response.data?.resultsPage?.results?.event;
      if (!events || events.length === 0) {
        console.log(`No upcoming events found for ${artistName} on Songkick`);
        return [];
      }

      const concerts: Concert[] = events.map((event: SongkickEvent) => ({
        artistName: artistName,
        venueName: event.venue.displayName,
        venueCity: event.venue.metroArea.displayName,
        venueCountry: event.venue.metroArea.country.displayName,
        eventDate: event.start.date,
        eventUrl: event.uri,
        ticketUrl: undefined,
        source: "songkick",
        sourceId: `songkick-${event.id}`,
        announcedDate: new Date().toISOString().split("T")[0],
        notified: 0,
      }));

      return concerts;
    } catch (error: any) {
      console.error(
        `Error fetching Songkick events for artist ID ${artistId}:`,
        error.message,
      );
      return [];
    }
  }

  async getEventsForMultipleArtists(
    artists: Array<{ name: string; songkickId?: number | null }>,
  ): Promise<Concert[]> {
    const allConcerts: Concert[] = [];

    for (const artist of artists) {
      console.log(`Checking Songkick for ${artist.name}...`);

      let artistId = artist.songkickId;

      // If we don't have the Songkick ID, search for it
      if (!artistId) {
        artistId = await this.searchArtist(artist.name);
        if (!artistId) {
          continue;
        }
      }

      const concerts = await this.getArtistEvents(artistId, artist.name);
      allConcerts.push(...concerts);

      // Rate limiting - wait 1 second between requests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return allConcerts;
  }

  async getEventsByLocation(location: string): Promise<Concert[]> {
    try {
      const url = `${this.baseUrl}/metro_areas/${location}/calendar.json`;
      const response = await axios.get(url, {
        params: {
          apikey: this.apiKey,
        },
      });

      const events = response.data?.resultsPage?.results?.event;
      if (!events || events.length === 0) {
        return [];
      }

      const concerts: Concert[] = events.map((event: SongkickEvent) => {
        const headliner = event.performance.find(
          (p) => p.billing === "headline",
        );
        const artistName =
          headliner?.artist.displayName ||
          event.performance[0]?.artist.displayName;

        return {
          artistName: artistName,
          venueName: event.venue.displayName,
          venueCity: event.venue.metroArea.displayName,
          venueCountry: event.venue.metroArea.country.displayName,
          eventDate: event.start.date,
          eventUrl: event.uri,
          ticketUrl: undefined,
          source: "songkick",
          sourceId: `songkick-${event.id}`,
          announcedDate: new Date().toISOString().split("T")[0],
          notified: 0,
        };
      });

      return concerts;
    } catch (error: any) {
      console.error(
        `Error fetching Songkick events for location ${location}:`,
        error.message,
      );
      return [];
    }
  }
}

// Made with Bob
