import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getAvailabilityReport,
  getAvailabilityReports,
  getRecentOutages,
  getDevicesAvailabilityStats,
  PeriodType,
} from "../services/availability.service";

export const availabilityRouter = router({
  /**
   * Get availability report for a specific device and period
   */
  getReport: protectedProcedure
    .input(
      z.object({
        deviceId: z.string(),
        period: z.enum(["5m", "1h", "24h", "7d", "30d"]).default("24h"),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const report = await getAvailabilityReport(
          ctx.user.id,
          input.deviceId,
          input.period as PeriodType
        );
        return report;
      } catch (error) {
        console.error("[Availability] Failed to get report:", error);
        throw new Error("Failed to fetch availability report");
      }
    }),

  /**
   * Get availability reports for multiple periods
   */
  getReports: protectedProcedure
    .input(
      z.object({
        deviceId: z.string(),
        periods: z
          .array(z.enum(["5m", "1h", "24h", "7d", "30d"]))
          .default(["5m", "1h", "24h", "7d", "30d"]),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const reports = await getAvailabilityReports(
          ctx.user.id,
          input.deviceId,
          input.periods as PeriodType[]
        );
        return reports;
      } catch (error) {
        console.error("[Availability] Failed to get reports:", error);
        throw new Error("Failed to fetch availability reports");
      }
    }),

  /**
   * Get recent outages for a device
   */
  getRecentOutages: protectedProcedure
    .input(
      z.object({
        deviceId: z.string(),
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const outages = await getRecentOutages(
          ctx.user.id,
          input.deviceId,
          input.limit
        );
        return outages;
      } catch (error) {
        console.error("[Availability] Failed to get recent outages:", error);
        throw new Error("Failed to fetch recent outages");
      }
    }),

  /**
   * Get availability statistics for all devices
   */
  getDevicesStats: protectedProcedure
    .input(
      z.object({
        period: z.enum(["5m", "1h", "24h", "7d", "30d"]).default("24h"),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const stats = await getDevicesAvailabilityStats(
          ctx.user.id,
          input.period as PeriodType
        );
        return stats;
      } catch (error) {
        console.error("[Availability] Failed to get device stats:", error);
        throw new Error("Failed to fetch device availability statistics");
      }
    }),

  /**
   * Export availability report to PDF
   */
  exportReportPDF: protectedProcedure
    .input(
      z.object({
        deviceId: z.string(),
        period: z.enum(["5m", "1h", "24h", "7d", "30d"]).default("24h"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Use the report export service to generate the report data
        const reportExportService = await import("../services/report-export.service");
        const reportData = await reportExportService.generateReportData(
          ctx.user.id,
          input.deviceId,
          input.period as "5m" | "1h" | "24h" | "7d" | "30d",
          99.5
        );

        if (!reportData) {
          throw new Error("Report not found");
        }

        const pdfBuffer = await reportExportService.exportToPDF([reportData]);
        const base64 = pdfBuffer.toString("base64");
        const url = `data:application/pdf;base64,${base64}`;

        return { url };
      } catch (error) {
        console.error("[Availability] Failed to export PDF:", error);
        throw new Error("Failed to export report to PDF");
      }
    }),

  /**
   * Export availability report to CSV
   */
  exportReportCSV: protectedProcedure
    .input(
      z.object({
        deviceId: z.string(),
        period: z.enum(["5m", "1h", "24h", "7d", "30d"]).default("24h"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Use the report export service to generate the report data
        const reportExportService = await import("../services/report-export.service");
        const reportData = await reportExportService.generateReportData(
          ctx.user.id,
          input.deviceId,
          input.period as "5m" | "1h" | "24h" | "7d" | "30d",
          99.5
        );

        if (!reportData) {
          throw new Error("Report not found");
        }

        const csv = reportExportService.exportToCSV([reportData]);
        const url = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;

        return { url };
      } catch (error) {
        console.error("[Availability] Failed to export CSV:", error);
        throw new Error("Failed to export report to CSV");
      }
    }),
});
