// Drill Set 3 — Normalization Basics¶
// What you’ll learn:
// Normalization means avoiding duplicate data and ensuring consistency.
// It’s the difference between “clean schema” and “spaghetti tables.”

import { Client } from "pg";

async function main() {
  const client = new Client({
    user: "postgres",
    host: "localhost",
    database: "dbDrills",
    password: "postgres@132k4",
    port: 5432,
  });

  await client.connect();

  // Clean up old tables 
  await client.query(`
    DROP TABLE IF EXISTS posts_norm CASCADE;
    DROP TABLE IF EXISTS posts_denorm CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
  `);
  console.log("Old tables dropped");

  // Create users table
  await client.query(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL
    );
  `);

  await client.query(`
    INSERT INTO users (name, email)
    VALUES
      ('Alice', 'alice@example.com'),
      ('Albert', 'albert@example.com'),
      ('Bob', 'bob@example.com');
  `);

// Create a posts table with id, title, author_name.
// Insert two posts by the same author — notice duplication.
  await client.query(`
    CREATE TABLE posts_denorm (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      author_name TEXT NOT NULL
    );
  `);

  await client.query(`
    INSERT INTO posts_denorm (title, author_name)
    VALUES
      ('Understanding Databases', 'Albert'),
      ('Advanced SQL Patterns', 'Albert');
  `);

  const denormRes = await client.query(`SELECT * FROM posts_denorm;`);
  console.log("\n Denormalized Posts (duplicated author names):");
  console.table(denormRes.rows);

// Normalize: replace author_name with author_id referencing users. 
  await client.query(`
    CREATE TABLE posts_norm (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      author_id INTEGER REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await client.query(`
    INSERT INTO posts_norm (title, author_id)
    VALUES
      ('Understanding Databases', (SELECT id FROM users WHERE name = 'Albert')),
      ('Advanced SQL Patterns', (SELECT id FROM users WHERE name = 'Alice')),
      ('NoSQL Patterns', (SELECT id FROM users WHERE name = 'Alice'));
  `);

// Query posts with JOIN users to get author names.
  const normRes = await client.query(`
    SELECT p.id, p.title, u.name AS author_name
    FROM posts_norm p
    JOIN users u ON p.author_id = u.id;
  `);
  console.log("\n Normalized Posts (joined with users):");
  console.table(normRes.rows);

  await client.end();

}

main().catch(console.error);
  
// Document in your own words why normalization avoids errors when updating author info.

// In the denormalized table, "Alice" appears multiple times.
// If Alice changes her name, we would have to update every post row.
// If we miss one, the data becomes inconsistent.

// After normalization:
// - Author info is stored in one place (users table).
// - Each post stores only author_id.
// - Updating Alice’s name once in users automatically reflects in all posts.

// Normalization reduces duplication, prevents update errors, and ensures consistency.


