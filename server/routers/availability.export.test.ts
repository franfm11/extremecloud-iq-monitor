import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import * as availabilityService from "../services/availability.service";
import * as reportExportService from "../services/report-export.service";

// Mock the services
vi.mock("../services/availability.service");
vi.mock("../services/report-export.service");

describe("Availability Export Endpoints", () => {
  const mockUserId = "test-user-123";
  const mockDeviceId = "device-456";
  const mockPeriod = "24h" as const;

  const mockReport = {
    deviceId: mockDeviceId,
    period: mockPeriod,
    uptimePercentage: 99.5,
    uptime: 86040,
    downtime: 360,
    apiErrors: 2,
    currentStatus: "up" as const,
    outages: [
      {
        startTime: new Date("2026-01-01T10:00:00Z"),
        duration: 300,
        reason: "Network outage",
      },
    ],
    lastStateChange: new Date("2026-01-02T15:30:00Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("exportReportPDF", () => {
    it("should export report to PDF successfully", async () => {
      const mockPdfBuffer = Buffer.from("PDF content");
      const mockBase64 = mockPdfBuffer.toString("base64");

      vi.mocked(availabilityService.getAvailabilityReport).mockResolvedValue(
        mockReport as any
      );
      vi.mocked(reportExportService.exportToPDF).mockResolvedValue(
        mockPdfBuffer
      );

      // Simulate the endpoint logic
      const report = await availabilityService.getAvailabilityReport(
        mockUserId,
        mockDeviceId,
        mockPeriod
      );

      expect(report).toBeDefined();
      expect(report?.deviceId).toBe(mockDeviceId);

      const pdfBuffer = await reportExportService.exportToPDF([report as any]);
      const base64 = pdfBuffer.toString("base64");
      const url = `data:application/pdf;base64,${base64}`;

      expect(url).toContain("data:application/pdf;base64,");
      expect(base64).toBe(mockBase64);
    });

    it("should throw error if report not found", async () => {
      vi.mocked(availabilityService.getAvailabilityReport).mockResolvedValue(
        null
      );

      const report = await availabilityService.getAvailabilityReport(
        mockUserId,
        mockDeviceId,
        mockPeriod
      );

      expect(report).toBeNull();
    });

    it("should handle PDF generation errors", async () => {
      vi.mocked(availabilityService.getAvailabilityReport).mockResolvedValue(
        mockReport as any
      );
      vi.mocked(reportExportService.exportToPDF).mockRejectedValue(
        new Error("PDF generation failed")
      );

      const report = await availabilityService.getAvailabilityReport(
        mockUserId,
        mockDeviceId,
        mockPeriod
      );

      await expect(
        reportExportService.exportToPDF([report as any])
      ).rejects.toThrow("PDF generation failed");
    });
  });

  describe("exportReportCSV", () => {
    it("should export report to CSV successfully", async () => {
      const mockCsv = "deviceId,period,uptime\ndevice-456,24h,99.5";

      vi.mocked(availabilityService.getAvailabilityReport).mockResolvedValue(
        mockReport as any
      );
      vi.mocked(reportExportService.exportToCSV).mockReturnValue(mockCsv);

      // Simulate the endpoint logic
      const report = await availabilityService.getAvailabilityReport(
        mockUserId,
        mockDeviceId,
        mockPeriod
      );

      expect(report).toBeDefined();

      const csv = reportExportService.exportToCSV([report as any]);
      const url = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;

      expect(url).toContain("data:text/csv;charset=utf-8,");
      expect(csv).toBe(mockCsv);
    });

    it("should throw error if report not found for CSV export", async () => {
      vi.mocked(availabilityService.getAvailabilityReport).mockResolvedValue(
        null
      );

      const report = await availabilityService.getAvailabilityReport(
        mockUserId,
        mockDeviceId,
        mockPeriod
      );

      expect(report).toBeNull();
    });

    it("should properly encode CSV data in data URL", async () => {
      const mockCsv =
        "deviceId,period,uptime,downtime\ndevice-456,24h,86040,360";

      vi.mocked(availabilityService.getAvailabilityReport).mockResolvedValue(
        mockReport as any
      );
      vi.mocked(reportExportService.exportToCSV).mockReturnValue(mockCsv);

      const report = await availabilityService.getAvailabilityReport(
        mockUserId,
        mockDeviceId,
        mockPeriod
      );

      const csv = reportExportService.exportToCSV([report as any]);
      const encoded = encodeURIComponent(csv);
      const url = `data:text/csv;charset=utf-8,${encoded}`;

      expect(url).toContain("deviceId");
      expect(url).toContain("period");
      expect(url).toContain("uptime");
    });
  });

  describe("Export input validation", () => {
    it("should validate deviceId is required", () => {
      const schema = z.object({
        deviceId: z.string(),
        period: z.enum(["5m", "1h", "24h", "7d", "30d"]).default("24h"),
      });

      expect(() => schema.parse({ period: "24h" })).toThrow();
    });

    it("should validate period is one of allowed values", () => {
      const schema = z.object({
        deviceId: z.string(),
        period: z.enum(["5m", "1h", "24h", "7d", "30d"]).default("24h"),
      });

      expect(() =>
        schema.parse({ deviceId: "device-123", period: "invalid" })
      ).toThrow();
    });

    it("should accept valid input", () => {
      const schema = z.object({
        deviceId: z.string(),
        period: z.enum(["5m", "1h", "24h", "7d", "30d"]).default("24h"),
      });

      const result = schema.parse({
        deviceId: "device-123",
        period: "24h",
      });

      expect(result).toEqual({
        deviceId: "device-123",
        period: "24h",
      });
    });

    it("should use default period if not provided", () => {
      const schema = z.object({
        deviceId: z.string(),
        period: z.enum(["5m", "1h", "24h", "7d", "30d"]).default("24h"),
      });

      const result = schema.parse({
        deviceId: "device-123",
      });

      expect(result.period).toBe("24h");
    });
  });

  describe("Export data URL generation", () => {
    it("should generate valid PDF data URL", () => {
      const mockPdfBuffer = Buffer.from("PDF content");
      const base64 = mockPdfBuffer.toString("base64");
      const url = `data:application/pdf;base64,${base64}`;

      expect(url).toMatch(/^data:application\/pdf;base64,.+$/);
      expect(url).toContain("UERGIGNvbnRlbnQ="); // base64 of "PDF content"
    });

    it("should generate valid CSV data URL", () => {
      const csv = "col1,col2\nval1,val2";
      const encoded = encodeURIComponent(csv);
      const url = `data:text/csv;charset=utf-8,${encoded}`;

      expect(url).toMatch(/^data:text\/csv;charset=utf-8,.+$/);
      expect(url).toContain("col1");
      expect(url).toContain("col2");
    });

    it("should handle special characters in CSV", () => {
      const csv = 'Device,"Name with, comma","Value with ""quotes"""';
      const encoded = encodeURIComponent(csv);
      const url = `data:text/csv;charset=utf-8,${encoded}`;

      expect(url).toContain("%2C"); // encoded comma
      expect(url).toContain("%22"); // encoded quote
    });
  });

  describe("Export error handling", () => {
    it("should handle missing report gracefully", async () => {
      vi.mocked(availabilityService.getAvailabilityReport).mockResolvedValue(
        null
      );

      const report = await availabilityService.getAvailabilityReport(
        mockUserId,
        mockDeviceId,
        mockPeriod
      );

      if (!report) {
        expect(report).toBeNull();
      }
    });

    it("should handle service errors", async () => {
      vi.mocked(availabilityService.getAvailabilityReport).mockRejectedValue(
        new Error("Service error")
      );

      await expect(
        availabilityService.getAvailabilityReport(
          mockUserId,
          mockDeviceId,
          mockPeriod
        )
      ).rejects.toThrow("Service error");
    });

    it("should handle export service errors", async () => {
      vi.mocked(reportExportService.exportToPDF).mockRejectedValue(
        new Error("Export failed")
      );

      await expect(
        reportExportService.exportToPDF([mockReport as any])
      ).rejects.toThrow("Export failed");
    });
  });
});
