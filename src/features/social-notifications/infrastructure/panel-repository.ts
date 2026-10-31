import "server-only";
import { and, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { books, inAppReminders, readingSessions } from "@/db/schema";
import { getUserDayUtcRange } from "@/features/analytics/domain";
import { getReminderOccurrence } from "@/features/reminders/domain/reminder-schedule";
import { GetEffectiveReminderTimeUseCaseImpl } from "@/features/reminders/application/get-effective-reminder-time";
import {
  DrizzleReminderPreferenceRepository,
  DrizzleReadingBehaviorProfileRepository,
} from "@/features/reminders/infrastructure";
import { localDayKey } from "@/features/streak-buddies/domain/nudge";
import type { PanelData, PanelItem, PanelKind } from "../domain/panel";
function database() {
  if (!db) throw new Error("Database unavailable");
  return db;
}

/** In-app reminders do not depend on email/push opt-ins. Materialize the current
 * local day's due reminder when the signed-in app refreshes its bell. */
export async function ensureReadingReminder(
  user: { id: string; timezone: string },
  now = new Date(),
) {
  const effective = await new GetEffectiveReminderTimeUseCaseImpl(
    new DrizzleReminderPreferenceRepository(),
    new DrizzleReadingBehaviorProfileRepository(),
  ).execute(user.id, now);
  const due = getReminderOccurrence(now, effective.time, user.timezone);
  if (due > now) return;
  const day = getUserDayUtcRange(now, user.timezone);
  const [active, read] = await Promise.all([
    database()
      .select({ id: books.id })
      .from(books)
      .where(
        and(
          eq(books.userId, user.id),
          eq(books.status, "READING"),
          isNull(books.removedAt),
        ),
      )
      .limit(1),
    database()
      .select({ id: readingSessions.id })
      .from(readingSessions)
      .where(
        and(
          eq(readingSessions.userId, user.id),
          gte(readingSessions.readAt, day.startDate),
          lte(readingSessions.readAt, day.endDate),
        ),
      )
      .limit(1),
  ]);
  if (active.length && !read.length)
    await database()
      .insert(inAppReminders)
      .values({
        userId: user.id,
        localDay: localDayKey(now, user.timezone),
        createdAt: due,
      })
      .onConflictDoNothing();
}

/** The same unbounded, owner-scoped feed powers both the badge and panel. */
function feed(userId: string) {
  return sql`
select n.id, 'NUDGE'::text kind, u.name, null::integer days, n.created_at, n.read_at, n.reaction from streak_nudges n join users u on u.id=n.sender_id where n.recipient_id=${userId}
union all select c.id,'CONGRATULATION',u.name,m.days,c.created_at,c.read_at,c.reaction from milestone_congratulations c join streak_milestones m on m.id=c.milestone_id join users u on u.id=c.sender_id where m.user_id=${userId}
union all select n.id,'NUDGE_REACTION',u.name,null::integer,n.reaction_at,n.reaction_read_at,n.reaction from streak_nudges n join users u on u.id=n.recipient_id where n.sender_id=${userId} and n.reaction is not null
union all select c.id,'CONGRATULATION_REACTION',u.name,m.days,c.reaction_at,c.reaction_read_at,c.reaction from milestone_congratulations c join streak_milestones m on m.id=c.milestone_id join users u on u.id=m.user_id where c.sender_id=${userId} and c.reaction is not null
union all select f.id,'FRIEND_INVITE',u.name,null::integer,f.created_at,null::timestamptz,null::text from reading_friends f join users u on u.id=f.invited_by_user_id where f.status='PENDING' and f.invited_by_user_id<>${userId} and ${userId} in (f.user_low_id,f.user_high_id)
union all select p.id,'STREAK_INVITE',u.name,null::integer,p.updated_at,null::timestamptz,null::text from streak_partnerships p join reading_friends f on f.id=p.friendship_id join users u on u.id=p.invited_by_user_id where f.status='ACCEPTED' and p.status='PENDING' and p.invited_by_user_id<>${userId} and ${userId} in (f.user_low_id,f.user_high_id)
union all select m.id,'MILESTONE',u.name,m.days,m.created_at,null::timestamptz,null::text from streak_milestones m join users u on u.id=m.user_id join reading_friends f on m.user_id in (f.user_low_id,f.user_high_id) and ${userId} in (f.user_low_id,f.user_high_id) where m.user_id<>${userId} and f.status='ACCEPTED' and not exists(select 1 from milestone_congratulations c where c.milestone_id=m.id and c.sender_id=${userId})
union all select r.id,'READING_REMINDER',null::text,null::integer,r.created_at,null::timestamptz,null::text from in_app_reminders r where r.user_id=${userId}`;
}
function withReceipts(userId: string) {
  return sql`select f.*,coalesce(f.read_at,r.read_at) effective_read_at from (${feed(userId)}) f left join notification_receipts r on r.user_id=${userId} and r.kind=f.kind and r.source_id=f.id and r.read_at>=f.created_at`;
}
export async function readPanel(
  userId: string,
  limit = 50,
): Promise<PanelData> {
  const result = await database().execute(
    sql`with activity as (${withReceipts(userId)}) select (select count(*)::integer from activity where effective_read_at is null) unread_count,coalesce((select json_agg(page order by page.created_at desc,page.kind,page.id) from (select * from activity order by created_at desc,kind,id limit ${limit + 1}) page),'[]'::json) items`,
  );
  const row = result.rows[0] as {
    unread_count: number;
    items: Record<string, unknown>[];
  };
  return {
    unreadCount: row.unread_count,
    hasMore: row.items.length > limit,
    items: row.items.slice(0, limit).map((r) => ({
      id: String(r.id),
      kind: r.kind as PanelKind,
      name: r.name as string | null,
      days: r.days as number | null,
      createdAt: new Date(r.created_at as string).toISOString(),
      read: r.effective_read_at !== null,
      reaction: r.reaction as PanelItem["reaction"],
    })),
  };
}
export async function markPanelItemRead(
  userId: string,
  id: string,
  kind: PanelKind,
) {
  const result = await database().execute(
    sql`insert into notification_receipts(user_id,kind,source_id) select ${userId},f.kind,f.id from (${feed(userId)}) f where f.id=${id} and f.kind=${kind} on conflict (user_id,kind,source_id) do update set read_at=now() returning source_id`,
  );
  if (!result.rows.length) throw new Error("Notification not found.");
}
