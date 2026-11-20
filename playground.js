(function () {
  'use strict';

  var store = {
    get: function (k, fallback) {
      try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
    },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---------- Skills: counts ---------- */
  var total = 0;
  document.querySelectorAll('.skill').forEach(function (card) {
    var n = card.querySelectorAll('.chips li').length;
    total += n;
    var c = card.querySelector('.skill__count');
    if (c) c.textContent = n;
  });
  if ($('skill-total') && total) $('skill-total').textContent = total;

  /* ---------- Tabs ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.pg__tab'));
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { e.preventDefault(); selectTab(tabs[(i + d + tabs.length) % tabs.length], true); }
    });
  });

  /* ---------- Task board ---------- */
  var TB_KEY = 'pg_tasks_v1';
  var COLS = ['todo', 'doing', 'done'];
  var seed = [
    { id: 1, title: 'Design MySQL schema for orders & inventory', priority: 'high', col: 'done' },
    { id: 2, title: 'Build REST endpoints for product sync', priority: 'high', col: 'doing' },
    { id: 3, title: 'Integrate Stripe checkout with Laravel Cashier', priority: 'medium', col: 'doing' },
    { id: 4, title: 'Add RBAC roles for admin, manager, staff', priority: 'medium', col: 'todo' },
    { id: 5, title: 'Set up CI/CD pipeline and deploy to AWS', priority: 'high', col: 'todo' },
    { id: 6, title: 'Write API documentation', priority: 'low', col: 'todo' }
  ];
  var tasks = store.get(TB_KEY, null) || seed.slice();
  var filter = 'all';
  var query = '';
  var dragId = null;

  function save() { store.set(TB_KEY, tasks); }
  function nextId() { return tasks.reduce(function (m, t) { return Math.max(m, t.id); }, 0) + 1; }
  function move(id, dir) {
    var t = tasks.find(function (x) { return x.id === id; });
    if (!t) return;
    var i = COLS.indexOf(t.col) + dir;
    if (i < 0 || i >= COLS.length) return;
    t.col = COLS[i]; save(); renderTasks();
  }

  function renderTasks() {
    var board = $('tb-board');
    if (!board) return;
    COLS.forEach(function (col) {
      var colEl = board.querySelector('[data-col="' + col + '"]');
      var list = colEl.querySelector('.tb__list');
      list.textContent = '';
      var items = tasks.filter(function (t) {
        return t.col === col && (filter === 'all' || t.priority === filter) &&
          (!query || t.title.toLowerCase().indexOf(query) !== -1);
      });
      colEl.querySelector('.cnt').textContent = items.length;
      if (!items.length) list.appendChild(el('li', 'tb__empty', col === 'done' ? 'Nothing finished yet' : 'Drop tasks here'));
      items.forEach(function (t) {
        var li = el('li', 'tb__card' + (col === 'done' ? ' is-done' : ''));
        li.draggable = true;
        li.dataset.id = t.id;
        li.appendChild(el('span', 'prio prio--' + t.priority, t.priority));
        li.appendChild(el('p', 'tb__title', t.title));
        var actions = el('div', 'tb__actions');
        var left = el('button', 'tb__btn', '←'); left.type = 'button'; left.title = 'Move left'; left.setAttribute('aria-label', 'Move "' + t.title + '" left'); left.disabled = col === 'todo';
        var right = el('button', 'tb__btn', '→'); right.type = 'button'; right.title = 'Move right'; right.setAttribute('aria-label', 'Move "' + t.title + '" right'); right.disabled = col === 'done';
        var del = el('button', 'tb__btn tb__btn--del', '×'); del.type = 'button'; del.title = 'Delete'; del.setAttribute('aria-label', 'Delete "' + t.title + '"');
        left.addEventListener('click', function () { move(t.id, -1); });
        right.addEventListener('click', function () { move(t.id, 1); });
        del.addEventListener('click', function () { tasks = tasks.filter(function (x) { return x.id !== t.id; }); save(); renderTasks(); });
        actions.appendChild(left); actions.appendChild(right); actions.appendChild(del);
        li.appendChild(actions);
        li.addEventListener('dragstart', function (e) { dragId = t.id; li.classList.add('is-drag'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(t.id)); } catch (x) {} });
        li.addEventListener('dragend', function () { dragId = null; li.classList.remove('is-drag'); });
        list.appendChild(li);
      });
    });
    var done = tasks.filter(function (t) { return t.col === 'done'; }).length;
    $('tb-progress').textContent = tasks.length ? done + ' of ' + tasks.length + ' done (' + Math.round(done / tasks.length * 100) + '%)' : 'No tasks';
  }

  if ($('tb-board')) {
    $('tb-board').querySelectorAll('.tb__col').forEach(function (colEl) {
      colEl.addEventListener('dragover', function (e) { if (dragId != null) { e.preventDefault(); colEl.classList.add('is-over'); } });
      colEl.addEventListener('dragleave', function (e) { if (!colEl.contains(e.relatedTarget)) colEl.classList.remove('is-over'); });
      colEl.addEventListener('drop', function (e) {
        e.preventDefault(); colEl.classList.remove('is-over');
        var t = tasks.find(function (x) { return x.id === dragId; });
        if (t) { t.col = colEl.dataset.col; save(); renderTasks(); }
      });
    });
    $('tb-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var title = $('tb-title').value.trim();
      if (!title) return;
      tasks.push({ id: nextId(), title: title, priority: $('tb-priority').value, col: 'todo' });
      $('tb-title').value = '';
      save(); renderTasks();
    });
    $('tb-search').addEventListener('input', function (e) { query = e.target.value.trim().toLowerCase(); renderTasks(); });
    document.querySelectorAll('.seg button').forEach(function (b) {
      b.addEventListener('click', function () {
        filter = b.dataset.filter;
        document.querySelectorAll('.seg button').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        renderTasks();
      });
    });
    $('tb-clear').addEventListener('click', function () { tasks = tasks.filter(function (t) { return t.col !== 'done'; }); save(); renderTasks(); });
    $('tb-reset').addEventListener('click', function () { tasks = seed.map(function (t) { return Object.assign({}, t); }); save(); renderTasks(); });
    renderTasks();
  }

  /* ---------- Inventory API console ---------- */
  var presets = {
    receive: {
      method: 'POST', url: '/api/inventory/receive',
      body: {
        sku: 'EVL-HOODIE-BLK-M',
        inbound_qty: 120,
        preorders: [
          { order_id: 'AMZ-10021', qty: 25 },
          { order_id: 'EBAY-55310', qty: 40 },
          { order_id: 'WEB-9004', qty: 15 }
        ],
        locations: [
          { name: 'Shimla Warehouse', share: 50 },
          { name: 'Delhi Hub', share: 30 },
          { name: 'Mumbai Hub', share: 20 }
        ]
      }
    },
    invalid: {
      method: 'POST', url: '/api/inventory/receive',
      body: { sku: '', inbound_qty: -5, preorders: [{ order_id: 'AMZ-1', qty: 0 }], locations: [{ name: 'Main', share: 60 }] }
    },
    health: { method: 'GET', url: '/api/health', body: null }
  };

  function curlFor(p, bodyText) {
    var origin = location.protocol.indexOf('http') === 0 ? location.origin : 'https://rohit-gautam.vercel.app';
    var c = 'curl -X ' + p.method + ' ' + origin + p.url;
    if (p.method === 'POST') c += " -H 'Content-Type: application/json' -d '" + bodyText.replace(/\s+/g, ' ') + "'";
    return c;
  }
  function loadPreset() {
    var p = presets[$('api-preset').value];
    var ta = $('api-body');
    ta.value = p.body ? JSON.stringify(p.body, null, 2) : '// GET requests have no body';
    ta.disabled = !p.body;
    $('api-curl').textContent = curlFor(p, ta.value);
  }
  if ($('api-preset')) {
    $('api-preset').addEventListener('change', loadPreset);
    $('api-body').addEventListener('input', function () {
      $('api-curl').textContent = curlFor(presets[$('api-preset').value], $('api-body').value);
    });
    $('api-send').addEventListener('click', function () {
      var p = presets[$('api-preset').value];
      var status = $('api-status'), out = $('api-out'), time = $('api-time');
      var opts = { method: p.method, headers: { Accept: 'application/json' } };
      if (p.body) {
        try { JSON.parse($('api-body').value); } catch (e) {
          status.textContent = 'Invalid JSON'; status.className = 'api__status is-err';
          out.textContent = '// Fix the JSON in the request body first:\n// ' + e.message; time.textContent = '';
          return;
        }
        opts.headers['Content-Type'] = 'application/json';
        opts.body = $('api-body').value;
      }
      status.textContent = 'Sending...'; status.className = 'api__status';
      out.textContent = ''; time.textContent = '';
      var t0 = performance.now();
      fetch(p.url, opts).then(function (r) {
        return r.text().then(function (txt) {
          var ms = Math.round(performance.now() - t0);
          status.textContent = r.status + ' ' + (r.statusText || '');
          status.className = 'api__status ' + (r.ok ? 'is-ok' : 'is-err');
          time.textContent = ms + ' ms';
          try { out.textContent = JSON.stringify(JSON.parse(txt), null, 2); } catch (e) { out.textContent = txt; }
        });
      }).catch(function () {
        status.textContent = 'Network error'; status.className = 'api__status is-err';
        out.textContent = '// Could not reach the API. It runs on the deployed site (rohit-gautam.vercel.app).';
      });
    });
    loadPreset();
  }

  /* ---------- Subnet calculator ---------- */
  function ipToInt(ip) {
    var parts = ip.split('.');
    if (parts.length !== 4) return null;
    var n = 0;
    for (var i = 0; i < 4; i++) {
      if (!/^\d{1,3}$/.test(parts[i])) return null;
      var v = +parts[i];
      if (v > 255) return null;
      n = n * 256 + v;
    }
    return n;
  }
  function intToIp(n) { return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.'); }
  function ipClass(first) { return first < 128 ? 'A' : first < 192 ? 'B' : first < 224 ? 'C' : first < 240 ? 'D (multicast)' : 'E (reserved)'; }
  function scope(n) {
    var a = n >>> 24, b = (n >>> 16) & 255;
    if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return 'Private (RFC 1918)';
    if (a === 127) return 'Loopback';
    if (a === 169 && b === 254) return 'Link-local';
    if (a === 100 && b >= 64 && b <= 127) return 'Carrier-grade NAT';
    if (a >= 224) return 'Multicast / reserved';
    return 'Public';
  }
  function calcSubnet(input) {
    var m = input.trim().match(/^(\d{1,3}(?:\.\d{1,3}){3})\s*\/\s*(\d{1,2})$/);
    if (!m) return { error: 'Use CIDR notation, for example 192.168.1.10/24.' };
    var ip = ipToInt(m[1]);
    var prefix = +m[2];
    if (ip === null) return { error: 'Each octet must be a number from 0 to 255.' };
    if (prefix > 32) return { error: 'The prefix must be between 0 and 32.' };
    var mask = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0;
    var network = (ip & mask) >>> 0;
    var broadcast = (network | (~mask >>> 0)) >>> 0;
    var total = Math.pow(2, 32 - prefix);
    var usable = prefix >= 31 ? (prefix === 32 ? 1 : 2) : total - 2;
    var first = prefix >= 31 ? network : network + 1;
    var last = prefix >= 31 ? broadcast : broadcast - 1;
    return {
      ip: ip, prefix: prefix,
      rows: [
        ['Address', intToIp(ip)],
        ['Network', intToIp(network) + '/' + prefix],
        ['Subnet mask', intToIp(mask)],
        ['Wildcard mask', intToIp(~mask >>> 0)],
        ['Broadcast', prefix >= 31 ? 'n/a' : intToIp(broadcast)],
        ['Usable host range', intToIp(first) + ' – ' + intToIp(last)],
        ['Usable hosts', usable.toLocaleString()],
        ['Total addresses', total.toLocaleString()],
        ['Class', ipClass(ip >>> 24)],
        ['Scope', scope(ip)]
      ]
    };
  }
  function renderSubnet() {
    var r = calcSubnet($('net-in').value);
    var out = $('net-out'), bits = $('net-bits'), err = $('net-err');
    out.textContent = ''; bits.textContent = '';
    if (r.error) { err.textContent = r.error; return; }
    err.textContent = '';
    r.rows.forEach(function (row) {
      var d = el('div', 'net__cell');
      d.appendChild(el('dt', null, row[0]));
      d.appendChild(el('dd', null, row[1]));
      out.appendChild(d);
    });
    var bin = ('00000000000000000000000000000000' + r.ip.toString(2)).slice(-32);
    for (var i = 0; i < 32; i++) {
      if (i && i % 8 === 0) bits.appendChild(el('span', 'net__dot', '.'));
      bits.appendChild(el('span', i < r.prefix ? 'net__bit is-net' : 'net__bit', bin[i]));
    }
    var legend = el('p', 'net__legend');
    legend.appendChild(el('span', 'net__key is-net', ''));
    legend.appendChild(document.createTextNode(' network bits (' + r.prefix + ')  '));
    legend.appendChild(el('span', 'net__key', ''));
    legend.appendChild(document.createTextNode(' host bits (' + (32 - r.prefix) + ')'));
    bits.appendChild(legend);
  }
  if ($('net-form')) {
    $('net-form').addEventListener('submit', function (e) { e.preventDefault(); renderSubnet(); });
    document.querySelectorAll('[data-net]').forEach(function (b) {
      b.addEventListener('click', function () { $('net-in').value = b.dataset.net; renderSubnet(); });
    });
    renderSubnet();
  }

  /* ---------- Memory game ---------- */
  var STACK = ['Laravel', 'PHP', 'Vue.js', 'React', 'MySQL', 'AWS', 'Linux', 'Twilio'];
  var mem = { first: null, lock: false, moves: 0, matched: 0, timer: null, secs: 0, started: false };
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function memStats() {
    $('mem-moves').textContent = mem.moves;
    $('mem-time').textContent = mem.secs + 's';
    var best = store.get('pg_mem_best', null);
    $('mem-best').textContent = best ? best + ' moves' : '–';
  }
  function memStart() {
    clearInterval(mem.timer);
    mem = { first: null, lock: false, moves: 0, matched: 0, timer: null, secs: 0, started: false };
    var grid = $('mem-grid'); grid.textContent = '';
    $('mem-msg').textContent = '';
    shuffle(STACK.concat(STACK)).forEach(function (name, idx) {
      var b = el('button', 'mem__card');
      b.type = 'button';
      b.dataset.name = name;
      b.dataset.hue = STACK.indexOf(name);
      b.setAttribute('aria-label', 'Hidden card ' + (idx + 1));
      var inner = el('span', 'mem__inner');
      inner.appendChild(el('span', 'mem__back', '</>'));
      inner.appendChild(el('span', 'mem__front', name));
      b.appendChild(inner);
      b.addEventListener('click', function () { memFlip(b); });
      grid.appendChild(b);
    });
    memStats();
  }
  function memFlip(card) {
    if (mem.lock || card.classList.contains('is-open') || card.classList.contains('is-matched')) return;
    if (!mem.started) {
      mem.started = true;
      mem.timer = setInterval(function () { mem.secs++; $('mem-time').textContent = mem.secs + 's'; }, 1000);
    }
    card.classList.add('is-open');
    card.setAttribute('aria-label', card.dataset.name);
    if (!mem.first) { mem.first = card; return; }
    mem.moves++;
    var a = mem.first; mem.first = null;
    if (a.dataset.name === card.dataset.name) {
      a.classList.add('is-matched'); card.classList.add('is-matched');
      mem.matched++;
      if (mem.matched === STACK.length) {
        clearInterval(mem.timer);
        var best = store.get('pg_mem_best', null);
        var msg = 'Solved in ' + mem.moves + ' moves and ' + mem.secs + 's.';
        if (!best || mem.moves < best) { store.set('pg_mem_best', mem.moves); msg += ' New best!'; }
        $('mem-msg').textContent = msg;
      }
      memStats();
    } else {
      mem.lock = true;
      memStats();
      setTimeout(function () {
        a.classList.remove('is-open'); card.classList.remove('is-open');
        a.setAttribute('aria-label', 'Hidden card'); card.setAttribute('aria-label', 'Hidden card');
        mem.lock = false;
      }, 800);
    }
  }
  if ($('mem-grid')) { $('mem-restart').addEventListener('click', memStart); memStart(); }

  /* ---------- Tic-tac-toe (minimax) ---------- */
  var LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  var board = Array(9).fill(null), over = false, busy = false;
  var score = store.get('pg_ttt_score', { w: 0, d: 0, l: 0 });
  function winner(b) {
    for (var i = 0; i < LINES.length; i++) {
      var l = LINES[i];
      if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) return { p: b[l[0]], line: l };
    }
    return b.every(Boolean) ? { p: 'draw' } : null;
  }
  function minimax(b, player, depth) {
    var w = winner(b);
    if (w) return { score: w.p === 'O' ? 10 - depth : w.p === 'X' ? depth - 10 : 0 };
    var best = { score: player === 'O' ? -Infinity : Infinity, idx: -1 };
    for (var i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = player;
      var r = minimax(b, player === 'O' ? 'X' : 'O', depth + 1);
      b[i] = null;
      if (player === 'O' ? r.score > best.score : r.score < best.score) best = { score: r.score, idx: i };
    }
    return best;
  }
  function tttRender(win) {
    var g = $('ttt');
    Array.prototype.forEach.call(g.children, function (c, i) {
      c.textContent = board[i] || '';
      c.className = 'ttt__cell' + (board[i] ? ' is-' + board[i].toLowerCase() : '') + (win && win.line && win.line.indexOf(i) !== -1 ? ' is-win' : '');
      c.disabled = !!board[i] || over;
      c.setAttribute('aria-label', 'Cell ' + (i + 1) + (board[i] ? ', ' + board[i] : ', empty'));
    });
    $('ttt-w').textContent = score.w; $('ttt-d').textContent = score.d; $('ttt-l').textContent = score.l;
  }
  function tttEnd(w) {
    over = true;
    if (w.p === 'X') { score.w++; $('ttt-msg').textContent = 'You won! (That should be impossible...)'; }
    else if (w.p === 'O') { score.l++; $('ttt-msg').textContent = 'The AI wins. Try again!'; }
    else { score.d++; $('ttt-msg').textContent = 'Draw. Perfect play from both sides!'; }
    store.set('pg_ttt_score', score);
    tttRender(w);
  }
  function tttPlay(i) {
    if (over || busy || board[i]) return;
    board[i] = 'X';
    var w = winner(board);
    tttRender();
    if (w) return tttEnd(w);
    busy = true;
    $('ttt-msg').textContent = 'AI is thinking...';
    setTimeout(function () {
      board[minimax(board, 'O', 0).idx] = 'O';
      busy = false;
      var w2 = winner(board);
      if (w2) return tttEnd(w2);
      $('ttt-msg').textContent = 'Your move.';
      tttRender();
    }, 350);
  }
  function tttStart() {
    board = Array(9).fill(null); over = false; busy = false;
    $('ttt-msg').textContent = 'Your move.';
    tttRender();
  }
  if ($('ttt')) {
    for (var i = 0; i < 9; i++) {
      (function (idx) {
        var c = el('button', 'ttt__cell'); c.type = 'button';
        c.addEventListener('click', function () { tttPlay(idx); });
        $('ttt').appendChild(c);
      })(i);
    }
    $('ttt-restart').addEventListener('click', tttStart);
    tttStart();
  }
})();
