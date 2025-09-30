import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as authSchema from '../../lib/db/auth-schema'

const connectionString = process.env.DATABASE_URL!

export const client = postgres(connectionString)
export const db = drizzle(client, { schema: authSchema })