import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as pollingService from "../services/polling.service";
import * as eventCounterService from "../services/event-counter.service";
import * as plannedDowntimeService from "../services/planned-downtime.service";
import * as webhookService from "../services/webhook.service";

export const advancedAvailabilityRouter = router({
  // Polling Configuration
  polling: router({
    getConfig: protectedProcedure.query(async ({ ctx }) => {
      return await pollingService.getPollingConfig(ctx.user.id);
    }),

    updateConfig: protectedProcedure
      .input(
        z.object({
          pollingIntervalSeconds: z.number().min(60).max(3600).optional(),
          fastPollingIntervalSeconds: z.number().min(10).max(300).optional(),
          fastPollingRetries: z.number().min(1).max(10).optional(),
          enabled: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const updates: any = {};
        if (input.pollingIntervalSeconds !== undefined) {
          updates.pollingIntervalSeconds = input.pollingIntervalSeconds;
        }
        if (input.fastPollingIntervalSeconds !== undefined) {
          updates.fastPollingIntervalSeconds = input.fastPollingIntervalSeconds;
        }
        if (input.fastPollingRetries !== undefined) {
          updates.fastPollingRetries = input.fastPollingRetries;
        }
        if (input.enabled !== undefined) {
          updates.enabled = input.enabled ? 1 : 0;
        }

        return await pollingService.updatePollingConfig(ctx.user.id, updates);
      }),

    startPolling: protectedProcedure.mutation(async ({ ctx }) => {
      pollingService.startPolling(ctx.user.id);
      return { success: true };
    }),

    stopPolling: protectedProcedure.mutation(async ({ ctx }) => {
      pollingService.stopPolling(ctx.user.id);
      return { success: true };
    }),
  }),

  // Event Counter and Flapping Detection
  events: router({
    getEvents: protectedProcedure
      .input(
        z.object({
          deviceId: z.string(),
          startTime: z.date(),
          endTime: z.date(),
        })
      )
      .query(async ({ ctx, input }) => {
        return await eventCounterService.getEvents(
          ctx.user.id,
          input.deviceId,
          input.startTime,
          input.endTime
        );
      }),

    getEventStats: protectedProcedure
      .input(
        z.object({
          deviceId: z.string(),
          startTime: z.date(),
          endTime: z.date(),
        })
      )
      .query(async ({ ctx, input }) => {
        return await eventCounterService.getEventStats(
          ctx.user.id,
          input.deviceId,
          input.startTime,
          input.endTime
        );
      }),

    getFlappingEvents: protectedProcedure
      .input(
        z.object({
          deviceId: z.string().optional(),
          acknowledgedOnly: z.boolean().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        return await eventCounterService.getFlappingEvents(
          ctx.user.id,
          input.deviceId,
          input.acknowledgedOnly
        );
      }),

    acknowledgeFlappingEvent: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .mutation(async ({ input }) => {
        return await eventCounterService.acknowledgeFlappingEvent(input.eventId);
      }),
  }),

  // Planned Downtime
  plannedDowntime: router({
    create: protectedProcedure
      .input(
        z.object({
          deviceId: z.string(),
          title: z.string().min(1).max(255),
          description: z.string().optional(),
          startTime: z.date(),
          endTime: z.date(),
          recurring: z.enum(["none", "daily", "weekly", "monthly"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await plannedDowntimeService.createPlannedDowntime(
          ctx.user.id,
          input.deviceId,
          input.title,
          input.startTime,
          input.endTime,
          input.description,
          input.recurring as any
        );
      }),

    getForDevice: protectedProcedure
      .input(z.object({ deviceId: z.string() }))
      .query(async ({ ctx, input }) => {
        return await plannedDowntimeService.getPlannedDowntimeForDevice(
          ctx.user.id,
          input.deviceId
        );
      }),

    getAll: protectedProcedure.query(async ({ ctx }) => {
      return await plannedDowntimeService.getAllPlannedDowntime(ctx.user.id);
    }),

    update: protectedProcedure
      .input(
        z.object({
          windowId: z.number(),
          title: z.string().optional(),
          description: z.string().optional(),
          startTime: z.date().optional(),
          endTime: z.date().optional(),
          recurring: z.enum(["none", "daily", "weekly", "monthly"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const updates: any = {};
        if (input.title !== undefined) updates.title = input.title;
        if (input.description !== undefined) updates.description = input.description;
        if (input.startTime !== undefined) updates.startTime = input.startTime;
        if (input.endTime !== undefined) updates.endTime = input.endTime;
        if (input.recurring !== undefined) updates.recurring = input.recurring;

        return await plannedDowntimeService.updatePlannedDowntime(input.windowId, updates);
      }),

    delete: protectedProcedure
      .input(z.object({ windowId: z.number() }))
      .mutation(async ({ input }) => {
        return await plannedDowntimeService.deletePlannedDowntime(input.windowId);
      }),

    calculateExcludedTime: protectedProcedure
      .input(
        z.object({
          deviceId: z.string(),
          startTime: z.date(),
          endTime: z.date(),
        })
      )
      .query(async ({ ctx, input }) => {
        return await plannedDowntimeService.calculateExcludedTime(
          ctx.user.id,
          input.deviceId,
          input.startTime,
          input.endTime
        );
      }),
  }),

  // Webhooks
  webhooks: router({
    register: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          url: z.string().url(),
          secret: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await webhookService.registerWebhook(ctx.user.id, input.name, input.url, input.secret);
      }),

    getAll: protectedProcedure.query(async ({ ctx }) => {
      const webhooks = await webhookService.getWebhooks(ctx.user.id);
      // Don't expose secrets to client
      return webhooks.map((w) => ({
        ...w,
        secret: undefined,
      }));
    }),

    toggle: protectedProcedure
      .input(z.object({ webhookId: z.number(), enabled: z.boolean() }))
      .mutation(async ({ input }) => {
        return await webhookService.toggleWebhook(input.webhookId, input.enabled);
      }),

    delete: protectedProcedure
      .input(z.object({ webhookId: z.number() }))
      .mutation(async ({ input }) => {
        return await webhookService.deleteWebhook(input.webhookId);
      }),

    test: protectedProcedure
      .input(z.object({ webhookId: z.number() }))
      .mutation(async ({ input }) => {
        return await webhookService.testWebhook(input.webhookId);
      }),
  }),
});
