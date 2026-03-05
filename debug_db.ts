import Database from "better-sqlite3";
import fs from "fs";

try {
  const db = new Database("file:tournament.db.corrupted?nolock=1", { readonly: true, fileMustExist: true });
  console.log("Connected to corrupted DB (NoLock)");
  
  const tables = ["teams", "matches", "settings"];
  for (const table of tables) {
    try {
      const rows = db.prepare(`SELECT * FROM ${table}`).all();
      console.log(`Table ${table}: ${rows.length} rows salvaged`);
      fs.writeFileSync(`${table}_salvaged.json`, JSON.stringify(rows));
    } catch (e) {
      console.error(`Failed to salvage ${table}: ${e.message}`);
    }
  }
  db.close();
} catch (e) {
  console.error("NoLock connection failed:", e.message);
}
