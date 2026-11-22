/**
 * 밍밍시 친구네 귤 주문서 — 구글 시트 백엔드 (Google Apps Script)
 *
 * 설치 방법은 README.md 를 봐주세요. 요약:
 * 1. 구글 시트를 새로 만들고  확장 프로그램 > Apps Script  를 엽니다.
 * 2. 이 파일 내용을 Code.gs 에 붙여넣고 저장합니다.
 * 3. 아래 ADMIN_PASSWORD 를 꼭 바꿔주세요.
 *    (프로젝트 설정 > 스크립트 속성 에 ADMIN_PASSWORD 를 넣으면 그 값이 우선합니다.)
 * 4. 배포 > 새 배포 > 웹 앱 / 실행: 나 / 액세스: 모든 사용자  → URL 을 config.js 의 API_URL 에.
 */

var ADMIN_PASSWORD = 'change-me-please'; // ← 꼭 바꾸세요!

// config.js 의 PRODUCTS 와 id / 이름 / 가격을 똑같이 맞춰주세요. (금액은 여기 가격으로 계산돼요)
var PRODUCTS = [
  { id: 'noji10', name: '노지감귤 10kg',      price: 35000 },
  { id: 'small5', name: '꼬마 황금향 5kg',    price: 25000 },
  { id: 'home5',  name: '가정용 황금향 5kg',  price: 35000 },
  { id: 'gift5',  name: '선물용 황금향 5kg',  price: 40000 }
];
var SOLD_OUT = [];          // 품절 상품 id. 예) ['gift5']
var MAX_QTY_PER_ITEM = 20;
var DEFAULT_CARRIER = 'CJ대한통운';

var SHEET_NAME = '주문';
var STATUSES = ['주문접수', '미입금', '입금확인', '발송완료', '취소'];

function headers_() {
  return ['주문번호', '주문일시', '상태', '주문자', '주문자연락처', '받는분', '받는분연락처',
    '우편번호', '주소', '상세주소', '주문내역', '총수량(박스)', '금액']
    .concat(PRODUCTS.map(function (p) { return p.name; }))
    .concat(['입금자명', '입금셀프체크', '배송메모', '택배사', '송장번호', '관리자메모']);
}
var NUMBER_COLS = ['총수량(박스)', '금액'].concat(PRODUCTS.map(function (p) { return p.name; }));

/* ---------------- 진입점 ---------------- */

function doGet() {
  return json_({ ok: true, service: 'mingmandarin', time: new Date().toISOString() });
}

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); }
  catch (err) { return json_({ ok: false, error: '잘못된 요청이에요.' }); }
  try {
    switch (body.action) {
      case 'stats':       return json_(publicStats_());
      case 'createOrder': return json_(createOrder_(body.order || {}));
      case 'lookup':      return json_(lookup_(body.name, body.phone));
      case 'adminLogin':  auth_(body.password); return json_({ ok: true });
      case 'adminList':   auth_(body.password); return json_(adminList_());
      case 'adminUpdate': auth_(body.password); return json_(adminUpdate_(body.updates || []));
      default:            return json_({ ok: false, error: '알 수 없는 요청이에요.' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

/* ---------------- 공개 API ---------------- */

function publicStats_() {
  var boxes = 0;
  readRows_().forEach(function (r) { if (r['상태'] !== '취소') boxes += Number(r['총수량(박스)']) || 0; });
  return { ok: true, soldBoxes: boxes, soldOut: SOLD_OUT };
}

function createOrder_(o) {
  var name = clean_(o.name, 20);
  var phone = digits_(o.phone);
  var recvName = clean_(o.recvName, 20) || name;
  var recvPhone = digits_(o.recvPhone) || phone;
  var zip = clean_(o.zip, 10);
  var address = clean_(o.address, 200);
  var addressDetail = clean_(o.addressDetail, 100);
  var depositor = clean_(o.depositor, 20) || name;
  var memo = clean_(o.memo, 100);
  var items = o.items || {};

  if (!name) throw new Error('주문자 이름을 입력해주세요.');
  if (!/^01\d{8,9}$/.test(phone)) throw new Error('휴대폰 번호를 확인해주세요.');
  if (!/^01\d{8,9}$/.test(recvPhone)) throw new Error('받는 분 휴대폰 번호를 확인해주세요.');
  if (!address) throw new Error('주소를 입력해주세요.');
  if (o.depositChecked !== true) throw new Error('입금 확인 체크가 필요해요.');

  var total = 0, amount = 0, summary = [], perProduct = {};
  PRODUCTS.forEach(function (p) {
    var q = parseInt(items[p.id], 10) || 0;
    if (q < 0 || q > MAX_QTY_PER_ITEM) throw new Error(p.name + ' 수량을 확인해주세요.');
    if (q > 0 && SOLD_OUT.indexOf(p.id) >= 0) throw new Error(p.name + ' 은(는) 품절이에요.');
    perProduct[p.name] = q;
    if (q > 0) { total += q; amount += q * p.price; summary.push(p.name + ' × ' + q); }
  });
  if (total < 1) throw new Error('상품을 1개 이상 골라주세요.');

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sheet_();
    var now = new Date();
    var prefix = 'MM' + Utilities.formatDate(now, 'Asia/Seoul', 'yyMMdd') + '-';
    var seq = 1;
    var last = sh.getLastRow();
    if (last >= 2) {
      sh.getRange(2, 1, last - 1, 1).getValues().forEach(function (r) {
        var id = String(r[0]);
        if (id.indexOf(prefix) === 0) seq = Math.max(seq, parseInt(id.slice(prefix.length), 10) + 1);
      });
    }
    var orderNo = prefix + ('00' + seq).slice(-3);
    var rec = {
      '주문번호': orderNo,
      '주문일시': Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss'),
      '상태': '주문접수',
      '주문자': name, '주문자연락처': fmtPhone_(phone),
      '받는분': recvName, '받는분연락처': fmtPhone_(recvPhone),
      '우편번호': zip, '주소': address, '상세주소': addressDetail,
      '주문내역': summary.join(', '), '총수량(박스)': total, '금액': amount,
      '입금자명': depositor, '입금셀프체크': '입금했어요 ✅', '배송메모': memo,
      '택배사': '', '송장번호': '', '관리자메모': ''
    };
    Object.keys(perProduct).forEach(function (k) { rec[k] = perProduct[k]; });
    var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    sh.appendRow(head.map(function (h) { return safeCell_(rec[h] === undefined ? '' : rec[h]); }));
    return { ok: true, orderNo: orderNo, amount: amount, summary: summary.join(', ') };
  } finally {
    lock.releaseLock();
  }
}

function lookup_(name, phone) {
  name = clean_(name, 20);
  phone = digits_(phone);
  if (!name || !phone) throw new Error('이름과 휴대폰 번호를 입력해주세요.');
  var p = fmtPhone_(phone);
  var list = readRows_().filter(function (r) {
    return String(r['주문자']).trim() === name && String(r['주문자연락처']) === p;
  }).map(function (r) {
    return {
      orderNo: r['주문번호'], createdAt: r['주문일시'],
      summary: r['주문내역'], qty: r['총수량(박스)'], amount: r['금액'],
      recvName: mask_(r['받는분']), status: r['상태'],
      carrier: r['택배사'] || DEFAULT_CARRIER, trackingNo: r['송장번호']
    };
  }).reverse();
  return { ok: true, orders: list };
}

/* ---------------- 관리자 API ---------------- */

function auth_(pw) {
  var real = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD') || ADMIN_PASSWORD;
  if (!pw || String(pw) !== String(real)) {
    Utilities.sleep(800);
    throw new Error('비밀번호가 맞지 않아요.');
  }
}

function adminList_() {
  return { ok: true, orders: readRows_() };
}

/** updates: [{orderNo, status?, carrier?, trackingNo?, adminMemo?}] */
function adminUpdate_(updates) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sheet_();
    var last = sh.getLastRow();
    if (last < 2) return { ok: true, updated: 0, missing: [] };
    var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var c = {}; head.forEach(function (h, i) { c[h] = i; });
    var range = sh.getRange(2, 1, last - 1, head.length);
    var values = range.getValues();
    var index = {};
    values.forEach(function (r, i) { index[String(r[c['주문번호']])] = i; });
    var count = 0, missing = [];
    updates.forEach(function (u) {
      var i = index[String(u.orderNo)];
      if (i === undefined) { missing.push(u.orderNo); return; }
      var r = values[i];
      if (u.status !== undefined) {
        if (STATUSES.indexOf(u.status) < 0) throw new Error('잘못된 상태값: ' + u.status);
        r[c['상태']] = u.status;
      }
      if (u.carrier !== undefined) r[c['택배사']] = safeCell_(clean_(u.carrier, 20));
      if (u.trackingNo !== undefined) r[c['송장번호']] = safeCell_(clean_(u.trackingNo, 200));
      if (u.adminMemo !== undefined) r[c['관리자메모']] = safeCell_(clean_(u.adminMemo, 200));
      count++;
    });
    // 수정 가능한 열만 다시 씁니다 (시트에서 직접 고친 다른 칸을 덮어쓰지 않도록)
    ['상태', '택배사', '송장번호', '관리자메모'].forEach(function (h) {
      var col = c[h];
      sh.getRange(2, col + 1, values.length, 1).setValues(values.map(function (r) { return [r[col]]; }));
    });
    return { ok: true, updated: count, missing: missing };
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- 시트 유틸 ---------------- */

/** '주문' 시트를 만들고, 빠진 열(새 상품 등)이 있으면 맨 뒤에 추가해요. */
function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  var want = headers_();
  var changed = false;
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.getRange(1, 1, 1, want.length).setValues([want]);
    sh.setFrozenRows(1);
    changed = true;
  } else {
    var have = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];
    var missing = want.filter(function (h) { return have.indexOf(h) < 0; });
    if (missing.length) { sh.getRange(1, have.length + 1, 1, missing.length).setValues([missing]); changed = true; }
  }
  if (!changed) return sh;
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  // 서식: 헤더 강조, 전화번호/우편번호/송장번호 등은 텍스트(앞자리 0 보존), 숫자열은 숫자
  sh.getRange(1, 1, 1, head.length).setFontWeight('bold').setBackground('#FF7A00').setFontColor('#FFFFFF');
  head.forEach(function (h, i) {
    var r = sh.getRange(2, i + 1, sh.getMaxRows() - 1, 1);
    r.setNumberFormat(NUMBER_COLS.indexOf(h) >= 0 ? '#,##0' : '@');
  });
  return sh;
}

function readRows_() {
  var sh = sheet_();
  var last = sh.getLastRow();
  if (last < 2) return [];
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var values = sh.getRange(2, 1, last - 1, head.length).getDisplayValues();
  return values.filter(function (r) { return r[0]; }).map(function (r) {
    var o = {};
    head.forEach(function (h, i) { if (h) o[h] = r[i]; });
    NUMBER_COLS.forEach(function (h) { if (h in o) o[h] = Number(String(o[h]).replace(/,/g, '')) || 0; });
    return o;
  });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function clean_(s, max) { return String(s == null ? '' : s).replace(/[\r\n\t]+/g, ' ').trim().slice(0, max || 100); }
function digits_(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }
function fmtPhone_(d) {
  d = digits_(d);
  if (d.length === 11) return d.slice(0, 3) + '-' + d.slice(3, 7) + '-' + d.slice(7);
  if (d.length === 10) return d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6);
  return d;
}
function mask_(n) { n = String(n || ''); return n.length <= 1 ? n : n[0] + '*'.repeat(Math.max(1, n.length - 2)) + (n.length > 2 ? n[n.length - 1] : ''); }
/** 수식 주입 방지: = + - @ 로 시작하는 텍스트 앞에 ' 를 붙입니다 */
function safeCell_(v) { return (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v; }

/** (선택) 편집기에서 한 번 실행하면 '주문' 시트와 헤더를 미리 만들어주고 권한 승인도 받아요. */
function setup() { sheet_(); }
