-- Supabase Realtime for `public.messages` (applicant ↔ owner DMs)
-- Run in Supabase SQL Editor on the **same** database/branch your app uses (e.g. Production).
--
-- If Realtime → Policies shows `messages` as **API DISABLED** or changes feel delayed across
-- tabs/devices, complete ALL steps below AND confirm the table is in the publication:
--   Dashboard → Database → Publications → `supabase_realtime` → `messages` must be enabled
--   (or the `alter publication` line below must succeed without error).
--
-- Auth: the browser uses a short-lived JWT from GET /realtime/token (Bearer: app login token).
-- That JWT is signed with Supabase's JWT Secret (stored only in backend SUPABASE_JWT_SECRET).
-- RLS below uses auth.jwt()->>'sub' for the app user id; it does NOT use your FastAPI JWT_SECRET_KEY.
--
-- Note: Sending still goes through your FastAPI WebSocket `/ws/chat`. Realtime duplicates INSERTs
-- for extra clients/tabs when the WS path alone is not enough.

-- 1) Replicate inserts to Realtime subscribers
-- If you already enabled `messages` under Database → Publications → supabase_realtime, a plain
-- `ALTER PUBLICATION ... ADD TABLE` errors and aborts the whole script. This block is idempotent.
do $add_pub$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then
    null;
  when others then
    if sqlstate = '42710' or sqlerrm ilike '%already member%' then
      null;
    else
      raise;
    end if;
end
$add_pub$;

-- 2) Row Level Security so clients only receive rows they participate in
alter table public.messages enable row level security;

-- Drop if re-running
drop policy if exists "messages_select_realtime_participants" on public.messages;

create policy "messages_select_realtime_participants"
  on public.messages
  for select
  using (
    trim(both from coalesce(sender_id, '')) = trim(both from coalesce((select auth.jwt()->>'sub'), ''))
    or trim(both from coalesce(receiver_id, '')) = trim(both from coalesce((select auth.jwt()->>'sub'), ''))
  );

-- Match Supabase third-party JWT docs. Backend: SUPABASE_JWT_SECRET + GET /realtime/token.
