# Import Artists from YouTube Music CSV Export

This guide shows you how to import your artists from a YouTube Music CSV export (from Google Takeout).

## Quick Start

### Step 1: Get Your YouTube Music Data

1. Go to [Google Takeout](https://takeout.google.com/)
2. Deselect all, then select only **"YouTube and YouTube Music"**
3. Click "All YouTube data included" and deselect everything except **"music-library-songs"**
4. Click "Next step" and "Create export"
5. Wait for the export email (can take a few hours)
6. Download and extract the ZIP file

### Step 2: Find Your CSV File

The CSV file will be located at:

```
Takeout/YouTube and YouTube Music/music-library-songs/music library songs.csv
```

### Step 3: Import Artists

Copy the CSV file to your concert-tracker directory, then run:

```bash
npm run import-csv "music library songs.csv"
```

Or specify the full path:

```bash
npm run import-csv "/path/to/music library songs.csv"
```

### Step 4: Verify Import

Check your artists were imported:

```bash
cat config/artists.json
```

You should see all your artists listed.

## What Gets Imported

The script:

- ✅ Reads all songs from the CSV
- ✅ Extracts unique artist names (handles up to 5 artists per song)
- ✅ Removes duplicates
- ✅ Sorts alphabetically
- ✅ Updates `config/artists.json` automatically

## Example Output

```
📂 Reading CSV file: music library songs.csv

🎵 Found 188 unique artists

📋 First 20 artists:
   - Arctic Monkeys
   - The Strokes
   - Radiohead
   - Coldplay
   ... and 168 more

✅ Updated config/artists.json with 188 artists

✅ Done! Your artists have been imported.
```

## Re-importing

To update your artist list with a new export:

1. Get a fresh export from Google Takeout
2. Run the import command again
3. It will replace your existing artist list

**Note:** This will overwrite your current `config/artists.json`. If you've made manual edits, back it up first!

## CSV Format

The script expects a CSV with these columns:

```
Video ID, Song Title, Album Title, Artist Name 1, Artist Name 2, Artist Name 3, Artist Name 4, Artist Name 5
```

This is the standard format from YouTube Music exports via Google Takeout.

## Troubleshooting

### "CSV file not found"

Make sure:

- The file path is correct
- The filename is exactly `music library songs.csv` (with spaces)
- You're running the command from the concert-tracker directory

### "No artists found"

- Verify the CSV file has data (not just headers)
- Check the CSV format matches the expected structure
- Try opening the CSV in a text editor to verify it's not corrupted

### Special Characters

The script handles:

- ✅ Artists with special characters ($, &, etc.)
- ✅ Artists with accented characters (é, ñ, etc.)
- ✅ Quoted fields in CSV
- ✅ Multiple artists per song

## Next Steps

After importing:

1. **Test your setup:**

   ```bash
   npm run test
   ```

2. **Check for concerts:**

   ```bash
   npm run check
   ```

3. **Start the scheduler:**
   ```bash
   npm start
   ```

## Alternative: Manual Artist List

If you prefer to manually manage your artists, you can edit `config/artists.json` directly:

```json
{
  "artists": [
    {
      "name": "Arctic Monkeys",
      "songkickId": null,
      "bandsintownId": "Arctic Monkeys"
    }
  ],
  "locations": [
    {
      "country": "Ireland",
      "cities": ["Dublin", "Cork", "Galway", "Belfast"]
    }
  ]
}
```

## Benefits of CSV Import

- 🚀 **Fast:** Import hundreds of artists in seconds
- 🎯 **Accurate:** Uses your actual listening history
- 🔄 **Easy to update:** Re-run whenever you want to refresh
- 📊 **Comprehensive:** Captures all artists from your library
- 🔒 **Private:** All processing happens locally on your computer

## Privacy

- ✅ CSV file stays on your computer
- ✅ No data sent to external servers
- ✅ No authentication required
- ✅ Works completely offline

---

**Happy concert tracking! 🎸**
