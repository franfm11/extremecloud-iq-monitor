import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { extremeCloudService } from "./services/extremecloud.service";
import { recordDeviceStateChange, recordApiError } from "./services/availability.service";
import { availabilityRouter } from "./routers/availability";
import { advancedAvailabilityRouter } from "./routers/advanced-availability";
import { reportExportRouter } from "./routers/report-export";
import {
  getLatestApiToken,
  saveApiToken,
  getUserDevices,
  getDeviceById,
  upsertDevice,
  getUserClients,
  upsertClient,
  getUserAlerts,
  upsertAlert,
  acknowledgeAlert,
  getUserCliCommands,
  createCliCommand,
  updateCliCommand,
} from "./db";

export const appRouter = router({
  system: systemRouter,

  advanced: advancedAvailabilityRouter,
  reports: reportExportRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============================================================================
  // EXTREMECLOUD IQ AUTHENTICATION
  // ============================================================================

  extremecloud: router({
    /**
     * Login to ExtremeCloud IQ API and store token
     */
    login: publicProcedure
      .input(
        z.object({
          username: z.string().email("Invalid email"),
          password: z.string().min(1, "Password required"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const result = await extremeCloudService.login(input.username, input.password);

          // For public login, use a test user ID (1)
          const userId = ctx.user?.id || 1;

          // Store token in database
          const expiresAt = new Date(Date.now() + result.expiresIn * 1000);
          await saveApiToken({
            userId,
            accessToken: result.token,
            tokenType: "Bearer",
            expiresAt,
          });

          return {
            success: true,
            expiresIn: result.expiresIn,
            expiresAt: expiresAt.toISOString(),
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Login failed";
          throw new Error(message);
        }
      }),

    /**
     * Check if user has valid token
     */
    hasValidToken: protectedProcedure.query(async ({ ctx }) => {
      const token = await getLatestApiToken(ctx.user.id);
      if (!token) {
        return { hasToken: false };
      }

      const isExpired = token.expiresAt < new Date();
      return {
        hasToken: true,
        isExpired,
        expiresAt: token.expiresAt.toISOString(),
      };
    }),

    /**
     * Get rate limit status
     */
    getRateLimitStatus: protectedProcedure.query(() => {
      return extremeCloudService.getRateLimitState();
    }),

    /**
     * Sync devices from XIQ to database
     */
    syncDevices: publicProcedure.mutation(async () => {
      try {
        const userId = 1;
        const token = await getLatestApiToken(userId);
        if (!token) throw new Error("No token");
        if (token.expiresAt < new Date()) throw new Error("Expired");
        const devicesData = await extremeCloudService.getDevices(token.accessToken, { page: 1, limit: 100 });
        if (!devicesData?.data) return { success: true, count: 0 };
        let count = 0;
        for (const d of devicesData.data) {
          try {
            await upsertDevice({
              userId,
              deviceId: d.id,
              hostname: d.name || d.id,
              productType: d.device_type || "Unknown",
              ipAddress: d.ip_address || "",
              macAddress: d.mac_address || "",
              connected: d.connected ? 1 : 0,
              lastConnectTime: d.last_seen ? new Date(d.last_seen) : new Date(),
              rawData: d,
            });
            count++;
          } catch (e) {}
        }
        return { success: true, count };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sync failed";
        throw new Error(message);
      }
    }),
  }),

  // ============================================================================
  // DEVICE MANAGEMENT
  // ============================================================================

  devices: router({
    /**
     * List all devices for current user
     */
    list: protectedProcedure
      .input(
        z.object({
          page: z.number().int().positive().default(1),
          limit: z.number().int().positive().default(10),
        })
      )
      .query(async ({ input, ctx }) => {
        try {
          const token = await getLatestApiToken(ctx.user.id);
          if (!token) {
            return { devices: [], total: 0, page: input.page };
          }

          if (token.expiresAt < new Date()) {
            return { devices: [], total: 0, page: input.page, error: "Token expired" };
          }

          const devices = await getUserDevices(ctx.user.id, input.page, input.limit);
          return { devices, total: devices.length, page: input.page };
        } catch (error) {
          console.error("[Devices] Failed to list:", error);
          return { devices: [], total: 0, page: input.page, error: "Failed to fetch devices" };
        }
      }),

    /**
     * Get device details
     */
    detail: protectedProcedure
      .input(z.object({ deviceId: z.string() }))
      .query(async ({ input, ctx }) => {
        try {
          const device = await getDeviceById(ctx.user.id, input.deviceId);
          if (!device) {
            throw new Error("Device not found");
          }
          return device;
        } catch (error) {
          console.error("[Devices] Failed to get detail:", error);
          throw new Error("Failed to fetch device details");
        }
      }),
  }),

  // ============================================================================
  // CLIENT MANAGEMENT
  // ============================================================================

  clients: router({
    /**
     * List all clients for current user
     */
     list: protectedProcedure
      .input(
        z.object({
          page: z.number().int().positive().default(1),
          limit: z.number().int().positive().default(10),
        })
      )
      .query(async ({ input, ctx }) => {
        try {
          const token = await getLatestApiToken(ctx.user.id);
          if (!token) {
            return { clients: [], total: 0 };
          }
          if (token.expiresAt < new Date()) {
            return { clients: [], total: 0, error: "Token expired" };
          }
          const offset = (input.page - 1) * input.limit;
          const clients = await getUserClients(ctx.user.id, undefined, input.limit, offset);
          return { clients, total: clients.length };
        } catch (error) {
          console.error("[Clients] Failed to list:", error);
          return { clients: [], total: 0, error: "Failed to fetch clients" };
        }
      }),
  }),

  // ============================================================================
  // ALERT MANAGEMENT
  // ============================================================================

  alerts: router({
    /**
     * List all alerts for current user
     */
    list: protectedProcedure
      .input(
        z.object({
          page: z.number().int().positive().default(1),
          limit: z.number().int().positive().default(10),
        })
      )
      .query(async ({ input, ctx }) => {
        try {
          const offset = (input.page - 1) * input.limit;
          const alerts = await getUserAlerts(ctx.user.id, undefined, input.limit, offset);
          return { alerts, total: alerts.length };
        } catch (error) {
          console.error("[Alerts] Failed to list:", error);
          return { alerts: [], total: 0, error: "Failed to fetch alerts" };
        }
      }),

    /**
     * Acknowledge alert
     */
    acknowledge: protectedProcedure
      .input(z.object({ alertId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        try {
          await acknowledgeAlert(input.alertId, String(ctx.user.id));
          return { success: true };
        } catch (error) {
          console.error("[Alerts] Failed to acknowledge:", error);
          throw new Error("Failed to acknowledge alert");
        }
      }),
  }),

  // ============================================================================
  // CLI COMMANDS
  // ============================================================================

  cli: router({
    /**
     * List CLI commands
     */
    list: protectedProcedure
      .input(
        z.object({
          page: z.number().int().positive().default(1),
          limit: z.number().int().positive().default(10),
        })
      )
      .query(async ({ input, ctx }) => {
        try {
          const offset = (input.page - 1) * input.limit;
          const commands = await getUserCliCommands(ctx.user.id, undefined, input.limit, offset);
          return { commands, total: commands.length };
        } catch (error) {
          console.error("[CLI] Failed to list:", error);
          return { commands: [], total: 0, error: "Failed to fetch commands" };
        }
      }),

    /**
     * Create CLI command
     */
    create: protectedProcedure
      .input(
        z.object({
          deviceId: z.string(),
          command: z.string(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const result = await createCliCommand({
            userId: ctx.user.id,
            deviceId: input.deviceId,
            command: input.command,
            status: "pending",
            output: "",
            createdAt: new Date(),
          });
          return { success: true, id: result };
        } catch (error) {
          console.error("[CLI] Failed to create:", error);
          throw new Error("Failed to create command");
        }
      }),
  }),

  // ============================================================================
  // AVAILABILITY MONITORING
  // ============================================================================

  availability: availabilityRouter,
});

export type AppRouter = typeof appRouter;
