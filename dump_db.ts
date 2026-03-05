import Database from "better-sqlite3";
const db = new Database("tournament.db.corrupted");
const teams = db.prepare("SELECT * FROM teams").all();
console.log(JSON.stringify(teams, null, 2));
db.close();
