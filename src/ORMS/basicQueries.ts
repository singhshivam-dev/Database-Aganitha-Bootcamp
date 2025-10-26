// Drill Set 2 — Basic Queries¶
// What you’ll learn:
// ORMs make CRUD easier and type-safe compared to writing raw SQL.

import { drizzle } from "drizzle-orm/postgres-js";
// pnpm add drizzle-orm pg postgres
// pnpm add -D drizzle-kit typescript tsx
import { pgTable, serial, text, varchar } from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import "dotenv/config";

// Connect DB
const client = postgres(process.env.DATABASE_URL!); // ! asserts non-null
const db = drizzle(client);

// Defining Schema
const users332 = pgTable("users332", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email").notNull(),
});

async function main() {
  // Drop table if exists (for repeatability)
  await client`DROP TABLE IF EXISTS users332 CASCADE`;

  await client`
    CREATE TABLE IF NOT EXISTS users332 (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email VARCHAR(255) NOT NULL
    );
  `;

  // Insert 3 users with Drizzle’s insert.
  await db.insert(users332).values([
    { name: "Alice", email: "alice@example.com" },
    { name: "Bob", email: "bob@example.com" },
    { name: "Charlie", email: "charlie@example.com" },
  ]);
  console.log("Inserted 3 users");

  // Fetch all users with select.
  const allUsers = await db.select().from(users332);
  console.log("All Users:", allUsers);

  // Update a user’s email with update.
  await db
    .update(users332)
    .set({ email: "newalice@example.com" })
    .where(eq(users332.name, "Alice")); // eq = equals
  console.log("Updated Alice's email");

  // Delete one user by id.
  await db.delete(users332).where(eq(users332.id, 3)); // deletes Charlie
  console.log("Deleted user with id=3");

  // remaining users
  const remaining = await db.select().from(users332);
  console.log("Remaining Users:", remaining);

  // Confirm TypeScript enforces correct field names.
  //   await db.insert(users332).values([{ nam: "Oops" }]);
}

main()
  .then(() => console.log("Done"))
  .catch(console.error)
  .finally(() => client.end());
