import { getDb } from "../db";
import { 
  deviceAvailability, 
  InsertDeviceAvailability,
  apiErrors,
  InsertApiError 
} from "../../drizzle/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

/**
 * Period type for availability reports
 */
export type PeriodType = "5m" | "1h" | "24h" | "7d" | "30d";

/**
 * Availability report data
 */
export interface AvailabilityReport {
  deviceId: string;
  period: PeriodType;
  uptimePercentage: number;
  downtime: number; // in seconds
  uptime: number; // in seconds
  totalTime: number; // in seconds
  outages: Array<{
    startTime: Date;
    endTime: Date;
    duration: number; // in seconds
    reason?: string;
  }>;
  apiErrors: number;
  lastStateChange: Date | null;
  currentStatus: "up" | "down" | "unknown";
}

/**
 * Get period duration in milliseconds
 */
function getPeriodDuration(period: PeriodType): number {
  const durations: Record<PeriodType, number> = {
    "5m": 5 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };
  return durations[period];
}

/**
 * Record device state change in availability history
 */
export async function recordDeviceStateChange(
  userId: number,
  deviceId: string,
  status: "up" | "down",
  reason?: string
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Availability] Cannot record state change: database not available");
    return;
  }

  try {
    const data: InsertDeviceAvailability = {
      userId,
      deviceId,
      status,
      reason,
    };

    await db.insert(deviceAvailability).values(data);
    console.log(`[Availability] Recorded ${status} state for device ${deviceId}`);
  } catch (error) {
    console.error("[Availability] Failed to record state change:", error);
  }
}

/**
 * Record API error separately from device state
 */
export async function recordApiError(
  userId: number,
  endpoint: string,
  errorCode?: string,
  errorMessage?: string,
  statusCode?: number
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Availability] Cannot record API error: database not available");
    return;
  }

  try {
    const data: InsertApiError = {
      userId,
      endpoint,
      errorCode,
      errorMessage,
      statusCode,
    };

    await db.insert(apiErrors).values(data);
    console.log(`[Availability] Recorded API error for endpoint ${endpoint}`);
  } catch (error) {
    console.error("[Availability] Failed to record API error:", error);
  }
}

/**
 * Get availability report for a device in a specific period
 */
export async function getAvailabilityReport(
  userId: number,
  deviceId: string,
  period: PeriodType
): Promise<AvailabilityReport> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const periodMs = getPeriodDuration(period);
  const now = new Date();
  const startTime = new Date(now.getTime() - periodMs);

  // Get all state changes in the period
  const stateChanges = await db
    .select()
    .from(deviceAvailability)
    .where(
      and(
        eq(deviceAvailability.userId, userId),
        eq(deviceAvailability.deviceId, deviceId),
        gte(deviceAvailability.timestamp, startTime),
        lte(deviceAvailability.timestamp, now)
      )
    )
    .orderBy(deviceAvailability.timestamp);

  // Get API errors in the period
  const apiErrorsCount = await db
    .select()
    .from(apiErrors)
    .where(
      and(
        eq(apiErrors.userId, userId),
        gte(apiErrors.timestamp, startTime),
        lte(apiErrors.timestamp, now)
      )
    );

  // Get current status (most recent state change)
  const lastState = await db
    .select()
    .from(deviceAvailability)
    .where(
      and(
        eq(deviceAvailability.userId, userId),
        eq(deviceAvailability.deviceId, deviceId)
      )
    )
    .orderBy(desc(deviceAvailability.timestamp))
    .limit(1);

  const currentStatus = lastState.length > 0 ? lastState[0].status : "unknown";

  // Calculate uptime and outages
  let uptime = 0;
  let downtime = 0;
  const outages: Array<{
    startTime: Date;
    endTime: Date;
    duration: number;
    reason?: string;
  }> = [];

  if (stateChanges.length === 0) {
    // No state changes recorded in this period
    // Assume the device has been in the current state for the entire period
    const totalSeconds = periodMs / 1000;
    if (currentStatus === "up") {
      uptime = totalSeconds;
    } else if (currentStatus === "down") {
      downtime = totalSeconds;
    }
  } else {
    // Process state changes to calculate uptime/downtime
    for (let i = 0; i < stateChanges.length; i++) {
      const current = stateChanges[i];
      const next = stateChanges[i + 1];

      // Duration until next state change or end of period
      const endTime = next ? new Date(next.timestamp) : now;
      const duration = (endTime.getTime() - current.timestamp.getTime()) / 1000;

      if (current.status === "up") {
        uptime += duration;
      } else if (current.status === "down") {
        downtime += duration;
        outages.push({
          startTime: new Date(current.timestamp),
          endTime,
          duration,
          reason: current.reason || undefined,
        });
      }
    }
  }

  const totalTime = uptime + downtime;
  const uptimePercentage = totalTime > 0 ? (uptime / totalTime) * 100 : 0;

  return {
    deviceId,
    period,
    uptimePercentage: Math.round(uptimePercentage * 100) / 100,
    downtime: Math.round(downtime),
    uptime: Math.round(uptime),
    totalTime: Math.round(totalTime),
    outages,
    apiErrors: apiErrorsCount.length,
    lastStateChange: lastState.length > 0 ? new Date(lastState[0].timestamp) : null,
    currentStatus,
  };
}

/**
 * Get availability reports for multiple periods
 */
export async function getAvailabilityReports(
  userId: number,
  deviceId: string,
  periods: PeriodType[] = ["5m", "1h", "24h", "7d", "30d"]
): Promise<Record<PeriodType, AvailabilityReport>> {
  const reports: Record<PeriodType, AvailabilityReport> = {} as Record<PeriodType, AvailabilityReport>;

  for (const period of periods) {
    reports[period] = await getAvailabilityReport(userId, deviceId, period);
  }

  return reports;
}

/**
 * Get recent outages for a device
 */
export async function getRecentOutages(
  userId: number,
  deviceId: string,
  limit: number = 10
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const outages = await db
    .select()
    .from(deviceAvailability)
    .where(
      and(
        eq(deviceAvailability.userId, userId),
        eq(deviceAvailability.deviceId, deviceId),
        eq(deviceAvailability.status, "down")
      )
    )
    .orderBy(desc(deviceAvailability.timestamp))
    .limit(limit);

  return outages.map((outage) => ({
    startTime: new Date(outage.timestamp),
    duration: outage.durationSeconds || 0,
    reason: outage.reason || undefined,
  }));
}

/**
 * Get availability statistics for all devices
 */
export async function getDevicesAvailabilityStats(
  userId: number,
  period: PeriodType = "24h"
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const periodMs = getPeriodDuration(period);
  const now = new Date();
  const startTime = new Date(now.getTime() - periodMs);

  // Get all devices for this user
  const devices = await db
    .select()
    .from(deviceAvailability)
    .where(
      and(
        eq(deviceAvailability.userId, userId),
        gte(deviceAvailability.timestamp, startTime)
      )
    );

  // Group by device and calculate stats
  const deviceStats: Record<string, { uptime: number; downtime: number; lastStatus: string }> = {};

  for (const record of devices) {
    if (!deviceStats[record.deviceId]) {
      deviceStats[record.deviceId] = { uptime: 0, downtime: 0, lastStatus: "unknown" };
    }

    if (record.status === "up") {
      deviceStats[record.deviceId].uptime += record.durationSeconds || 0;
    } else {
      deviceStats[record.deviceId].downtime += record.durationSeconds || 0;
    }

    deviceStats[record.deviceId].lastStatus = record.status;
  }

  return Object.entries(deviceStats).map(([deviceId, stats]) => ({
    deviceId,
    uptimePercentage: stats.uptime + stats.downtime > 0
      ? Math.round((stats.uptime / (stats.uptime + stats.downtime)) * 10000) / 100
      : 0,
    lastStatus: stats.lastStatus,
  }));
}
