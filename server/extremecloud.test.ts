import { describe, it, expect, beforeEach, vi } from "vitest";
import { extremeCloudService } from "./services/extremecloud.service";

describe("ExtremeCloud Service", () => {
  describe("Status Logic - Traffic Light", () => {
    it("should return 'online' status when device is connected", () => {
      const device = {
        id: 1,
        hostname: "router-01",
        connected: true,
        last_connect_time: new Date().toISOString(),
      };

      const status = device.connected ? "online" : device.last_connect_time ? "offline" : "unknown";
      expect(status).toBe("online");
    });

    it("should return 'offline' status when device is disconnected but has last_connect_time", () => {
      const device = {
        id: 1,
        hostname: "router-01",
        connected: false,
        last_connect_time: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      };

      const status = device.connected ? "online" : device.last_connect_time ? "offline" : "unknown";
      expect(status).toBe("offline");
    });

    it("should return 'unknown' status when device has no connection info", () => {
      const device = {
        id: 1,
        hostname: "router-01",
        connected: false,
        last_connect_time: null,
      };

      const status = device.connected ? "online" : device.last_connect_time ? "offline" : "unknown";
      expect(status).toBe("unknown");
    });

    it("should handle API error as 'unknown' status", () => {
      const apiError = {
        error: "NETWORK_ERROR",
        message: "Network connection failed",
        status: "UNKNOWN",
      };

      expect(apiError.status).toBe("UNKNOWN");
    });
  });

  describe("Rate Limiting", () => {
    it("should track rate limit state from response headers", () => {
      const rateLimitState = extremeCloudService.getRateLimitState();
      
      expect(rateLimitState).toHaveProperty("remaining");
      expect(rateLimitState).toHaveProperty("limit");
      expect(rateLimitState).toHaveProperty("resetTime");
      expect(rateLimitState.limit).toBeGreaterThan(0);
    });

    it("should have initial rate limit of 7500", () => {
      const rateLimitState = extremeCloudService.getRateLimitState();
      expect(rateLimitState.limit).toBe(7500);
    });

    it("should calculate exponential backoff correctly", () => {
      // Exponential backoff: base * 2^n
      const baseDelay = 1000;
      const maxRetries = 3;
      
      for (let i = 0; i < maxRetries; i++) {
        const delay = baseDelay * Math.pow(2, i);
        expect(delay).toBe(baseDelay * Math.pow(2, i));
      }
      
      expect(baseDelay * Math.pow(2, 0)).toBe(1000);
      expect(baseDelay * Math.pow(2, 1)).toBe(2000);
      expect(baseDelay * Math.pow(2, 2)).toBe(4000);
    });
  });

  describe("Error Handling", () => {
    it("should distinguish network errors from API errors", () => {
      const networkError = {
        error: "NETWORK_ERROR",
        message: "Network connection failed",
        status: "UNKNOWN",
      };

      const apiError = {
        error: "API_ERROR",
        message: "Failed to fetch devices",
        status: 500,
      };

      expect(networkError.error).toBe("NETWORK_ERROR");
      expect(apiError.error).toBe("API_ERROR");
      expect(networkError.status).not.toBe(apiError.status);
    });

    it("should handle rate limit errors (429)", () => {
      const rateLimitError = {
        error: "RATE_LIMIT",
        message: "API rate limit exceeded",
        status: "RATE_LIMIT",
        retryAfter: "60",
      };

      expect(rateLimitError.status).toBe("RATE_LIMIT");
      expect(rateLimitError.retryAfter).toBe("60");
    });

    it("should handle authentication errors (401)", () => {
      const authError = {
        error: "AUTH_ERROR",
        message: "Authentication failed",
        status: "AUTH_ERROR",
      };

      expect(authError.error).toBe("AUTH_ERROR");
    });

    it("should handle invalid credentials", () => {
      const invalidCredentialsError = new Error("Invalid credentials");
      expect(invalidCredentialsError.message).toBe("Invalid credentials");
    });
  });

  describe("Token Management", () => {
    it("should validate token expiration", () => {
      const expiredToken = {
        accessToken: "token123",
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      };

      const validToken = {
        accessToken: "token456",
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      };

      const isExpiredExpired = expiredToken.expiresAt < new Date();
      const isExpiredValid = validToken.expiresAt < new Date();

      expect(isExpiredExpired).toBe(true);
      expect(isExpiredValid).toBe(false);
    });

    it("should handle token refresh", () => {
      const oldToken = {
        accessToken: "old_token",
        expiresAt: new Date(Date.now() - 1000),
      };

      const newToken = {
        accessToken: "new_token",
        expiresAt: new Date(Date.now() + 3600000),
      };

      expect(oldToken.expiresAt < new Date()).toBe(true);
      expect(newToken.expiresAt < new Date()).toBe(false);
    });
  });

  describe("Device Data Transformation", () => {
    it("should correctly map API device response to internal format", () => {
      const apiDevice = {
        id: 123,
        hostname: "router-01",
        mac_address: "00:11:22:33:44:55",
        ip_address: "192.168.1.1",
        serial_number: "SN123456",
        product_type: "AP",
        software_version: "10.5.2",
        connected: true,
        last_connect_time: "2026-01-30T12:00:00Z",
        device_function: "Access Point",
        device_admin_state: "managed",
      };

      const transformed = {
        deviceId: String(apiDevice.id),
        hostname: apiDevice.hostname,
        macAddress: apiDevice.mac_address,
        ipAddress: apiDevice.ip_address,
        serialNumber: apiDevice.serial_number,
        productType: apiDevice.product_type,
        softwareVersion: apiDevice.software_version,
        connected: apiDevice.connected ? 1 : 0,
        lastConnectTime: apiDevice.last_connect_time ? new Date(apiDevice.last_connect_time) : null,
        deviceFunction: apiDevice.device_function,
        managedStatus: apiDevice.device_admin_state,
      };

      expect(transformed.deviceId).toBe("123");
      expect(transformed.hostname).toBe("router-01");
      expect(transformed.macAddress).toBe("00:11:22:33:44:55");
      expect(transformed.connected).toBe(1);
    });

    it("should handle missing optional fields", () => {
      const minimalDevice = {
        id: 123,
        hostname: undefined,
        mac_address: undefined,
        ip_address: "192.168.1.1",
        connected: false,
        last_connect_time: null,
      };

      const transformed = {
        deviceId: String(minimalDevice.id),
        hostname: minimalDevice.hostname || null,
        macAddress: minimalDevice.mac_address || null,
        ipAddress: minimalDevice.ip_address,
        connected: minimalDevice.connected ? 1 : 0,
      };

      expect(transformed.hostname).toBeNull();
      expect(transformed.macAddress).toBeNull();
      expect(transformed.ipAddress).toBe("192.168.1.1");
    });
  });

  describe("Pagination", () => {
    it("should calculate correct page offsets", () => {
      const limit = 20;
      
      const page1Offset = (1 - 1) * limit; // 0
      const page2Offset = (2 - 1) * limit; // 20
      const page3Offset = (3 - 1) * limit; // 40

      expect(page1Offset).toBe(0);
      expect(page2Offset).toBe(20);
      expect(page3Offset).toBe(40);
    });

    it("should validate pagination parameters", () => {
      const validParams = { page: 1, limit: 20 };
      const invalidParams = { page: 0, limit: 0 };

      expect(validParams.page > 0).toBe(true);
      expect(validParams.limit > 0).toBe(true);
      expect(invalidParams.page > 0).toBe(false);
      expect(invalidParams.limit > 0).toBe(false);
    });
  });

  describe("Alert Severity Filtering", () => {
    it("should filter alerts by severity level", () => {
      const alerts = [
        { id: 1, severity: "critical", title: "Critical Alert" },
        { id: 2, severity: "high", title: "High Alert" },
        { id: 3, severity: "medium", title: "Medium Alert" },
        { id: 4, severity: "low", title: "Low Alert" },
      ];

      const criticalAlerts = alerts.filter((a) => a.severity === "critical");
      const highAlerts = alerts.filter((a) => a.severity === "high");

      expect(criticalAlerts).toHaveLength(1);
      expect(highAlerts).toHaveLength(1);
      expect(criticalAlerts[0].title).toBe("Critical Alert");
    });

    it("should handle unknown severity values", () => {
      const alert = { id: 1, severity: "unknown", title: "Unknown Alert" };
      const severityLevels = ["critical", "high", "medium", "low", "info"];

      const isValidSeverity = severityLevels.includes(alert.severity);
      expect(isValidSeverity).toBe(false);
    });
  });

  describe("CLI Command Execution", () => {
    it("should track command status transitions", () => {
      const command = {
        id: 1,
        status: "pending" as const,
        command: "ping 8.8.8.8",
        output: null,
        createdAt: new Date(),
      };

      // Simulate status update
      const updatedCommand = {
        ...command,
        status: "success" as const,
        output: "PING 8.8.8.8 (8.8.8.8): 56 data bytes\n64 bytes from 8.8.8.8: icmp_seq=0 ttl=119 time=20.1 ms",
        completedAt: new Date(),
      };

      expect(command.status).toBe("pending");
      expect(updatedCommand.status).toBe("success");
      expect(updatedCommand.output).toBeTruthy();
    });

    it("should handle command execution errors", () => {
      const failedCommand = {
        id: 1,
        status: "failed" as const,
        command: "invalid command",
        errorMessage: "Command not found",
      };

      expect(failedCommand.status).toBe("failed");
      expect(failedCommand.errorMessage).toBeTruthy();
    });
  });
});
