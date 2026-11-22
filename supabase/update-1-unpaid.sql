-- =========================================================
--  업데이트 #1 : '미입금' 상태 추가
--  이미 setup.sql 을 실행했다면 이 파일만 SQL Editor 에서 Run 하세요.
--  (비밀번호나 주문 데이터는 그대로예요)
-- =========================================================

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

grant execute on function public.admin_update(text, jsonb) to anon, authenticated;
