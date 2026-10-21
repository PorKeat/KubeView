export const cleanAlloc = (val: string | undefined): string => {
  if (!val) return "0";
  return val.replace(/\s*\(\d+%\)/, "");
};

export interface TelemetryPoint {
  index: number;
  timeLabel: string;
  x: number;
  cpuPercent: number;
  cpuRaw: string;
  cpuY: number;
  ramPercent: number;
  ramRaw: string;
  ramY: number;
}
