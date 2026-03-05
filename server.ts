import express from "express";
console.log("SERVER STARTING...");
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket as WS } from "ws";
import { createServer } from "http";

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: any;
try {
  db = new Database("tournament.db");
  db.pragma('journal_mode = WAL');
  console.log("Database connected with WAL mode.");
} catch (e) {
  console.error("CRITICAL: Failed to connect to database:", e);
  process.exit(1);
}

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    group_name TEXT NOT NULL,
    logo_url TEXT
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    team_a_id INTEGER,
    team_b_id INTEGER,
    score_a INTEGER DEFAULT 0,
    score_b INTEGER DEFAULT 0,
    date TEXT,
    time TEXT,
    location TEXT,
    status TEXT DEFAULT 'scheduled',
    is_final INTEGER DEFAULT 0,
    is_third_place INTEGER DEFAULT 0,
    FOREIGN KEY(team_a_id) REFERENCES teams(id),
    FOREIGN KEY(team_b_id) REFERENCES teams(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    previous_data TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  INSERT OR IGNORE INTO settings (key, value) VALUES ('tournament_logo', NULL);
`);

// Migration: Ensure logo_url exists in teams table (in case it was created earlier)
try {
  db.prepare("ALTER TABLE teams ADD COLUMN logo_url TEXT").run();
  console.log("Added logo_url column to teams table");
} catch (e: any) {
  if (!e.message.includes("duplicate column name")) {
    console.error("Migration error:", e.message);
  }
}

// Migration: Ensure is_final exists in matches table
try {
  db.prepare("ALTER TABLE matches ADD COLUMN is_final INTEGER DEFAULT 0").run();
  console.log("Added is_final column to matches table");
} catch (e: any) {
  if (!e.message.includes("duplicate column name")) {
    console.error("Migration error:", e.message);
  }
}

// Migration: Ensure is_third_place exists in matches table
try {
  db.prepare("ALTER TABLE matches ADD COLUMN is_third_place INTEGER DEFAULT 0").run();
  console.log("Added is_third_place column to matches table");
} catch (e: any) {
  if (!e.message.includes("duplicate column name")) {
    console.error("Migration error:", e.message);
  }
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  app.use(express.json({ limit: '10mb' }));
  const PORT = 3000;

  // Broadcast to all clients
  const broadcast = (data: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WS.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };

  // API Routes
  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const result = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(result);
  });

  app.post("/api/settings", (req, res) => {
    const { tournament_logo } = req.body;
    db.prepare("UPDATE settings SET value = ? WHERE key = 'tournament_logo'").run(tournament_logo);
    broadcast({ type: 'SETTINGS_UPDATED' });
    res.json({ success: true });
  });

  app.get("/api/teams", (req, res) => {
    const teams = db.prepare("SELECT * FROM teams").all();
    res.json(teams);
  });

  app.post("/api/teams", (req, res) => {
    const { name, category, group_name, logo_url } = req.body;
    const info = db.prepare("INSERT INTO teams (name, category, group_name, logo_url) VALUES (?, ?, ?, ?)").run(name, category, group_name, logo_url);
    
    // Log history
    db.prepare("INSERT INTO history (action_type, entity_type, entity_id, previous_data) VALUES (?, ?, ?, ?)").run('CREATE', 'TEAM', info.lastInsertRowid, null);
    
    broadcast({ type: 'DATA_UPDATED' });
    res.json({ id: info.lastInsertRowid });
  });

  app.patch("/api/teams/:id", (req, res) => {
    const { name, category, group_name, logo_url } = req.body;
    const previous = db.prepare("SELECT * FROM teams WHERE id = ?").get(req.params.id);
    
    db.prepare("UPDATE teams SET name = ?, category = ?, group_name = ?, logo_url = ? WHERE id = ?").run(name, category, group_name, logo_url, req.params.id);
    
    // Log history
    db.prepare("INSERT INTO history (action_type, entity_type, entity_id, previous_data) VALUES (?, ?, ?, ?)").run('UPDATE', 'TEAM', req.params.id, JSON.stringify(previous));
    
    broadcast({ type: 'DATA_UPDATED' });
    res.json({ success: true });
  });

  app.delete("/api/teams/:id", (req, res) => {
    const teamId = req.params.id;
    const previous = db.prepare("SELECT * FROM teams WHERE id = ?").get(teamId);
    
    // Delete matches where this team is either team_a or team_b
    db.prepare("DELETE FROM matches WHERE team_a_id = ? OR team_b_id = ?").run(teamId, teamId);
    // Delete the team
    db.prepare("DELETE FROM teams WHERE id = ?").run(teamId);
    
    // Log history
    db.prepare("INSERT INTO history (action_type, entity_type, entity_id, previous_data) VALUES (?, ?, ?, ?)").run('DELETE', 'TEAM', teamId, JSON.stringify(previous));
    
    broadcast({ type: 'DATA_UPDATED' });
    res.json({ success: true });
  });

  app.get("/api/matches", (req, res) => {
    const matches = db.prepare(`
      SELECT m.*, 
             t1.name as team_a_name, t1.logo_url as team_a_logo,
             t2.name as team_b_name, t2.logo_url as team_b_logo
      FROM matches m
      LEFT JOIN teams t1 ON m.team_a_id = t1.id
      LEFT JOIN teams t2 ON m.team_b_id = t2.id
    `).all();
    res.json(matches);
  });

  app.post("/api/matches", (req, res) => {
    const { category, team_a_id, team_b_id, date, time, location, is_final, is_third_place } = req.body;
    const info = db.prepare("INSERT INTO matches (category, team_a_id, team_b_id, date, time, location, is_final, is_third_place) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(category, team_a_id, team_b_id, date, time, location, is_final ? 1 : 0, is_third_place ? 1 : 0);
    
    // Log history
    db.prepare("INSERT INTO history (action_type, entity_type, entity_id, previous_data) VALUES (?, ?, ?, ?)").run('CREATE', 'MATCH', info.lastInsertRowid, null);
    
    broadcast({ type: 'DATA_UPDATED' });
    res.json({ id: info.lastInsertRowid });
  });

  app.patch("/api/matches/:id", (req, res) => {
    const { score_a, score_b, status, team_a_id, team_b_id, date, time, location, is_final, is_third_place } = req.body;
    const previous = db.prepare("SELECT * FROM matches WHERE id = ?").get(req.params.id);
    
    // Build update query dynamically or just update all
    db.prepare(`
      UPDATE matches 
      SET score_a = COALESCE(?, score_a), 
          score_b = COALESCE(?, score_b), 
          status = COALESCE(?, status),
          team_a_id = COALESCE(?, team_a_id),
          team_b_id = COALESCE(?, team_b_id),
          date = COALESCE(?, date),
          time = COALESCE(?, time),
          location = COALESCE(?, location),
          is_final = COALESCE(?, is_final),
          is_third_place = COALESCE(?, is_third_place)
      WHERE id = ?
    `).run(score_a, score_b, status, team_a_id, team_b_id, date, time, location, is_final !== undefined ? (is_final ? 1 : 0) : null, is_third_place !== undefined ? (is_third_place ? 1 : 0) : null, req.params.id);
    
    // Log history
    db.prepare("INSERT INTO history (action_type, entity_type, entity_id, previous_data) VALUES (?, ?, ?, ?)").run('UPDATE', 'MATCH', req.params.id, JSON.stringify(previous));
    
    broadcast({ type: 'DATA_UPDATED' });
    res.json({ success: true });
  });

  app.delete("/api/matches/:id", (req, res) => {
    const previous = db.prepare("SELECT * FROM matches WHERE id = ?").get(req.params.id);
    db.prepare("DELETE FROM matches WHERE id = ?").run(req.params.id);
    
    // Log history
    db.prepare("INSERT INTO history (action_type, entity_type, entity_id, previous_data) VALUES (?, ?, ?, ?)").run('DELETE', 'MATCH', req.params.id, JSON.stringify(previous));
    
    broadcast({ type: 'DATA_UPDATED' });
    res.json({ success: true });
  });

  app.post("/api/undo", (req, res) => {
    const lastAction = db.prepare("SELECT * FROM history ORDER BY id DESC LIMIT 1").get();
    if (!lastAction) return res.status(400).json({ error: "No actions to undo" });

    const { action_type, entity_type, entity_id, previous_data } = lastAction;
    const data = previous_data ? JSON.parse(previous_data) : null;

    try {
      if (action_type === 'CREATE') {
        if (entity_type === 'TEAM') db.prepare("DELETE FROM teams WHERE id = ?").run(entity_id);
        if (entity_type === 'MATCH') db.prepare("DELETE FROM matches WHERE id = ?").run(entity_id);
      } else if (action_type === 'UPDATE') {
        if (entity_type === 'TEAM') {
          db.prepare("UPDATE teams SET name = ?, category = ?, group_name = ?, logo_url = ? WHERE id = ?").run(data.name, data.category, data.group_name, data.logo_url, entity_id);
        }
        if (entity_type === 'MATCH') {
          db.prepare("UPDATE matches SET category = ?, team_a_id = ?, team_b_id = ?, score_a = ?, score_b = ?, date = ?, time = ?, location = ?, status = ?, is_final = ?, is_third_place = ? WHERE id = ?").run(data.category, data.team_a_id, data.team_b_id, data.score_a, data.score_b, data.date, data.time, data.location, data.status, data.is_final, data.is_third_place, entity_id);
        }
      } else if (action_type === 'DELETE') {
        if (entity_type === 'TEAM') {
          db.prepare("INSERT INTO teams (id, name, category, group_name, logo_url) VALUES (?, ?, ?, ?, ?)").run(data.id, data.name, data.category, data.group_name, data.logo_url);
        }
        if (entity_type === 'MATCH') {
          db.prepare("INSERT INTO matches (id, category, team_a_id, team_b_id, score_a, score_b, date, time, location, status, is_final, is_third_place) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(data.id, data.category, data.team_a_id, data.team_b_id, data.score_a, data.score_b, data.date, data.time, data.location, data.status, data.is_final, data.is_third_place);
        }
      }

      // Remove from history
      db.prepare("DELETE FROM history WHERE id = ?").run(lastAction.id);
      
      broadcast({ type: 'DATA_UPDATED' });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Initializing Vite middleware...");
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite middleware initialized.");
    } catch (e) {
      console.error("Failed to initialize Vite middleware:", e);
    }
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    setInterval(() => console.log("HEARTBEAT"), 30000);
  });
}

startServer().catch(err => {
  console.error("CRITICAL: Failed to start server:", err);
  process.exit(1);
});
