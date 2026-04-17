"use client";

import { useState } from "react";

type Invite = {
  id: string;
  token: string;
  expiresAt: string;
  usedBy: string | null;
  usedAt: string | null;
  usedByName: string | null;
};

function inviteStatus(invite: Invite): { label: string; className: string } {
  if (invite.usedBy) {
    return { label: "Использовано", className: "text-lumm-text-secondary" };
  }
  if (new Date(invite.expiresAt) < new Date()) {
    return { label: "Истекло", className: "text-red-400" };
  }
  return { label: "Активно", className: "text-green-400" };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function buildInviteUrl(token: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/invite/${token}`;
  }
  return `/invite/${token}`;
}

export function InvitesClient({ initialInvites }: { initialInvites: Invite[] }) {
  const [invites, setInvites] = useState<Invite[]>(initialInvites);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const createInvite = async () => {
    setCreating(true);
    const res = await fetch("/api/invites", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setInvites([
        {
          id: data.token,
          token: data.token,
          expiresAt: data.expiresAt,
          usedBy: null,
          usedAt: null,
          usedByName: null,
        },
        ...invites,
      ]);
    }
    setCreating(false);
  };

  const copyLink = async (token: string) => {
    await navigator.clipboard.writeText(buildInviteUrl(token));
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-lumm-text-primary">Приглашения</h1>
          <p className="text-sm text-lumm-text-secondary mt-1">
            Создавайте ссылки для приглашения новых участников
          </p>
        </div>
        <button
          onClick={createInvite}
          disabled={creating}
          className="px-4 py-2 bg-lumm-gold text-lumm-dark font-medium rounded-lg hover:bg-lumm-gold-light disabled:opacity-50 transition-colors"
        >
          {creating ? "Создание..." : "Создать приглашение"}
        </button>
      </div>

      <div className="bg-lumm-black border border-lumm-gray-light rounded-xl overflow-hidden">
        {invites.length === 0 ? (
          <p className="p-8 text-center text-lumm-text-secondary">Приглашений пока нет</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-lumm-gray-light text-sm text-lumm-text-secondary">
                  <th className="text-left px-4 py-3 font-normal">Статус</th>
                  <th className="text-left px-4 py-3 font-normal">Истекает</th>
                  <th className="text-left px-4 py-3 font-normal">Использовано</th>
                  <th className="text-right px-4 py-3 font-normal">Ссылка</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => {
                  const status = inviteStatus(invite);
                  const canCopy = !invite.usedBy && new Date(invite.expiresAt) > new Date();
                  return (
                    <tr
                      key={invite.id}
                      className="border-b border-lumm-gray-light/50 hover:bg-lumm-gray/20"
                    >
                      <td className={`px-4 py-3 text-sm ${status.className}`}>{status.label}</td>
                      <td className="px-4 py-3 text-sm text-lumm-text-primary">
                        {formatDate(invite.expiresAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-lumm-text-primary">
                        {invite.usedByName || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canCopy ? (
                          <button
                            onClick={() => copyLink(invite.token)}
                            className="text-sm text-lumm-gold hover:text-lumm-gold-light"
                          >
                            {copiedId === invite.token ? "Скопировано!" : "Скопировать"}
                          </button>
                        ) : (
                          <span className="text-sm text-lumm-text-secondary">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
