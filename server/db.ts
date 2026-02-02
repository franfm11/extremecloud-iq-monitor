import { eq, desc, and, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  InsertApiToken, apiTokens,
  InsertDevice, devices,
  InsertClient, clients,
  InsertAlert, alerts,
  InsertCliCommand, cliCommands
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try {
      _db = drizzle(ENV.databaseUrl);
      console.log("[Database] Connected successfully");
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  if (!_db && !ENV.databaseUrl) {
    console.error("[Database] DATABASE_URL is not configured");
  }
  return _db;
}

// ============================================================================
// USER OPERATIONS
// ============================================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// API TOKEN OPERATIONS
// ============================================================================

export async function saveApiToken(token: InsertApiToken) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot save API token: database not available");
    return;
  }

  await db.insert(apiTokens).values(token);
}

export async function getLatestApiToken(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(apiTokens)
    .where(eq(apiTokens.userId, userId))
    .orderBy(desc(apiTokens.createdAt))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function deleteExpiredTokens() {
  const db = await getDb();
  if (!db) return;

  await db.delete(apiTokens).where(lte(apiTokens.expiresAt, new Date()));
}

// ============================================================================
// DEVICE OPERATIONS
// ============================================================================

export async function upsertDevice(device: InsertDevice) {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select()
    .from(devices)
    .where(and(eq(devices.userId, device.userId!), eq(devices.deviceId, device.deviceId!)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(devices)
      .set({
        ...device,
        updatedAt: new Date(),
      })
      .where(eq(devices.id, existing[0].id));
  } else {
    await db.insert(devices).values(device);
  }
}

export async function getUserDevices(userId: number, limit: number = 100, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(devices)
    .where(eq(devices.userId, userId))
    .orderBy(desc(devices.updatedAt))
    .limit(limit)
    .offset(offset);
}

export async function getDeviceById(userId: number, deviceId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(devices)
    .where(and(eq(devices.userId, userId), eq(devices.deviceId, deviceId)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// CLIENT OPERATIONS
// ============================================================================

export async function upsertClient(client: InsertClient) {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select()
    .from(clients)
    .where(and(eq(clients.userId, client.userId!), eq(clients.clientId, client.clientId!)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(clients)
      .set({
        ...client,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, existing[0].id));
  } else {
    await db.insert(clients).values(client);
  }
}

export async function getUserClients(userId: number, deviceId?: string, limit: number = 100, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(clients.userId, userId)];
  if (deviceId) {
    conditions.push(eq(clients.deviceId, deviceId));
  }

  return await db
    .select()
    .from(clients)
    .where(and(...conditions))
    .orderBy(desc(clients.updatedAt))
    .limit(limit)
    .offset(offset);
}

// ============================================================================
// ALERT OPERATIONS
// ============================================================================

export async function upsertAlert(alert: InsertAlert) {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select()
    .from(alerts)
    .where(and(eq(alerts.userId, alert.userId!), eq(alerts.alertId, alert.alertId!)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(alerts)
      .set({
        ...alert,
        updatedAt: new Date(),
      })
      .where(eq(alerts.id, existing[0].id));
  } else {
    await db.insert(alerts).values(alert);
  }
}

export async function getUserAlerts(userId: number, severity?: string, limit: number = 100, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(alerts.userId, userId)];
  if (severity) {
    conditions.push(eq(alerts.severity, severity as any));
  }

  return await db
    .select()
    .from(alerts)
    .where(and(...conditions))
    .orderBy(desc(alerts.timestamp))
    .limit(limit)
    .offset(offset);
}

export async function acknowledgeAlert(alertId: number, acknowledgedBy: string) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(alerts)
    .set({
      acknowledged: 1,
      acknowledgedAt: new Date(),
      acknowledgedBy,
    })
    .where(eq(alerts.id, alertId));
}

// ============================================================================
// CLI COMMAND OPERATIONS
// ============================================================================

export async function createCliCommand(command: InsertCliCommand) {
  const db = await getDb();
  if (!db) return { id: 0 };

  const result = await db.insert(cliCommands).values(command);
  // Get the inserted ID by querying the latest record
  const inserted = await db
    .select()
    .from(cliCommands)
    .orderBy(desc(cliCommands.createdAt))
    .limit(1);
  
  return inserted[0] || { id: 0 };
}

export async function updateCliCommand(id: number, updates: Partial<InsertCliCommand>) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(cliCommands)
    .set(updates)
    .where(eq(cliCommands.id, id));
}

export async function getUserCliCommands(userId: number, deviceId?: string, limit: number = 50, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(cliCommands.userId, userId)];
  if (deviceId) {
    conditions.push(eq(cliCommands.deviceId, deviceId));
  }

  return await db
    .select()
    .from(cliCommands)
    .where(and(...conditions))
    .orderBy(desc(cliCommands.createdAt))
    .limit(limit)
    .offset(offset);
}
