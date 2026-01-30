import { getDb } from "../db";
import { pollingConfig, deviceAvailabilityEvents } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { extremeCloudService } from "./extremecloud.service";
import { getLatestApiToken } from "../db";
import { recordDeviceStateChange } from "./availability.service";

interface PollingState {
  userId: number;
  deviceId: string;
  lastStatus: "up" | "down" | null;
  lastCheckTime: Date;
  failureCount: number;
}

const pollingStates = new Map<string, PollingState>();
const pollingIntervals = new Map<number, NodeJS.Timeout>();

/**
 * Get or create polling configuration for a user
 */
export async function getPollingConfig(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const existing = await db
    .select()
    .from(pollingConfig)
    .where(eq(pollingConfig.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create default config
  const defaultConfig = {
    userId,
    pollingIntervalSeconds: 300, // 5 minutes
    fastPollingIntervalSeconds: 30,
    fastPollingRetries: 3,
    enabled: 1,
  };

  await db.insert(pollingConfig).values(defaultConfig);
  return defaultConfig;
}

/**
 * Update polling configuration for a user
 */
export async function updatePollingConfig(
  userId: number,
  updates: Partial<typeof pollingConfig.$inferInsert>
) {
  const db = await getDb();
  if (!db) return null;

  await db
    .update(pollingConfig)
    .set(updates)
    .where(eq(pollingConfig.userId, userId));

  return getPollingConfig(userId);
}

/**
 * Start background polling for a user
 */
export async function startPolling(userId: number) {
  // Stop existing polling if any
  stopPolling(userId);

  const config = await getPollingConfig(userId);
  if (!config || !config.enabled) {
    console.log(`[Polling] Polling disabled for user ${userId}`);
    return;
  }

  console.log(
    `[Polling] Starting background polling for user ${userId} (interval: ${config.pollingIntervalSeconds}s)`
  );

  // Initial poll
  await pollUserDevices(userId, config);

  // Set up recurring polling
  const interval = setInterval(
    () => pollUserDevices(userId, config),
    config.pollingIntervalSeconds * 1000
  );

  pollingIntervals.set(userId, interval);
}

/**
 * Stop background polling for a user
 */
export function stopPolling(userId: number) {
  const interval = pollingIntervals.get(userId);
  if (interval) {
    clearInterval(interval);
    pollingIntervals.delete(userId);
    console.log(`[Polling] Stopped polling for user ${userId}`);
  }
}

/**
 * Poll all devices for a user
 */
async function pollUserDevices(userId: number, config: any) {
  try {
    const token = await getLatestApiToken(userId);
    if (!token || token.expiresAt < new Date()) {
      console.log(`[Polling] No valid token for user ${userId}`);
      return;
    }

    // Fetch devices from API
    const response = await extremeCloudService.getDevices(token.accessToken, {
      page: 1,
      limit: 1000,
      views: "basic,detail,status",
    });

    if (response.error) {
      console.warn(`[Polling] Failed to fetch devices for user ${userId}: ${response.message}`);
      return;
    }

    if (!response.data || !Array.isArray(response.data)) {
      return;
    }

    // Check each device
    for (const device of response.data) {
      const deviceId = String(device.id);
      const currentStatus = device.connected ? "up" : "down";
      const stateKey = `${userId}-${deviceId}`;

      let state = pollingStates.get(stateKey);
      if (!state) {
        state = {
          userId,
          deviceId,
          lastStatus: null,
          lastCheckTime: new Date(),
          failureCount: 0,
        };
        pollingStates.set(stateKey, state);
      }

      // Detect state change
      if (state.lastStatus !== currentStatus) {
        console.log(
          `[Polling] State change detected for device ${deviceId}: ${state.lastStatus} -> ${currentStatus}`
        );

        // Record the state change with detection method
        await recordDeviceStateChangeWithMethod(
          userId,
          deviceId,
          currentStatus,
          "polling",
          currentStatus === "down" ? "Device is disconnected" : "Device is connected"
        );

        state.lastStatus = currentStatus;
        state.failureCount = 0;
      }

      state.lastCheckTime = new Date();
    }
  } catch (error) {
    console.error(`[Polling] Error polling devices for user ${userId}:`, error);
  }
}

/**
 * Perform fast polling with retries for a specific device
 */
export async function fastPoll(
  userId: number,
  deviceId: string,
  maxRetries: number = 3,
  retryDelayMs: number = 1000
): Promise<"up" | "down" | "unknown"> {
  const token = await getLatestApiToken(userId);
  if (!token || token.expiresAt < new Date()) {
    return "unknown";
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await extremeCloudService.getDeviceDetail(token.accessToken, deviceId);

      if (!response.error && response.data) {
        const status = response.data.connected ? "up" : "down";
        console.log(`[FastPolling] Device ${deviceId} status: ${status} (attempt ${attempt}/${maxRetries})`);
        return status;
      }

      lastError = new Error(response.message || "Failed to fetch device");
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    // Wait before retry (exponential backoff)
    if (attempt < maxRetries) {
      const delay = retryDelayMs * Math.pow(2, attempt - 1);
      console.log(`[FastPolling] Retry ${attempt}/${maxRetries} in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  console.error(
    `[FastPolling] Device ${deviceId} failed after ${maxRetries} attempts:`,
    lastError?.message
  );
  return "unknown";
}

/**
 * Record device state change with detection method
 */
async function recordDeviceStateChangeWithMethod(
  userId: number,
  deviceId: string,
  status: "up" | "down",
  detectionMethod: string,
  reason?: string
) {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(deviceAvailabilityEvents).values({
      userId,
      deviceId,
      eventType: status,
      status,
      startTime: new Date(),
      reason,
      detectionMethod,
    });

    // Also record in legacy table for backward compatibility
    await recordDeviceStateChange(userId, deviceId, status, reason);
  } catch (error) {
    console.error("[Polling] Failed to record state change:", error);
  }
}

/**
 * Get polling statistics for a device
 */
export async function getPollingStats(userId: number, deviceId: string) {
  const db = await getDb();
  if (!db) return null;

  const stateKey = `${userId}-${deviceId}`;
  const state = pollingStates.get(stateKey);

  return {
    lastStatus: state?.lastStatus || null,
    lastCheckTime: state?.lastCheckTime || null,
    failureCount: state?.failureCount || 0,
  };
}

/**
 * Start all active polling services on server startup
 */
export async function initializeAllPolling() {
  const db = await getDb();
  if (!db) return;

  try {
    const configs = await db.select().from(pollingConfig).where(eq(pollingConfig.enabled, 1));

    console.log(`[Polling] Initializing polling for ${configs.length} users`);

    for (const config of configs) {
      startPolling(config.userId);
    }
  } catch (error) {
    console.error("[Polling] Failed to initialize polling:", error);
  }
}

/**
 * Stop all polling services on server shutdown
 */
export function stopAllPolling() {
  console.log(`[Polling] Stopping all polling services (${pollingIntervals.size} active)`);
  pollingIntervals.forEach((_, userId) => {
    stopPolling(userId);
  });
}
