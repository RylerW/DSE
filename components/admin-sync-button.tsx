"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminSyncButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setIsPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/sync-ui", {
        method: "POST",
      });

      const payload = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!response.ok || !payload?.ok) {
        setMessage(payload?.message ?? "Sync failed.");
        return;
      }

      setMessage("Sync completed.");
      router.refresh();
    } catch {
      setMessage("Sync failed.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div>
      <button type="button" className="primary-button" onClick={handleClick} disabled={isPending}>
        {isPending ? "Syncing..." : "Run official DSE sync"}
      </button>
      {message ? <p className="muted-copy">{message}</p> : null}
    </div>
  );
}
