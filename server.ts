import express, { Express } from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

let dbPath = path.resolve(process.cwd(), 'vault.db');
if (process.env.NETLIFY || process.env.NODE_ENV === 'production') {
  dbPath = '/tmp/vault.db';
}

console.log(`Using database at: ${dbPath}`);

const sourceDbPath = path.resolve(process.cwd(), 'vault.db');

// Copy initial DB to /tmp if needed
if (dbPath.startsWith('/tmp/') && !fs.existsSync(dbPath)) {
  if (fs.existsSync(sourceDbPath)) {
    try {
      fs.copyFileSync(sourceDbPath, dbPath);
      console.log("Database copied to /tmp");
    } catch (e) {
      console.error("Could not copy DB to /tmp:", e);
    }
  } else {
    console.log(`vault.db not found at ${sourceDbPath}, will create new one in /tmp`);
  }
}

const db = new Database(dbPath);

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS scripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT,
    text TEXT
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    display_name TEXT,
    diamond_count INTEGER DEFAULT 0,
    favorites TEXT DEFAULT '[]'
  );
`);

// Seed initial data if empty
const count = db.prepare("SELECT COUNT(*) as count FROM scripts").get() as any;
if (count.count === 0) {
  const stmt = db.prepare("INSERT INTO scripts (category, text) VALUES (?, ?)");
  const initialScripts = [
    ["DistantPartner", "I've noticed we've been a bit disconnected lately. I value our connection and would love to find some time to catch up properly. How are you feeling about us?"],
    ["DistantPartner", "I'm feeling a bit of distance between us and it's making me feel a little anxious. Can we talk about what's on your mind?"],
    ["PostArgument", "I'm sorry for my part in our argument. I've had some time to cool down and I'd like to talk about how we can move forward together."],
    ["FeelingUnheard", "I feel like my needs aren't being fully understood right now. I'd really appreciate it if we could sit down and I could share what's been on my mind."],
    ["SettingBoundaries", "I need to set a boundary regarding our communication. I'm not comfortable with [specific behavior] and I'd like us to find a healthier way to interact."],
    ["MissingEachOther", "I'm missing you so much today. Thinking of you and sending you all my love."],
  ];
  initialScripts.forEach(([cat, text]) => stmt.run(cat, text));
}

export function setupApp(app: Express) {
  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", dbPath, env: process.env.NODE_ENV });
  });

  // API Routes
  app.get("/api/scripts", (req, res) => {
    const scripts = db.prepare("SELECT * FROM scripts").all();
    const categories: Record<string, any> = {
      "DistantPartner": { title: "When He's Distant/Cold", scripts: [] },
      "PostArgument": { title: "After an Argument", scripts: [] },
      "FeelingUnheard": { title: "Feeling Unheard", scripts: [] },
      "SettingBoundaries": { title: "Setting Boundaries", scripts: [] },
      "MissingEachOther": { title: "Missing Each Other", scripts: [] }
    };

    scripts.forEach((s: any) => {
      if (categories[s.category]) {
        categories[s.category].scripts.push(s.text);
      }
    });

    res.json({ categories });
  });

  app.post("/api/signup", (req, res) => {
    const { username, password } = req.body;
    try {
      db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run(username, password);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ success: false, message: "Email already exists" });
    }
  });

  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password) as any;
    if (user) {
      res.json({ 
        success: true, 
        token: `token-${user.id}`, 
        user: {
          username: user.username,
          displayName: user.display_name || user.username.split('@')[0],
          diamondCount: user.diamond_count,
          favorites: JSON.parse(user.favorites)
        }
      });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  });

  app.post("/api/profile", (req, res) => {
    const { token, displayName } = req.body;
    if (!token || !token.startsWith("token-")) return res.status(403).send("Unauthorized");
    const userId = token.split("-")[1];
    
    db.prepare("UPDATE users SET display_name = ? WHERE id = ?")
      .run(displayName, userId);
    
    res.json({ success: true });
  });

  app.post("/api/sync", (req, res) => {
    const { token, diamondCount, favorites } = req.body;
    if (!token || !token.startsWith("token-")) return res.status(403).send("Unauthorized");
    const userId = token.split("-")[1];
    
    db.prepare("UPDATE users SET diamond_count = ?, favorites = ? WHERE id = ?")
      .run(diamondCount, JSON.stringify(favorites), userId);
    
    res.json({ success: true });
  });

  return app;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  setupApp(app);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    // Handle SPA routing
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "production") {
  startServer();
}
