import { create } from "zustand";
import type { FleetOverviewResult } from "@kubeview/contracts";
import { invokeRpc } from "@/lib/ipc";

export interface FleetOverviewState {
  overview: FleetOverviewResult | null;
  isLoading: boolean;
  hasLoadedOnce: boolean;
  error: string | null;
  lastLoadedAt: number;
  loadFleetOverview: (force?: boolean) => Promise<FleetOverviewResult | null>;
}

const CACHE_TTL_MS = 30_000;

let inFlightFleetPromise: Promise<FleetOverviewResult | null> | null = null;

export const useFleetOverviewStore = create<FleetOverviewState>((set, get) => ({
  overview: null,
  isLoading: false,
  hasLoadedOnce: false,
  error: null,
  lastLoadedAt: 0,

  loadFleetOverview: async (force = false) => {
    const state = get();
    if (
      !force &&
      state.overview &&
      Date.now() - state.lastLoadedAt < CACHE_TTL_MS
    ) {
      return state.overview;
    }
    if (inFlightFleetPromise) return inFlightFleetPromise;

    set({ isLoading: true, error: null });

    const promise = (async () => {
      try {
        const result = await invokeRpc<FleetOverviewResult>(
          "clusters.fleetOverview",
        );
        if (result) {
          set({
            overview: result,
            isLoading: false,
            hasLoadedOnce: true,
            error: null,
            lastLoadedAt: Date.now(),
          });
          return result;
        }
        set({
          isLoading: false,
          hasLoadedOnce: true,
          error: "No fleet overview data was returned.",
        });
        return null;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn("[FleetStore] Failed to load fleet overview:", err);
        set({
          isLoading: false,
          hasLoadedOnce: true,
          error: message,
        });
        return null;
      } finally {
        inFlightFleetPromise = null;
      }
    })();

    inFlightFleetPromise = promise;
    return promise;
  },
}));
