// Drill Set 4 — Denormalization & Trade-offs¶
// What you’ll learn:
// Sometimes, storing redundant data makes queries faster or simpler.
// This is denormalization — a trade-off you should do intentionally.

// Compare: fetching post list with/without counting comments via COUNT(*).

import { Client } from "pg";
import { performance } from "perf_hooks";

async function main() {
  const client = new Client({
    user: "postgres",
    host: "localhost",
    database: "dbDrills",
    password: "postgres@132k4",
    port: 5432,
  });

  await client.connect();

  // Cleanup old tables
  await client.query(`
    DROP TABLE IF EXISTS comments CASCADE;
    DROP TABLE IF EXISTS posts_norm CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
  `);

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
      ('Bob', 'bob@example.com');
  `);

  // Create posts table
  await client.query(`
    CREATE TABLE posts_norm (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      comment_count INTEGER DEFAULT 0
    );
  `);

  await client.query(`
    INSERT INTO posts_norm (title, author_id)
    VALUES
      ('Understanding Databases', (SELECT id FROM users WHERE name = 'Alice')),
      ('Advanced SQL Patterns', (SELECT id FROM users WHERE name = 'Bob'));
  `);

  await client.query(`
    CREATE TABLE comments (
      id SERIAL PRIMARY KEY,
      post_id INTEGER REFERENCES posts_norm(id) ON DELETE CASCADE,
      content TEXT NOT NULL
    );
  `);

// Write a SQL trigger or manual update query to increment when inserting a comment.
// via LLM
  await client.query(`
    CREATE OR REPLACE FUNCTION increment_comment_count()
    RETURNS TRIGGER AS $$
    BEGIN
      UPDATE posts_norm
      SET comment_count = comment_count + 1
      WHERE id = NEW.post_id;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER after_comment_insert
    AFTER INSERT ON comments
    FOR EACH ROW
    EXECUTE FUNCTION increment_comment_count();
  `);

// Insert 100 comments and measure query time.
  console.log("Inserting 100 comments...");
  for (let i = 0; i < 100; i++) {
    const postId = i % 2 === 0 ? 1 : 2; // Alternate between posts
    await client.query(
      `INSERT INTO comments (post_id, content) VALUES ($1, $2);`,
      [postId, `Sample comment ${i + 1}`]
    );
  }

  console.log("100 comments inserted.");


  const t1Start = performance.now();
  const resCount = await client.query(`
    SELECT p.id, p.title, COUNT(c.id) AS comment_count
    FROM posts_norm p
    LEFT JOIN comments c ON p.id = c.post_id
    GROUP BY p.id;
  `);
  const t1End = performance.now();

  const t2Start = performance.now();
  const resDenorm = await client.query(`
    SELECT id, title, comment_count FROM posts_norm;
  `);
  const t2End = performance.now();

  // Display results
  console.table(resCount.rows);

  console.table(resDenorm.rows);

  
  await client.end();
}

main().catch(console.error);


// Reflect: When does storing comment_count make sense? When is it risky?

// Denormalization (storing comment_count) improves read speed.
// Instead of calculating COUNT(*) each time, we can fetch comment_count directly.

// Makes sense when:
// - Reads are frequent, writes are rare.
// - We need real-time counts (e.g., likes, views, comments).
// - Query performance is critical.

// Risky when:
// - Writes are frequent — high chance of inconsistent counts.
// - Triggers or updates fail to keep the redundant data accurate.

// In short:
// - Normalization = safer, consistent, but slower reads.
// - Denormalization = faster reads, but higher maintenance risk.
// `);