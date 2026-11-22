(function () {
  const C = window.MM_CONFIG;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const PW_KEY = 'mm_admin_pw';
  const STATUSES = ['주문접수', '입금확인', '발송완료', '취소'];
  const STATUS_META = {
    '주문접수': { ic: '📝', bg: 'var(--orange-50)', color: 'var(--orange)', desc: '입금 확인이 필요해요' },
    '입금확인': { ic: '💰', bg: 'var(--blue-50)', color: 'var(--blue)', desc: '포장 · 송장 입력 대기' },
    '발송완료': { ic: '🚚', bg: 'var(--green-50)', color: 'var(--green)', desc: '송장번호 등록 완료' },
    '취소': { ic: '✕', bg: '#F2F4F6', color: '#B0B8C1', desc: '집계에서 제외돼요' }
  };

  let pw = null;
  let orders = [];
  let filter = '전체';
  let query = '';
  const selected = new Set();

  Pixel.mascot($('#logo'));
  Pixel.mascot($('#login-mascot'));

  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  if (MM.DEMO) { const n = $('#demo-note'); n.textContent = `데모 모드 · 비밀번호 ${C.DEMO_ADMIN_PASSWORD} · 샘플 주문이 들어있어요`; n.classList.remove('hidden'); }

  /* ---------- 로그인 ---------- */
  async function login(p, silent) {
    const btn = $('#login-btn');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
    try {
      const r = await MM.call('adminList', { password: p });
      pw = p;
      try { sessionStorage.setItem(PW_KEY, p); } catch (e) {}
      orders = r.orders;
      $('#login-view').classList.add('hidden');
      $('#dash-view').classList.remove('hidden');
      $('#top-actions').classList.remove('hidden');
      if (!$('#dash-farm').dataset.on) { $('#dash-farm').dataset.on = 1; Pixel.farm($('#dash-farm')); }
      render();
    } catch (err) {
      if (!silent) toast(err.message);
      try { sessionStorage.removeItem(PW_KEY); } catch (e) {}
    } finally { btn.disabled = false; btn.textContent = '들어가기'; }
  }
  $('#login-form').addEventListener('submit', (e) => { e.preventDefault(); login($('#pw').value, false); });
  try { const saved = sessionStorage.getItem(PW_KEY); if (saved) login(saved, true); } catch (e) {}

  $('#logout').onclick = () => { try { sessionStorage.removeItem(PW_KEY); } catch (e) {} location.reload(); };
  async function refresh() {
    const b = $('#refresh'); b.classList.add('spin');
    try { const r = await MM.call('adminList', { password: pw }); orders = r.orders; render(); toast('최신 주문을 불러왔어요'); }
    catch (err) { toast(err.message); }
    finally { b.classList.remove('spin'); }
  }
  $('#refresh').onclick = refresh;

  /* ---------- 렌더 ---------- */
  const live = () => orders.filter((o) => o['상태'] !== '취소');
  const sum = (arr, k) => arr.reduce((s, o) => s + (Number(o[k]) || 0), 0);

  function render() {
    renderKpis();
    renderChart();
    renderStatus();
    renderProducts();
    renderChips();
    renderRows();
  }

  function renderKpis() {
    const L = live();
    const boxes = sum(L, '총수량(박스)');
    const today = new Date();
    const tkey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayBoxes = sum(L.filter((o) => String(o['주문일시']).startsWith(tkey)), '총수량(박스)');
    const pendingPay = orders.filter((o) => o['상태'] === '주문접수');
    const toShip = orders.filter((o) => o['상태'] === '입금확인');
    $('#dash-title').innerHTML = `귤 <em>${boxes.toLocaleString()}박스</em> 주문됐어요`;
    $('#dash-sub').textContent = `${L.length}건 · 오늘 ${todayBoxes}박스 · ${MM.won(sum(L, '금액'))}`;
    const k = [
      { label: '총 주문 금액', val: MM.won(sum(L, '금액')), sub: `${L.length}건 · ${boxes}박스`, accent: true },
      { label: '입금 확인 필요', val: `${pendingPay.length}건`, sub: `${sum(pendingPay, '총수량(박스)')}박스 · ${MM.won(sum(pendingPay, '금액'))}` },
      { label: '발송 대기', val: `${toShip.length}건`, sub: `${sum(toShip, '총수량(박스)')}박스 포장 필요` },
      { label: '발송 완료', val: `${orders.filter((o) => o['상태'] === '발송완료').length}건`, sub: `${sum(orders.filter((o) => o['상태'] === '발송완료'), '총수량(박스)')}박스` }
    ];
    $('#kpis').innerHTML = k.map((x) => `<div class="kpi ${x.accent ? 'accent' : ''}"><span>${x.label}</span><b>${x.val}</b><small>${x.sub}</small></div>`).join('');
  }

  function renderChart() {
    const days = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ key, label: `${d.getMonth() + 1}/${d.getDate()}`, boxes: 0, count: 0 });
    }
    const idx = Object.fromEntries(days.map((d, i) => [d.key, i]));
    live().forEach((o) => { const i = idx[String(o['주문일시']).slice(0, 10)]; if (i !== undefined) { days[i].boxes += o['총수량(박스)']; days[i].count++; } });
    const W = Math.max(280, Math.round($('#chart').clientWidth || 640)), H = 220, padL = 28, padB = 26, padT = 18;
    const max = Math.max(4, ...days.map((d) => d.boxes));
    const step = max <= 5 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : Math.ceil(max / 5 / 5) * 5;
    const top = Math.ceil(max / step) * step;
    const y = (v) => padT + (H - padT - padB) * (1 - v / top);
    const bw = (W - padL) / days.length;
    const barW = Math.max(6, Math.min(24, bw - 8));
    let grid = '', bars = '', hits = '', labels = '', vals = '';
    for (let v = 0; v <= top; v += step) grid += `<line x1="${padL}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text x="${padL - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    days.forEach((d, i) => {
      const cx = padL + bw * i + bw / 2;
      if (d.boxes > 0) {
        const h = y(0) - y(d.boxes), r = Math.min(4, h);
        const x0 = cx - barW / 2, y0 = y(d.boxes), y1 = y(0);
        bars += `<path class="bar" data-i="${i}" d="M${x0},${y1} V${y0 + r} Q${x0},${y0} ${x0 + r},${y0} H${x0 + barW - r} Q${x0 + barW},${y0} ${x0 + barW},${y0 + r} V${y1} Z"/>`;
      }
      hits += `<rect class="hit" data-i="${i}" x="${padL + bw * i}" y="${padT}" width="${bw}" height="${H - padT - padB}"/>`;
      if (i % (bw < 34 ? 3 : 2) === (days.length - 1) % (bw < 34 ? 3 : 2)) labels += `<text x="${cx}" y="${H - 6}" text-anchor="middle">${d.label}</text>`;
    });
    // 최댓값과 오늘 값만 직접 표시
    const maxI = days.reduce((m, d, i) => (d.boxes > days[m].boxes ? i : m), 0);
    [maxI, days.length - 1].filter((v, i, a) => a.indexOf(v) === i).forEach((i) => {
      if (days[i].boxes > 0) vals += `<text class="val" x="${padL + bw * i + bw / 2}" y="${y(days[i].boxes) - 6}" text-anchor="middle">${days[i].boxes}</text>`;
    });
    $('#chart').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="최근 14일 날짜별 주문 박스 수">
      <g class="grid axis">${grid}</g><g class="axis">${labels}</g><g>${bars}</g><g>${vals}</g><g>${hits}</g></svg><div class="chart-tip"></div>`;
    const svg = $('#chart svg'), tip = $('#chart .chart-tip');
    svg.querySelectorAll('.hit').forEach((h) => {
      h.addEventListener('mouseenter', () => {
        const i = +h.dataset.i, d = days[i];
        svg.querySelectorAll('.bar').forEach((b) => b.classList.toggle('dim', +b.dataset.i !== i));
        const rect = svg.getBoundingClientRect();
        const px = ((padL + bw * i + bw / 2) / W) * rect.width;
        const py = (y(d.boxes) / H) * rect.height;
        tip.innerHTML = `${d.label} · <b>${d.boxes}박스</b> (${d.count}건)`;
        tip.style.left = px + 'px'; tip.style.top = py + 'px'; tip.style.opacity = 1;
      });
      h.addEventListener('mouseleave', () => { tip.style.opacity = 0; svg.querySelectorAll('.bar').forEach((b) => b.classList.remove('dim')); });
    });
  }

  function renderProducts() {
    const L = live();
    const stats = MM.PRODUCTS.map((p) => {
      const qty = L.reduce((a, o) => a + (Number(o[p.col]) || 0), 0);
      const waiting = L.filter((o) => o['상태'] !== '발송완료').reduce((a, o) => a + (Number(o[p.col]) || 0), 0);
      return { p, qty, waiting, amount: qty * p.price };
    });
    const max = Math.max(1, ...stats.map((x) => x.qty));
    $('#product-board').innerHTML = stats.map((x) => `<div class="prod-row">
        <div class="prod-top"><span class="prod-nm">${esc(x.p.name)} <small>${esc(x.p.weight)}</small></span><span class="prod-ct">${x.qty}<small>박스</small></span></div>
        <div class="prod-bar"><span style="width:${(x.qty / max) * 100}%"></span></div>
        <div class="prod-sub"><span>${MM.won(x.amount)}</span><span>${x.waiting ? `미발송 ${x.waiting}박스` : '모두 발송'}</span></div>
      </div>`).join('');
  }

  function renderStatus() {
    const total = orders.length || 1;
    const counts = Object.fromEntries(STATUSES.map((s) => [s, orders.filter((o) => o['상태'] === s).length]));
    const progress = STATUSES.filter((s) => counts[s]).map((s) => `<span style="width:${(counts[s] / total) * 100}%;background:${STATUS_META[s].color}" title="${s} ${counts[s]}건"></span>`).join('');
    $('#status-board').innerHTML = `<div class="progress">${progress}</div>` + STATUSES.map((s) => {
      const m = STATUS_META[s];
      return `<div class="status-row" data-status="${s}"><span class="ic" style="background:${m.bg};color:${m.color}">${m.ic}</span>
        <span class="nm">${s}<small>${m.desc}</small></span><span class="ct">${counts[s]}</span></div>`;
    }).join('');
    $('#status-board').querySelectorAll('.status-row').forEach((r) => r.onclick = () => { filter = r.dataset.status; renderChips(); renderRows(); $('#chips').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  }

  function renderChips() {
    const list = ['전체', ...STATUSES];
    $('#chips').innerHTML = list.map((s) => `<button class="${s === filter ? 'on' : ''}" data-f="${s}">${s}<em>${s === '전체' ? orders.length : orders.filter((o) => o['상태'] === s).length}</em></button>`).join('');
    $('#chips').querySelectorAll('button').forEach((b) => b.onclick = () => { filter = b.dataset.f; renderChips(); renderRows(); });
  }

  function visible() {
    const q = query.trim().toLowerCase().replace(/-/g, '');
    return orders.filter((o) => (filter === '전체' || o['상태'] === filter) && (!q || ['주문번호', '주문내역', '주문자', '주문자연락처', '받는분', '받는분연락처', '주소', '상세주소', '입금자명', '송장번호']
      .some((k) => String(o[k]).toLowerCase().replace(/-/g, '').includes(q)))).slice().reverse();
  }

  function renderRows() {
    const list = visible();
    $('#list-count').textContent = list.length;
    $('#list-empty').classList.toggle('hidden', list.length > 0);
    const carriers = Object.keys(MM.CARRIERS);
    $('#rows').innerHTML = list.map((o) => {
      const no = o['주문번호'];
      const gift = o['받는분'] && (o['받는분'] !== o['주문자'] || o['받는분연락처'] !== o['주문자연락처']);
      const carrier = o['택배사'] || C.DEFAULT_CARRIER;
      const carrierOpts = (carriers.includes(carrier) ? carriers : [carrier, ...carriers]).map((c) => `<option ${c === carrier ? 'selected' : ''}>${esc(c)}</option>`).join('');
      return `<tr data-no="${esc(no)}" class="${selected.has(no) ? 'sel' : ''} ${o['상태'] === '취소' ? 'cancel' : ''}">
        <td><input type="checkbox" class="row-check" ${selected.has(no) ? 'checked' : ''} aria-label="${esc(no)} 선택"></td>
        <td><div class="strong">${esc(no)}</div><div class="muted">${esc(String(o['주문일시']).slice(5, 16))}</div></td>
        <td><div class="strong">${esc(o['주문자'])}</div><div class="muted">${esc(o['주문자연락처'])}</div>
          ${gift ? `<div class="muted" style="margin-top:4px">🎁 ${esc(o['받는분'])} · ${esc(o['받는분연락처'])}</div>` : ''}</td>
        <td class="addr"><div>${o['우편번호'] ? `<span class="muted">(${esc(o['우편번호'])})</span> ` : ''}${esc(o['주소'])} ${esc(o['상세주소'])}</div>
          ${o['배송메모'] ? `<div class="muted" style="margin-top:4px">💬 ${esc(o['배송메모'])}</div>` : ''}</td>
        <td class="items">${esc(o['주문내역'] || '').split(', ').map((x) => `<div>${x}</div>`).join('')}<div class="muted">총 ${o['총수량(박스)']}박스</div></td>
        <td class="num">${MM.won(o['금액'])}</td>
        <td><div>${esc(o['입금자명'])}</div><div class="muted">셀프체크 ✅</div></td>
        <td><select class="status-sel s-${esc(o['상태'])}" data-field="status">${STATUSES.map((s) => `<option ${s === o['상태'] ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
        <td><div class="trk-cell">
          <select data-field="carrier">${carrierOpts}</select>
          <input class="trk" data-field="trackingNo" placeholder="송장번호" value="${esc(o['송장번호'])}" inputmode="numeric">
          <button class="save-btn" disabled>저장</button>
        </div></td>
      </tr>`;
    }).join('');
    bindRows();
    updateBulk();
  }

  function bindRows() {
    $('#rows').querySelectorAll('tr').forEach((tr) => {
      const no = tr.dataset.no;
      const o = orders.find((x) => x['주문번호'] === no);
      const status = tr.querySelector('[data-field=status]');
      const carrier = tr.querySelector('[data-field=carrier]');
      const trk = tr.querySelector('[data-field=trackingNo]');
      const save = tr.querySelector('.save-btn');
      const dirty = () => { save.disabled = status.value === o['상태'] && carrier.value === (o['택배사'] || C.DEFAULT_CARRIER) && trk.value.trim() === o['송장번호']; };
      // 상태 변경은 바로 저장
      status.addEventListener('change', async () => {
        status.className = `status-sel s-${status.value}`;
        await update([{ orderNo: no, status: status.value }], `${o['주문자']}님 주문 → ${status.value}`);
      });
      carrier.addEventListener('change', dirty);
      trk.addEventListener('input', dirty);
      trk.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !save.disabled) save.click(); });
      save.onclick = async () => {
        const u = { orderNo: no, carrier: carrier.value, trackingNo: trk.value.trim() };
        if (u.trackingNo && o['상태'] !== '발송완료' && o['상태'] !== '취소') u.status = '발송완료';
        save.disabled = true; save.textContent = '…';
        await update([u], u.status ? '송장 저장 · 발송완료로 바꿨어요' : '송장을 저장했어요');
        save.textContent = '저장';
      };
      tr.querySelector('.row-check').addEventListener('change', (e) => {
        if (e.target.checked) selected.add(no); else selected.delete(no);
        tr.classList.toggle('sel', e.target.checked); updateBulk();
      });
    });
  }

  async function update(updates, msg) {
    try {
      const r = await MM.call('adminUpdate', { password: pw, updates });
      updates.forEach((u) => {
        const o = orders.find((x) => x['주문번호'] === String(u.orderNo));
        if (!o) return;
        if (u.status !== undefined) o['상태'] = u.status;
        if (u.carrier !== undefined) o['택배사'] = u.carrier;
        if (u.trackingNo !== undefined) o['송장번호'] = u.trackingNo;
      });
      render();
      toast(msg + (r.missing && r.missing.length ? ` (못 찾은 주문 ${r.missing.length}건)` : ''));
      return r;
    } catch (err) { toast(err.message); render(); }
  }

  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (orders.length || pw) renderChart(); }, 150); });
  $('#search').addEventListener('input', (e) => { query = e.target.value; renderRows(); });
  $('#check-all').addEventListener('change', (e) => {
    visible().forEach((o) => { if (e.target.checked) selected.add(o['주문번호']); else selected.delete(o['주문번호']); });
    renderRows();
  });
  function updateBulk() {
    $('#bulk').classList.toggle('hidden', selected.size === 0);
    $('#bulk-count').textContent = `${selected.size}건 선택됨`;
    const vis = visible();
    $('#check-all').checked = vis.length > 0 && vis.every((o) => selected.has(o['주문번호']));
  }
  document.querySelectorAll('[data-bulk]').forEach((b) => b.onclick = async () => {
    const s = b.dataset.bulk;
    if (s === '취소' && !confirm(`${selected.size}건을 취소할까요?`)) return;
    const ups = [...selected].map((orderNo) => ({ orderNo, status: s }));
    await update(ups, `${ups.length}건 → ${s}`);
    selected.clear(); renderRows();
  });

  /* ---------- 엑셀 ---------- */
  const stamp = () => { const d = new Date(); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`; };

  function writeXlsx(rows, sheetName, file, widths) {
    if (!window.XLSX) { toast('엑셀 라이브러리를 불러오지 못했어요. 인터넷 연결을 확인해주세요.'); return; }
    const ws = XLSX.utils.json_to_sheet(rows);
    // 전화번호·우편번호·송장번호는 텍스트로 (앞자리 0 보존)
    Object.keys(ws).forEach((k) => { if (k[0] !== '!' && ws[k].t === 's') ws[k].z = '@'; });
    if (widths) ws['!cols'] = widths.map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, file);
  }

  $('#dl-all').onclick = () => {
    if (!orders.length) return toast('주문이 아직 없어요');
    const rows = orders.map((o) => {
      const r = {
        '주문번호': o['주문번호'], '주문일시': o['주문일시'], '상태': o['상태'],
        '주문자': o['주문자'], '주문자연락처': o['주문자연락처'], '받는분': o['받는분'], '받는분연락처': o['받는분연락처'],
        '우편번호': String(o['우편번호'] || ''), '주소': o['주소'], '상세주소': o['상세주소'],
        '주문내역': o['주문내역'], '총수량(박스)': o['총수량(박스)'], '금액': o['금액']
      };
      MM.PRODUCTS.forEach((p) => { r[p.col] = Number(o[p.col]) || 0; });
      Object.assign(r, { '입금자명': o['입금자명'], '입금셀프체크': o['입금셀프체크'], '배송메모': o['배송메모'], '택배사': o['택배사'], '송장번호': String(o['송장번호'] || ''), '관리자메모': o['관리자메모'] });
      return r;
    });
    writeXlsx(rows, '전체주문', `밍밍시_귤주문_전체_${stamp()}.xlsx`, [16, 18, 8, 8, 14, 8, 14, 8, 36, 18, 34, 10, 10, ...MM.PRODUCTS.map(() => 14), 8, 12, 20, 12, 18, 16]);
    toast(`${rows.length}건을 엑셀로 받았어요`);
  };

  $('#dl-ship').onclick = () => {
    const scope = $('#ship-scope').value;
    const split = $('#split-box').checked;
    const target = orders.filter((o) => {
      if (scope === 'ready') return o['상태'] === '입금확인' && !o['송장번호'];
      if (scope === 'unshipped') return o['상태'] === '주문접수' || o['상태'] === '입금확인';
      return o['상태'] !== '취소';
    });
    if (!target.length) return toast('해당하는 주문이 없어요');
    const rows = [];
    const base = (o) => ({
      '주문번호': o['주문번호'],
      '받는분성명': o['받는분'] || o['주문자'],
      '받는분전화번호': o['받는분연락처'] || o['주문자연락처'],
      '우편번호': String(o['우편번호'] || ''),
      '받는분주소': `${o['주소']} ${o['상세주소']}`.trim()
    });
    const tail = (o) => ({
      '배송메세지': o['배송메모'] || '',
      '보내는분성명': C.FARM,
      '주문자': o['주문자'],
      '주문자연락처': o['주문자연락처'],
      '택배사': o['택배사'] || C.DEFAULT_CARRIER,
      '송장번호': String(o['송장번호'] || '')
    });
    target.forEach((o) => {
      if (split) {
        // 상품별 · 박스별로 한 줄씩 (1줄 = 송장 1개)
        let k = 0; const total = o['총수량(박스)'];
        MM.PRODUCTS.forEach((p) => {
          for (let i = 0; i < (Number(o[p.col]) || 0); i++) {
            k++;
            rows.push({ ...base(o), '품목명': p.col, '박스수량': 1, '박스순번': `${k}/${total}`, ...tail(o) });
          }
        });
      } else {
        rows.push({ ...base(o), '품목명': o['주문내역'], '박스수량': o['총수량(박스)'], '박스순번': '', ...tail(o) });
      }
    });
    writeXlsx(rows, '송장', `밍밍시_송장용_${stamp()}.xlsx`, [16, 10, 15, 8, 44, 22, 8, 8, 22, 12, 8, 15, 12, 18]);
    toast(`${target.length}건 · ${rows.length}줄을 받았어요. 송장번호 칸을 채워서 다시 올리면 한 번에 등록돼요`);
  };

  /* ---------- 송장 일괄 등록 ---------- */
  $('#upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file || !window.XLSX) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', raw: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
      // 헤더 행 찾기 (앞 10줄 안에서 '주문번호' 포함)
      let hr = -1, cNo = -1, cTrk = -1, cCarrier = -1;
      for (let r = 0; r < Math.min(10, grid.length) && hr < 0; r++) {
        const row = grid[r].map((v) => String(v).replace(/\s/g, ''));
        const a = row.findIndex((v) => /주문번호/.test(v));
        const b = row.findIndex((v) => /(운송장|송장)(번호)?$|송장번호|운송장번호|waybill|tracking/i.test(v));
        if (a >= 0 && b >= 0) { hr = r; cNo = a; cTrk = b; cCarrier = row.findIndex((v) => /^택배사/.test(v)); }
      }
      if (hr < 0) return toast("'주문번호'와 '송장번호(운송장번호)' 열을 찾지 못했어요");
      const map = new Map();
      grid.slice(hr + 1).forEach((row) => {
        const no = String(row[cNo] || '').trim();
        const trk = String(row[cTrk] || '').replace(/[^\dA-Za-z-]/g, '');
        if (!no || !trk) return;
        if (!map.has(no)) map.set(no, { nos: [], carrier: cCarrier >= 0 ? String(row[cCarrier] || '').trim() : '' });
        const m = map.get(no); if (!m.nos.includes(trk)) m.nos.push(trk);
      });
      if (!map.size) return toast('등록할 송장번호가 없어요');
      const known = new Set(orders.map((o) => o['주문번호']));
      const ups = [...map].filter(([no]) => known.has(no)).map(([no, m]) => {
        const o = orders.find((x) => x['주문번호'] === no);
        const u = { orderNo: no, trackingNo: m.nos.join(', '), carrier: m.carrier || o['택배사'] || C.DEFAULT_CARRIER };
        if (o['상태'] !== '취소') u.status = '발송완료';
        return u;
      });
      const unknown = map.size - ups.length;
      if (!ups.length) return toast('파일의 주문번호와 일치하는 주문이 없어요');
      if (!confirm(`${ups.length}건의 송장번호를 등록하고 발송완료로 바꿀까요?${unknown ? `\n(일치하지 않는 주문번호 ${unknown}건은 건너뛰어요)` : ''}`)) return;
      await update(ups, `송장 ${ups.length}건 등록 완료`);
    } catch (err) { toast('파일을 읽지 못했어요: ' + err.message); }
  });
})();
