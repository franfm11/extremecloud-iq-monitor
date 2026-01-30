import { getAvailabilityReport } from "./availability.service";
import * as eventCounterService from "./event-counter.service";
import * as plannedDowntimeService from "./planned-downtime.service";
import { getDeviceById } from "../db";

export interface ReportData {
  deviceId: string;
  deviceName: string;
  reportPeriod: {
    start: Date;
    end: Date;
    label: string;
  };
  availability: {
    uptime: number;
    downtime: number;
    uptimePercentage: number;
    status: "excellent" | "very-good" | "good" | "fair" | "poor";
  };
  events: {
    totalEvents: number;
    upEvents: number;
    downEvents: number;
    transitions: number;
  };
  flapping: {
    isFlapping: boolean;
    eventCount: number;
    severity: string | null;
  };
  plannedDowntime: {
    totalExcludedSeconds: number;
  };
  sla: {
    target: number;
    achieved: number;
    compliant: boolean;
    breachDuration: number;
  };
}

/**
 * Generate comprehensive availability report data
 */
export async function generateReportData(
  userId: number,
  deviceId: string,
  period: "5m" | "1h" | "24h" | "7d" | "30d",
  slaTarget: number = 99.5
): Promise<ReportData | null> {
  const device = await getDeviceById(userId, deviceId);
  if (!device) {
    return null;
  }

  // Calculate start and end times based on period
  const now = new Date();
  const periodMs = getPeriodDurationMs(period);
  const startTime = new Date(now.getTime() - periodMs);
  const endTime = now;

  // Get availability metrics
  const availability = await getAvailabilityReport(userId, deviceId, period);

  // Get event statistics
  const eventStats = await eventCounterService.getEventStats(userId, deviceId, startTime, endTime);

  // Get flapping events
  const flappingEvents = await eventCounterService.getFlappingEvents(userId, deviceId);
  const deviceFlappingEvents = flappingEvents.filter((e) => e.deviceId === deviceId);

  // Get planned downtime
  const excludedSeconds = (await plannedDowntimeService.calculateExcludedTime(
    userId,
    deviceId,
    startTime,
    endTime
  )) || 0;

  // Calculate SLA metrics
  const totalSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
  const availableSeconds = totalSeconds - excludedSeconds;
  const downSeconds = availability.downtime;
  const achievedUptime = availableSeconds > 0 ? ((availableSeconds - downSeconds) / availableSeconds) * 100 : 0;
  const compliant = achievedUptime >= slaTarget;
  const breachDuration = compliant ? 0 : (slaTarget / 100) * availableSeconds - (achievedUptime / 100) * availableSeconds;

  // Calculate period label
  const periodLabel = getPeriodLabel(startTime, endTime);

  return {
    deviceId,
    deviceName: device.hostname || device.deviceId,
    reportPeriod: {
      start: startTime,
      end: endTime,
      label: periodLabel,
    },
    availability: {
      uptime: availability.uptime,
      downtime: availability.downtime,
      uptimePercentage: availability.uptimePercentage,
      status: getUptimeStatus(availability.uptimePercentage),
    },
    events: {
      totalEvents: eventStats?.totalEvents || 0,
      upEvents: eventStats?.upEvents || 0,
      downEvents: eventStats?.downEvents || 0,
      transitions: eventStats?.transitions || 0,
    },
    flapping: {
      isFlapping: deviceFlappingEvents.length > 0,
      eventCount: deviceFlappingEvents.length,
      severity: deviceFlappingEvents.length > 0 ? deviceFlappingEvents[0].severity : null,
    },
    plannedDowntime: {
      totalExcludedSeconds: excludedSeconds,
    },
    sla: {
      target: slaTarget,
      achieved: achievedUptime,
      compliant,
      breachDuration: Math.max(0, breachDuration),
    },
  };
}

/**
 * Export report to CSV format
 */
export function exportToCSV(reports: ReportData[]): string {
  const headers = [
    "Device Name",
    "Device ID",
    "Report Period",
    "Uptime %",
    "Status",
    "Total Events",
    "Transitions",
    "Flapping",
    "Planned Downtime (min)",
    "SLA Target %",
    "SLA Achieved %",
    "SLA Compliant",
    "Breach Duration (min)",
  ];

  const rows = reports.map((r) => [
    r.deviceName,
    r.deviceId,
    `${r.reportPeriod.start.toISOString().split("T")[0]} to ${r.reportPeriod.end.toISOString().split("T")[0]}`,
    r.availability.uptimePercentage.toFixed(2),
    r.availability.status.toUpperCase(),
    r.events.totalEvents,
    r.events.transitions,
    r.flapping.isFlapping ? `Yes (${r.flapping.severity})` : "No",
    (r.plannedDowntime.totalExcludedSeconds / 60).toFixed(2),
    r.sla.target.toFixed(2),
    r.sla.achieved.toFixed(2),
    r.sla.compliant ? "Yes" : "No",
    (r.sla.breachDuration / 60).toFixed(2),
  ]);

  const csv = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) => row.map((cell) => escapeCSV(String(cell))).join(",")),
  ].join("\n");

  return csv;
}

/**
 * Export report to PDF format (text-based)
 */
export async function exportToPDF(reports: ReportData[]): Promise<Buffer> {
  let textContent = "AVAILABILITY REPORT\n";
  textContent += `Generated: ${new Date().toLocaleString()}\n\n`;

  if (reports.length > 0) {
    textContent += "SUMMARY\n";
    textContent += `Total Devices: ${reports.length}\n`;
    const avgUptime = reports.reduce((sum, r) => sum + r.availability.uptimePercentage, 0) / reports.length;
    textContent += `Average Uptime: ${avgUptime.toFixed(2)}%\n`;
    textContent += `SLA Compliant: ${reports.filter((r) => r.sla.compliant).length}\n`;
    textContent += `Flapping Devices: ${reports.filter((r) => r.flapping.isFlapping).length}\n\n`;
  }

  reports.forEach((report, index) => {
    if (index > 0) textContent += "\n" + "=".repeat(80) + "\n\n";

    textContent += `DEVICE: ${report.deviceName} (${report.deviceId})\n`;
    textContent += `Period: ${report.reportPeriod.label}\n`;
    textContent += `${report.reportPeriod.start.toLocaleString()} to ${report.reportPeriod.end.toLocaleString()}\n\n`;

    textContent += "AVAILABILITY METRICS\n";
    textContent += `  Uptime: ${report.availability.uptimePercentage.toFixed(2)}%\n`;
    textContent += `  Status: ${report.availability.status.toUpperCase()}\n`;
    textContent += `  Uptime Duration: ${formatDuration(report.availability.uptime)}\n`;
    textContent += `  Downtime Duration: ${formatDuration(report.availability.downtime)}\n\n`;

    textContent += "EVENT STATISTICS\n";
    textContent += `  Total Events: ${report.events.totalEvents}\n`;
    textContent += `  Up Events: ${report.events.upEvents}\n`;
    textContent += `  Down Events: ${report.events.downEvents}\n`;
    textContent += `  Transitions: ${report.events.transitions}\n\n`;

    if (report.flapping.isFlapping) {
      textContent += "FLAPPING DETECTION\n";
      textContent += `  Status: FLAPPING DETECTED\n`;
      textContent += `  Events: ${report.flapping.eventCount}\n`;
      textContent += `  Severity: ${report.flapping.severity?.toUpperCase() || "N/A"}\n\n`;
    }

    textContent += "SLA COMPLIANCE\n";
    textContent += `  Target: ${report.sla.target.toFixed(2)}%\n`;
    textContent += `  Achieved: ${report.sla.achieved.toFixed(2)}%\n`;
    textContent += `  Compliant: ${report.sla.compliant ? "YES" : "NO"}\n`;
    textContent += `  Breach Duration: ${formatDuration(report.sla.breachDuration)}\n`;
  });

  return Buffer.from(textContent);
}

/**
 * Helper function to escape CSV values
 */
function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Helper function to format duration in seconds to human readable format
 */
function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(" ");
}

/**
 * Helper function to get uptime status
 */
function getUptimeStatus(uptimePercentage: number): "excellent" | "very-good" | "good" | "fair" | "poor" {
  if (uptimePercentage >= 99.9) return "excellent";
  if (uptimePercentage >= 99.5) return "very-good";
  if (uptimePercentage >= 99.0) return "good";
  if (uptimePercentage >= 95.0) return "fair";
  return "poor";
}

/**
 * Helper function to get period label
 */
function getPeriodLabel(startTime: Date, endTime: Date): string {
  const diffMs = endTime.getTime() - startTime.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays <= 1) return "Last 24 Hours";
  if (diffDays <= 7) return "Last 7 Days";
  if (diffDays <= 30) return "Last 30 Days";
  if (diffDays <= 365) return "Last Year";
  return "Custom Period";
}

/**
 * Helper function to get period duration in milliseconds
 */
function getPeriodDurationMs(period: "5m" | "1h" | "24h" | "7d" | "30d"): number {
  const durations: Record<string, number> = {
    "5m": 5 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };
  return durations[period] || 24 * 60 * 60 * 1000;
}
