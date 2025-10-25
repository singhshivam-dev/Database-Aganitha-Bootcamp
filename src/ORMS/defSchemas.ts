// Drill Set 1 — Defining Schemas¶
// What you’ll learn:
// Defining tables in TypeScript ensures your DB schema and code stay aligned.

// Generate a migration and apply it.
// Inspect DB tables to confirm schema matches TypeScript.

// pnpm add drizzle-orm pg
// pnpm add -D drizzle-kit @types/pg

// src/ORMS/drill1DrizzleWithDB.ts
import readline from "node:readline";
import dotenv from "dotenv";
dotenv.config();

import { query } from "./db"; // your existing query helper
import { drizzle } from "drizzle-orm/node-postgres";
import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";

// Install Drizzle ORM and set up a Postgres connection.
import { Pool } from "pg";

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: Number(process.env.PG_PORT),
});

const db = drizzle(pool);

// Define a users table with id, name, email.
export const users = pgTable("users_drizzle", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
});

// Define a posts table with id, title, userId.
export const posts = pgTable("posts_drizzle", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
});

// Dynamic input via readline
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

async function main() {
  try {
    // Drop tables if they exist (using db.ts query)
    await query(`DROP TABLE IF EXISTS posts_drizzle`);
    await query(`DROP TABLE IF EXISTS users_drizzle`);

    await query(`
      CREATE TABLE users_drizzle (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL
      )
    `);

    await query(`
      CREATE TABLE posts_drizzle (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        user_id INTEGER REFERENCES users_drizzle(id) NOT NULL
      )
    `);

    console.log("Tables created successfully.");

    const name = await question("Enter user name: ");
    const email = await question("Enter user email: ");

    const insertedUser = await db.insert(users).values({ name, email }).returning();
    console.log("User inserted:", insertedUser[0]);

    const title = await question("Enter post title: ");
    const userIdStr = await question(
      `Enter user ID for this post (existing: ${insertedUser[0].id}): `
    );
    const userId = parseInt(userIdStr, 10);

    const insertedPost = await db.insert(posts)
      .values({ title, userId })
      .returning();

    console.log("Post inserted:", insertedPost[0]);

    // Fetch all users using Drizzle
    const allUsers = await db.select().from(users);
    console.log("\nAll Users:");
    console.table(allUsers);

    // Display all posts with Drizzle-
    const allPosts = await db.select().from(posts);
    console.log("\nAll Posts:");
    console.table(allPosts);

  } catch (err) {
    console.error("Error in Drill Set 1:", err);
  } finally {
    rl.close();
    await pool.end();
  }
}

main();
