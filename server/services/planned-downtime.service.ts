import { getDb } from "../db";
import { plannedDowntime } from "../../drizzle/schema";
import { eq, and, gte, lte, or } from "drizzle-orm";

type RecurringType = "none" | "daily" | "weekly" | "monthly";

/**
 * Create a planned downtime window
 */
export async function createPlannedDowntime(
  userId: number,
  deviceId: string,
  title: string,
  startTime: Date,
  endTime: Date,
  description?: string,
  recurring: RecurringType = "none"
) {
  const db = await getDb();
  if (!db) return null;

  try {
    if (startTime >= endTime) {
      throw new Error("Start time must be before end time");
    }

    const result = await db.insert(plannedDowntime).values({
      userId,
      deviceId,
      title,
      description,
      startTime,
      endTime,
      recurring,
    });

    console.log(
      `[PlannedDowntime] Created maintenance window for device ${deviceId}: ${title}`
    );
    return result;
  } catch (error) {
    console.error("[PlannedDowntime] Failed to create maintenance window:", error);
    return null;
  }
}

/**
 * Get planned downtime windows for a device
 */
export async function getPlannedDowntimeForDevice(userId: number, deviceId: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    const windows = await db
      .select()
      .from(plannedDowntime)
      .where(and(eq(plannedDowntime.userId, userId), eq(plannedDowntime.deviceId, deviceId)));

    return windows;
  } catch (error) {
    console.error("[PlannedDowntime] Failed to get maintenance windows:", error);
    return [];
  }
}

/**
 * Get all planned downtime windows for a user
 */
export async function getAllPlannedDowntime(userId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const windows = await db
      .select()
      .from(plannedDowntime)
      .where(eq(plannedDowntime.userId, userId));

    return windows;
  } catch (error) {
    console.error("[PlannedDowntime] Failed to get all maintenance windows:", error);
    return [];
  }
}

/**
 * Check if a timestamp falls within any planned downtime window
 */
export async function isInPlannedDowntime(
  userId: number,
  deviceId: string,
  timestamp: Date
): Promise<boolean> {
  const windows = await getPlannedDowntimeForDevice(userId, deviceId);

  for (const window of windows) {
    if (isTimestampInWindow(timestamp, window)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a time range overlaps with any planned downtime
 */
export async function isRangeInPlannedDowntime(
  userId: number,
  deviceId: string,
  startTime: Date,
  endTime: Date
): Promise<boolean> {
  const windows = await getPlannedDowntimeForDevice(userId, deviceId);

  for (const window of windows) {
    if (rangesOverlap(startTime, endTime, window.startTime, window.endTime)) {
      return true;
    }
  }

  return false;
}

/**
 * Get planned downtime windows that overlap with a time range
 */
export async function getOverlappingPlannedDowntime(
  userId: number,
  deviceId: string,
  startTime: Date,
  endTime: Date
) {
  const windows = await getPlannedDowntimeForDevice(userId, deviceId);

  return windows.filter((window) => rangesOverlap(startTime, endTime, window.startTime, window.endTime));
}

/**
 * Calculate excluded time from planned downtime windows
 */
export async function calculateExcludedTime(
  userId: number,
  deviceId: string,
  startTime: Date,
  endTime: Date
): Promise<number> {
  const overlappingWindows = await getOverlappingPlannedDowntime(
    userId,
    deviceId,
    startTime,
    endTime
  );

  let totalExcludedMs = 0;

  for (const window of overlappingWindows) {
    const overlapStart = Math.max(startTime.getTime(), window.startTime.getTime());
    const overlapEnd = Math.min(endTime.getTime(), window.endTime.getTime());
    totalExcludedMs += Math.max(0, overlapEnd - overlapStart);
  }

  return Math.floor(totalExcludedMs / 1000); // Return in seconds
}

/**
 * Update a planned downtime window
 */
export async function updatePlannedDowntime(
  windowId: number,
  updates: Partial<typeof plannedDowntime.$inferInsert>
) {
  const db = await getDb();
  if (!db) return null;

  try {
    await db.update(plannedDowntime).set(updates).where(eq(plannedDowntime.id, windowId));

    console.log(`[PlannedDowntime] Updated maintenance window ${windowId}`);
    return true;
  } catch (error) {
    console.error("[PlannedDowntime] Failed to update maintenance window:", error);
    return false;
  }
}

/**
 * Delete a planned downtime window
 */
export async function deletePlannedDowntime(windowId: number) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.delete(plannedDowntime).where(eq(plannedDowntime.id, windowId));

    console.log(`[PlannedDowntime] Deleted maintenance window ${windowId}`);
    return true;
  } catch (error) {
    console.error("[PlannedDowntime] Failed to delete maintenance window:", error);
    return false;
  }
}

/**
 * Helper: Check if timestamp is within a window (accounting for recurring)
 */
function isTimestampInWindow(
  timestamp: Date,
  window: typeof plannedDowntime.$inferSelect
): boolean {
  if (!window.recurring || window.recurring === "none") {
    return timestamp >= window.startTime && timestamp <= window.endTime;
  }

  // For recurring windows, check if the time of day matches
  const windowStartHour = window.startTime.getHours();
  const windowStartMin = window.startTime.getMinutes();
  const windowEndHour = window.endTime.getHours();
  const windowEndMin = window.endTime.getMinutes();

  const timestampHour = timestamp.getHours();
  const timestampMin = timestamp.getMinutes();

  const windowStartMinutes = windowStartHour * 60 + windowStartMin;
  const windowEndMinutes = windowEndHour * 60 + windowEndMin;
  const timestampMinutes = timestampHour * 60 + timestampMin;

  let isInTimeWindow = false;

  if (windowStartMinutes <= windowEndMinutes) {
    isInTimeWindow = timestampMinutes >= windowStartMinutes && timestampMinutes <= windowEndMinutes;
  } else {
    // Window spans midnight
    isInTimeWindow = timestampMinutes >= windowStartMinutes || timestampMinutes <= windowEndMinutes;
  }

  if (!isInTimeWindow) return false;

  // Check day of week/month based on recurring type
  const day = timestamp.getDay();
  const date = timestamp.getDate();
  const windowDay = window.startTime.getDay();
  const windowDate = window.startTime.getDate();

  switch (window.recurring) {
    case "daily":
      return true;
    case "weekly":
      return day === windowDay;
    case "monthly":
      return date === windowDate;
    default:
      return false;
  }
}

/**
 * Helper: Check if two time ranges overlap
 */
function rangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1;
}
