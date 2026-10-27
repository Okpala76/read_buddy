"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Search, UserRoundPlus, UsersRound, X } from "lucide-react";
import {
  findReadingFriends, removeFriendship, respondToFriendRequest, sendFriendRequest,
  type FriendView,
} from "./friend-actions";

type SearchResult = Awaited<ReturnType<typeof findReadingFriends>>[number];

export function FriendsPage({ relationships }: { relationships: FriendView[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const incoming = relationships.filter((r) => r.status === "PENDING" && r.direction === "incoming");
  const outgoing = relationships.filter((r) => r.status === "PENDING" && r.direction === "outgoing");
  const friends = relationships.filter((r) => r.status === "ACCEPTED");

  function execute(action: () => Promise<unknown>, successful: string) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        await action();
        setNotice(successful);
        setResults([]);
        setSearched(false);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Something went wrong. Try again.");
      }
    });
  }

  function lookup() {
    setError(null);
    setNotice(null);
    if (search.trim().length < 3) {
      setError("Enter at least 3 characters of a name, or an exact email address.");
      return;
    }
    startTransition(async () => {
      try {
        setResults(await findReadingFriends(search.trim()));
        setSearched(true);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Search failed");
      }
    });
  }

  return (
    <div className="space-y-9">
      <header className="max-w-2xl">
        <p className="text-primary text-sm font-medium">Reading Buddies · Batch 1/6</p>
        <h1 className="text-foreground mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Friends & invitations</h1>
        <p className="text-muted-foreground mt-2">
          Connect with readers first. A friendship doesn&apos;t automatically enroll anyone in a streak partnership.
        </p>
      </header>

      {error && <p role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-xl border p-3 text-sm">{error}</p>}
      {notice && <p role="status" className="bg-primary/10 text-primary rounded-xl p-3 text-sm">{notice}</p>}

      <section className="border-border bg-card space-y-4 rounded-2xl border p-5 sm:p-6">
        <div className="flex items-center gap-2"><UserRoundPlus className="text-primary size-5" aria-hidden="true" /><h2 className="text-lg font-semibold">Find reading friends</h2></div>
        <form onSubmit={(event) => { event.preventDefault(); lookup(); }} className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="friend-search" className="sr-only">Search readers by name or exact email</label>
          <input id="friend-search" type="search" minLength={3} maxLength={100} value={search}
            onChange={(event) => { setSearch(event.target.value); setSearched(false); setResults([]); }}
            placeholder="Name or exact email address" className="border-input bg-background min-h-11 w-full rounded-lg border px-3 text-sm sm:flex-1" />
          <button type="submit" disabled={pending} className="bg-primary text-primary-foreground inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-medium disabled:opacity-50"><Search className="size-4" aria-hidden="true" />Search</button>
        </form>
        {searched && (results.length ? (
          <ul className="divide-border divide-y">
            {results.map((person) => (
              <li key={person.id} className="flex items-center justify-between gap-3 py-3">
                <span className="font-medium">{person.name}</span>
                {person.relationship === "NONE" ? (
                  <button disabled={pending} type="button" onClick={() => execute(() => sendFriendRequest({ userId: person.id }), "Friend request sent.")}
                    className="border-border hover:bg-muted rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50">Add friend</button>
                ) : <span className="text-muted-foreground text-xs">
                  {person.relationship === "ACCEPTED" ? "Already friends" : person.relationship === "DECLINED" ? "Request declined" : person.direction === "incoming" ? "Sent you a request below" : "Request pending"}
                </span>}
              </li>
            ))}
          </ul>
        ) : <p className="text-muted-foreground text-sm">No readers found. Try another name or an exact email.</p>)}
        <p className="text-muted-foreground text-xs">Only display names appear in results. Your email address is not shown to other readers.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Requests {incoming.length > 0 ? `(${incoming.length})` : ""}</h2>
        {incoming.length === 0 && outgoing.length === 0 ? (
          <p className="text-muted-foreground rounded-xl border p-5 text-sm">No pending friend requests yet.</p>
        ) : (
          <div className="space-y-3">
            {incoming.map((r) => (
              <article key={r.requestId} className="border-border bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                <div><p className="font-semibold">{r.name}</p><p className="text-muted-foreground text-sm">Wants to connect with you</p></div>
                <div className="flex gap-2">
                  <button disabled={pending} onClick={() => execute(() => respondToFriendRequest({ requestId:r.requestId, decision:"ACCEPTED" }), "Friend request accepted.")} className="bg-primary text-primary-foreground inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-sm font-semibold disabled:opacity-50"><Check className="size-4" />Accept</button>
                  <button disabled={pending} onClick={() => execute(() => respondToFriendRequest({ requestId:r.requestId, decision:"DECLINED" }), "Request declined.")} className="inline-flex min-h-11 items-center gap-1 rounded-lg border px-3 text-sm disabled:opacity-50"><X className="size-4" />Decline</button>
                </div>
              </article>
            ))}
            {outgoing.map((r) => (
              <article key={r.requestId} className="border-border bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                <div><p className="font-semibold">{r.name}</p><p className="text-muted-foreground text-sm">Invitation awaiting a reply</p></div>
                <button disabled={pending} onClick={() => execute(() => removeFriendship({ requestId:r.requestId }), "Invitation canceled.")} className="min-h-11 rounded-lg border px-3 text-sm disabled:opacity-50">Cancel invitation</button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2"><UsersRound className="text-primary size-5" aria-hidden="true" /><h2 className="text-xl font-semibold">Your friends ({friends.length})</h2></div>
        {friends.length === 0 ? (
          <p className="text-muted-foreground rounded-xl border p-5 text-sm">No reading friends yet. Search above to invite someone.</p>
        ) : (
          <ul className="space-y-3">
            {friends.map((r) => (
              <li key={r.requestId} className="border-border bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                <div><p className="font-semibold">{r.name}</p><p className="text-muted-foreground text-xs">Reading friend · Streak invitations available in Batch 2/6</p></div>
                <button disabled={pending} onClick={() => {
                  if (window.confirm(`Remove ${r.name} from your friends?`)) execute(() => removeFriendship({ requestId:r.requestId }), "Friend removed.");
                }} className="text-muted-foreground min-h-11 rounded-lg border px-3 text-sm disabled:opacity-50">Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
