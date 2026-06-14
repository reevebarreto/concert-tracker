import fs from "fs";
import path from "path";

interface ArtistConfig {
  name: string;
  songkickId?: number | null;
  bandsintownId?: string;
}

interface Config {
  artists: ArtistConfig[];
  locations: Array<{ country: string; cities: string[] }>;
}

/**
 * Parse CSV and extract unique artists
 */
function parseCSV(csvPath: string): string[] {
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split("\n");

  // Skip header row
  const dataLines = lines.slice(1);

  const artistsSet = new Set<string>();

  for (const line of dataLines) {
    if (!line.trim()) continue;

    // Simple CSV parser that handles quoted fields
    const fields: string[] = [];
    let currentField = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        fields.push(currentField.trim());
        currentField = "";
      } else {
        currentField += char;
      }
    }
    fields.push(currentField.trim()); // Add last field

    // Artist columns are at indices 3, 4, 5, 6, 7
    // (Video ID, Song Title, Album Title, Artist Name 1, Artist Name 2, ...)
    for (let i = 3; i <= 7; i++) {
      const artist = fields[i]?.trim();
      if (artist && artist !== "" && artist !== '""') {
        // Remove surrounding quotes if present
        const cleanArtist = artist.replace(/^"(.*)"$/, "$1");
        artistsSet.add(cleanArtist);
      }
    }
  }

  return Array.from(artistsSet).sort();
}

/**
 * Update artists.json with the extracted artists
 */
function updateArtistsConfig(artists: string[]): void {
  const configPath = path.join(process.cwd(), "config", "artists.json");

  // Read existing config or create new one
  let config: Config;
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } else {
    config = {
      artists: [],
      locations: [
        {
          country: "Ireland",
          cities: ["Dublin", "Cork", "Galway", "Belfast"],
        },
      ],
    };
  }

  // Create artist objects
  config.artists = artists.map((artist) => ({
    name: artist,
  }));

  // Write back to file
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  console.log(`✅ Updated config/artists.json with ${artists.length} artists`);
}

/**
 * Main function
 */
function main() {
  const csvPath = process.argv[2] || "music library songs.csv";

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`);
    console.log("\nUsage:");
    console.log('  npm run import-csv "path/to/music library songs.csv"');
    console.log("\nOr place the CSV in the project root and run:");
    console.log("  npm run import-csv");
    process.exit(1);
  }

  console.log(`📂 Reading CSV file: ${csvPath}`);

  const artists = parseCSV(csvPath);

  console.log(`\n🎵 Found ${artists.length} unique artists`);

  if (artists.length === 0) {
    console.error("❌ No artists found in CSV");
    process.exit(1);
  }

  // Show first 20 artists
  console.log("\n📋 First 20 artists:");
  artists.slice(0, 20).forEach((artist) => {
    console.log(`   - ${artist}`);
  });

  if (artists.length > 20) {
    console.log(`   ... and ${artists.length - 20} more`);
  }

  // Update config
  updateArtistsConfig(artists);

  console.log("\n✅ Done! Your artists have been imported.");
  console.log("\nNext steps:");
  console.log("  1. Review config/artists.json");
  console.log("  2. Run: npm run check");
}

main();

// Made with Bob
