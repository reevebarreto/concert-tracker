import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

export interface Concert {
  id?: number;
  artistName: string;
  venueName: string;
  venueCity: string;
  venueCountry: string;
  eventDate: string;
  eventUrl: string;
  ticketUrl?: string;
  source: string;
  sourceId: string;
  announcedDate: string;
  notified: number;
  createdAt?: string;
}

export class ConcertDatabase {
  private db: Database.Database;

  constructor(dbPath: string) {
    // Ensure data directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.initializeSchema();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS concerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        artistName TEXT NOT NULL,
        venueName TEXT NOT NULL,
        venueCity TEXT NOT NULL,
        venueCountry TEXT NOT NULL,
        eventDate TEXT NOT NULL,
        eventUrl TEXT NOT NULL,
        ticketUrl TEXT,
        source TEXT NOT NULL,
        sourceId TEXT NOT NULL UNIQUE,
        announcedDate TEXT NOT NULL,
        notified INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_artist ON concerts(artistName);
      CREATE INDEX IF NOT EXISTS idx_date ON concerts(eventDate);
      CREATE INDEX IF NOT EXISTS idx_notified ON concerts(notified);
      CREATE INDEX IF NOT EXISTS idx_source_id ON concerts(sourceId);
    `);
  }

  addConcert(concert: Concert): boolean {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO concerts (
          artistName, venueName, venueCity, venueCountry,
          eventDate, eventUrl, ticketUrl, source, sourceId, announcedDate, notified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        concert.artistName,
        concert.venueName,
        concert.venueCity,
        concert.venueCountry,
        concert.eventDate,
        concert.eventUrl,
        concert.ticketUrl || null,
        concert.source,
        concert.sourceId,
        concert.announcedDate,
        concert.notified,
      );

      return true;
    } catch (error: any) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        // Concert already exists
        return false;
      }
      throw error;
    }
  }

  getConcertBySourceId(sourceId: string): Concert | undefined {
    const stmt = this.db.prepare("SELECT * FROM concerts WHERE sourceId = ?");
    return stmt.get(sourceId) as Concert | undefined;
  }

  getUnnotifiedConcerts(): Concert[] {
    const stmt = this.db.prepare(
      "SELECT * FROM concerts WHERE notified = 0 ORDER BY eventDate",
    );
    return stmt.all() as Concert[];
  }

  markAsNotified(id: number): void {
    const stmt = this.db.prepare(
      "UPDATE concerts SET notified = 1 WHERE id = ?",
    );
    stmt.run(id);
  }

  getUpcomingConcerts(daysAhead: number = 90): Concert[] {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const futureDateStr = futureDate.toISOString().split("T")[0];

    const stmt = this.db.prepare(`
      SELECT * FROM concerts 
      WHERE eventDate >= date('now') AND eventDate <= ?
      ORDER BY eventDate
    `);
    return stmt.all(futureDateStr) as Concert[];
  }

  getAllConcerts(): Concert[] {
    const stmt = this.db.prepare(
      "SELECT * FROM concerts ORDER BY eventDate DESC",
    );
    return stmt.all() as Concert[];
  }

  close(): void {
    this.db.close();
  }
}

// Made with Bob
