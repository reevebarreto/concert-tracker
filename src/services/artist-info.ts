import axios from "axios";

export interface ArtistInfo {
  name: string;
  imageUrl?: string;
  websiteUrl?: string;
  musicBrainzUrl?: string;
  spotifyUrl?: string;
  youtubeUrl?: string;
}

export class ArtistInfoService {
  private cache: Map<string, ArtistInfo> = new Map();
  private readonly USER_AGENT =
    "ConcertTracker/1.0 (https://github.com/yourusername/concert-tracker)";

  /**
   * Get artist information including image and links
   */
  async getArtistInfo(artistName: string): Promise<ArtistInfo> {
    // Check cache first
    const cached = this.cache.get(artistName.toLowerCase());
    if (cached) {
      return cached;
    }

    const info: ArtistInfo = {
      name: artistName,
    };

    try {
      // Search MusicBrainz for artist
      const searchUrl = `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(artistName)}&fmt=json&limit=1`;

      const response = await axios.get(searchUrl, {
        headers: {
          "User-Agent": this.USER_AGENT,
        },
        timeout: 5000,
      });

      if (response.data.artists && response.data.artists.length > 0) {
        const artist = response.data.artists[0];
        const artistId = artist.id;

        // Get artist details including relationships (for URLs)
        const detailsUrl = `https://musicbrainz.org/ws/2/artist/${artistId}?inc=url-rels&fmt=json`;

        const detailsResponse = await axios.get(detailsUrl, {
          headers: {
            "User-Agent": this.USER_AGENT,
          },
          timeout: 5000,
        });

        const artistDetails = detailsResponse.data;

        // Extract URLs from relations
        if (artistDetails.relations) {
          for (const relation of artistDetails.relations) {
            if (relation.type === "official homepage" && relation.url) {
              info.websiteUrl = relation.url.resource;
            } else if (relation.type === "youtube" && relation.url) {
              info.youtubeUrl = relation.url.resource;
            } else if (relation.type === "spotify" && relation.url) {
              info.spotifyUrl = relation.url.resource;
            }
          }
        }

        info.musicBrainzUrl = `https://musicbrainz.org/artist/${artistId}`;

        // Try to get artist image from Cover Art Archive or Fanart.tv
        try {
          // First try: Get release groups and find cover art
          const releaseGroupUrl = `https://musicbrainz.org/ws/2/release-group?artist=${artistId}&fmt=json&limit=1`;
          const rgResponse = await axios.get(releaseGroupUrl, {
            headers: { "User-Agent": this.USER_AGENT },
            timeout: 5000,
          });

          if (
            rgResponse.data["release-groups"] &&
            rgResponse.data["release-groups"].length > 0
          ) {
            const releaseGroupId = rgResponse.data["release-groups"][0].id;

            // Try to get cover art
            try {
              const coverArtUrl = `https://coverartarchive.org/release-group/${releaseGroupId}`;
              const coverResponse = await axios.get(coverArtUrl, {
                timeout: 5000,
              });

              if (
                coverResponse.data.images &&
                coverResponse.data.images.length > 0
              ) {
                // Use the first image (usually the front cover)
                info.imageUrl =
                  coverResponse.data.images[0].thumbnails?.large ||
                  coverResponse.data.images[0].image;
              }
            } catch (coverError) {
              // Cover art not available, that's okay
            }
          }
        } catch (imageError) {
          // Image fetch failed, continue without image
        }
      }

      // If no YouTube URL found, create a search URL
      if (!info.youtubeUrl) {
        info.youtubeUrl = `https://music.youtube.com/search?q=${encodeURIComponent(artistName)}`;
      }

      // Cache the result
      this.cache.set(artistName.toLowerCase(), info);

      // Add small delay to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error fetching info for ${artistName}:`, error);
      // Return basic info even if API fails
      info.youtubeUrl = `https://music.youtube.com/search?q=${encodeURIComponent(artistName)}`;
    }

    return info;
  }

  /**
   * Get artist info for multiple artists
   */
  async getMultipleArtistInfo(
    artistNames: string[],
  ): Promise<Map<string, ArtistInfo>> {
    const results = new Map<string, ArtistInfo>();

    for (const name of artistNames) {
      const info = await this.getArtistInfo(name);
      results.set(name, info);
    }

    return results;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Made with Bob
