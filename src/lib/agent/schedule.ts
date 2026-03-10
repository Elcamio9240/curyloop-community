import type { AgentSchedule } from "./types";
import { SCHEDULE_MS } from "./types";

export function getNextRunAt(schedule: AgentSchedule): string {
  return new Date(Date.now() + SCHEDULE_MS[schedule]).toISOString();
}
