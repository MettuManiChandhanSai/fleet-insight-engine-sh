/**
 * CSV Export Utility
 * Exports telemetry data and session information to CSV format
 */

import type { Sample } from "./mock-trace";

interface SessionData {
  id: string;
  vehicle_id: string;
  dtc_code: string | null;
  completeness_score: number | null;
  created_at: string;
  status: string;
  samples?: Sample[];
}

/**
 * Convert sample telemetry data to CSV format
 */
export function exportSamplesAsCSV(
  samples: Sample[],
  vehicleId: string,
  dtcCode: string | null
): string {
  if (samples.length === 0) return "";

  // CSV headers
  const headers = ["Timestamp(s)", "RPM", "Coolant Temp(°C)", "Engine Load(%)", "Speed(km/h)"];
  const rows = [
    [
      "Vehicle ID",
      "DTC Code",
      "Sample Count",
      "Recording Duration(min)",
      new Date().toISOString(),
    ],
    [], // Blank row for spacing
    headers,
  ];

  // Add data rows
  rows.push([vehicleId, dtcCode ?? "N/A", String(samples.length), String(Math.round(samples.length / 6))]);
  rows.push([]); // Blank row

  // Add sample data
  samples.forEach((sample) => {
    rows.push([
      sample.t.toFixed(2),
      String(Math.round(sample.rpm)),
      sample.temp.toFixed(1),
      sample.load.toFixed(1),
      String(Math.round(sample.speed)),
    ]);
  });

  // Convert to CSV string
  return rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
}

/**
 * Convert session metadata to CSV format
 */
export function exportSessionMetadataAsCSV(
  sessions: SessionData[]
): string {
  if (sessions.length === 0) return "";

  const headers = [
    "Session ID",
    "Vehicle ID",
    "DTC Code",
    "Status",
    "Completeness(%)",
    "Created Date",
  ];

  const rows = [headers];

  sessions.forEach((session) => {
    rows.push([
      session.id,
      session.vehicle_id,
      session.dtc_code ?? "No DTC",
      session.status,
      String(session.completeness_score ?? 0),
      new Date(session.created_at).toLocaleString(),
    ]);
  });

  return rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
}

/**
 * Trigger a CSV file download in the browser
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
