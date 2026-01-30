import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as reportExportService from "../services/report-export.service";

export const reportExportRouter = router({
  generateReport: protectedProcedure
    .input(
      z.object({
        deviceId: z.string(),
        period: z.enum(["5m", "1h", "24h", "7d", "30d"]),
        slaTarget: z.number().min(0).max(100).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await reportExportService.generateReportData(
        ctx.user.id,
        input.deviceId,
        input.period,
        input.slaTarget || 99.5
      );
    }),

  generateMultipleReports: protectedProcedure
    .input(
      z.object({
        deviceIds: z.array(z.string()),
        period: z.enum(["5m", "1h", "24h", "7d", "30d"]),
        slaTarget: z.number().min(0).max(100).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const reports = await Promise.all(
        input.deviceIds.map((deviceId) =>
          reportExportService.generateReportData(
            ctx.user.id,
            deviceId,
            input.period,
            input.slaTarget || 99.5
          )
        )
      );
      return reports.filter((r) => r !== null);
    }),

  exportToCSV: protectedProcedure
    .input(
      z.object({
        deviceIds: z.array(z.string()),
        period: z.enum(["5m", "1h", "24h", "7d", "30d"]),
        slaTarget: z.number().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const reports = await Promise.all(
        input.deviceIds.map((deviceId) =>
          reportExportService.generateReportData(
            ctx.user.id,
            deviceId,
            input.period,
            input.slaTarget || 99.5
          )
        )
      );

      const validReports = reports.filter((r) => r !== null) as reportExportService.ReportData[];
      if (validReports.length === 0) {
        throw new Error("No valid reports generated");
      }

      const csv = reportExportService.exportToCSV(validReports);
      return {
        data: csv,
        filename: `availability-report-${new Date().toISOString().split("T")[0]}.csv`,
        mimeType: "text/csv",
      };
    }),

  exportToPDF: protectedProcedure
    .input(
      z.object({
        deviceIds: z.array(z.string()),
        period: z.enum(["5m", "1h", "24h", "7d", "30d"]),
        slaTarget: z.number().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const reports = await Promise.all(
        input.deviceIds.map((deviceId) =>
          reportExportService.generateReportData(
            ctx.user.id,
            deviceId,
            input.period,
            input.slaTarget || 99.5
          )
        )
      );

      const validReports = reports.filter((r) => r !== null) as reportExportService.ReportData[];
      if (validReports.length === 0) {
        throw new Error("No valid reports generated");
      }

      const pdfBuffer = await reportExportService.exportToPDF(validReports);
      return {
        data: pdfBuffer.toString("base64"),
        filename: `availability-report-${new Date().toISOString().split("T")[0]}.pdf`,
        mimeType: "application/pdf",
      };
    }),
});
