// Drill Set 3 — Reset to a known state¶
// Why: Tests need deterministic data. Resetting ensures clean runs every time.

import { Client } from "pg";
import initSqlJs from "sql.js";
import { drizzle, SQLJsDatabase } from "drizzle-orm/sql-js";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import readline from "node:readline/promises";
import { stdin, stdout } from "process";
import dotenv from "dotenv";

dotenv.config();

// Drizzle schema (optional for queries)
const users = sqliteTable("users", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
});

const posts = sqliteTable("posts", {
  id: integer("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  authorId: integer("author_id").notNull(),
});

const schema = { users, posts };

// Seed minimal baseline rows.
const SEED_USERS = [
  { name: "Alice", email: "alice@example.com" },
  { name: "Bob", email: "bob@example.com" },
];

const SEED_POSTS = [
  { title: "Hello World", content: "My first post", authorId: 1 },
  { title: "Second Post", content: "Another post", authorId: 2 },
];

async function main() {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  console.log("Select DB to reset:");
  console.log("1. Postgres");
  console.log("2. SQLite (in-memory)");
  const choice = await rl.question("Enter 1 or 2: ");
  rl.close();

  const DB_USER = process.env.PG_USER || "postgres";
  const DB_PASS = process.env.PG_PASSWORD || "postgres@132k4";
  const DB_NAME = process.env.PG_DATABASE || "dbDrills";
  const DB_HOST = process.env.PG_HOST || "localhost";
  const DB_PORT = process.env.PG_PORT || "5432";

  if (choice === "2") {
    console.log("Resetting SQLite in-memory DB...");
    const SQL = await initSqlJs();
    const sqljsDB = new SQL.Database();
    const db: SQLJsDatabase<typeof schema> = drizzle(sqljsDB, { schema });

    // SQLite: remove DB file → migrate → seed.
    sqljsDB.run(`
      DROP TABLE IF EXISTS posts;
      DROP TABLE IF EXISTS users;
    `);
    sqljsDB.run(`
      CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL);
      CREATE TABLE posts (id INTEGER PRIMARY KEY, title TEXT NOT NULL, content TEXT, author_id INTEGER NOT NULL);
    `);

    for (const u of SEED_USERS) {
      sqljsDB.run(`INSERT INTO users (name, email) VALUES (?, ?)`, [u.name, u.email]);
    }
    for (const p of SEED_POSTS) {
      sqljsDB.run(`INSERT INTO posts (title, content, author_id) VALUES (?, ?, ?)`, [p.title, p.content, p.authorId]);
    }

    console.log("SQLite DB reset and seeded successfully.");
    sqljsDB.close();
    return;
  }

  if (choice === "1") {
    console.log("Resetting Postgres DB...");
    const DATABASE_URL = `postgresql://${DB_USER}:${encodeURIComponent(DB_PASS)}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();

    await client.query(`DROP TABLE IF EXISTS posts CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS users CASCADE;`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT,
        author_id INTEGER NOT NULL REFERENCES users(id)
      );
    `);

// Alternative: truncate all tables between tests.
    await client.query("TRUNCATE TABLE posts, users RESTART IDENTITY CASCADE;");

    // Seed data
    for (const u of SEED_USERS) {
      await client.query(`INSERT INTO users (name, email) VALUES ($1, $2)`, [u.name, u.email]);
    }
    for (const p of SEED_POSTS) {
      await client.query(`INSERT INTO posts (title, content, author_id) VALUES ($1, $2, $3)`, [p.title, p.content, p.authorId]);
    }

    console.log("Postgres DB reset and seeded successfully.");
    await client.end();
  }
}

main().catch((err) => {
  console.error("Error resetting DB:", err);
  process.exit(1);
});
