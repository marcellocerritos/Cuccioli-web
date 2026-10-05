import { sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core";
export const records = sqliteTable("records", { collection: text("collection").notNull(), id: text("id").notNull(), value: text("value").notNull() }, table => [primaryKey({ columns: [table.collection, table.id] })]);
