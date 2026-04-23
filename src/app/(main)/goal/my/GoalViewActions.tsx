"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export function GoalViewActions() {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Удалить структурную цель? Это действие нельзя отменить.")) return;
    setDeleting(true);
    const res = await fetch("/api/goal-plans/me", { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      router.push("/goal");
      router.refresh();
    } else {
      alert("Не удалось удалить цель");
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href="/goal/new?edit=1"
        className="px-5 py-2.5 rounded-lg bg-lumm-gold text-lumm-dark font-medium hover:bg-lumm-gold-light transition-colors"
      >
        Уточнить формулировку
      </Link>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="px-5 py-2.5 rounded-lg bg-lumm-gray border border-lumm-gray-light text-red-400 hover:bg-lumm-gray-light transition-colors disabled:opacity-50"
      >
        {deleting ? "Удаление..." : "Отказаться от цели"}
      </button>
    </div>
  );
}
