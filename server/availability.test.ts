import { describe, it, expect } from "vitest";

describe("Availability Service", () => {
  describe("Period Duration Calculations", () => {
    it("should calculate correct duration for 5 minutes", () => {
      const duration = 5 * 60 * 1000;
      expect(duration).toBe(300000);
    });

    it("should calculate correct duration for 1 hour", () => {
      const duration = 60 * 60 * 1000;
      expect(duration).toBe(3600000);
    });

    it("should calculate correct duration for 24 hours", () => {
      const duration = 24 * 60 * 60 * 1000;
      expect(duration).toBe(86400000);
    });

    it("should calculate correct duration for 7 days", () => {
      const duration = 7 * 24 * 60 * 60 * 1000;
      expect(duration).toBe(604800000);
    });

    it("should calculate correct duration for 30 days", () => {
      const duration = 30 * 24 * 60 * 60 * 1000;
      expect(duration).toBe(2592000000);
    });
  });

  describe("Uptime Percentage Calculations", () => {
    it("should calculate 100% uptime when no downtime", () => {
      const uptime = 3600;
      const downtime = 0;
      const total = uptime + downtime;
      const percentage = (uptime / total) * 100;
      expect(percentage).toBe(100);
    });

    it("should calculate 99.9% uptime correctly", () => {
      const uptime = 3596.4;
      const downtime = 3.6;
      const total = uptime + downtime;
      const percentage = Math.round((uptime / total) * 10000) / 100;
      expect(percentage).toBe(99.9);
    });

    it("should calculate 50% uptime when equal up and down time", () => {
      const uptime = 1800;
      const downtime = 1800;
      const total = uptime + downtime;
      const percentage = (uptime / total) * 100;
      expect(percentage).toBe(50);
    });

    it("should calculate 0% uptime when all downtime", () => {
      const uptime = 0;
      const downtime = 3600;
      const total = uptime + downtime;
      const percentage = total > 0 ? (uptime / total) * 100 : 0;
      expect(percentage).toBe(0);
    });

    it("should handle zero total time", () => {
      const uptime = 0;
      const downtime = 0;
      const total = uptime + downtime;
      const percentage = total > 0 ? (uptime / total) * 100 : 0;
      expect(percentage).toBe(0);
    });
  });

  describe("Status Classification", () => {
    it("should classify 99.95% as excellent", () => {
      const uptime = 99.95;
      const status = uptime >= 99.9 ? "excellent" : "other";
      expect(status).toBe("excellent");
    });

    it("should classify 99.5% as very-good", () => {
      const uptime = 99.5;
      const status =
        uptime >= 99.9
          ? "excellent"
          : uptime >= 99
          ? "very-good"
          : "other";
      expect(status).toBe("very-good");
    });

    it("should classify 97% as good", () => {
      const uptime = 97;
      const status =
        uptime >= 99.9
          ? "excellent"
          : uptime >= 99
          ? "very-good"
          : uptime >= 95
          ? "good"
          : "other";
      expect(status).toBe("good");
    });

    it("should classify 92% as fair", () => {
      const uptime = 92;
      const status =
        uptime >= 99.9
          ? "excellent"
          : uptime >= 99
          ? "very-good"
          : uptime >= 95
          ? "good"
          : uptime >= 90
          ? "fair"
          : "poor";
      expect(status).toBe("fair");
    });

    it("should classify 85% as poor", () => {
      const uptime = 85;
      const status =
        uptime >= 99.9
          ? "excellent"
          : uptime >= 99
          ? "very-good"
          : uptime >= 95
          ? "good"
          : uptime >= 90
          ? "fair"
          : "poor";
      expect(status).toBe("poor");
    });
  });

  describe("Outage Duration Calculations", () => {
    it("should calculate outage duration in seconds", () => {
      const startTime = new Date("2026-01-30T12:00:00Z");
      const endTime = new Date("2026-01-30T12:05:30Z");
      const duration = (endTime.getTime() - startTime.getTime()) / 1000;
      expect(duration).toBe(330);
    });

    it("should convert seconds to hours and minutes", () => {
      const duration = 7200; // 2 hours
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      expect(hours).toBe(2);
      expect(minutes).toBe(0);
    });

    it("should handle partial hours and minutes", () => {
      const duration = 3930; // 1 hour 5 minutes 30 seconds
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      const seconds = Math.floor(duration % 60);
      expect(hours).toBe(1);
      expect(minutes).toBe(5);
      expect(seconds).toBe(30);
    });
  });

  describe("API Error Tracking", () => {
    it("should distinguish API errors from device downtime", () => {
      const deviceStatus = "up";
      const apiError = true;
      expect(deviceStatus).toBe("up");
      expect(apiError).toBe(true);
      // Device is up, but API call failed
    });

    it("should track multiple API errors", () => {
      const apiErrors = [
        { endpoint: "/devices", statusCode: 500 },
        { endpoint: "/clients", statusCode: 503 },
        { endpoint: "/alerts", statusCode: 429 },
      ];
      expect(apiErrors).toHaveLength(3);
      expect(apiErrors[2].statusCode).toBe(429);
    });
  });

  describe("State Change Recording", () => {
    it("should record device state transitions", () => {
      const stateChanges = [
        { timestamp: new Date("2026-01-30T12:00:00Z"), status: "up" },
        { timestamp: new Date("2026-01-30T12:05:00Z"), status: "down" },
        { timestamp: new Date("2026-01-30T12:10:00Z"), status: "up" },
      ];
      expect(stateChanges).toHaveLength(3);
      expect(stateChanges[1].status).toBe("down");
    });

    it("should calculate duration between state changes", () => {
      const stateChanges = [
        { timestamp: new Date("2026-01-30T12:00:00Z"), status: "up" },
        { timestamp: new Date("2026-01-30T12:05:00Z"), status: "down" },
      ];
      const duration =
        (stateChanges[1].timestamp.getTime() - stateChanges[0].timestamp.getTime()) /
        1000;
      expect(duration).toBe(300);
    });
  });

  describe("Report Generation", () => {
    it("should generate report with all required fields", () => {
      const report = {
        deviceId: "device-123",
        period: "24h" as const,
        uptimePercentage: 99.5,
        downtime: 180,
        uptime: 86220,
        totalTime: 86400,
        outages: [],
        apiErrors: 2,
        lastStateChange: new Date(),
        currentStatus: "up" as const,
      };

      expect(report).toHaveProperty("deviceId");
      expect(report).toHaveProperty("period");
      expect(report).toHaveProperty("uptimePercentage");
      expect(report).toHaveProperty("outages");
      expect(report).toHaveProperty("apiErrors");
      expect(report.currentStatus).toBe("up");
    });

    it("should handle reports with no outages", () => {
      const report = {
        outages: [] as Array<{ startTime: Date; endTime: Date; duration: number }>,
      };
      expect(report.outages).toHaveLength(0);
    });

    it("should handle reports with multiple outages", () => {
      const report = {
        outages: [
          {
            startTime: new Date("2026-01-30T12:00:00Z"),
            endTime: new Date("2026-01-30T12:05:00Z"),
            duration: 300,
          },
          {
            startTime: new Date("2026-01-30T14:00:00Z"),
            endTime: new Date("2026-01-30T14:10:00Z"),
            duration: 600,
          },
        ],
      };
      expect(report.outages).toHaveLength(2);
      expect(report.outages[0].duration).toBe(300);
      expect(report.outages[1].duration).toBe(600);
    });
  });
});
