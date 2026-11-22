-- =========================================================
--  밍밍시 친구네 귤 주문서 — Supabase 설정 SQL
--  Supabase 대시보드 > SQL Editor > New query 에 전체 붙여넣고 Run.
--  ⚠️ 맨 아래 '관리자 비밀번호' 부분을 먼저 바꾸고 실행하세요.
--  여러 번 실행해도 안전해요 (주문 데이터는 지워지지 않아요).
-- =========================================================

create extension if not exists pgcrypto with schema extensions;

-- 상품 (가격은 여기 값으로 계산돼요. config.js 와 같게 맞춰주세요)
create table if not exists public.products (
  id       text primary key,
  name     text not null,          -- 엑셀 열 이름으로도 쓰여요 (예: 노지감귤 10kg)
  price    int  not null,
  sold_out boolean not null default false,
  sort     int  not null default 0
);

insert into public.products (id, name, price, sort) values
  ('noji10', '노지감귤 10kg',     35000, 1),
  ('small5', '꼬마 황금향 5kg',   25000, 2),
  ('home5',  '가정용 황금향 5kg', 35000, 3),
  ('gift5',  '선물용 황금향 5kg', 40000, 4)
on conflict (id) do update set name = excluded.name, price = excluded.price, sort = excluded.sort;

-- 주문
create table if not exists public.orders (
  order_no       text primary key,
  created_at     timestamptz not null default now(),
  status         text not null default '주문접수',
  name           text not null,
  phone          text not null,      -- 숫자만 저장 (01012345678)
  recv_name      text not null,
  recv_phone     text not null,
  zip            text not null default '',
  address        text not null,
  address_detail text not null default '',
  items          jsonb not null,     -- {"noji10": 2, "gift5": 1}
  summary        text not null,      -- 노지감귤 10kg × 2, 선물용 황금향 5kg × 1
  total_qty      int  not null,
  amount         int  not null,
  depositor      text not null default '',
  memo           text not null default '',
  carrier        text not null default '',
  tracking_no    text not null default '',
  admin_memo     text not null default ''
);
create index if not exists orders_lookup_idx on public.orders (name, phone);

-- 설정 (관리자 비밀번호 해시)
create table if not exists public.settings (
  key   text primary key,
  value text not null
);

-- 테이블은 직접 접근 금지. 아래 함수로만 읽고 써요.
alter table public.products enable row level security;
alter table public.orders   enable row level security;
alter table public.settings enable row level security;
revoke all on public.products, public.orders, public.settings from anon, authenticated;

-- ---------- 도우미 ----------
create or replace function public.mm_digits(t text) returns text
language sql immutable as $$ select regexp_replace(coalesce(t, ''), '\D', '', 'g') $$;

create or replace function public.mm_clean(t text, n int) returns text
language sql immutable as $$ select left(btrim(regexp_replace(coalesce(t, ''), '[\r\n\t]+', ' ', 'g')), n) $$;

create or replace function public.mm_mask(t text) returns text
language sql immutable as $$
  select case when char_length(coalesce(t, '')) <= 1 then coalesce(t, '')
              when char_length(t) = 2 then left(t, 1) || '*'
              else left(t, 1) || repeat('*', char_length(t) - 2) || right(t, 1) end
$$;

create or replace function public.mm_check_admin(p_password text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare v text;
begin
  select value into v from settings where key = 'admin_password';
  if v is null or p_password is null or crypt(p_password, v) <> v then
    perform pg_sleep(0.7);
    raise exception '비밀번호가 맞지 않아요.';
  end if;
end $$;

-- ---------- 손님용 ----------
create or replace function public.public_stats() returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'ok', true,
    'soldBoxes', coalesce((select sum(total_qty) from orders where status <> '취소'), 0),
    'soldOut', coalesce((select jsonb_agg(id) from products where sold_out), '[]'::jsonb)
  )
$$;

create or replace function public.create_order(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_name   text := mm_clean(p->>'name', 20);
  v_phone  text := mm_digits(p->>'phone');
  v_rname  text := mm_clean(p->>'recvName', 20);
  v_rphone text := mm_digits(p->>'recvPhone');
  v_items  jsonb := coalesce(p->'items', '{}'::jsonb);
  r record; q int;
  v_total int := 0; v_amount int := 0; v_summary text[] := '{}'; v_clean jsonb := '{}'::jsonb;
  v_prefix text; v_seq int; v_no text;
begin
  if jsonb_typeof(v_items) <> 'object' then v_items := '{}'::jsonb; end if;
  if v_rname = '' then v_rname := v_name; end if;
  if v_rphone = '' then v_rphone := v_phone; end if;
  if v_name = '' then raise exception '주문자 이름을 입력해주세요.'; end if;
  if v_phone !~ '^01[0-9]{8,9}$' then raise exception '휴대폰 번호를 확인해주세요.'; end if;
  if v_rphone !~ '^01[0-9]{8,9}$' then raise exception '받는 분 휴대폰 번호를 확인해주세요.'; end if;
  if mm_clean(p->>'address', 200) = '' then raise exception '주소를 입력해주세요.'; end if;
  if coalesce(p->>'depositChecked', '') <> 'true' then raise exception '입금 확인 체크가 필요해요.'; end if;

  for r in select * from products order by sort loop
    q := coalesce(nullif(mm_digits(left(v_items->>r.id, 4)), '')::int, 0);
    if q > 20 then raise exception '% 수량을 확인해주세요.', r.name; end if;
    if q > 0 and r.sold_out then raise exception '% 은(는) 품절이에요.', r.name; end if;
    if q > 0 then
      v_total := v_total + q;
      v_amount := v_amount + q * r.price;
      v_summary := v_summary || (r.name || ' × ' || q);
      v_clean := v_clean || jsonb_build_object(r.id, q);
    end if;
  end loop;
  if v_total < 1 then raise exception '상품을 1개 이상 골라주세요.'; end if;

  perform pg_advisory_xact_lock(20261122);
  v_prefix := 'MM' || to_char(now() at time zone 'Asia/Seoul', 'YYMMDD') || '-';
  select coalesce(max(substring(order_no from char_length(v_prefix) + 1)::int), 0) + 1 into v_seq
    from orders where order_no like v_prefix || '%';
  v_no := v_prefix || lpad(v_seq::text, 3, '0');

  insert into orders (order_no, name, phone, recv_name, recv_phone, zip, address, address_detail,
                      items, summary, total_qty, amount, depositor, memo)
  values (v_no, v_name, v_phone, v_rname, v_rphone, mm_clean(p->>'zip', 10), mm_clean(p->>'address', 200),
          mm_clean(p->>'addressDetail', 100), v_clean, array_to_string(v_summary, ', '), v_total, v_amount,
          coalesce(nullif(mm_clean(p->>'depositor', 20), ''), v_name), mm_clean(p->>'memo', 100));

  return jsonb_build_object('ok', true, 'orderNo', v_no, 'amount', v_amount, 'summary', array_to_string(v_summary, ', '));
end $$;

create or replace function public.lookup_orders(p_name text, p_phone text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if mm_clean(p_name, 20) = '' or mm_digits(p_phone) = '' then
    raise exception '이름과 휴대폰 번호를 입력해주세요.';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'orderNo', order_no,
      'createdAt', to_char(created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI'),
      'summary', summary, 'qty', total_qty, 'amount', amount,
      'recvName', mm_mask(recv_name), 'status', status,
      'carrier', carrier, 'trackingNo', tracking_no
    ) order by created_at desc)
    from orders where name = mm_clean(p_name, 20) and phone = mm_digits(p_phone)
  ), '[]'::jsonb);
end $$;

-- ---------- 관리자용 ----------
create or replace function public.admin_list(p_password text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform mm_check_admin(p_password);
  return coalesce((
    select jsonb_agg(to_jsonb(o) || jsonb_build_object(
      'created_kst', to_char(o.created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI:SS')
    ) order by o.created_at)
    from orders o
  ), '[]'::jsonb);
end $$;

create or replace function public.admin_update(p_password text, p_updates jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare u jsonb; n int := 0; missing jsonb := '[]'::jsonb;
begin
  perform mm_check_admin(p_password);
  for u in select * from jsonb_array_elements(coalesce(p_updates, '[]'::jsonb)) loop
    if u ? 'status' and (u->>'status') not in ('주문접수', '미입금', '입금확인', '발송완료', '취소') then
      raise exception '잘못된 상태값: %', u->>'status';
    end if;
    update orders set
      status      = case when u ? 'status'     then u->>'status' else status end,
      carrier     = case when u ? 'carrier'    then mm_clean(u->>'carrier', 20) else carrier end,
      tracking_no = case when u ? 'trackingNo' then mm_clean(u->>'trackingNo', 300) else tracking_no end,
      admin_memo  = case when u ? 'adminMemo'  then mm_clean(u->>'adminMemo', 200) else admin_memo end
    where order_no = u->>'orderNo';
    if found then n := n + 1; else missing := missing || to_jsonb(u->>'orderNo'); end if;
  end loop;
  return jsonb_build_object('ok', true, 'updated', n, 'missing', missing);
end $$;

-- 공개 함수만 손님/관리자 페이지에서 부를 수 있게
revoke all on function public.mm_check_admin(text) from public, anon, authenticated;
grant execute on function public.public_stats()               to anon, authenticated;
grant execute on function public.create_order(jsonb)          to anon, authenticated;
grant execute on function public.lookup_orders(text, text)    to anon, authenticated;
grant execute on function public.admin_list(text)             to anon, authenticated;
grant execute on function public.admin_update(text, jsonb)    to anon, authenticated;

-- =========================================================
--  🔑 관리자 비밀번호 — 아래 '여기에-비밀번호' 를 바꾸고 실행하세요.
--  나중에 비밀번호를 바꾸려면 이 줄만 다시 실행하면 돼요.
-- =========================================================
insert into public.settings (key, value)
values ('admin_password', extensions.crypt('여기에-비밀번호', extensions.gen_salt('bf')))
on conflict (key) do update set value = excluded.value;
