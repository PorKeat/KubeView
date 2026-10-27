export type TerminalConnectionStatus =
  "connecting" | "connected" | "disconnected" | "error";

export interface ShellOption {
  value: string;
  label: string;
  triggerLabel: string;
  badge: string;
  badgeClass: string;
  description: string;
}
