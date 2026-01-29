import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * ExtremeCloud IQ API token storage.
 * Stores JWT tokens for API authentication with expiration tracking.
 */
export const apiTokens = mysqlTable("api_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  accessToken: text("accessToken").notNull(),
  tokenType: varchar("tokenType", { length: 50 }).default("Bearer").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApiToken = typeof apiTokens.$inferSelect;
export type InsertApiToken = typeof apiTokens.$inferInsert;

/**
 * Cached device information from ExtremeCloud IQ API.
 * Stores device metadata for quick access and status tracking.
 */
export const devices = mysqlTable("devices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  deviceId: varchar("deviceId", { length: 100 }).notNull(),
  hostname: varchar("hostname", { length: 255 }),
  macAddress: varchar("macAddress", { length: 17 }),
  ipAddress: varchar("ipAddress", { length: 45 }),
  serialNumber: varchar("serialNumber", { length: 255 }),
  productType: varchar("productType", { length: 255 }),
  softwareVersion: varchar("softwareVersion", { length: 255 }),
  connected: int("connected").default(0).notNull(), // 0 = false, 1 = true
  lastConnectTime: timestamp("lastConnectTime"),
  deviceFunction: varchar("deviceFunction", { length: 100 }),
  managedStatus: varchar("managedStatus", { length: 50 }),
  rawData: json("rawData"), // Store full API response for reference
  lastSyncedAt: timestamp("lastSyncedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Device = typeof devices.$inferSelect;
export type InsertDevice = typeof devices.$inferInsert;

/**
 * Connected clients information from ExtremeCloud IQ API.
 * Tracks wireless clients connected to managed devices.
 */
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  clientId: varchar("clientId", { length: 100 }).notNull(),
  deviceId: varchar("deviceId", { length: 100 }).notNull(),
  hostname: varchar("hostname", { length: 255 }),
  macAddress: varchar("macAddress", { length: 17 }),
  ipAddress: varchar("ipAddress", { length: 45 }),
  ipv6Address: varchar("ipv6Address", { length: 45 }),
  osType: varchar("osType", { length: 100 }),
  ssid: varchar("ssid", { length: 255 }),
  vlan: int("vlan"),
  connected: int("connected").default(0).notNull(),
  connectionType: varchar("connectionType", { length: 50 }),
  signalStrength: int("signalStrength"),
  healthScore: int("healthScore"),
  rawData: json("rawData"),
  lastSyncedAt: timestamp("lastSyncedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

/**
 * Alert information from ExtremeCloud IQ API.
 * Stores security and operational alerts with severity levels.
 */
export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  alertId: varchar("alertId", { length: 100 }).notNull(),
  deviceId: varchar("deviceId", { length: 100 }),
  severity: mysqlEnum("severity", ["critical", "high", "medium", "low", "info"]).notNull(),
  category: varchar("category", { length: 100 }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  timestamp: timestamp("timestamp").notNull(),
  acknowledged: int("acknowledged").default(0).notNull(),
  acknowledgedAt: timestamp("acknowledgedAt"),
  acknowledgedBy: varchar("acknowledgedBy", { length: 255 }),
  rawData: json("rawData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = typeof alerts.$inferInsert;

/**
 * CLI command execution history.
 * Tracks diagnostic commands sent to devices for audit and troubleshooting.
 */
export const cliCommands = mysqlTable("cli_commands", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  deviceId: varchar("deviceId", { length: 100 }).notNull(),
  command: text("command").notNull(),
  output: text("output"),
  status: mysqlEnum("status", ["pending", "success", "failed", "timeout"]).default("pending").notNull(),
  executedAt: timestamp("executedAt"),
  completedAt: timestamp("completedAt"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CliCommand = typeof cliCommands.$inferSelect;
export type InsertCliCommand = typeof cliCommands.$inferInsert;
