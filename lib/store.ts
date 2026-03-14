import type { Alert } from "@/lib/types";

type StoreModule = typeof import("@/lib/postgres-store");

let storeModulePromise: Promise<StoreModule> | null = null;

async function loadStore(): Promise<StoreModule> {
  if (storeModulePromise) {
    return storeModulePromise;
  }

  storeModulePromise = (async () => {
    if (process.env.DATABASE_URL) {
      return (await import("@/lib/postgres-store")) as StoreModule;
    }

    try {
      return (await import("@/lib/local-store")) as StoreModule;
    } catch {
      return (await import("@/lib/worker-store")) as StoreModule;
    }
  })();

  return storeModulePromise;
}

export async function getMarketOverview() {
  return (await loadStore()).getMarketOverview();
}

export async function listSecurities() {
  return (await loadStore()).listSecurities();
}

export async function getSecurityByTicker(ticker: string) {
  return (await loadStore()).getSecurityByTicker(ticker);
}

export async function getDefaultWatchlist() {
  return (await loadStore()).getDefaultWatchlist();
}

export async function addWatchlistSecurity(securityId: string) {
  return (await loadStore()).addWatchlistSecurity(securityId);
}

export async function removeWatchlistSecurity(securityId: string) {
  return (await loadStore()).removeWatchlistSecurity(securityId);
}

export async function listAlerts() {
  return (await loadStore()).listAlerts();
}

export async function createAlert(input: { securityId: string; type: Alert["type"]; thresholdValue: number; channel: Alert["channel"] }) {
  return (await loadStore()).createAlert(input);
}

export async function toggleAlert(alertId: string) {
  return (await loadStore()).toggleAlert(alertId);
}

export async function listNotifications() {
  return (await loadStore()).listNotifications();
}

export async function listIngestionRuns() {
  return (await loadStore()).listIngestionRuns();
}

export async function runOfficialIngestion(recordFailure?: boolean) {
  return (await loadStore()).runOfficialIngestion(recordFailure);
}
