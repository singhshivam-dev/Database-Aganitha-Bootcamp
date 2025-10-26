// Drill Set 3 — Relationships¶
// What you’ll learn:
// Relationships map foreign keys in DB to references in TypeScript models.

import { drizzle } from "drizzle-orm/postgres-js";
import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  foreignKey,
} from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm"; // eq = equals
import postgres from "postgres";
import "dotenv/config";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

// Connect DB
const client = postgres(process.env.DATABASE_URL!); // ! asserts non-null
const db = drizzle(client);

// Define user schema
const users333 = pgTable("users333", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email").notNull(),
});

// Define post schema with foreign key to users333.id
// Add userId in posts referencing users.id.
const posts333 = pgTable("posts333", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  // Reflect: how ORM ensures referential consistency.
  userId: integer("user_id")
    .notNull()
    .references(() => users333.id),
});

async function main() {
  await client`SET client_min_messages TO WARNING;`; // suppress NOTICE if table exists

  // await client`DROP TABLE IF EXISTS posts333 CASCADE`;
  // await client`DROP TABLE IF EXISTS users333 CASCADE`;

  // Create users table
  await client`
        CREATE TABLE IF NOT EXISTS users333 (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email VARCHAR(255) NOT NULL
        );`;

  // Create posts table

  await client`
    CREATE TABLE IF NOT EXISTS posts333(
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users333(id)
        );`;

  // Ensure column exists
  await client`ALTER TABLE posts333 
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now() NOT NULL;`;

  // Insert users (if not already present)
  const existingUsers = await db.select().from(users333);

  if (existingUsers.length === 0) {
    await db.insert(users333).values([
      { name: "Andromeda", email: "galaxy@gm.com" },
      { name: "Nebula", email: "orion@gmail.com" },
    ]);
    //   console.log("Users inserted");
  }

  // Adding readline for user input (dynamic posts)
  const rl = readline.createInterface({
    input: stdin,
    output: stdout,
  });

  const addUser = await rl.question("Do you want to add a new user? (y/n): ");
  if (addUser.toLowerCase() === "y") {
    const name = await rl.question("Enter user name: ");
    const email = await rl.question("Enter user email: ");
    await db.insert(users333).values([{ name: name, email: email }]);
    console.log("New user added.");
  } else {
    console.log("Proceeding without adding new user.");
  }

  const usersList = await db.select().from(users333);

  // Insert posts linked to users.
  console.log("\nCreate a new post: ");

  const title = await rl.question("Enter post title: ");
  const content = await rl.question("Enter post content: ");

  console.log("\nSelect user by id: ");
  usersList.forEach((users333, index) => {
    console.log(`${index + 1}. ${users333.name} (id: ${users333.id})`);
  });

  const userChoice = await rl.question("Enter user id: ");
  const userId = parseInt(userChoice, 10) - 1;

  if (userId < 0 || userId >= usersList.length) {
    console.log("Invalid user selection. Exiting.");
    rl.close();
    client.end();
    return;
  }

  const selectedUser = usersList[userId];

  // Insert post linked to selected user
  await db
    .insert(posts333)
    .values([{ title: title, content: content, userId: selectedUser.id }]);

  // Fetch posts with user info (join)
  const postsWithUsers = await db
    .select({ postTitle: posts333.title, userName: users333.name })
    .from(posts333)
    // Query posts with their user (join).
    .innerJoin(users333, eq(posts333.userId, users333.id)); // innerjoin: defnite association, leftjoin: optional association

  console.log("\nPosts with User Info: ");
  postsWithUsers.forEach((post) => {
    console.log(`- ${post.postTitle} (by ${post.userName})`);
    // Map results to { userName, postTitle }.
  });

  rl.close();
  client.end();
}

main().catch(console.error);
