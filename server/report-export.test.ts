import { describe, it, expect } from "vitest";
import * as reportExportService from "./services/report-export.service";

describe("Report Export Service", () => {
  describe("exportToCSV", () => {
    it("should generate valid CSV from report data", () => {
      const mockReport: reportExportService.ReportData = {
        deviceId: "device-123",
        deviceName: "Test Device",
        reportPeriod: {
          start: new Date("2026-01-20"),
          end: new Date("2026-01-27"),
          label: "Last 7 Days",
        },
        availability: {
          uptime: 604800,
          downtime: 3600,
          uptimePercentage: 99.58,
          status: "very-good",
        },
        events: {
          totalEvents: 2,
          upEvents: 1,
          downEvents: 1,
          transitions: 2,
        },
        flapping: {
          isFlapping: false,
          eventCount: 0,
          severity: null,
        },
        plannedDowntime: {
          totalExcludedSeconds: 0,
        },
        sla: {
          target: 99.5,
          achieved: 99.58,
          compliant: true,
          breachDuration: 0,
        },
      };

      const csv = reportExportService.exportToCSV([mockReport]);

      expect(csv).toContain("Device Name");
      expect(csv).toContain("Test Device");
      expect(csv).toContain("99.58");
      expect(csv).toContain("VERY-GOOD");
      expect(csv).toContain("Yes");
    });

    it("should escape CSV special characters", () => {
      const mockReport: reportExportService.ReportData = {
        deviceId: "device-123",
        deviceName: 'Device "With" Commas, And Quotes',
        reportPeriod: {
          start: new Date("2026-01-20"),
          end: new Date("2026-01-27"),
          label: "Last 7 Days",
        },
        availability: {
          uptime: 604800,
          downtime: 3600,
          uptimePercentage: 99.58,
          status: "very-good",
        },
        events: {
          totalEvents: 0,
          upEvents: 0,
          downEvents: 0,
          transitions: 0,
        },
        flapping: {
          isFlapping: false,
          eventCount: 0,
          severity: null,
        },
        plannedDowntime: {
          totalExcludedSeconds: 0,
        },
        sla: {
          target: 99.5,
          achieved: 99.58,
          compliant: true,
          breachDuration: 0,
        },
      };

      const csv = reportExportService.exportToCSV([mockReport]);

      expect(csv).toContain('"Device ""With"" Commas, And Quotes"');
    });

    it("should handle multiple reports", () => {
      const mockReports: reportExportService.ReportData[] = [
        {
          deviceId: "device-1",
          deviceName: "Device 1",
          reportPeriod: {
            start: new Date("2026-01-20"),
            end: new Date("2026-01-27"),
            label: "Last 7 Days",
          },
          availability: {
            uptime: 604800,
            downtime: 0,
            uptimePercentage: 100,
            status: "excellent",
          },
          events: {
            totalEvents: 0,
            upEvents: 0,
            downEvents: 0,
            transitions: 0,
          },
          flapping: {
            isFlapping: false,
            eventCount: 0,
            severity: null,
          },
          plannedDowntime: {
            totalExcludedSeconds: 0,
          },
          sla: {
            target: 99.5,
            achieved: 100,
            compliant: true,
            breachDuration: 0,
          },
        },
        {
          deviceId: "device-2",
          deviceName: "Device 2",
          reportPeriod: {
            start: new Date("2026-01-20"),
            end: new Date("2026-01-27"),
            label: "Last 7 Days",
          },
          availability: {
            uptime: 600000,
            downtime: 4800,
            uptimePercentage: 99.21,
            status: "good",
          },
          events: {
            totalEvents: 1,
            upEvents: 0,
            downEvents: 1,
            transitions: 1,
          },
          flapping: {
            isFlapping: false,
            eventCount: 0,
            severity: null,
          },
          plannedDowntime: {
            totalExcludedSeconds: 0,
          },
          sla: {
            target: 99.5,
            achieved: 99.21,
            compliant: false,
            breachDuration: 1800,
          },
        },
      ];

      const csv = reportExportService.exportToCSV(mockReports);

      expect(csv).toContain("Device 1");
      expect(csv).toContain("Device 2");
      expect(csv).toContain("100.00");
      expect(csv).toContain("99.21");
    });
  });

  describe("exportToPDF", () => {
    it("should generate PDF buffer from report data", async () => {
      const mockReport: reportExportService.ReportData = {
        deviceId: "device-123",
        deviceName: "Test Device",
        reportPeriod: {
          start: new Date("2026-01-20"),
          end: new Date("2026-01-27"),
          label: "Last 7 Days",
        },
        availability: {
          uptime: 604800,
          downtime: 3600,
          uptimePercentage: 99.58,
          status: "very-good",
        },
        events: {
          totalEvents: 2,
          upEvents: 1,
          downEvents: 1,
          transitions: 2,
        },
        flapping: {
          isFlapping: false,
          eventCount: 0,
          severity: null,
        },
        plannedDowntime: {
          totalExcludedSeconds: 0,
        },
        sla: {
          target: 99.5,
          achieved: 99.58,
          compliant: true,
          breachDuration: 0,
        },
      };

      const pdf = await reportExportService.exportToPDF([mockReport]);

      expect(pdf).toBeInstanceOf(Buffer);
      expect(pdf.length).toBeGreaterThan(0);
      expect(pdf.toString("utf-8")).toContain("AVAILABILITY REPORT");
    });

    it("should include device name in PDF", async () => {
      const mockReport: reportExportService.ReportData = {
        deviceId: "device-123",
        deviceName: "My Test Device",
        reportPeriod: {
          start: new Date("2026-01-20"),
          end: new Date("2026-01-27"),
          label: "Last 7 Days",
        },
        availability: {
          uptime: 604800,
          downtime: 3600,
          uptimePercentage: 99.58,
          status: "very-good",
        },
        events: {
          totalEvents: 0,
          upEvents: 0,
          downEvents: 0,
          transitions: 0,
        },
        flapping: {
          isFlapping: false,
          eventCount: 0,
          severity: null,
        },
        plannedDowntime: {
          totalExcludedSeconds: 0,
        },
        sla: {
          target: 99.5,
          achieved: 99.58,
          compliant: true,
          breachDuration: 0,
        },
      };

      const pdf = await reportExportService.exportToPDF([mockReport]);
      const pdfText = pdf.toString("utf-8");

      expect(pdfText).toContain("My Test Device");
      expect(pdfText).toContain("AVAILABILITY METRICS");
    });
  });
});
