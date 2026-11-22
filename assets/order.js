(function () {
  const C = window.MM_CONFIG;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- 설정값 채우기 ---------- */
  document.querySelectorAll('[data-c]').forEach((el) => { el.textContent = C[el.dataset.c] || ''; });
  $('#bank-name').textContent = C.BANK.name;
  $('#bank-num').textContent = C.BANK.number;
  $('#bank-holder').textContent = C.BANK.holder;
  $('#notices').innerHTML = (C.NOTICES || []).map((n) => `<li>${esc(n)}</li>`).join('');
  const cl = $('#contact-link');
  cl.textContent = C.CONTACT_PHONE; cl.href = `sms:${MM.digits(C.CONTACT_PHONE)}`;
  if (MM.DEMO) $('#demo-note').classList.remove('hidden');

  Pixel.mascot($('#logo'));
  Pixel.farm($('#farm'));

  /* ---------- 토스트 ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }
  async function copy(text, msg) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
    toast(msg);
  }

  /* ---------- 탭 ---------- */
  function showTab(name) {
    document.querySelectorAll('.seg button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
    $('#tab-order').classList.toggle('hidden', name !== 'order');
    $('#tab-lookup').classList.toggle('hidden', name !== 'lookup');
    $('#cta-bar').classList.toggle('hidden', name !== 'order' || !$('#order-done').classList.contains('hidden'));
    history.replaceState(null, '', name === 'lookup' ? '#lookup' : location.pathname + location.search);
    window.scrollTo({ top: 0 });
  }
  document.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
  if (location.hash === '#lookup') showTab('lookup');

  /* ---------- 상품 / 수량 ---------- */
  const MAXQ = C.MAX_QTY_PER_ITEM || 20;
  const cart = Object.fromEntries(MM.PRODUCTS.map((p) => [p.id, 0]));
  const soldOut = new Set(MM.PRODUCTS.filter((p) => p.soldOut).map((p) => p.id));
  // ?item=gift5 처럼 링크로 들어오면 그 상품을 1개 담아둬요
  const pre = new URLSearchParams(location.search).get('item');
  if (pre && pre in cart) cart[pre] = 1;

  function renderProducts() {
    $('#products').innerHTML = MM.PRODUCTS.map((p) => `
      <div class="pitem ${soldOut.has(p.id) ? 'soldout' : ''}" data-id="${p.id}">
        <div class="p-img"><canvas class="pixel"></canvas></div>
        <div class="p-info">
          <div class="p-name">${esc(p.name)} <span class="w">${esc(p.weight)}</span>${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ''}${soldOut.has(p.id) ? '<span class="badge" style="background:#F2F4F6;color:#8B95A1">품절</span>' : ''}</div>
          <div class="p-desc">${esc(p.desc || '')}</div>
          <div class="p-row">
            <span class="p-price">${MM.won(p.price)}</span>
            <div class="stepper sm">
              <button type="button" data-d="-1" aria-label="${esc(p.name)} 빼기">−</button>
              <input type="number" inputmode="numeric" min="0" max="${MAXQ}" value="0" aria-label="${esc(p.name)} 수량">
              <button type="button" data-d="1" aria-label="${esc(p.name)} 담기">+</button>
            </div>
          </div>
        </div>
      </div>`).join('');
    document.querySelectorAll('.pitem').forEach((el) => {
      const id = el.dataset.id;
      Pixel.productIcon(el.querySelector('canvas'), MM.PRODUCTS.find((p) => p.id === id).icon);
      el.querySelectorAll('button').forEach((b) => b.onclick = () => setQty(id, cart[id] + Number(b.dataset.d)));
      el.querySelector('input').addEventListener('change', (e) => setQty(id, e.target.value));
    });
  }
  function setQty(id, n) {
    n = soldOut.has(id) ? 0 : Math.max(0, Math.min(MAXQ, parseInt(n, 10) || 0));
    cart[id] = n;
    updateCart();
  }
  const cartTotal = () => MM.PRODUCTS.reduce((a, p) => ({ qty: a.qty + cart[p.id], amount: a.amount + cart[p.id] * p.price }), { qty: 0, amount: 0 });
  function updateCart() {
    document.querySelectorAll('.pitem').forEach((el) => {
      const id = el.dataset.id, n = cart[id];
      el.classList.toggle('on', n > 0);
      el.querySelector('input').value = n;
      const [minus, plus] = el.querySelectorAll('button');
      minus.disabled = n <= 0; plus.disabled = n >= MAXQ || soldOut.has(id);
    });
    const t = cartTotal();
    const lines = MM.PRODUCTS.filter((p) => cart[p.id] > 0).map((p) => `<div class="line"><span>${esc(p.name)} ${esc(p.weight)} × ${cart[p.id]}</span><span>${MM.won(cart[p.id] * p.price)}</span></div>`).join('');
    $('#cart-sum').innerHTML = t.qty
      ? `${lines}<div class="total"><span>총 ${t.qty}박스</span><b>${MM.won(t.amount)}</b></div>`
      : '<div class="hint">+ 버튼을 눌러 상품을 담아주세요</div>';
    $('#total').textContent = MM.won(t.amount);
    $('#check-amount').textContent = t.qty ? MM.won(t.amount) : '주문 금액을';
    $('#cta-sum').textContent = t.qty ? `· ${t.qty}박스 ${MM.won(t.amount)}` : '';
    $('#paid-check').classList.toggle('disabled', !t.qty);
  }
  renderProducts();
  updateCart();

  MM.call('stats').then((s) => {
    (s.soldOut || []).forEach((id) => soldOut.add(id));
    if (s.soldOut && s.soldOut.length) { renderProducts(); MM.PRODUCTS.forEach((p) => setQty(p.id, cart[p.id])); }
  }).catch(() => {});

  /* ---------- 휴대폰 자동 하이픈 ---------- */
  document.querySelectorAll('input[type=tel]').forEach((el) => el.addEventListener('input', () => {
    const d = MM.digits(el.value).slice(0, 11);
    el.value = d.length < 4 ? d : d.length < 8 ? `${d.slice(0, 3)}-${d.slice(3)}` : d.length < 11 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  }));

  /* ---------- 선물하기 ---------- */
  $('#gift').addEventListener('change', (e) => $('#gift-fields').classList.toggle('hidden', !e.target.checked));

  /* ---------- 주소 검색 (다음 우편번호) ---------- */
  function loadPostcode() {
    return new Promise((resolve, reject) => {
      if (window.daum && window.daum.Postcode) return resolve();
      const s = document.createElement('script');
      s.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  $('#find-addr').onclick = async () => {
    try { await loadPostcode(); } catch (e) { toast('주소 검색을 불러오지 못했어요. 직접 입력해주세요.'); $('#address').focus(); return; }
    const layer = document.createElement('div');
    layer.className = 'post-layer';
    layer.innerHTML = '<div class="post-sheet"><header>주소 검색<button type="button" aria-label="닫기">✕</button></header><div class="post-body"></div></div>';
    document.body.appendChild(layer);
    const close = () => layer.remove();
    layer.querySelector('header button').onclick = close;
    layer.addEventListener('click', (e) => { if (e.target === layer) close(); });
    new daum.Postcode({
      oncomplete(data) {
        let addr = data.roadAddress || data.jibunAddress;
        const extra = [data.bname && /[동로가]$/.test(data.bname) ? data.bname : '', data.buildingName && data.apartment === 'Y' ? data.buildingName : ''].filter(Boolean).join(', ');
        if (extra && data.roadAddress) addr += ` (${extra})`;
        $('#zip').value = data.zonecode; $('#address').value = addr;
        clearErr($('#address'));
        close();
        setTimeout(() => $('#addressDetail').focus(), 50);
      },
      width: '100%', height: '100%'
    }).embed(layer.querySelector('.post-body'));
  };

  /* ---------- 검증 ---------- */
  function setErr(input, msg) {
    input.classList.add('invalid');
    const err = input.closest('.field')?.querySelector('.err');
    if (err) err.textContent = msg;
  }
  function clearErr(input) {
    input.classList.remove('invalid');
    const err = input.closest('.field')?.querySelector('.err');
    if (err) err.textContent = '';
  }
  document.querySelectorAll('.input').forEach((el) => el.addEventListener('input', () => clearErr(el)));
  const phoneOk = (v) => /^01\d{8,9}$/.test(MM.digits(v));

  const paidBox = $('#paid-check');
  $('#paid').addEventListener('change', (e) => { paidBox.classList.toggle('on', e.target.checked); paidBox.classList.remove('invalid'); });

  function validate() {
    const bad = [];
    const name = $('#name'), phone = $('#phone'), addr = $('#address');
    if (!cartTotal().qty) { $('#products').scrollIntoView({ behavior: 'smooth', block: 'center' }); toast('상품을 1개 이상 담아주세요'); return false; }
    if (!name.value.trim()) { setErr(name, '이름을 입력해주세요'); bad.push(name); }
    if (!phoneOk(phone.value)) { setErr(phone, '휴대폰 번호를 확인해주세요'); bad.push(phone); }
    if ($('#gift').checked) {
      const rn = $('#recvName'), rp = $('#recvPhone');
      if (!rn.value.trim()) { setErr(rn, '받는 분 이름을 입력해주세요'); bad.push(rn); }
      if (!phoneOk(rp.value)) { setErr(rp, '휴대폰 번호를 확인해주세요'); bad.push(rp); }
    }
    if (!addr.value.trim()) { setErr(addr, '주소를 입력해주세요'); bad.push(addr); }
    if (!$('#paid').checked) { paidBox.classList.add('invalid'); bad.push(paidBox); }
    if (bad.length) {
      bad[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (bad[0].focus && bad[0].tagName === 'INPUT') setTimeout(() => bad[0].focus({ preventScroll: true }), 300);
      toast(bad[0] === paidBox ? '입금 후 체크해주세요' : '입력 내용을 확인해주세요');
      return false;
    }
    return true;
  }

  /* ---------- 제출 ---------- */
  let sending = false;
  $('#order-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending || !validate()) return;
    sending = true;
    const btn = $('#submit-btn'), label = $('#submit-label'), prev = label.textContent;
    btn.disabled = true; label.innerHTML = '<span class="spinner"></span>'; $('#cta-sum').textContent = '';
    const gift = $('#gift').checked;
    const order = {
      name: $('#name').value.trim(),
      phone: MM.digits($('#phone').value),
      recvName: gift ? $('#recvName').value.trim() : '',
      recvPhone: gift ? MM.digits($('#recvPhone').value) : '',
      zip: $('#zip').value.trim(),
      address: $('#address').value.trim(),
      addressDetail: $('#addressDetail').value.trim(),
      items: { ...cart },
      depositor: $('#depositor').value.trim(),
      memo: $('#memo').value.trim(),
      depositChecked: true
    };
    try {
      const r = await MM.call('createOrder', { order });
      showDone(order, r);
    } catch (err) {
      toast(err.message || '주문 접수에 실패했어요. 잠시 후 다시 시도해주세요.');
      btn.disabled = false; label.textContent = prev; updateCart();
    } finally { sending = false; }
  });

  function showDone(o, r) {
    $('#order-form-view').classList.add('hidden');
    $('#order-done').classList.remove('hidden');
    $('#cta-bar').classList.add('hidden');
    const rows = [
      ['주문번호', r.orderNo],
      ['상품', (r.summary || '').split(', ').join('\n')],
      ['입금 금액', MM.won(r.amount)],
      ['받는 분', `${o.recvName || o.name} · ${MM.fmtPhone(o.recvPhone || o.phone)}`],
      ['주소', `${o.zip ? `(${o.zip}) ` : ''}${o.address} ${o.addressDetail}`]
    ];
    $('#done-summary').innerHTML = rows.map(([k, v]) => `<div><span>${k}</span><b>${esc(v).replace(/\n/g, '<br>')}</b></div>`).join('');
    Pixel.mascot($('#done-mascot'));
    Pixel.roller($('#done-roller'), 3);
    // 조회 탭에 미리 채워두기
    $('#lk-name').value = o.name; $('#lk-phone').value = MM.fmtPhone(o.phone);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  $('#copy-account').onclick = () => copy(`${C.BANK.name} ${C.BANK.number}`, '계좌번호를 복사했어요');
  $('#copy-all').onclick = () => copy(`${C.BANK.name} ${C.BANK.number} ${C.BANK.holder} ${MM.won(cartTotal().amount)}`, '계좌번호와 금액을 복사했어요');

  /* ---------- 송장 조회 ---------- */
  const STEPS = ['주문접수', '입금확인', '발송완료'];
  $('#lookup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#lk-name').value.trim(), phone = $('#lk-phone').value;
    if (!name || !phoneOk(phone)) { toast('이름과 휴대폰 번호를 확인해주세요'); return; }
    const btn = $('#lookup-btn'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
    const box = $('#lookup-result');
    try {
      const r = await MM.call('lookup', { name, phone: MM.digits(phone) });
      if (!r.orders.length) {
        box.innerHTML = `<div class="card fade-in empty"><canvas class="pixel" id="lk-empty" style="width:72px;height:72px;margin:0 auto 8px"></canvas>주문 내역을 찾지 못했어요.<br><small>주문할 때 입력한 이름·번호인지 확인해주세요.</small></div>`;
        Pixel.mascot($('#lk-empty'), { still: true });
      } else {
        box.innerHTML = `<div class="card fade-in"><h2>${esc(name)}님의 주문 ${r.orders.length}건</h2>${r.orders.map(orderCard).join('')}</div>`;
        box.querySelectorAll('[data-copy]').forEach((b) => b.onclick = () => copy(b.dataset.copy, '송장번호를 복사했어요'));
      }
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) { toast(err.message); }
    finally { btn.disabled = false; btn.textContent = '조회하기'; }
  });

  function orderCard(o) {
    const idx = o.status === '취소' ? -1 : STEPS.indexOf(o.status);
    const tl = STEPS.map((s, i) => `${i ? `<span class="bar ${i <= idx ? 'on' : ''}"></span>` : ''}<span class="dot ${i <= idx ? 'on' : ''}"></span>`).join('');
    const labels = ['주문접수', '입금확인', '발송완료'].map((s, i) => `<span class="${i <= idx ? 'on' : ''}">${s}</span>`).join('');
    const nos = String(o.trackingNo || '').split(/[,\s/]+/).filter(Boolean);
    const tracking = nos.length
      ? nos.map((no) => {
          const url = MM.trackUrl(o.carrier, no);
          return `<div class="tracking" style="margin-top:8px"><div class="grow"><div class="t-carrier">${esc(o.carrier)}</div><div class="t-no">${esc(no)}</div></div>
           <div class="t-actions"><button class="chip-btn" data-copy="${esc(no)}">복사</button>
           ${url ? `<a class="chip-btn" style="background:var(--orange);color:#fff" href="${url}" target="_blank" rel="noopener">배송조회</a>` : ''}</div></div>`;
        }).join('')
      : `<div class="tracking"><div class="grow"><div class="t-carrier">송장번호</div><div style="font-weight:700;color:var(--ink-2)">${o.status === '취소' ? '취소된 주문이에요' : '발송 준비 중이에요 🍊'}</div></div></div>`;
    return `<div class="order-card">
      <div class="top"><span class="no">${esc(o.orderNo)} · ${esc(String(o.createdAt).slice(0, 10))}</span><span class="pill s-${esc(o.status)}">${esc(o.status)}</span></div>
      <div class="what">${esc(o.summary || `${o.qty}박스`).split(', ').join('<br>')}<div style="color:var(--ink-3);font-weight:600;font-size:14px;margin-top:2px">${MM.won(o.amount)} · 받는 분 ${esc(o.recvName)}</div></div>
      ${o.status !== '취소' ? `<div class="timeline">${tl}</div><div class="tl-labels">${labels}</div>` : ''}
      ${tracking}
    </div>`;
  }
})();
