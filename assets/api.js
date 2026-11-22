/* 밍밍시 주문서 API — Supabase (기본) / 구글 Apps Script (선택) / 데모 모드 (둘 다 비어 있을 때) */
(function () {
  const C = window.MM_CONFIG;
  const MODE = C.SUPABASE_URL && C.SUPABASE_KEY ? 'supabase' : C.API_URL ? 'gas' : 'demo';
  const DEMO = MODE === 'demo';
  const KEY = 'mm_demo_orders_v2';

  const digits = (s) => String(s || '').replace(/\D/g, '');
  const fmtPhone = (s) => {
    const d = digits(s);
    if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
    return d;
  };
  const mask = (n) => { n = String(n || ''); return n.length <= 1 ? n : n[0] + '*'.repeat(Math.max(1, n.length - 2)) + (n.length > 2 ? n[n.length - 1] : ''); };
  const pad = (n, l = 2) => String(n).padStart(l, '0');

  async function remote(action, payload) {
    const res = await fetch(C.API_URL, {
      method: 'POST',
      // text/plain 으로 보내야 CORS 사전요청 없이 Apps Script 에 전달돼요
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || '요청에 실패했어요.');
    return data;
  }

  /* ---------- 데모(로컬) 구현 ---------- */
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  const save = (rows) => { try { localStorage.setItem(KEY, JSON.stringify(rows)); } catch (e) {} };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // 상품: 시트 열 이름 = "이름 무게" (예: 노지감귤 10kg)
  const PRODUCTS = C.PRODUCTS.map((p) => ({ ...p, col: `${p.name} ${p.weight}` }));
  function buildItems(items) {
    let total = 0, amount = 0; const summary = [], per = {};
    PRODUCTS.forEach((p) => {
      const q = parseInt(items[p.id], 10) || 0;
      per[p.col] = q;
      if (q > 0) { total += q; amount += q * p.price; summary.push(`${p.col} × ${q}`); }
    });
    return { total, amount, summary: summary.join(', '), per };
  }
  const nowStr = (t) => `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`;

  function seedIfEmpty() {
    if (load().length) return;
    const names = ['김민지', '이서준', '박하늘', '최유나', '정도윤', '한지우', '오세린', '윤태오', '강보람', '임채원', '서하준', '문다은'];
    const addrs = ['서울 마포구 월드컵북로 12', '경기 성남시 분당구 판교역로 235', '부산 해운대구 센텀중앙로 55', '서울 강남구 테헤란로 152', '인천 연수구 송도과학로 32', '대전 유성구 대학로 99'];
    const baskets = [{ noji10: 1 }, { gift5: 2 }, { noji10: 1, small5: 1 }, { home5: 1 }, { noji10: 2 }, { small5: 1 }, { noji10: 1, gift5: 1 }, { home5: 2 }, { noji10: 3 }, { gift5: 1 }, { small5: 2 }, { noji10: 1, home5: 1 }];
    const rows = [];
    const now = Date.now();
    names.forEach((n, i) => {
      const t = new Date(now - (11 - i) * 86400000 * 0.9 - i * 3600000);
      const ymd = `${String(t.getFullYear()).slice(2)}${pad(t.getMonth() + 1)}${pad(t.getDate())}`;
      const b = buildItems(baskets[i]);
      const status = i < 6 ? '발송완료' : i < 9 ? '입금확인' : i === 9 ? '취소' : '주문접수';
      const phone = fmtPhone('010' + String(12345678 + i * 1111111).slice(0, 8));
      const gift = i % 4 === 1;
      rows.push({
        '주문번호': `MM${ymd}-${pad(i + 1, 3)}`, '주문일시': nowStr(t), '상태': status,
        '주문자': n, '주문자연락처': phone,
        '받는분': gift ? '엄마' : n, '받는분연락처': gift ? fmtPhone('010' + String(87654321 - i * 1234567).slice(0, 8)) : phone,
        '우편번호': String(10000 + i * 3711).slice(0, 5), '주소': addrs[i % addrs.length], '상세주소': `${101 + i}동 ${1001 + i * 7}호`,
        '주문내역': b.summary, '총수량(박스)': b.total, '금액': b.amount, ...b.per,
        '입금자명': n, '입금셀프체크': '입금했어요 ✅', '배송메모': i % 3 === 0 ? '문 앞에 놓아주세요' : '',
        '택배사': status === '발송완료' ? C.DEFAULT_CARRIER : '', '송장번호': status === '발송완료' ? String(6890000000000 + i * 137) : '', '관리자메모': ''
      });
    });
    save(rows);
  }

  async function demo(action, p) {
    await sleep(450);
    seedIfEmpty();
    const rows = load();
    if (action === 'stats') {
      const sold = rows.filter((r) => r['상태'] !== '취소').reduce((s, r) => s + r['총수량(박스)'], 0);
      return { ok: true, soldBoxes: sold, soldOut: [] };
    }
    if (action === 'createOrder') {
      const o = p.order;
      const b = buildItems(o.items || {});
      if (b.total < 1) throw new Error('상품을 1개 이상 골라주세요.');
      const now = new Date();
      const prefix = `MM${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}-`;
      const orderNo = prefix + pad(rows.filter((r) => r['주문번호'].startsWith(prefix)).length + 1, 3);
      rows.push({
        '주문번호': orderNo, '주문일시': nowStr(now), '상태': '주문접수',
        '주문자': o.name.trim(), '주문자연락처': fmtPhone(o.phone),
        '받는분': (o.recvName || o.name).trim(), '받는분연락처': fmtPhone(o.recvPhone || o.phone),
        '우편번호': o.zip || '', '주소': o.address, '상세주소': o.addressDetail || '',
        '주문내역': b.summary, '총수량(박스)': b.total, '금액': b.amount, ...b.per,
        '입금자명': o.depositor || o.name, '입금셀프체크': '입금했어요 ✅', '배송메모': o.memo || '',
        '택배사': '', '송장번호': '', '관리자메모': ''
      });
      save(rows);
      return { ok: true, orderNo, amount: b.amount, summary: b.summary };
    }
    if (action === 'lookup') {
      const p2 = fmtPhone(p.phone);
      const orders = rows.filter((r) => r['주문자'] === String(p.name).trim() && r['주문자연락처'] === p2)
        .map((r) => ({ orderNo: r['주문번호'], createdAt: r['주문일시'], summary: r['주문내역'], qty: r['총수량(박스)'], amount: r['금액'], recvName: mask(r['받는분']), status: r['상태'], carrier: r['택배사'] || C.DEFAULT_CARRIER, trackingNo: r['송장번호'] }))
        .reverse();
      return { ok: true, orders };
    }
    if (action.startsWith('admin')) {
      if (p.password !== C.DEMO_ADMIN_PASSWORD) throw new Error('비밀번호가 맞지 않아요. (데모: ' + C.DEMO_ADMIN_PASSWORD + ')');
      if (action === 'adminLogin') return { ok: true };
      if (action === 'adminList') return { ok: true, orders: rows };
      if (action === 'adminUpdate') {
        let updated = 0; const missing = [];
        p.updates.forEach((u) => {
          const r = rows.find((x) => x['주문번호'] === String(u.orderNo));
          if (!r) { missing.push(u.orderNo); return; }
          if (u.status !== undefined) r['상태'] = u.status;
          if (u.carrier !== undefined) r['택배사'] = u.carrier;
          if (u.trackingNo !== undefined) r['송장번호'] = u.trackingNo;
          if (u.adminMemo !== undefined) r['관리자메모'] = u.adminMemo;
          updated++;
        });
        save(rows);
        return { ok: true, updated, missing };
      }
    }
    throw new Error('알 수 없는 요청');
  }

  /* ---------- Supabase ---------- */
  async function rpc(fn, args) {
    const headers = { 'Content-Type': 'application/json', apikey: C.SUPABASE_KEY };
    if (/^eyJ/.test(C.SUPABASE_KEY)) headers.Authorization = 'Bearer ' + C.SUPABASE_KEY; // 예전 anon 키
    let res;
    try {
      res = await fetch(`${C.SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/rpc/${fn}`, { method: 'POST', headers, body: JSON.stringify(args) });
    } catch (e) { throw new Error('인터넷 연결을 확인해주세요.'); }
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && data.message) || '요청에 실패했어요. 잠시 후 다시 시도해주세요.');
    return data;
  }
  function rowToKo(r) {
    const o = {
      '주문번호': r.order_no, '주문일시': r.created_kst, '상태': r.status,
      '주문자': r.name, '주문자연락처': fmtPhone(r.phone), '받는분': r.recv_name, '받는분연락처': fmtPhone(r.recv_phone),
      '우편번호': r.zip, '주소': r.address, '상세주소': r.address_detail,
      '주문내역': r.summary, '총수량(박스)': r.total_qty, '금액': r.amount
    };
    PRODUCTS.forEach((p) => { o[p.col] = Number((r.items || {})[p.id]) || 0; });
    Object.assign(o, { '입금자명': r.depositor, '입금셀프체크': '입금했어요 ✅', '배송메모': r.memo, '택배사': r.carrier, '송장번호': r.tracking_no, '관리자메모': r.admin_memo });
    return o;
  }
  async function supabase(action, p) {
    switch (action) {
      case 'stats': return rpc('public_stats', {});
      case 'createOrder': return rpc('create_order', { p: p.order });
      case 'lookup': return { ok: true, orders: (await rpc('lookup_orders', { p_name: p.name, p_phone: p.phone })).map((o) => ({ ...o, carrier: o.carrier || C.DEFAULT_CARRIER })) };
      case 'adminLogin':
      case 'adminList': return { ok: true, orders: (await rpc('admin_list', { p_password: p.password })).map(rowToKo) };
      case 'adminUpdate': return rpc('admin_update', { p_password: p.password, p_updates: p.updates });
    }
    throw new Error('알 수 없는 요청');
  }

  const call = (action, payload = {}) => (MODE === 'supabase' ? supabase(action, payload) : MODE === 'gas' ? remote(action, payload) : demo(action, payload));

  /* ---------- 택배사 배송조회 링크 ---------- */
  const CARRIERS = {
    'CJ대한통운': (n) => `https://trace.cjlogistics.com/next/tracking.html?wblNo=${n}`,
    '우체국택배': (n) => `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${n}`,
    '한진택배': (n) => `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2=${n}`,
    '롯데택배': (n) => `https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=${n}`,
    '로젠택배': (n) => `https://www.ilogen.com/web/personal/trace/${n}`,
    '경동택배': (n) => `https://kdexp.com/service/delivery/delivery_result.do?barcode=${n}`
  };
  const trackUrl = (carrier, no) => { const f = CARRIERS[carrier]; return f && no ? f(encodeURIComponent(digits(no) || no)) : null; };

  window.MM = { DEMO, call, PRODUCTS, digits, fmtPhone, mask, CARRIERS, trackUrl, won: (n) => Number(n || 0).toLocaleString('ko-KR') + '원' };
})();
