import type { Config } from 'drizzle-kit'

export default {
  schema: [
    './lib/db/schema.ts',        // Custom tables
    './lib/db/auth-schema.ts'    // Better Auth tables
  ],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!
  }
} satisfies Config