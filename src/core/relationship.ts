// Drill Set 2 — Relationships (“has a” and “is a”)¶
// What you’ll learn:
// Relationships define how tables connect.

// “Has a” → composition (e.g. a user has a profile).
// “Is a” → inheritance/subtype (e.g. an admin is a user).

// “Has a” → foreign key.
// “Is a” → inheritance patterns.
// Create a profiles table with user_id (foreign key to users), bio (text).
// Query a user and join their profile in one SQL statement.
// Map the result into a nested TS object:
// type UserProfile = { user: User; bio: string }
// Bonus: Design an admins table where each admin is a user. Use user_id as the PK+FK.

import { Client } from 'pg';

interface User {
  id: number;
  name: string;
  email: string;
}

// Insert a profile row linked to a user.
type UserProfile = {
  user: User;
  bio: string;
};

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
    DROP TABLE IF EXISTS admins CASCADE;
    DROP TABLE IF EXISTS profiles CASCADE;
    DROP TABLE IF EXISTS posts_norm CASCADE;
    DROP TABLE IF EXISTS posts_denorm CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
  `);

  // Create users table (if not exists)
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL
    );
  `);

  // Create profiles table (HAS A relationship)
  await client.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      bio TEXT
    );
  `);

  // Create admins table (IS A relationship)
  await client.query(`
    CREATE TABLE IF NOT EXISTS admins (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Insert users
  await client.query(`
    INSERT INTO users (name, email)
    VALUES
      ('Alice', 'alice@example.com'),
      ('Bob', 'bob@example.com')
    ON CONFLICT (email) DO NOTHING;
  `);

  // Link profile to a user (HAS A)
  await client.query(`
    INSERT INTO profiles (user_id, bio)
    VALUES
      ((SELECT id FROM users WHERE email = 'alice@example.com'), 'Loves databases and TypeScript.')
    ON CONFLICT (user_id) DO NOTHING;
  `);

  // Make one user an admin (IS A)
  await client.query(`
    INSERT INTO admins (user_id)
    VALUES ((SELECT id FROM users WHERE email = 'bob@example.com'))
    ON CONFLICT (user_id) DO NOTHING;
  `);

  // Query: join user + profile
  const res = await client.query(`
    SELECT u.id, u.name, u.email, p.bio
    FROM users u
    JOIN profiles p ON u.id = p.user_id;
  `);

  // Map SQL rows → nested TypeScript objects
  const userProfiles: UserProfile[] = res.rows.map(row => ({
    user: {
      id: row.id,
      name: row.name,
      email: row.email,
    },
    bio: row.bio,
  }));

  console.log('User Profiles:', userProfiles);

  // Show admins (IS A)
  const adminRes = await client.query(`
    SELECT u.id, u.name, u.email
    FROM users u
    JOIN admins a ON u.id = a.user_id;
  `);

  const admins: User[] = adminRes.rows.map(row => ({
    id: row.id,
    name: row.name,
    email: row.email,
  }));

  console.log('Admins:', admins);

  await client.end();
}

main().catch(console.error);
