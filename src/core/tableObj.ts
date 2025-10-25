// Drill Set 1 — Tables ↔ Objects¶
// What you’ll learn:
// Applications think in objects; databases store rows in tables.
// This drill connects those worlds, so you can model real entities consistently.

import { Client } from 'pg';
// pnpm add pg
// pnpm add -D @types/pg

// Define a TypeScript interface User { id: number; name: string; email: string }.
interface User {
  id: number;
  name: string;
  email: string;
}

async function main() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'dbDrills',
    password: 'postgres@132k4',
    port: 5432,
  });

  await client.connect();

    // --- Clean up old tables ---
  await client.query(`
    DROP TABLE IF EXISTS posts_norm CASCADE;
    DROP TABLE IF EXISTS posts_denorm CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
  `);

  // Create table if not exists
// Create a users table with columns: id (serial pk), name (text), email (text unique).
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL
    );
  `);

// Insert two users using raw SQL in Postgres.
  await client.query(`
    INSERT INTO users (name, email)
    VALUES
      ('Alice', 'alice@example.com'),
      ('Bob', 'bob@example.com')
    ON CONFLICT (email) DO NOTHING;
  `);

// Fetch them in Node with the pg client and map rows → User[].
  const res = await client.query('SELECT * FROM users;');
  const users: User[] = res.rows.map((row: { id: number; name: string; email: string }) => ({
    id: row.id,
    name: row.name,
    email: row.email,
  }));

// Log the objects and confirm the mapping matches.
  console.log(users);

  await client.end();
}

main().catch(console.error);
