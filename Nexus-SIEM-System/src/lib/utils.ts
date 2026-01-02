import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimestamp(value: string) {
  const d = new Date(value);
  const time = d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${time} • ${date}`;
}

export function getSeverityString(sev: number): "critical" | "high" | "medium" | "low" {
  if (sev >= 4) return "critical";
  if (sev === 3) return "high";
  if (sev === 2) return "medium";
  return "low";
}

export function mapLogSeverity(severity: string): "critical" | "high" | "medium" | "low" {
  const sev = severity.toUpperCase();
  if (sev === "ERROR") return "critical";
  if (sev === "WARNING") return "high";
  if (sev === "INFO") return "medium";
  return "low";
}

export function generateSecureRandomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (globalThis.window !== undefined && globalThis.crypto) {
    const array = new Uint32Array(1);
    globalThis.crypto.getRandomValues(array);
    return array[0].toString();
  }
  return Date.now().toString(); 
}
