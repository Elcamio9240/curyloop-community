import { sqlite } from "./index";

export function setupFts() {
  // Create FTS5 virtual table for items search
  sqlite.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
      title,
      description,
      url,
      content='items',
      content_rowid='rowid',
      tokenize='porter unicode61'
    );
  `);

  // Create triggers to keep FTS in sync
  sqlite.exec(`
    CREATE TRIGGER IF NOT EXISTS items_fts_insert AFTER INSERT ON items BEGIN
      INSERT INTO items_fts(rowid, title, description, url)
      VALUES (NEW.rowid, NEW.title, NEW.description, NEW.url);
    END;
  `);

  sqlite.exec(`
    CREATE TRIGGER IF NOT EXISTS items_fts_delete AFTER DELETE ON items BEGIN
      INSERT INTO items_fts(items_fts, rowid, title, description, url)
      VALUES ('delete', OLD.rowid, OLD.title, OLD.description, OLD.url);
    END;
  `);

  sqlite.exec(`
    CREATE TRIGGER IF NOT EXISTS items_fts_update AFTER UPDATE ON items BEGIN
      INSERT INTO items_fts(items_fts, rowid, title, description, url)
      VALUES ('delete', OLD.rowid, OLD.title, OLD.description, OLD.url);
      INSERT INTO items_fts(rowid, title, description, url)
      VALUES (NEW.rowid, NEW.title, NEW.description, NEW.url);
    END;
  `);
}

export function searchItems(query: string, limit = 20): { id: string; rank: number }[] {
  const stmt = sqlite.prepare(`
    SELECT i.id, rank
    FROM items_fts
    JOIN items i ON items_fts.rowid = i.rowid
    WHERE items_fts MATCH ?
    ORDER BY bm25(items_fts, 10, 5, 1)
    LIMIT ?
  `);
  return stmt.all(query, limit) as { id: string; rank: number }[];
}
