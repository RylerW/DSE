import { randomUUID } from "node:crypto";

import seedData from "@/data/db.json";
import type {
  Alert,
  Database,
  IngestionRun,
  MarketOverview,
  Notification,
  PriceSnapshot,
  Security,
  SecurityWithSnapshot,
  Trend,
} from "@/lib/types";

const USER_ID = "demo-investor";
const SOURCE_NAME = "Dar es Salaam Stock Exchange";
const WORKER_DB_KEY = "__dseWorkerDb";

type AlertWithSecurity = Alert & { security: Security | null };

function currentDseDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Dar_es_Salaam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function cloneDatabase(value: Database): Database {
  return JSON.parse(JSON.stringify(value)) as Database;
}

function getDb(): Database {
  const globalState = globalThis as typeof globalThis & { [WORKER_DB_KEY]?: Database };
  if (!globalState[WORKER_DB_KEY]) {
    globalState[WORKER_DB_KEY] = cloneDatabase(seedData as Database);
  }

  return globalState[WORKER_DB_KEY];
}

function sortHistory(history: PriceSnapshot[]) {
  return [...history].sort((a, b) => a.marketDate.localeCompare(b.marketDate));
}

function computeTrend(history: PriceSnapshot[]): Trend {
  if (history.length < 2) return "FLAT";
  const ordered = sortHistory(history);
  const first = ordered.at(-5) ?? ordered[0];
  const last = ordered.at(-1)!;
  if (last.lastPrice > first.lastPrice) return "UP";
  if (last.lastPrice < first.lastPrice) return "DOWN";
  return "FLAT";
}

function latestSnapshot(snapshots: PriceSnapshot[], securityId: string) {
  const relevant = snapshots.filter((item) => item.securityId === securityId);
  if (relevant.length === 0) return null;
  return relevant.sort((a, b) => b.marketDate.localeCompare(a.marketDate))[0] ?? null;
}

function withSnapshot(db: Database, security: Security): SecurityWithSnapshot {
  const history = sortHistory(db.snapshots.filter((item) => item.securityId === security.id));
  return {
    ...security,
    latestSnapshot: latestSnapshot(db.snapshots, security.id),
    trend: computeTrend(history),
    history,
  };
}

export async function getMarketOverview(): Promise<MarketOverview> {
  const db = getDb();
  const securities = db.securities.map((security) => withSnapshot(db, security));
  const withPrices = securities.filter((security) => security.latestSnapshot !== null);
  const byGain = [...withPrices].sort((a, b) => (b.latestSnapshot?.percentChange ?? 0) - (a.latestSnapshot?.percentChange ?? 0));
  const byVolume = [...withPrices].sort((a, b) => (b.latestSnapshot?.volume ?? 0) - (a.latestSnapshot?.volume ?? 0));
  const marketDate = db.ingestionRuns[0]?.marketDate ?? "";
  const lastUpdated = db.ingestionRuns[0]?.completedAt ?? db.ingestionRuns[0]?.startedAt ?? new Date().toISOString();
  const freshness = marketDate >= currentDseDate() ? "FRESH" : "STALE";

  return {
    marketDate,
    lastUpdated,
    sourceName: SOURCE_NAME,
    trackedSecurities: withPrices.length,
    topGainers: byGain.slice(0, 5),
    topLosers: [...byGain].reverse().slice(0, 5),
    mostActive: byVolume.slice(0, 5),
    freshness,
  };
}

export async function listSecurities() {
  const db = getDb();
  return db.securities.map((security) => withSnapshot(db, security)).sort((a, b) => a.ticker.localeCompare(b.ticker));
}

export async function getSecurityByTicker(ticker: string) {
  const db = getDb();
  const security = db.securities.find((item) => item.ticker.toLowerCase() === ticker.toLowerCase());
  return security ? withSnapshot(db, security) : null;
}

export async function getDefaultWatchlist() {
  const db = getDb();
  const watchlist = db.watchlists.find((item) => item.userId === USER_ID) ?? db.watchlists[0] ?? { id: "watchlist-default", userId: USER_ID, name: "My DSE Picks" };
  const items = db.watchlistItems.filter((item) => item.watchlistId === watchlist.id);
  const securities = items
    .map((item) => db.securities.find((security) => security.id === item.securityId))
    .filter((item): item is Security => Boolean(item))
    .map((security) => withSnapshot(db, security));

  return { watchlist, securities };
}

export async function addWatchlistSecurity(securityId: string) {
  const db = getDb();
  const watchlist = db.watchlists.find((item) => item.userId === USER_ID) ?? db.watchlists[0];
  if (!watchlist) return;

  const exists = db.watchlistItems.some((item) => item.watchlistId === watchlist.id && item.securityId === securityId);
  if (!exists) {
    db.watchlistItems.push({ id: randomUUID(), watchlistId: watchlist.id, securityId });
  }
}

export async function removeWatchlistSecurity(securityId: string) {
  const db = getDb();
  const watchlist = db.watchlists.find((item) => item.userId === USER_ID) ?? db.watchlists[0];
  if (!watchlist) return;

  db.watchlistItems = db.watchlistItems.filter((item) => !(item.watchlistId === watchlist.id && item.securityId === securityId));
}

export async function listAlerts(): Promise<AlertWithSecurity[]> {
  const db = getDb();
  return db.alerts.map((alert) => ({
    ...alert,
    security: db.securities.find((item) => item.id === alert.securityId) ?? null,
  }));
}

export async function createAlert(input: { securityId: string; type: Alert["type"]; thresholdValue: number; channel: Alert["channel"] }) {
  const db = getDb();
  db.alerts.unshift({
    id: randomUUID(),
    userId: USER_ID,
    securityId: input.securityId,
    type: input.type,
    thresholdValue: input.thresholdValue,
    channel: input.channel,
    isActive: true,
    lastTriggeredAt: null,
  });
}

export async function toggleAlert(alertId: string) {
  const db = getDb();
  const alert = db.alerts.find((item) => item.id === alertId);
  if (alert) {
    alert.isActive = !alert.isActive;
  }
}

export async function listNotifications(): Promise<Notification[]> {
  const db = getDb();
  return [...db.notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listIngestionRuns(): Promise<IngestionRun[]> {
  const db = getDb();
  return [...db.ingestionRuns].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function runOfficialIngestion(_recordFailure?: boolean) {
  const db = getDb();
  db.ingestionRuns.unshift({
    id: randomUUID(),
    sourceName: SOURCE_NAME,
    marketDate: currentDseDate(),
    status: "PARTIAL",
    recordsSeen: 0,
    recordsInserted: 0,
    recordsUpdated: 0,
    recordsFailed: 0,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    errorSummary: "Worker fallback mode is serving seeded dashboard data because filesystem storage is unavailable.",
  });
}
