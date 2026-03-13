export const dynamic = "force-dynamic";

import { addToWatchlistAction, removeFromWatchlistAction } from "@/app/actions";
import { WatchlistTable } from "@/components/watchlist-table";
import { getDefaultWatchlist, listSecurities } from "@/lib/store";

export default async function WatchlistPage() {
  const [watchlist, securities] = await Promise.all([getDefaultWatchlist(), listSecurities()]);
  const watchlistIds = new Set(watchlist.securities.map((item) => item.id));
  const available = securities.filter((item) => !watchlistIds.has(item.id));

  return (
    <div className="page-grid two-column-layout">
      <section className="panel panel-wide">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Watchlist</p>
            <h1>{watchlist.watchlist.name}</h1>
          </div>
        </div>
        <WatchlistTable
          items={watchlist.securities}
          action={(securityId) => (
            <form action={removeFromWatchlistAction}>
              <input type="hidden" name="securityId" value={securityId} />
              <button type="submit" className="ghost-button">Remove</button>
            </form>
          )}
        />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Add Securities</p>
            <h2>Expand your coverage</h2>
          </div>
        </div>
        <div className="stack-list">
          {available.map((security) => (
            <div key={security.id} className="row-between card-row">
              <div>
                <p className="row-title">{security.ticker}</p>
                <p className="muted-copy">{security.companyName}</p>
              </div>
              <form action={addToWatchlistAction}>
                <input type="hidden" name="securityId" value={security.id} />
                <button type="submit" className="primary-button small-button">Add</button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}


