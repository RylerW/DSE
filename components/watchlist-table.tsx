import type { ReactNode } from "react";
import Link from "next/link";

import { formatCompactNumber, formatMoney, formatPercent, trendLabel } from "@/lib/format";
import type { SecurityWithSnapshot } from "@/lib/types";

export function WatchlistTable({ items, action }: { items: SecurityWithSnapshot[]; action?: (securityId: string) => ReactNode }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Company</th>
            <th>Last Price</th>
            <th>Daily Move</th>
            <th>Volume</th>
            <th>Trend</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td><Link href={`/securities/${item.ticker}`}>{item.ticker}</Link></td>
              <td>{item.companyName}</td>
              <td>{formatMoney(item.latestSnapshot?.lastPrice ?? null)}</td>
              <td className={(item.latestSnapshot?.percentChange ?? 0) >= 0 ? "text-green" : "text-red"}>{formatPercent(item.latestSnapshot?.percentChange ?? null)}</td>
              <td>{formatCompactNumber(item.latestSnapshot?.volume ?? null)}</td>
              <td>{trendLabel(item.trend)}</td>
              <td>{action ? action(item.id) : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

