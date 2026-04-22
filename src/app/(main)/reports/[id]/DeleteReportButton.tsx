"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteReportButton({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (!confirm("Удалить этот отчёт и его анализ? Это необратимо.")) return;
    setBusy(true);
    const res = await fetch(`/api/reports/${reportId}`, { method: "DELETE" });
    if (res.ok) {
      router.replace("/reports");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`Ошибка: ${data.error || res.statusText}`);
      setBusy(false);
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
    >
      {busy ? "Удаляю..." : "Удалить отчёт"}
    </button>
  );
}
