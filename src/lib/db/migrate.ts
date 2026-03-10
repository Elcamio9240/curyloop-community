import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./index";
import path from "path";

export function runMigrations() {
  console.log("[migrate] Running database migrations...");
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  console.log("[migrate] Migrations complete.");
}
