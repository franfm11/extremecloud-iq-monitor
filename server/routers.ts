import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { extremeCloudService } from "./services/extremecloud.service";
import { recordDeviceStateChange, recordApiError } from "./services/availability.service";
import { availabilityRouter } from "./routers/availability";
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
    login: protectedProcedure
      .input(
        z.object({
          username: z.string().email("Invalid email"),
          password: z.string().min(1, "Password required"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const result = await extremeCloudService.login(input.username, input.password);

          // Store token in database
          const expiresAt = new Date(Date.now() + result.expiresIn * 1000);
          await saveApiToken({
            userId: ctx.user.id,
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
          limit: z.number().int().positive().max(100).default(20),
        })
      )
      .query(async ({ input, ctx }): Promise<any> => {
        const token = await getLatestApiToken(ctx.user.id);
        if (!token || token.expiresAt < new Date()) {
          throw new Error("No valid authentication token. Please login first.");
        }

        // Fetch from API
        const apiResponse = await extremeCloudService.getDevices(token.accessToken, {
          page: input.page,
          limit: input.limit,
          views: "basic,detail,status",
        });

        if (apiResponse.error) {
          await recordApiError(
            ctx.user.id,
            "/devices/list",
            "API_ERROR",
            apiResponse.message || "Failed to fetch devices",
            apiResponse.statusCode
          );
          
          const cachedDevices = await getUserDevices(ctx.user.id, input.limit, (input.page - 1) * input.limit);
          return {
            data: cachedDevices || [],
            page: input.page,
            limit: input.limit,
            total: cachedDevices?.length || 0,
            fromCache: true,
            error: apiResponse.message || "API unavailable, showing cached data",
          };
        }

        // Cache devices in database and record state changes
        if (apiResponse.data && Array.isArray(apiResponse.data)) {
          for (const device of apiResponse.data) {
            await upsertDevice({
              userId: ctx.user.id,
              deviceId: String(device.id),
              hostname: device.hostname,
              macAddress: device.mac_address,
              ipAddress: device.ip_address,
              serialNumber: device.serial_number,
              productType: device.product_type,
              softwareVersion: device.software_version,
              connected: device.connected ? 1 : 0,
              lastConnectTime: device.last_connect_time ? new Date(device.last_connect_time) : null,
              deviceFunction: device.device_function,
              managedStatus: device.device_admin_state,
              rawData: device,
            });

            // Record device state for availability tracking
            const status = device.connected ? "up" : "down";
            await recordDeviceStateChange(
              ctx.user.id,
              String(device.id),
              status,
              device.connected ? "Device is connected" : "Device is disconnected"
            );
          }
        }

        return {
          data: apiResponse.data || [],
          page: apiResponse.page || input.page,
          limit: apiResponse.limit || input.limit,
          total: apiResponse.total_count || 0,
        };
      }),

    /**
     * Get single device details
     */
    detail: protectedProcedure
      .input(z.object({ deviceId: z.string() }))
      .query(async ({ input, ctx }) => {
        const token = await getLatestApiToken(ctx.user.id);
        if (!token || token.expiresAt < new Date()) {
          throw new Error("No valid authentication token. Please login first.");
        }

        const apiResponse = await extremeCloudService.getDeviceDetail(token.accessToken, input.deviceId);

        if (apiResponse.error) {
          throw new Error(apiResponse.message || "Failed to fetch device details");
        }

        // Cache in database and record state
        if (apiResponse.data) {
          const device = apiResponse.data;
          await upsertDevice({
            userId: ctx.user.id,
            deviceId: String(device.id),
            hostname: device.hostname,
            macAddress: device.mac_address,
            ipAddress: device.ip_address,
            serialNumber: device.serial_number,
            productType: device.product_type,
            softwareVersion: device.software_version,
            connected: device.connected ? 1 : 0,
            lastConnectTime: device.last_connect_time ? new Date(device.last_connect_time) : null,
            deviceFunction: device.device_function,
            managedStatus: device.device_admin_state,
            rawData: device,
          });

          // Record device state for availability tracking
          const status = device.connected ? "up" : "down";
          await recordDeviceStateChange(
            ctx.user.id,
            String(device.id),
            status,
            device.connected ? "Device is connected" : "Device is disconnected"
          );
        }

        return apiResponse.data;
      }),

    /**
     * Get cached devices (fallback when API is unavailable)
     */
    getCached: protectedProcedure
      .input(
        z.object({
          page: z.number().int().positive().default(1),
          limit: z.number().int().positive().max(100).default(20),
        })
      )
      .query(async ({ input, ctx }) => {
        const offset = (input.page - 1) * input.limit;
        const devices = await getUserDevices(ctx.user.id, input.limit, offset);
        return devices;
      }),
  }),

  // ============================================================================
  // CLIENTS MANAGEMENT
  // ============================================================================

  clients: router({
    /**
     * List connected clients
     */
    list: protectedProcedure
      .input(
        z.object({
          page: z.number().int().positive().default(1),
          limit: z.number().int().positive().max(100).default(20),
          deviceId: z.string().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        const token = await getLatestApiToken(ctx.user.id);
        if (!token || token.expiresAt < new Date()) {
          throw new Error("No valid authentication token. Please login first.");
        }

        const apiResponse = await extremeCloudService.getClients(token.accessToken, {
          page: input.page,
          limit: input.limit,
          deviceId: input.deviceId,
        });

        if (apiResponse.error) {
          throw new Error(apiResponse.message || "Failed to fetch clients");
        }

        // Cache clients in database
        if (apiResponse.data && Array.isArray(apiResponse.data)) {
          for (const client of apiResponse.data) {
            await upsertClient({
              userId: ctx.user.id,
              clientId: String(client.id),
              deviceId: String(client.device_id),
              hostname: client.hostname,
              macAddress: client.mac_address,
              ipAddress: client.ip_address,
              ipv6Address: client.ipv6_address,
              osType: client.os_type,
              ssid: client.ssid,
              vlan: client.vlan,
              connected: client.connected ? 1 : 0,
              connectionType: client.connection_type,
              signalStrength: client.rssi,
              healthScore: client.client_health,
              rawData: client,
            });
          }
        }

        return {
          data: apiResponse.data || [],
          page: apiResponse.page || input.page,
          limit: apiResponse.limit || input.limit,
          total: apiResponse.total_count || 0,
        };
      }),

    /**
     * Get cached clients
     */
    getCached: protectedProcedure
      .input(
        z.object({
          page: z.number().int().positive().default(1),
          limit: z.number().int().positive().max(100).default(20),
          deviceId: z.string().optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        const offset = (input.page - 1) * input.limit;
        const clients = await getUserClients(ctx.user.id, input.deviceId, input.limit, offset);
        return clients;
      }),
  }),

  // ============================================================================
  // ALERTS MANAGEMENT
  // ============================================================================

  alerts: router({
    /**
     * List alerts with optional filtering
     */
    list: protectedProcedure
      .input(
        z.object({
          page: z.number().int().positive().default(1),
          limit: z.number().int().positive().max(100).default(20),
          severity: z.enum(["critical", "high", "medium", "low", "info"]).optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        const token = await getLatestApiToken(ctx.user.id);
        if (!token || token.expiresAt < new Date()) {
          throw new Error("No valid authentication token. Please login first.");
        }

        const apiResponse = await extremeCloudService.getAlerts(token.accessToken, {
          page: input.page,
          limit: input.limit,
          severity: input.severity,
        });

        if (apiResponse.error) {
          throw new Error(apiResponse.message || "Failed to fetch alerts");
        }

        // Cache alerts in database
        if (apiResponse.data && Array.isArray(apiResponse.data)) {
          for (const alert of apiResponse.data) {
            await upsertAlert({
              userId: ctx.user.id,
              alertId: String(alert.id),
              deviceId: alert.device_id ? String(alert.device_id) : null,
              severity: alert.severity_name?.toLowerCase() || "info",
              category: alert.category,
              title: alert.title,
              description: alert.description,
              timestamp: new Date(alert.timestamp),
              acknowledged: alert.acknowledged ? 1 : 0,
              rawData: alert,
            });
          }
        }

        return {
          data: apiResponse.data || [],
          page: apiResponse.page || input.page,
          limit: apiResponse.limit || input.limit,
          total: apiResponse.total_count || 0,
        };
      }),

    /**
     * Get cached alerts
     */
    getCached: protectedProcedure
      .input(
        z.object({
          page: z.number().int().positive().default(1),
          limit: z.number().int().positive().max(100).default(20),
          severity: z.enum(["critical", "high", "medium", "low", "info"]).optional(),
        })
      )
      .query(async ({ input, ctx }) => {
        const offset = (input.page - 1) * input.limit;
        const alerts = await getUserAlerts(ctx.user.id, input.severity, input.limit, offset);
        return alerts;
      }),

    /**
     * Acknowledge an alert
     */
    acknowledge: protectedProcedure
      .input(z.object({ alertId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await acknowledgeAlert(input.alertId, ctx.user.email || ctx.user.name || "Unknown");
        return { success: true };
      }),
  }),

  // ============================================================================
  // CLI DIAGNOSTICS
  // ============================================================================

  cli: router({
    /**
     * Execute CLI commands on device
     */
    execute: protectedProcedure
      .input(
        z.object({
          deviceId: z.string(),
          commands: z.array(z.string()).min(1),
          async: z.boolean().default(false),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const token = await getLatestApiToken(ctx.user.id);
        if (!token || token.expiresAt < new Date()) {
          throw new Error("No valid authentication token. Please login first.");
        }

        // Create command record
        const commandRecord = await createCliCommand({
          userId: ctx.user.id,
          deviceId: input.deviceId,
          command: input.commands.join("; "),
          status: "pending",
        });

        try {
          const apiResponse = await extremeCloudService.executeCli(
            token.accessToken,
            [parseInt(input.deviceId, 10)],
            input.commands,
            { async: input.async }
          );

          if (apiResponse.error) {
            await updateCliCommand(commandRecord.id, {
              status: "failed",
              errorMessage: apiResponse.message,
            });
            throw new Error(apiResponse.message || "Failed to execute CLI commands");
          }

          // Update command with output
          const output = apiResponse.device_cli_outputs ? JSON.stringify(apiResponse.device_cli_outputs) : "";
          await updateCliCommand(commandRecord.id, {
            status: "success",
            output,
            completedAt: new Date(),
          });

          return {
            success: true,
            commandId: commandRecord.id,
            output: apiResponse.device_cli_outputs,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Command execution failed";
          await updateCliCommand(commandRecord.id, {
            status: "failed",
            errorMessage: message,
          });
          throw error;
        }
      }),

    /**
     * Get command history
     */
    history: protectedProcedure
      .input(
        z.object({
          deviceId: z.string().optional(),
          limit: z.number().int().positive().max(50).default(20),
        })
      )
      .query(async ({ input, ctx }) => {
        return await getUserCliCommands(ctx.user.id, input.deviceId, input.limit);
      }),
   }),

  availability: availabilityRouter,
});
export type AppRouter = typeof appRouter;
