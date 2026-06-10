import axios from "axios";
import { Concert } from "../database/schema";

export interface BandsintownEvent {
  id: string;
  artist_id: string;
  url: string;
  datetime: string;
  venue: {
    name: string;
    city: string;
    country: string;
    latitude: string;
    longitude: string;
  };
  offers: Array<{
    type: string;
    url: string;
    status: string;
  }>;
  lineup: string[];
}

export class BandsintownCollector {
  private appId: string;
  private baseUrl = "https://rest.bandsintown.com";

  constructor(appId: string) {
    this.appId = appId;
  }

  async getArtistEvents(
    artistName: string,
    location?: string,
  ): Promise<Concert[]> {
    try {
      const encodedArtist = encodeURIComponent(artistName);
      const url = `${this.baseUrl}/artists/${encodedArtist}/events`;

      const params: any = {
        app_id: this.appId,
        date: "upcoming",
      };

      const response = await axios.get<BandsintownEvent[]>(url, { params });

      if (!response.data || response.data.length === 0) {
        console.log(
          `No upcoming events found for ${artistName} on Bandsintown`,
        );
        return [];
      }

      const concerts: Concert[] = response.data.map((event) => {
        const ticketOffer = event.offers?.find(
          (offer) => offer.type === "Tickets",
        );

        return {
          artistName: artistName,
          venueName: event.venue.name,
          venueCity: event.venue.city,
          venueCountry: event.venue.country,
          eventDate: event.datetime.split("T")[0],
          eventUrl: event.url,
          ticketUrl: ticketOffer?.url,
          source: "bandsintown",
          sourceId: `bandsintown-${event.id}`,
          announcedDate: new Date().toISOString().split("T")[0],
          notified: 0,
        };
      });

      // Filter by location if specified
      if (location) {
        const locationLower = location.toLowerCase();
        return concerts.filter(
          (concert) =>
            concert.venueCity.toLowerCase().includes(locationLower) ||
            concert.venueCountry.toLowerCase().includes(locationLower),
        );
      }

      return concerts;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`Artist "${artistName}" not found on Bandsintown`);
        return [];
      }
      console.error(
        `Error fetching Bandsintown events for ${artistName}:`,
        error.message,
      );
      return [];
    }
  }

  async getEventsForMultipleArtists(
    artists: string[],
    locations?: string[],
  ): Promise<Concert[]> {
    const allConcerts: Concert[] = [];

    for (const artist of artists) {
      console.log(`Checking Bandsintown for ${artist}...`);

      if (locations && locations.length > 0) {
        for (const location of locations) {
          const concerts = await this.getArtistEvents(artist, location);
          allConcerts.push(...concerts);
        }
      } else {
        const concerts = await this.getArtistEvents(artist);
        allConcerts.push(...concerts);
      }

      // Rate limiting - wait 1 second between requests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return allConcerts;
  }
}

// Made with Bob
