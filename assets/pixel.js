/* 밍밍시 픽셀 아트 — 귤 따는 농부, 굴러가는 귤, 귤 마스코트 */
(function () {
  const PAL = {
    o: '#FF8A00', O: '#E06A00', y: '#FFB547', l: '#FFE2B0', // 귤
    g: '#3DAA5C', G: '#23824A', d: '#17603A', L: '#7FD18B', // 잎
    t: '#8A5A36', T: '#6B4226',                             // 나무 줄기
    h: '#F4C542', H: '#E0533D', k: '#FFD1A6', e: '#2B2B33', p: '#FF9AA2', // 사람
    s: '#FFFFFF', S: '#D9E1EA', b: '#3B6FD8', B: '#2A55B0', n: '#5A3A22',
    w: '#C98B4E', W: '#A86E36', c: '#E8C9A0', C: '#D1AE7F', // 바구니/상자
    r: '#F04452', u: '#FFFFFF', v: '#9FD3FF', Q: '#FF6B81'
  };

  // 농부 (12x18) — 0: 팔 내림, 1: 팔 들어 귤 따기
  const FARMER = [
    [
      '....hhhh....',
      '...hhhhhh...',
      '.hhHHHHHHhh.',
      '....kkkk....',
      '....ekke....',
      '....kppk....',
      '.....kk.....',
      '...ssssss...',
      '..ssssssss..',
      '..kbssssbk..',
      '..kbbbbbbk..',
      '...bbbbbb...',
      '...bbbbbb...',
      '...bbBBbb...',
      '...bb..bb...',
      '...bb..bb...',
      '...nn..nn...',
      '..nnn..nnn..'
    ],
    [
      'k...hhhh....',
      'k..hhhhhh...',
      'shhHHHHHHhh.',
      's...kkkk....',
      's...ekke....',
      's...kppk....',
      'ss...kk.....',
      '.sssssss....',
      '..ssssssss..',
      '..bbsssbbk..',
      '..bbbbbbbk..',
      '...bbbbbb...',
      '...bbbbbb...',
      '...bbBBbb...',
      '...bb..bb...',
      '...bb..bb...',
      '...nn..nn...',
      '..nnn..nnn..'
    ]
  ];

  const BASKET = [
    '.w........w.',
    '.Ww......wW.',
    '..W......W..',
    'wwwwwwwwwwww',
    'wWwWwWwWwWwW',
    'WwWwWwWwWwWw',
    'wWwWwWwWwWwW',
    '.WwWwWwWwWw.',
    '..WWWWWWWW..'
  ];

  const BOX = [
    'CCCCCCCCCCCCCC',
    'cccccccrrccccc',
    'cccccccrrccccc',
    'cCCCCCCCCCCCCc',
    'cccccooooocccc',
    'ccccoyooooOccc',
    'ccccoooooOOccc',
    'cccccoOOOOcccc',
    'cccccccccccccc',
    'CCCCCCCCCCCCCC'
  ];

  // 일꾼 (10x15) — 상체 + 팔 + 다리 프레임 조합, 오른쪽을 바라봄
  const W_BODY = [
    '...rrrr...',
    '..rrrrrrr.',
    '.nnkkkkk..',
    'nn.kkekk..',
    'n..kkkkp..',
    '....kk....',
    '..QQQQQQ..'
  ];
  const W_ARMS = {
    down:  ['.QQooooQQ.', '.kQooooQk.', '..oooooo..', '..oooooo..'],
    carry: ['.QQoooookk', '..Qoooo...', '..oooooo..', '..oooooo..']
  };
  const W_LEGS = [
    ['..BB..BB..', '..BB..BB..', '..nn..nn..', '.nnn..nnn.'],
    ['..BBBBBB..', '.BB....BB.', '.BB....BB.', 'nn......nn'],
    ['...BBBB...', '...BBB....', '...BBn....', '...nnn....']
  ];
  const CRATE = [
    '.o.oo.o.',
    'oooooooo',
    'wWwWwWwW',
    'WwWwWwWw',
    'WWWWWWWW'
  ];
  const TRUCK = [
    '......SSSSSSSSSSSSSSS.',
    '......SSSSSSSSSSSSSSS.',
    '..ooooSSoooooooooooSS.',
    '.ovvvoSSSSSSSSSSSSSSS.',
    '.ovvvoSSSoooSSSSSSSSS.',
    'ooooooSSSoyoSSSSSSSSS.',
    'ooooooSSSSSSSSSSSSSSS.',
    'OOOOOOOOOOOOOOOOOOOOOO',
    '.eee..........eee.....',
    '.eSe..........eSe.....',
    '.eee..........eee.....'
  ];

  // 귤 마스코트 (14x14)
  const MASCOT = [
    '......gG......',
    '.....gLgg.....',
    '....ooooooo...',
    '..ooyyoooooo..',
    '.oyyoooooooOo.',
    '.oyoooooooooO.',
    'ooooeooooeoooO',
    'oooouoooouoooO',
    'oopoooeeoooppO',
    '.ooooooooooOO.',
    '.oooooooooOOO.',
    '..ooooooOOOO..',
    '...OOOOOOOO...',
    '..............'
  ];

  function sprite(ctx, rows, x, y, flip) {
    const w = rows[0].length;
    for (let j = 0; j < rows.length; j++) {
      const row = rows[j];
      for (let i = 0; i < w; i++) {
        const ch = row[i];
        if (ch === '.' || ch === ' ') continue;
        ctx.fillStyle = PAL[ch];
        ctx.fillRect(Math.round(x + (flip ? w - 1 - i : i)), Math.round(y + j), 1, 1);
      }
    }
  }

  // 7x7 굴러가는 귤 — 꼭지(잎)가 회전
  function orange(ctx, x, y, frame) {
    const base = [
      '..ooo..',
      '.oyooo.',
      'oyooooo',
      'ooooooO',
      'oooooOO',
      '.oooOO.',
      '..OOO..'
    ];
    sprite(ctx, base, x, y);
    const leaf = [[3, -1, 4, -1], [7, 3, 7, 2], [3, 7, 2, 7], [-1, 3, -1, 4]][frame & 3];
    ctx.fillStyle = PAL.g; ctx.fillRect(Math.round(x + leaf[0]), Math.round(y + leaf[1]), 1, 1);
    ctx.fillStyle = PAL.L; ctx.fillRect(Math.round(x + leaf[2]), Math.round(y + leaf[3]), 1, 1);
  }

  function smallOrange(ctx, x, y) {
    ctx.fillStyle = PAL.o; ctx.fillRect(x, y, 3, 3);
    ctx.fillStyle = PAL.O; ctx.fillRect(x + 2, y + 1, 1, 2); ctx.fillRect(x + 1, y + 2, 1, 1);
    ctx.fillStyle = PAL.y; ctx.fillRect(x, y, 1, 1);
    ctx.fillStyle = PAL.g; ctx.fillRect(x + 1, y - 1, 1, 1);
  }

  function blob(ctx, cx, cy, r, color) {
    ctx.fillStyle = color;
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) ctx.fillRect(cx + x, cy + y, 1, 1);
  }

  function cloud(ctx, x, y) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x + 3, y, 6, 1); ctx.fillRect(x + 1, y + 1, 11, 1); ctx.fillRect(x, y + 2, 15, 2);
    ctx.fillStyle = '#EAF1FA'; ctx.fillRect(x + 1, y + 4, 13, 1);
  }

  function setup(canvas, W, H) {
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return ctx;
  }

  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- 메인 장면: 귤 농장 ---------------- */
  function farm(canvas) {
    const W = 160, H = 84, GROUND = 70;
    const ctx = setup(canvas, W, H);
    const treeX = 40, treeY = 30;
    // 나무에 달린 귤 위치 (상대좌표)
    const fruits = [[-18, -6], [-10, -14], [0, -18], [10, -12], [18, -4], [-14, 6], [-4, 2], [8, 4], [16, 10], [-20, 12], [4, -6], [-6, -8]];
    const alive = fruits.map(() => true);
    let rolling = [];   // 굴러가는 귤
    let falling = [];   // 떨어지는 귤
    let leaves = [];
    let clouds = [[14, 6], [96, 12], [140, 3]];
    let t = 0, pickTimer = 0, picking = 0, basketCount = 3;
    // 일꾼: wait → pickup → toStack → drop → back
    const HOME = 92, DROP = 106, STACK_X = 122;
    const worker = { x: HOME, state: 'wait', timer: 0, carrying: false, dir: 1, step: 0 };
    let stack = 1;
    const truck = { x: W + 30, state: 'away', timer: 0 };

    function drawBg() {
      ctx.clearRect(0, 0, W, H);
      // 해
      blob(ctx, 140, 16, 7, '#FFE08A'); blob(ctx, 140, 16, 5, '#FFC94A');
      clouds.forEach((c) => cloud(ctx, Math.round(c[0]), c[1]));
      // 먼 언덕
      ctx.fillStyle = '#CDEFC9';
      for (let x = 0; x < W; x++) { const hh = Math.round(6 + 4 * Math.sin(x / 18) + 2 * Math.sin(x / 7)); ctx.fillRect(x, GROUND - hh, 1, hh); }
      // 땅
      ctx.fillStyle = PAL.g; ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.fillStyle = PAL.G; ctx.fillRect(0, GROUND + 3, W, H - GROUND - 3);
      ctx.fillStyle = PAL.L; for (let x = 3; x < W; x += 9) ctx.fillRect(x, GROUND, 2, 1);
      ctx.fillStyle = PAL.d; for (let x = 6; x < W; x += 13) { ctx.fillRect(x, GROUND + 6 + (x % 5), 1, 1); ctx.fillRect(x + 4, GROUND + 10 - (x % 3), 1, 1); }
    }

    function drawTree() {
      ctx.fillStyle = PAL.T; ctx.fillRect(treeX - 3, treeY + 10, 6, GROUND - treeY - 10);
      ctx.fillStyle = PAL.t; ctx.fillRect(treeX - 2, treeY + 10, 2, GROUND - treeY - 10);
      ctx.fillRect(treeX + 2, treeY + 18, 6, 2); ctx.fillRect(treeX - 9, treeY + 16, 6, 2);
      blob(ctx, treeX, treeY, 24, PAL.d);
      blob(ctx, treeX - 2, treeY - 2, 22, PAL.G);
      blob(ctx, treeX - 5, treeY - 6, 16, PAL.g);
      blob(ctx, treeX - 9, treeY - 11, 6, PAL.L);
      fruits.forEach((f, i) => { if (alive[i]) orange(ctx, treeX + f[0] - 3, treeY + f[1] - 3, 0); });
    }

    function step() {
      t++;
      clouds.forEach((c) => { c[0] += 0.05; if (c[0] > W + 4) c[0] = -18; });

      // 농부가 귤을 따는 주기
      pickTimer++;
      if (pickTimer > 70) {
        picking = 22; pickTimer = 0;
        const candidates = alive.map((a, i) => (a ? i : -1)).filter((i) => i >= 0 && fruits[i][0] > 0);
        if (candidates.length) {
          const i = candidates[Math.floor(Math.random() * candidates.length)];
          alive[i] = false;
          falling.push({ x: treeX + fruits[i][0] - 3, y: treeY + fruits[i][1] - 3, vy: 0, toBasket: true });
          setTimeout(() => { alive[i] = true; }, 6000);
        }
      }
      // 가끔 귤이 저절로 떨어져 굴러감
      if (t % 150 === 40) {
        const candidates = alive.map((a, i) => (a ? i : -1)).filter((i) => i >= 0);
        const i = candidates[Math.floor(Math.random() * candidates.length)];
        if (i !== undefined) {
          alive[i] = false;
          falling.push({ x: treeX + fruits[i][0] - 3, y: treeY + fruits[i][1] - 3, vy: 0, toBasket: false });
          setTimeout(() => { alive[i] = true; }, 5000);
        }
      }
      if (t % 40 === 0) leaves.push({ x: treeX - 18 + Math.random() * 36, y: treeY + 8, vx: 0.15 + Math.random() * 0.2, life: 120 });

      falling.forEach((f) => {
        f.vy += 0.12; f.y += f.vy;
        if (f.toBasket) f.x += (basketX + 2 - f.x) * 0.06;
        const floor = f.toBasket ? GROUND - 12 : GROUND - 7;
        if (f.y >= floor) {
          f.done = true;
          if (f.toBasket) basketCount = Math.min(basketCount + 1, 6);
          else rolling.push({ x: f.x, y: GROUND - 7, vx: 0.45 + Math.random() * 0.35, frame: 0, bounce: 2 });
        }
      });
      falling = falling.filter((f) => !f.done);
      rolling.forEach((r) => {
        r.x += r.vx; r.frame += r.vx * 0.35;
        if (r.bounce > 0) { r.bounce -= 0.12; }
      });
      rolling = rolling.filter((r) => r.x < W + 8);
      leaves.forEach((l) => { l.y += 0.25; l.x += l.vx + Math.sin((t + l.life) / 8) * 0.2; l.life--; });
      leaves = leaves.filter((l) => l.life > 0 && l.y < GROUND);
      if (picking > 0) picking--;

      // 일꾼 움직임
      const w = worker;
      if (w.state === 'wait') { if (basketCount >= 5 && stack < 3) { w.state = 'pickup'; w.timer = 24; } }
      else if (w.state === 'pickup') { if (--w.timer <= 0) { basketCount = 1; w.carrying = true; w.state = 'toStack'; w.dir = 1; } }
      else if (w.state === 'toStack') { w.x += 0.35; w.step += 0.35; if (w.x >= DROP) { w.x = DROP; w.state = 'drop'; w.timer = 24; } }
      else if (w.state === 'drop') { if (--w.timer <= 0) { w.carrying = false; stack = Math.min(3, stack + 1); w.state = 'back'; w.dir = -1; } }
      else if (w.state === 'back') { w.x -= 0.4; w.step += 0.4; if (w.x <= HOME) { w.x = HOME; w.state = 'wait'; w.dir = 1; } }

      // 택배 트럭: 상자 3개가 쌓이면 와서 싣고 감
      const tr = truck;
      if (tr.state === 'away' && stack >= 3 && w.state !== 'drop') tr.state = 'in';
      else if (tr.state === 'in') { tr.x -= 0.8; if (tr.x <= 138) { tr.x = 138; tr.state = 'load'; tr.timer = 70; } }
      else if (tr.state === 'load') { tr.timer--; if (tr.timer === 35) stack = 0; if (tr.timer <= 0) tr.state = 'out'; }
      else if (tr.state === 'out') { tr.x += 1; if (tr.x > W + 30) { tr.x = W + 30; tr.state = 'away'; } }
    }

    const farmerX = 64, basketX = 78;
    function draw() {
      drawBg();
      drawTree();
      leaves.forEach((l) => { ctx.fillStyle = PAL.L; ctx.fillRect(Math.round(l.x), Math.round(l.y), 1, 1); });
      // 농부 (왼쪽 나무를 바라봄)
      const bob = picking > 0 ? 0 : (Math.floor(t / 20) % 2);
      sprite(ctx, FARMER[picking > 0 ? 1 : 0], farmerX, GROUND - 18 + (picking > 0 ? -1 : 0) + bob * 0, false);
      // 바구니 + 귤 더미
      const heap = [[2, -2], [6, -2], [4, -4], [8, -3], [1, -4], [6, -5]];
      for (let i = 0; i < basketCount; i++) smallOrange(ctx, basketX + heap[i][0], GROUND - 9 + heap[i][1]);
      sprite(ctx, BASKET, basketX, GROUND - 9);
      // 쌓인 상자
      for (let i = 0; i < stack; i++) sprite(ctx, BOX, STACK_X + (i === 1 ? 2 : i === 2 ? -1 : 0), GROUND - 10 - i * 10);
      // 일꾼
      const w = worker;
      const walking = w.state === 'toStack' || w.state === 'back';
      const legs = walking ? W_LEGS[1 + (Math.floor(w.step / 3) % 2)] : W_LEGS[0];
      const bend = w.state === 'pickup' || w.state === 'drop' ? 1 : 0;
      const wy = GROUND - 15 + bend + (walking && Math.floor(w.step / 3) % 2 ? -1 : 0);
      const rows = [...W_BODY, ...(w.carrying || bend ? W_ARMS.carry : W_ARMS.down), ...legs];
      sprite(ctx, rows, w.x, wy, w.dir < 0);
      if (w.carrying) sprite(ctx, CRATE, w.dir > 0 ? w.x + 8 : w.x - 6, wy + 4);
      if (w.state === 'wait' && Math.floor(t / 45) % 4 === 0) { ctx.fillStyle = PAL.Q; ctx.fillRect(w.x + 4, wy - 4, 1, 1); ctx.fillRect(w.x + 6, wy - 4, 1, 1); ctx.fillRect(w.x + 4, wy - 3, 3, 1); ctx.fillRect(w.x + 5, wy - 2, 1, 1); }
      // 트럭
      if (truck.state !== 'away') sprite(ctx, TRUCK, truck.x, GROUND - 11 + (Math.floor(t / 6) % 2 && truck.state !== 'load' ? -1 : 0));
      falling.forEach((f) => orange(ctx, f.x, f.y, Math.floor(f.y / 4)));
      rolling.forEach((r) => orange(ctx, r.x, r.y - Math.abs(Math.sin(r.x / 3)) * r.bounce, Math.floor(r.frame)));
    }

    function loop() { step(); draw(); if (!reduce) raf = requestAnimationFrame(loop); }
    let raf;
    // 처음부터 굴러가는 귤 하나
    rolling.push({ x: 60, y: GROUND - 7, vx: 0.5, frame: 0, bounce: 0 });
    loop();
    return () => cancelAnimationFrame(raf);
  }

  /* ---------------- 마스코트 (통통 튀는 귤이) ---------------- */
  function mascot(canvas, opts = {}) {
    const W = 20, H = 20;
    const ctx = setup(canvas, W, H);
    let t = 0;
    function loop() {
      t++;
      ctx.clearRect(0, 0, W, H);
      const jump = opts.still ? 0 : Math.max(0, Math.sin(t / 9)) * 3;
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      const sw = 10 - Math.round(jump);
      ctx.fillRect(Math.round(10 - sw / 2), 18, sw, 1);
      sprite(ctx, MASCOT, 3, 4 - Math.round(jump));
      if (!reduce && !opts.still) requestAnimationFrame(loop);
    }
    loop();
  }

  /* ---------------- 굴러가는 귤 (로딩/띠) ---------------- */
  function roller(canvas, count = 3) {
    const W = 120, H = 12;
    const ctx = setup(canvas, W, H);
    const items = Array.from({ length: count }, (_, i) => ({ x: -10 - i * 40, f: 0 }));
    function loop() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#F2E4D3'; ctx.fillRect(0, H - 2, W, 1);
      items.forEach((it) => {
        it.x += 0.6; it.f += 0.2; if (it.x > W + 8) it.x = -10;
        orange(ctx, it.x, H - 9 - Math.abs(Math.sin(it.x / 6)) * 1.5, Math.floor(it.f));
      });
      if (!reduce) requestAnimationFrame(loop);
    }
    loop();
  }

  /* ---------------- 박스 아이콘 (상품 카드) ---------------- */
  function boxIcon(canvas) {
    const ctx = setup(canvas, 24, 24);
    let t = 0;
    function loop() {
      t++;
      ctx.clearRect(0, 0, 24, 24);
      const b = Math.round(Math.max(0, Math.sin(t / 14)) * 2);
      [[5, 4 - b], [10, 2 - b], [15, 4 - b]].forEach(([x, y], i) => orange(ctx, x - 1, y + 2, i));
      sprite(ctx, BOX, 5, 12);
      ctx.fillStyle = PAL.C; ctx.fillRect(5, 21, 14, 1);
      if (!reduce) requestAnimationFrame(loop);
    }
    loop();
  }

  /* ---------------- 상품 아이콘 ---------------- */
  // 황금향 (9x9, 귤보다 크고 노란 빛, 꼭지 볼록)
  function golden(ctx, x, y) {
    sprite(ctx, [
      '...GgG...',
      '...aaa...',
      '.aaYaaaa.',
      'aaYYaaaaa',
      'aaYaaaaaA',
      'aaaaaaaaA',
      'aaaaaaaAA',
      '.aaaaaAA.',
      '..AAAAA..'
    ], x, y);
  }
  PAL.a = '#FFA51F'; PAL.A = '#E07F00'; PAL.Y = '#FFD36B'; PAL.R = '#E8344A'; PAL.Q = '#FF6B81';
  const GIFT = [
    '....R..R....',
    '...RQR.RQR..',
    '....RRRR....',
    'QQQQQRRQQQQQ',
    'QQQQQRRQQQQQ',
    'RRRRRRRRRRRR',
    'QQQQQRRQQQQQ',
    'QQQQQRRQQQQQ',
    'QQQQQRRQQQQQ',
    'RRRRRRRRRRRR'
  ];
  function productIcon(canvas, kind) {
    const ctx = setup(canvas, 24, 24);
    let t = Math.floor(Math.random() * 60);
    function loop() {
      t++;
      ctx.clearRect(0, 0, 24, 24);
      const b = Math.round(Math.max(0, Math.sin(t / 14)) * 2);
      if (kind === 'small') {
        [[3, 14], [8, 14], [13, 14], [18, 14], [5, 10], [10, 10], [15, 10], [8, 6], [13, 6]].forEach(([x, y], i) => smallOrange(ctx, x, y + 3 - (i === 7 || i === 8 ? b : 0)));
        ctx.fillStyle = PAL.W; ctx.fillRect(2, 20, 20, 1);
        ctx.fillStyle = PAL.w; ctx.fillRect(2, 21, 20, 2);
      } else if (kind === 'home') {
        golden(ctx, 2, 6 - b); golden(ctx, 12, 5 - b);
        sprite(ctx, BOX, 5, 12);
        ctx.fillStyle = PAL.C; ctx.fillRect(5, 21, 14, 1);
      } else if (kind === 'gift') {
        golden(ctx, 7, 1 - b);
        sprite(ctx, GIFT, 6, 11);
        ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(6, 21, 12, 1);
      } else {
        [[5, 4 - b], [10, 2 - b], [15, 4 - b]].forEach(([x, y], i) => orange(ctx, x - 1, y + 2, i));
        sprite(ctx, BOX, 5, 12);
        ctx.fillStyle = PAL.C; ctx.fillRect(5, 21, 14, 1);
      }
      if (!reduce) requestAnimationFrame(loop);
    }
    loop();
  }

  window.Pixel = { farm, mascot, roller, boxIcon, productIcon };
})();
