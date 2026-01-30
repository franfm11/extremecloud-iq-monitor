import { getDb } from "../db";
import { deviceAvailabilityEvents, flappingEvents } from "../../drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";

interface EventTransition {
  timestamp: Date;
  status: "up" | "down";
  detectionMethod: string;
}

const FLAPPING_THRESHOLD = 5; // Number of transitions to consider flapping
const FLAPPING_WINDOW = 5 * 60 * 1000; // 5 minutes in milliseconds
const FLAPPING_SEVERITY_MAP: Record<number, "low" | "medium" | "high"> = {
  5: "low",
  10: "medium",
  15: "high",
};

/**
 * Record a device state change event with full details
 */
export async function recordEvent(
  userId: number,
  deviceId: string,
  status: "up" | "down",
  detectionMethod: "polling" | "trap" | "fast_polling",
  reason?: string,
  retryAttempts: number = 0
) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(deviceAvailabilityEvents).values({
      userId,
      deviceId,
      eventType: status,
      status,
      startTime: new Date(),
      reason,
      detectionMethod,
      retryAttempts,
    });

    console.log(
      `[EventCounter] Recorded ${status} event for device ${deviceId} (method: ${detectionMethod})`
    );

    // Check for flapping after recording event
    await detectFlapping(userId, deviceId);

    return result;
  } catch (error) {
    console.error("[EventCounter] Failed to record event:", error);
    return null;
  }
}

/**
 * Get event count for a device in a time window
 */
export async function getEventCount(
  userId: number,
  deviceId: string,
  startTime: Date,
  endTime: Date,
  statusFilter?: "up" | "down"
) {
  const db = await getDb();
  if (!db) return 0;

  try {
    const whereConditions = [
      eq(deviceAvailabilityEvents.userId, userId),
      eq(deviceAvailabilityEvents.deviceId, deviceId),
      gte(deviceAvailabilityEvents.startTime, startTime),
      lte(deviceAvailabilityEvents.startTime, endTime),
    ];

    if (statusFilter) {
      whereConditions.push(eq(deviceAvailabilityEvents.status, statusFilter));
    }

    const events = await db
      .select()
      .from(deviceAvailabilityEvents)
      .where(and(...whereConditions));
    return events.length;
  } catch (error) {
    console.error("[EventCounter] Failed to get event count:", error);
    return 0;
  }
}

/**
 * Get all events for a device in a time window
 */
export async function getEvents(
  userId: number,
  deviceId: string,
  startTime: Date,
  endTime: Date
) {
  const db = await getDb();
  if (!db) return [];

  try {
    const events = await db
      .select()
      .from(deviceAvailabilityEvents)
      .where(
        and(
          eq(deviceAvailabilityEvents.userId, userId),
          eq(deviceAvailabilityEvents.deviceId, deviceId),
          gte(deviceAvailabilityEvents.startTime, startTime),
          lte(deviceAvailabilityEvents.startTime, endTime)
        )
      );

    return events;
  } catch (error) {
    console.error("[EventCounter] Failed to get events:", error);
    return [];
  }
}

/**
 * Detect flapping (rapid UP/DOWN transitions)
 */
export async function detectFlapping(userId: number, deviceId: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - FLAPPING_WINDOW);

    // Get recent events
    const recentEvents = await db
      .select()
      .from(deviceAvailabilityEvents)
      .where(
        and(
          eq(deviceAvailabilityEvents.userId, userId),
          eq(deviceAvailabilityEvents.deviceId, deviceId),
          gte(deviceAvailabilityEvents.startTime, windowStart),
          lte(deviceAvailabilityEvents.startTime, now)
        )
      );

    if (recentEvents.length < FLAPPING_THRESHOLD) {
      return null;
    }

    // Count transitions
    let transitionCount = 0;
    let lastStatus: "up" | "down" | null = null;

    for (const event of recentEvents) {
      if (lastStatus !== null && lastStatus !== event.status) {
        transitionCount++;
      }
      lastStatus = event.status;
    }

    // Check if flapping threshold exceeded
    if (transitionCount >= FLAPPING_THRESHOLD) {
      const severity = FLAPPING_SEVERITY_MAP[transitionCount] || "high";

      console.warn(
        `[Flapping] Device ${deviceId} detected flapping: ${transitionCount} transitions in ${FLAPPING_WINDOW / 1000}s`
      );

      // Check if flapping event already exists
      const existingFlapping = await db
        .select()
        .from(flappingEvents)
        .where(
          and(
            eq(flappingEvents.userId, userId),
            eq(flappingEvents.deviceId, deviceId),
            eq(flappingEvents.acknowledged, 0),
            gte(flappingEvents.startTime, windowStart)
          )
        )
        .limit(1);

      if (existingFlapping.length === 0) {
        // Record new flapping event
        const result = await db.insert(flappingEvents).values({
          userId,
          deviceId,
          transitionCount,
          timeWindowSeconds: FLAPPING_WINDOW / 1000,
          startTime: windowStart,
          endTime: now,
          severity,
          acknowledged: 0,
        });

        return result;
      }
    }

    return null;
  } catch (error) {
    console.error("[EventCounter] Failed to detect flapping:", error);
    return null;
  }
}

/**
 * Get flapping events for a device
 */
export async function getFlappingEvents(
  userId: number,
  deviceId?: string,
  acknowledgedOnly: boolean = false
) {
  const db = await getDb();
  if (!db) return [];

  try {
    const whereConditions = [eq(flappingEvents.userId, userId)];

    if (deviceId) {
      whereConditions.push(eq(flappingEvents.deviceId, deviceId));
    }

    if (acknowledgedOnly) {
      whereConditions.push(eq(flappingEvents.acknowledged, 1));
    }

    const events = await db
      .select()
      .from(flappingEvents)
      .where(and(...whereConditions));
    return events;
  } catch (error) {
    console.error("[EventCounter] Failed to get flapping events:", error);
    return [];
  }
}

/**
 * Acknowledge a flapping event
 */
export async function acknowledgeFlappingEvent(eventId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    await db
      .update(flappingEvents)
      .set({ acknowledged: 1 })
      .where(eq(flappingEvents.id, eventId));

    console.log(`[Flapping] Acknowledged flapping event ${eventId}`);
    return true;
  } catch (error) {
    console.error("[EventCounter] Failed to acknowledge flapping event:", error);
    return false;
  }
}

/**
 * Get transition count for a device in a time window
 */
export async function getTransitionCount(
  userId: number,
  deviceId: string,
  startTime: Date,
  endTime: Date
) {
  const db = await getDb();
  if (!db) return 0;

  try {
    const events = await db
      .select()
      .from(deviceAvailabilityEvents)
      .where(
        and(
          eq(deviceAvailabilityEvents.userId, userId),
          eq(deviceAvailabilityEvents.deviceId, deviceId),
          gte(deviceAvailabilityEvents.startTime, startTime),
          lte(deviceAvailabilityEvents.startTime, endTime)
        )
      );

    if (events.length < 2) return 0;

    let transitions = 0;
    for (let i = 1; i < events.length; i++) {
      if (events[i].status !== events[i - 1].status) {
        transitions++;
      }
    }

    return transitions;
  } catch (error) {
    console.error("[EventCounter] Failed to get transition count:", error);
    return 0;
  }
}

/**
 * Get event statistics for a device
 */
export async function getEventStats(
  userId: number,
  deviceId: string,
  startTime: Date,
  endTime: Date
) {
  const db = await getDb();
  if (!db) return null;

  try {
    const events = await getEvents(userId, deviceId, startTime, endTime);
    const upEvents = events.filter((e) => e.status === "up").length;
    const downEvents = events.filter((e) => e.status === "down").length;
    const transitions = await getTransitionCount(userId, deviceId, startTime, endTime);

    const pollingEvents = events.filter((e) => e.detectionMethod === "polling").length;
    const trapEvents = events.filter((e) => e.detectionMethod === "trap").length;
    const fastPollingEvents = events.filter((e) => e.detectionMethod === "fast_polling").length;

    return {
      totalEvents: events.length,
      upEvents,
      downEvents,
      transitions,
      detectionMethods: {
        polling: pollingEvents,
        trap: trapEvents,
        fastPolling: fastPollingEvents,
      },
      averageRetries: events.reduce((sum, e) => sum + (e.retryAttempts || 0), 0) / events.length,
    };
  } catch (error) {
    console.error("[EventCounter] Failed to get event stats:", error);
    return null;
  }
}
