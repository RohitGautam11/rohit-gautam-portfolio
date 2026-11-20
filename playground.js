(function () {
  'use strict';

  /* ---------- helpers ---------- */
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
  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function sample(a, n) { return shuffle(a).slice(0, n); }
  function setSeg(group, btn) {
    group.querySelectorAll('button').forEach(function (b) { b.classList.toggle('is-on', b === btn); });
  }
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function confetti(host) {
    if (reduceMotion || !host) return;
    var colors = ['#14b8a6', '#6366f1', '#f59e0b', '#ef4444', '#22c55e', '#ec4899'];
    var box = el('div', 'confetti');
    for (var i = 0; i < 36; i++) {
      var p = el('i');
      p.style.left = rand(5, 95) + '%';
      p.style.background = pick(colors);
      p.style.setProperty('--dx', rand(-80, 80) + 'px');
      p.style.setProperty('--r', rand(180, 720) + 'deg');
      p.style.animationDelay = (Math.random() * 0.25) + 's';
      box.appendChild(p);
    }
    host.appendChild(box);
    setTimeout(function () { box.remove(); }, 1600);
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
  var onTabChange = [];
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
    onTabChange.forEach(function (fn) { fn(tab.id); });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { e.preventDefault(); selectTab(tabs[(i + d + tabs.length) % tabs.length], true); }
    });
  });

  /* =====================================================================
     ARCADE
     ===================================================================== */
  var stages = {};
  document.querySelectorAll('[data-stage]').forEach(function (s) { stages[s.dataset.stage] = s; });
  var games = {};          // name -> { init, stop }
  var inited = {};
  var current = null;

  function showGame(name) {
    if (current && games[current] && games[current].stop) games[current].stop();
    current = name;
    Object.keys(stages).forEach(function (k) { stages[k].hidden = k !== name; });
    document.querySelectorAll('.arcade__pick').forEach(function (b) {
      b.classList.toggle('is-on', b.dataset.game === name);
      b.setAttribute('aria-pressed', String(b.dataset.game === name));
    });
    if (!inited[name] && games[name]) { games[name].init(); inited[name] = true; }
  }
  document.querySelectorAll('.arcade__pick').forEach(function (b) {
    b.addEventListener('click', function () { showGame(b.dataset.game); });
  });
  onTabChange.push(function (id) {
    if (id !== 'tab-games' && current && games[current] && games[current].stop) games[current].stop();
  });

  /* ---------- Whack-a-Bug ---------- */
  games.whack = (function () {
    var cells = [], running = false, score = 0, combo = 1, timeLeft = 30, tick = null, spawnT = null, startAt = 0;
    var best = store.get('pg_wb_best', 0);
    function hud() {
      $('wb-score').textContent = score;
      $('wb-time').textContent = timeLeft;
      $('wb-combo').textContent = 'x' + combo;
      $('wb-best').textContent = best;
    }
    function clearCell(c) {
      clearTimeout(c._t);
      c.className = 'wb__cell';
      c.dataset.kind = '';
      c.querySelector('.wb__thing').textContent = '';
    }
    function spawn() {
      if (!running) return;
      var elapsed = (Date.now() - startAt) / 1000;
      var interval = Math.max(380, 950 - elapsed * 22);
      var free = cells.filter(function (c) { return !c.dataset.kind; });
      var count = elapsed > 15 && Math.random() < 0.35 ? 2 : 1;
      sample(free, Math.min(count, free.length)).forEach(function (c) {
        var kind = Math.random() < 0.22 ? 'feature' : (Math.random() < 0.12 ? 'boss' : 'bug');
        c.dataset.kind = kind;
        c.className = 'wb__cell is-up is-' + kind;
        c.querySelector('.wb__thing').textContent = kind === 'feature' ? '⭐' : kind === 'boss' ? '🪲' : '🐞';
        c._t = setTimeout(function () {
          if (c.dataset.kind === 'bug' || c.dataset.kind === 'boss') { combo = 1; hud(); }
          clearCell(c);
        }, interval * 1.35);
      });
      spawnT = setTimeout(spawn, interval);
    }
    function pop(c, text, good) {
      var f = el('span', 'wb__float ' + (good ? 'is-good' : 'is-bad'), text);
      c.appendChild(f);
      setTimeout(function () { f.remove(); }, 700);
    }
    function hit(c) {
      if (!running || !c.dataset.kind) return;
      var kind = c.dataset.kind;
      if (kind === 'feature') {
        score = Math.max(0, score - 15); combo = 1;
        pop(c, '-15', false);
        $('wb-msg').textContent = 'That was a feature, not a bug!';
      } else {
        var pts = (kind === 'boss' ? 25 : 10) * combo;
        score += pts; combo = Math.min(combo + 1, 8);
        pop(c, '+' + pts, true);
        $('wb-msg').textContent = kind === 'boss' ? 'Critical bug squashed!' : pick(['Squashed!', 'Fixed in prod!', 'Hotfix shipped!', 'Nice!', 'Patched!']);
      }
      clearCell(c);
      hud();
    }
    function end() {
      running = false;
      clearInterval(tick); clearTimeout(spawnT);
      cells.forEach(clearCell);
      var msg = 'Time! You scored ' + score + '.';
      if (score > best) { best = score; store.set('pg_wb_best', best); msg += ' New best!'; confetti(stages.whack); }
      $('wb-msg').textContent = msg;
      $('wb-start').textContent = 'Play again';
      $('wb-start').disabled = false;
      hud();
    }
    function start() {
      score = 0; combo = 1; timeLeft = 30; running = true; startAt = Date.now();
      cells.forEach(clearCell);
      $('wb-start').disabled = true;
      $('wb-msg').textContent = 'Go go go!';
      hud();
      tick = setInterval(function () { timeLeft--; hud(); if (timeLeft <= 0) end(); }, 1000);
      spawn();
    }
    return {
      init: function () {
        var grid = $('wb-grid');
        for (var i = 0; i < 9; i++) {
          var c = el('button', 'wb__cell'); c.type = 'button';
          c.setAttribute('aria-label', 'Server ' + (i + 1));
          c.appendChild(el('span', 'wb__rack'));
          c.appendChild(el('span', 'wb__thing'));
          (function (cell) { cell.addEventListener('pointerdown', function (e) { e.preventDefault(); hit(cell); }); cell.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hit(cell); } }); })(c);
          cells.push(c); grid.appendChild(c);
        }
        $('wb-start').addEventListener('click', start);
        hud();
      },
      stop: function () { if (running) { running = false; clearInterval(tick); clearTimeout(spawnT); cells.forEach(clearCell); $('wb-start').disabled = false; $('wb-start').textContent = 'Start (30s)'; $('wb-msg').textContent = 'Paused. Press Start to play again.'; } }
    };
  })();

  /* ---------- Code Typing ---------- */
  games.typing = (function () {
    var SNIPPETS = [
      ['PHP', "Route::get('/orders', [OrderController::class, 'index']);"],
      ['PHP', "$order = Order::with('items')->findOrFail($id);"],
      ['PHP', "$user->roles()->attach($adminRole->id);"],
      ['PHP', "return response()->json(['status' => 'ok'], 201);"],
      ['SQL', "SELECT sku, SUM(qty) AS stock FROM inventory GROUP BY sku;"],
      ['SQL', "ALTER TABLE orders ADD INDEX idx_status (status);"],
      ['SQL', "UPDATE inventory SET available = available + 25 WHERE id = 7;"],
      ['JavaScript', "const total = items.reduce((sum, i) => sum + i.qty, 0);"],
      ['JavaScript', "const res = await fetch('/api/health').then(r => r.json());"],
      ['JavaScript', "users.filter(u => u.active).map(u => u.email);"],
      ['Bash', "php artisan queue:work --tries=3 --timeout=90"],
      ['Bash', "sudo ufw allow 443/tcp && sudo ufw reload"],
      ['Bash', "git checkout -b feature/stripe-webhooks"],
      ['Bash', "tail -f storage/logs/laravel.log | grep ERROR"],
      ['TypeScript', "type Task = { id: number; title: string; done: boolean };"]
    ];
    var target = '', lang = '', startT = 0, keys = 0, errors = 0, done = false, last = '', prevLen = 0;
    var best = store.get('pg_ty_best', 0);
    function render(val) {
      var t = $('ty-target'); t.textContent = '';
      for (var i = 0; i < target.length; i++) {
        var cls = 'ty__ch';
        if (i < val.length) cls += val[i] === target[i] ? ' is-ok' : ' is-bad';
        else if (i === val.length) cls += ' is-cur';
        var s = el('span', cls, target[i]);
        t.appendChild(s);
      }
    }
    function stats(final) {
      var secs = startT ? (Date.now() - startT) / 1000 : 0;
      var typed = $('ty-input').value.length;
      var wpm = secs > 0.5 ? Math.round((typed / 5) / (secs / 60)) : 0;
      var acc = keys ? Math.max(0, Math.round(((keys - errors) / keys) * 100)) : 100;
      $('ty-wpm').textContent = wpm;
      $('ty-acc').textContent = acc + '%';
      $('ty-best').textContent = best + ' WPM';
      if (final) return { wpm: wpm, acc: acc, secs: secs };
    }
    function next() {
      var choice;
      do { choice = pick(SNIPPETS); } while (SNIPPETS.length > 1 && choice[1] === last);
      last = choice[1]; target = choice[1]; lang = choice[0];
      startT = 0; keys = 0; errors = 0; done = false; prevLen = 0;
      var inp = $('ty-input'); inp.value = ''; inp.disabled = false; inp.maxLength = target.length;
      $('ty-lang').textContent = lang;
      $('ty-msg').textContent = '';
      render(''); stats();
    }
    return {
      init: function () {
        var inp = $('ty-input');
        inp.addEventListener('paste', function (e) { e.preventDefault(); $('ty-msg').textContent = 'No pasting. Real typing only!'; });
        inp.addEventListener('input', function () {
          if (done) return;
          var v = inp.value;
          if (!startT && v.length) startT = Date.now();
          if (v.length > prevLen) { keys++; if (v[v.length - 1] !== target[v.length - 1]) errors++; }
          prevLen = v.length;
          render(v); stats();
          if (v === target) {
            done = true; inp.disabled = true;
            var r = stats(true);
            var msg = r.wpm + ' WPM at ' + r.acc + '% accuracy in ' + r.secs.toFixed(1) + 's.';
            if (r.wpm > best) { best = r.wpm; store.set('pg_ty_best', best); msg += ' New best!'; confetti(stages.typing); }
            $('ty-msg').textContent = msg + ' Press "New snippet" for another.';
            stats();
          }
        });
        $('ty-target').addEventListener('click', function () { inp.focus(); });
        $('ty-next').addEventListener('click', function () { next(); inp.focus(); });
        next();
      }
    };
  })();

  /* ---------- Dev Quiz ---------- */
  games.quiz = (function () {
    var BANK = [
      ['HTTP', 'Which status code means the request data failed validation (Unprocessable Entity)?', '422', ['400', '409', '415'], 'Laravel returns 422 with an "errors" object when validation fails.'],
      ['HTTP', 'Which status code should an API return after successfully creating a resource?', '201 Created', ['200 OK', '202 Accepted', '204 No Content'], '201 tells the client something new was created, often with a Location header.'],
      ['HTTP', 'What does 429 mean?', 'Too Many Requests', ['Unauthorized', 'Conflict', 'Gone'], '429 is the rate-limiting response. Laravel\'s throttle middleware returns it.'],
      ['HTTP', 'User is logged in but not allowed to see the page. Which code?', '403 Forbidden', ['401 Unauthorized', '404 Not Found', '407 Proxy Auth'], '401 means "who are you?", 403 means "I know who you are, and no."'],
      ['HTTP', 'Which header tells the server the body is JSON?', 'Content-Type: application/json', ['Accept: text/html', 'Authorization: Bearer', 'Cache-Control: no-store'], 'Content-Type describes the body you send. Accept describes what you want back.'],
      ['Networking', 'Default port for HTTPS?', '443', ['80', '8080', '22'], 'HTTP uses 80, HTTPS uses 443.'],
      ['Networking', 'Default port for SSH?', '22', ['21', '23', '25'], '21 is FTP, 23 is Telnet, 25 is SMTP.'],
      ['Networking', 'Default MySQL port?', '3306', ['5432', '1433', '27017'], '5432 is PostgreSQL, 1433 is SQL Server, 27017 is MongoDB.'],
      ['Networking', 'How many usable hosts are in a /24 network?', '254', ['256', '255', '252'], '256 addresses minus the network and broadcast addresses.'],
      ['Networking', 'Which range is a private (RFC 1918) range?', '172.16.0.0/12', ['100.64.0.0/10', '169.254.0.0/16', '8.8.8.0/24'], '100.64/10 is carrier-grade NAT and 169.254/16 is link-local.'],
      ['Networking', 'What is the subnet mask for /26?', '255.255.255.192', ['255.255.255.224', '255.255.255.128', '255.255.255.240'], '26 network bits leave 6 host bits: 64 addresses per subnet.'],
      ['Networking', 'Which protocol does ping use?', 'ICMP', ['TCP', 'UDP', 'ARP'], 'ping sends ICMP echo requests.'],
      ['Networking', 'DNS mainly runs on which port?', '53', ['25', '67', '123'], '67 is DHCP and 123 is NTP.'],
      ['SQL', 'Which clause filters rows after GROUP BY?', 'HAVING', ['WHERE', 'ORDER BY', 'LIMIT'], 'WHERE filters rows before grouping, HAVING filters the groups.'],
      ['SQL', 'Best first step to speed up a slow WHERE lookup on a column?', 'Add an index on it', ['Use SELECT *', 'Add more JOINs', 'Use DISTINCT'], 'Check EXPLAIN, then index the columns you filter and join on.'],
      ['SQL', 'Which JOIN keeps every row from the left table?', 'LEFT JOIN', ['INNER JOIN', 'CROSS JOIN', 'RIGHT JOIN'], 'Unmatched right-side columns come back as NULL.'],
      ['SQL', 'In ACID, what does the "A" stand for?', 'Atomicity', ['Availability', 'Authentication', 'Aggregation'], 'A transaction happens completely or not at all.'],
      ['Laravel', 'Which command runs pending database migrations?', 'php artisan migrate', ['php artisan db:run', 'php artisan make:migration', 'php artisan schema:run'], 'make:migration only creates the file.'],
      ['Laravel', 'How do you avoid the N+1 query problem in Eloquent?', 'Eager load with with()', ['Use all()', 'Use DB::raw()', 'Use paginate()'], 'Order::with(\'items\') loads the relation in one extra query.'],
      ['Laravel', 'Where should slow work like sending emails or syncing marketplaces run?', 'Queued jobs', ['Blade views', 'Route closures', 'Migrations'], 'Queues keep requests fast and allow retries.'],
      ['Laravel', 'What protects a route so only logged-in users reach it?', 'Middleware', ['Seeders', 'Factories', 'Accessors'], 'The auth middleware checks the user before the controller runs.'],
      ['Laravel', 'Which file holds environment secrets in a Laravel app?', '.env', ['composer.json', 'routes/web.php', 'config/app.blade.php'], '.env should never be committed to Git.'],
      ['JavaScript', 'What does typeof null return?', '"object"', ['"null"', '"undefined"', '"number"'], 'A famous historical quirk of JavaScript.'],
      ['JavaScript', 'What does [1, 2, 3].map(x => x * 2) return?', '[2, 4, 6]', ['6', '[1, 2, 3]', 'undefined'], 'map returns a new array; it does not change the original.'],
      ['Vue / React', 'Which Vue directive renders a list?', 'v-for', ['v-if', 'v-model', 'v-bind'], 'Always give v-for items a unique :key.'],
      ['Vue / React', 'Which React hook runs side effects like fetching data?', 'useEffect', ['useState', 'useMemo', 'useRef'], 'useEffect runs after render.'],
      ['Linux', 'What does chmod 644 give the file owner?', 'Read and write', ['Read only', 'Read, write and execute', 'Nothing'], '6 = read (4) + write (2). Group and others get read (4).'],
      ['Linux', 'Which command lists listening ports on a Linux server?', 'ss -tulpn', ['ls -la', 'df -h', 'chmod -R'], 'netstat -tulpn does the same on older systems.'],
      ['Security', 'What is the right way to store user passwords?', 'Hash with bcrypt or Argon2', ['Base64 encode them', 'Encrypt with a fixed key', 'Hash with MD5'], 'Slow, salted hashes. Laravel\'s Hash::make uses bcrypt by default.'],
      ['Security', 'What prevents SQL injection?', 'Prepared statements / parameter binding', ['Hiding error messages', 'Using POST instead of GET', 'Minifying JavaScript'], 'Eloquent and the query builder bind parameters for you.'],
      ['Security', 'What does RBAC stand for?', 'Role-Based Access Control', ['Rule-Based Auth Cache', 'Remote Backup And Copy', 'Request-Based API Control'], 'Users get roles, and roles get permissions.'],
      ['Security', 'What does CORS control?', 'Which websites a browser lets call your API', ['Database replication', 'Server CPU limits', 'DNS caching'], 'It is enforced by browsers, not by servers.']
    ];
    var qs = [], idx = 0, score = 0, streak = 0, correct = 0, timer = null, left = 15, answered = false, nextT = null;
    var best = store.get('pg_qz_best', 0);
    function hud() {
      $('qz-num').textContent = Math.min(idx + 1, 10) + '/10';
      $('qz-score').textContent = score;
      $('qz-streak').textContent = streak;
      $('qz-best').textContent = best;
    }
    function bar() { $('qz-bar').style.width = (left / 15 * 100) + '%'; $('qz-bar').classList.toggle('is-low', left <= 5); }
    function stopTimers() { clearInterval(timer); clearTimeout(nextT); }
    function show() {
      answered = false; left = 15; bar(); hud();
      var q = qs[idx];
      $('qz-cat').textContent = q[0];
      $('qz-q').textContent = q[1];
      $('qz-exp').textContent = '';
      var box = $('qz-opts'); box.textContent = '';
      shuffle([q[2]].concat(q[3])).forEach(function (opt) {
        var b = el('button', 'qz__opt', opt); b.type = 'button';
        b.addEventListener('click', function () { answer(b, opt); });
        box.appendChild(b);
      });
      clearInterval(timer);
      timer = setInterval(function () { left--; bar(); if (left <= 0) answer(null, null); }, 1000);
    }
    function answer(btn, opt) {
      if (answered) return;
      answered = true; clearInterval(timer);
      var q = qs[idx];
      var ok = opt === q[2];
      $('qz-opts').querySelectorAll('button').forEach(function (b) {
        b.disabled = true;
        if (b.textContent === q[2]) b.classList.add('is-right');
      });
      if (btn && !ok) btn.classList.add('is-wrong');
      if (ok) { correct++; streak++; score += 100 + left * 10 + (streak > 2 ? 50 : 0); }
      else streak = 0;
      $('qz-exp').textContent = (ok ? 'Correct! ' : opt === null ? 'Time\'s up. ' : 'Not quite. ') + q[4];
      hud();
      nextT = setTimeout(function () {
        idx++;
        if (idx < qs.length) show(); else finish();
      }, ok ? 1700 : 2600);
    }
    function finish() {
      stopTimers();
      var msg = 'You got ' + correct + '/10 and scored ' + score + '.';
      if (score > best) { best = score; store.set('pg_qz_best', best); msg += ' New best!'; confetti(stages.quiz); }
      $('qz-cat').textContent = 'Round over';
      $('qz-q').textContent = msg;
      $('qz-opts').textContent = '';
      $('qz-exp').textContent = correct >= 8 ? 'Senior-level answers. Want to talk shop? Get in touch!' : 'Play again for a fresh random set of questions.';
      $('qz-start').textContent = 'Play again'; $('qz-start').disabled = false;
      idx = 9; hud();
    }
    function start() {
      stopTimers();
      qs = sample(BANK, 10); idx = 0; score = 0; streak = 0; correct = 0;
      $('qz-start').textContent = 'Restart';
      show();
    }
    return {
      init: function () { $('qz-start').addEventListener('click', start); hud(); bar(); },
      stop: function () { if (timer && !answered) { stopTimers(); answered = true; $('qz-exp').textContent = 'Paused. Press Restart to play a new round.'; } }
    };
  })();

  /* ---------- Stack Memory ---------- */
  games.memory = (function () {
    var POOL = ['Laravel', 'PHP', 'Vue.js', 'React', 'MySQL', 'AWS', 'Linux', 'Twilio', 'Stripe', 'NestJS', 'Next.js', 'Docker', 'Tailwind', 'Git', 'Node.js', 'PostgreSQL', 'TypeScript', 'Redis'];
    var pairs = 8, st = {};
    function bestKey() { return 'pg_mem_best_' + pairs; }
    function hud() {
      $('mem-moves').textContent = st.moves;
      $('mem-time').textContent = st.secs + 's';
      $('mem-pairs').textContent = st.matched + '/' + pairs;
      var best = store.get(bestKey(), null);
      $('mem-best').textContent = best ? best + ' moves' : '-';
    }
    function deal() {
      clearInterval(st.timer);
      st = { first: null, lock: false, moves: 0, matched: 0, timer: null, secs: 0, started: false };
      var grid = $('mem-grid'); grid.textContent = '';
      grid.style.setProperty('--cols', pairs === 10 ? 5 : 4);
      $('mem-msg').textContent = '';
      var names = sample(POOL, pairs);
      shuffle(names.concat(names)).forEach(function (name, i) {
        var b = el('button', 'mem__card'); b.type = 'button';
        b.dataset.name = name;
        b.setAttribute('aria-label', 'Hidden card ' + (i + 1));
        var inner = el('span', 'mem__inner');
        inner.appendChild(el('span', 'mem__back', '</>'));
        inner.appendChild(el('span', 'mem__front', name));
        b.appendChild(inner);
        b.addEventListener('click', function () { flip(b); });
        grid.appendChild(b);
      });
      hud();
    }
    function flip(card) {
      if (st.lock || card.classList.contains('is-open') || card.classList.contains('is-matched')) return;
      if (!st.started) { st.started = true; st.timer = setInterval(function () { st.secs++; $('mem-time').textContent = st.secs + 's'; }, 1000); }
      card.classList.add('is-open'); card.setAttribute('aria-label', card.dataset.name);
      if (!st.first) { st.first = card; return; }
      st.moves++;
      var a = st.first; st.first = null;
      if (a.dataset.name === card.dataset.name) {
        a.classList.add('is-matched'); card.classList.add('is-matched'); st.matched++;
        if (st.matched === pairs) {
          clearInterval(st.timer);
          var best = store.get(bestKey(), null);
          var msg = 'Solved in ' + st.moves + ' moves and ' + st.secs + 's.';
          if (!best || st.moves < best) { store.set(bestKey(), st.moves); msg += ' New best!'; }
          $('mem-msg').textContent = msg + ' Deal again for a different set.';
          confetti(stages.memory);
        }
      } else {
        st.lock = true;
        setTimeout(function () {
          a.classList.remove('is-open'); card.classList.remove('is-open');
          a.setAttribute('aria-label', 'Hidden card'); card.setAttribute('aria-label', 'Hidden card');
          st.lock = false;
        }, 750);
      }
      hud();
    }
    return {
      init: function () {
        $('mem-restart').addEventListener('click', deal);
        $('mem-diff').querySelectorAll('button').forEach(function (b) {
          b.addEventListener('click', function () { pairs = +b.dataset.n; setSeg($('mem-diff'), b); deal(); });
        });
        deal();
      },
      stop: function () { clearInterval(st.timer); st.started = false; }
    };
  })();

  /* ---------- Tic-tac-toe ---------- */
  games.ttt = (function () {
    var LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    var board, over, busy, level = 'medium', aiStarts = false, score = store.get('pg_ttt_score', { w: 0, d: 0, l: 0 });
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
    function aiMove() {
      var free = []; board.forEach(function (v, i) { if (!v) free.push(i); });
      var smart = level === 'impossible' || (level === 'medium' && Math.random() < 0.6);
      if (!smart) return pick(free);
      if (free.length === 9) return pick([0, 2, 4, 6, 8]);
      return minimax(board, 'O', 0).idx;
    }
    function render(win) {
      Array.prototype.forEach.call($('ttt').children, function (c, i) {
        c.textContent = board[i] || '';
        c.className = 'ttt__cell' + (board[i] ? ' is-' + board[i].toLowerCase() : '') + (win && win.line && win.line.indexOf(i) !== -1 ? ' is-win' : '');
        c.disabled = !!board[i] || over || busy;
        c.setAttribute('aria-label', 'Cell ' + (i + 1) + (board[i] ? ', ' + board[i] : ', empty'));
      });
      $('ttt-w').textContent = score.w; $('ttt-d').textContent = score.d; $('ttt-l').textContent = score.l;
    }
    function end(w) {
      over = true;
      if (w.p === 'X') { score.w++; $('ttt-msg').textContent = level === 'impossible' ? 'You beat the impossible AI?! Impressive.' : 'You win! Try a harder level.'; confetti(stages.ttt); }
      else if (w.p === 'O') { score.l++; $('ttt-msg').textContent = 'The AI wins this one. Rematch?'; }
      else { score.d++; $('ttt-msg').textContent = 'Draw. Solid play!'; }
      store.set('pg_ttt_score', score);
      render(w);
    }
    function ai() {
      busy = true; render();
      $('ttt-msg').textContent = 'AI is thinking...';
      setTimeout(function () {
        board[aiMove()] = 'O'; busy = false;
        var w = winner(board);
        if (w) return end(w);
        $('ttt-msg').textContent = 'Your move.';
        render();
      }, 380);
    }
    function play(i) {
      if (over || busy || board[i]) return;
      board[i] = 'X';
      var w = winner(board);
      if (w) return end(w);
      ai();
    }
    function start() {
      board = Array(9).fill(null); over = false; busy = false;
      aiStarts = !aiStarts;
      if (aiStarts) ai(); else { $('ttt-msg').textContent = 'You start. Your move.'; render(); }
    }
    return {
      init: function () {
        for (var i = 0; i < 9; i++) {
          (function (idx) {
            var c = el('button', 'ttt__cell'); c.type = 'button';
            c.addEventListener('click', function () { play(idx); });
            $('ttt').appendChild(c);
          })(i);
        }
        $('ttt-restart').addEventListener('click', start);
        $('ttt-level').querySelectorAll('button').forEach(function (b) {
          b.addEventListener('click', function () { level = b.dataset.l; setSeg($('ttt-level'), b); aiStarts = true; start(); });
        });
        aiStarts = Math.random() < 0.5;
        start();
      }
    };
  })();

  if ($('panel-games')) showGame(pick(['whack', 'typing', 'quiz', 'memory', 'ttt']));

  /* =====================================================================
     LIVE API
     ===================================================================== */
  var SKUS = ['EVL-HOODIE-BLK-M', 'EVL-TEE-WHT-L', 'EVL-CAP-NAVY', 'EVL-MUG-CER-11', 'EVL-BAG-CANVAS', 'EVL-JACKET-OLV-S', 'EVL-SOCKS-3PK'];
  var CHANNELS = ['AMZ', 'EBAY', 'WEB', 'DRP'];
  var LOCS = ['Shimla Warehouse', 'Delhi Hub', 'Mumbai Hub', 'Bengaluru Hub', 'Chandigarh Store', 'Pune Hub', 'Kolkata Hub'];
  function randomShares(n) {
    var w = []; for (var i = 0; i < n; i++) w.push(rand(1, 10));
    var sum = w.reduce(function (a, b) { return a + b; }, 0);
    var shares = w.map(function (x) { return Math.max(5, Math.round(x / sum * 20) * 5); });
    var diff = 100 - shares.reduce(function (a, b) { return a + b; }, 0);
    var big = shares.indexOf(Math.max.apply(null, shares));
    shares[big] += diff;
    if (shares[big] <= 0) return randomShares(n);
    return shares;
  }
  function randomReceive() {
    var pre = [], n = rand(1, 4), demand = 0;
    for (var i = 0; i < n; i++) { var q = rand(4, 40); demand += q; pre.push({ order_id: pick(CHANNELS) + '-' + rand(10000, 99999), qty: q }); }
    var locs = sample(LOCS, rand(2, 4)), shares = randomShares(locs.length);
    return {
      sku: pick(SKUS),
      inbound_qty: Math.max(1, demand + rand(-Math.floor(demand * 0.6), 90)),
      preorders: pre,
      locations: locs.map(function (l, i) { return { name: l, share: shares[i] }; })
    };
  }
  function randomInvalid() {
    return pick([
      { sku: '', inbound_qty: -5, preorders: [{ order_id: 'AMZ-1', qty: 0 }], locations: [{ name: 'Main', share: 60 }] },
      { sku: 'EVL-TEE', inbound_qty: 'twenty', locations: [] },
      { sku: 'EVL-CAP', inbound_qty: 50, preorders: 'not-an-array', locations: [{ name: '', share: 120 }] },
      { inbound_qty: 2000000, locations: [{ name: 'Delhi Hub', share: 50 }, { name: 'Pune Hub', share: 30 }] }
    ]);
  }
  var presets = {
    receive: { method: 'POST', url: '/api/inventory/receive', make: randomReceive },
    invalid: { method: 'POST', url: '/api/inventory/receive', make: randomInvalid },
    health: { method: 'GET', url: '/api/health', make: null }
  };
  var ORIGIN = location.protocol.indexOf('http') === 0 ? location.origin : 'https://rohit-gautam.vercel.app';
  var API_BASE = location.protocol.indexOf('http') === 0 ? '' : 'https://rohit-gautam.vercel.app';
  function curlFor(p, bodyText) {
    var c = 'curl -X ' + p.method + ' ' + ORIGIN + p.url;
    if (p.method === 'POST') c += " -H 'Content-Type: application/json' -d '" + bodyText.replace(/\s+/g, ' ') + "'";
    return c;
  }
  function loadPreset() {
    var p = presets[$('api-preset').value];
    var ta = $('api-body');
    ta.value = p.make ? JSON.stringify(p.make(), null, 2) : '// GET requests have no body';
    ta.disabled = !p.make;
    $('api-random').disabled = !p.make;
    $('api-curl').textContent = curlFor(p, ta.value);
  }
  var history = [];
  function addHistory(p, status, ms) {
    history.unshift({ m: p.method, u: p.url, s: status, ms: ms, t: new Date() });
    history = history.slice(0, 6);
    var ol = $('api-hist'); ol.textContent = '';
    history.forEach(function (h) {
      var li = el('li');
      li.appendChild(el('span', 'h__m', h.m));
      li.appendChild(el('span', 'h__u', h.u));
      li.appendChild(el('span', 'h__s ' + (h.s >= 200 && h.s < 300 ? 'is-ok' : 'is-err'), String(h.s || 'ERR')));
      li.appendChild(el('span', 'h__ms', h.ms + ' ms'));
      ol.appendChild(li);
    });
  }
  function bars(title, rows) {
    var wrap = el('div', 'viz__group');
    wrap.appendChild(el('p', 'viz__title', title));
    var max = Math.max.apply(null, rows.map(function (r) { return r.max; }).concat([1]));
    rows.forEach(function (r) {
      var row = el('div', 'viz__row');
      row.appendChild(el('span', 'viz__label', r.label));
      var track = el('span', 'viz__track');
      var fill = el('span', 'viz__fill ' + (r.cls || ''));
      fill.style.width = '0%';
      track.appendChild(fill);
      row.appendChild(track);
      row.appendChild(el('span', 'viz__val', r.text));
      wrap.appendChild(row);
      requestAnimationFrame(function () { requestAnimationFrame(function () { fill.style.width = Math.max(2, r.value / max * 100) + '%'; }); });
    });
    return wrap;
  }
  function visualize(data) {
    var v = $('api-viz'); v.textContent = '';
    if (!data || !data.preorders) { v.hidden = true; return; }
    v.hidden = false;
    var summary = el('div', 'viz__sum');
    [['Received', data.received_qty], ['To pre-orders', data.preorders.fulfilled_qty], ['Released to stock', data.surplus_released_to_available], ['Still owed', data.preorders.still_outstanding_qty]].forEach(function (s) {
      var d = el('div'); d.appendChild(el('b', null, String(s[1]))); d.appendChild(el('span', null, s[0])); summary.appendChild(d);
    });
    v.appendChild(summary);
    if (data.preorders.orders.length) {
      v.appendChild(bars('Pre-orders filled', data.preorders.orders.map(function (o) {
        return { label: o.order_id, value: o.fulfilled, max: o.requested, text: o.fulfilled + '/' + o.requested, cls: o.status === 'fulfilled' ? 'is-ok' : o.status === 'pending' ? 'is-err' : 'is-warn' };
      })));
    }
    if (data.surplus_released_to_available > 0) {
      v.appendChild(bars('Surplus allocated to locations', data.allocation.map(function (a) {
        return { label: a.location, value: a.qty, max: data.surplus_released_to_available, text: a.qty + ' (' + a.share + '%)' };
      })));
    }
  }
  if ($('api-preset')) {
    $('api-preset').addEventListener('change', loadPreset);
    $('api-random').addEventListener('click', loadPreset);
    $('api-body').addEventListener('input', function () {
      $('api-curl').textContent = curlFor(presets[$('api-preset').value], $('api-body').value);
    });
    $('api-send').addEventListener('click', function () {
      var p = presets[$('api-preset').value];
      var status = $('api-status'), out = $('api-out'), time = $('api-time');
      var opts = { method: p.method, headers: { Accept: 'application/json' } };
      if (p.make) {
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
      var btn = $('api-send'); btn.disabled = true;
      var t0 = performance.now();
      fetch(API_BASE + p.url, opts).then(function (r) {
        return r.text().then(function (txt) {
          var ms = Math.round(performance.now() - t0);
          status.textContent = r.status + ' ' + (r.statusText || '');
          status.className = 'api__status ' + (r.ok ? 'is-ok' : 'is-err');
          time.textContent = ms + ' ms';
          var json = null;
          try { json = JSON.parse(txt); out.textContent = JSON.stringify(json, null, 2); } catch (e) { out.textContent = txt; }
          visualize(r.ok && json && json.data ? json.data : null);
          addHistory(p, r.status, ms);
        });
      }).catch(function () {
        status.textContent = 'Network error'; status.className = 'api__status is-err';
        out.textContent = '// Could not reach the API. Check your connection and try again.';
        visualize(null);
        addHistory(p, 0, Math.round(performance.now() - t0));
      }).then(function () { btn.disabled = false; });
    });
    loadPreset();
  }

  /* ---------- Live server monitor ---------- */
  (function () {
    if (!$('mon-btn')) return;
    var samples = [], timer = null, count = 0, ok = 0, MAX = 30;
    function draw() {
      var W = 600, H = 120, pad = 8;
      if (!samples.length) { $('mon-line').setAttribute('points', ''); $('mon-area').setAttribute('points', ''); return; }
      var vals = samples.map(function (s) { return s == null ? 0 : s; });
      var max = Math.max.apply(null, vals.concat([50])) * 1.15;
      var step = W / (MAX - 1);
      var pts = vals.map(function (v, i) { return (i * step).toFixed(1) + ',' + (H - pad - (v / max) * (H - pad * 2)).toFixed(1); });
      $('mon-line').setAttribute('points', pts.join(' '));
      $('mon-area').setAttribute('points', '0,' + H + ' ' + pts.join(' ') + ' ' + ((vals.length - 1) * step).toFixed(1) + ',' + H);
    }
    function stats() {
      var good = samples.filter(function (s) { return s != null; });
      if (!good.length) return;
      var sum = good.reduce(function (a, b) { return a + b; }, 0);
      $('mon-last').textContent = (samples[samples.length - 1] != null ? samples[samples.length - 1] + ' ms' : 'timeout');
      $('mon-avg').textContent = Math.round(sum / good.length) + ' ms';
      $('mon-mm').textContent = Math.min.apply(null, good) + ' / ' + Math.max.apply(null, good) + ' ms';
      $('mon-up').textContent = Math.round(ok / count * 100) + '% (' + ok + '/' + count + ')';
    }
    function ping() {
      var t0 = performance.now();
      count++;
      fetch(API_BASE + '/api/health?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
        var ms = Math.round(performance.now() - t0);
        ok++; samples.push(ms);
        $('mon-region').textContent = j.region || '-';
        $('mon-state').textContent = 'Healthy';
        $('mon-state').className = 'is-ok';
      }).catch(function () {
        samples.push(null);
        $('mon-state').textContent = 'Unreachable';
        $('mon-state').className = 'is-err';
      }).then(function () {
        draw(); stats();
        if (count >= MAX) stop('Done');
      });
    }
    function stop(label) {
      clearInterval(timer); timer = null;
      $('mon-btn').textContent = 'Run again';
      if (label) $('mon-state').textContent = label === 'Done' ? 'Finished' : label;
    }
    $('mon-btn').addEventListener('click', function () {
      if (timer) { stop('Stopped'); return; }
      samples = []; count = 0; ok = 0; draw();
      $('mon-state').textContent = 'Running'; $('mon-state').className = '';
      $('mon-btn').textContent = 'Stop';
      ping();
      timer = setInterval(function () { if (count < MAX) ping(); }, 1000);
    });
    onTabChange.push(function (id) { if (id !== 'tab-api' && timer) stop('Stopped'); });
  })();

  /* =====================================================================
     NETWORK LAB
     ===================================================================== */
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
  function maskOf(prefix) { return prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0; }
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
  function subnet(ip, prefix) {
    var mask = maskOf(prefix);
    var network = (ip & mask) >>> 0;
    var broadcast = (network | (~mask >>> 0)) >>> 0;
    var totalA = Math.pow(2, 32 - prefix);
    return {
      mask: mask, network: network, broadcast: broadcast, total: totalA,
      usable: prefix >= 31 ? (prefix === 32 ? 1 : 2) : totalA - 2,
      first: prefix >= 31 ? network : network + 1,
      last: prefix >= 31 ? broadcast : broadcast - 1
    };
  }
  function randomCidr() {
    var kind = pick(['10', '172', '192', 'pub']);
    var a, b;
    if (kind === '10') { a = 10; b = rand(0, 255); }
    else if (kind === '172') { a = 172; b = rand(16, 31); }
    else if (kind === '192') { a = 192; b = 168; }
    else { a = pick([23, 45, 52, 103, 151, 185, 203]); b = rand(0, 255); }
    var prefix = kind === '10' ? rand(8, 28) : kind === '172' ? rand(12, 29) : rand(20, 30);
    return a + '.' + b + '.' + rand(0, 255) + '.' + rand(1, 254) + '/' + prefix;
  }
  var netState = null;
  function parseCidr(input) {
    var m = input.trim().match(/^(\d{1,3}(?:\.\d{1,3}){3})\s*\/\s*(\d{1,2})$/);
    if (!m) return { error: 'Use CIDR notation, for example 192.168.1.10/24.' };
    var ip = ipToInt(m[1]);
    if (ip === null) return { error: 'Each octet must be a number from 0 to 255.' };
    if (+m[2] > 32) return { error: 'The prefix must be between 0 and 32.' };
    return { ip: ip, prefix: +m[2] };
  }
  function renderSubnet() {
    var r = parseCidr($('net-in').value);
    var out = $('net-out'), bits = $('net-bits'), err = $('net-err');
    out.textContent = ''; bits.textContent = '';
    if (r.error) { err.textContent = r.error; netState = null; renderSplit(); return; }
    err.textContent = '';
    var s = subnet(r.ip, r.prefix);
    netState = { ip: r.ip, prefix: r.prefix, s: s };
    [
      ['Address', intToIp(r.ip)],
      ['Network', intToIp(s.network) + '/' + r.prefix],
      ['Subnet mask', intToIp(s.mask)],
      ['Wildcard mask', intToIp(~s.mask >>> 0)],
      ['Broadcast', r.prefix >= 31 ? 'n/a' : intToIp(s.broadcast)],
      ['Usable host range', intToIp(s.first) + ' – ' + intToIp(s.last)],
      ['Usable hosts', s.usable.toLocaleString()],
      ['Total addresses', s.total.toLocaleString()],
      ['Class', ipClass(r.ip >>> 24)],
      ['Scope', scope(r.ip)]
    ].forEach(function (row) {
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
    renderSplit();
  }
  var SPLIT_COLORS = ['#14b8a6', '#6366f1', '#f59e0b', '#ec4899', '#22c55e', '#0ea5e9', '#ef4444', '#a855f7'];
  function renderSplit() {
    var bar = $('split-bar'), list = $('split-list');
    if (!bar) return;
    bar.textContent = ''; list.textContent = '';
    if (!netState) return;
    var n = +$('net-split').value, add = Math.log2(n), np = netState.prefix + add;
    if (np > 30) { list.appendChild(el('p', 'split__note', 'A /' + netState.prefix + ' is too small to split into ' + n + ' usable subnets. Try a bigger network or fewer subnets.')); return; }
    var size = Math.pow(2, 32 - np);
    for (var i = 0; i < n; i++) {
      var net = netState.s.network + i * size;
      var s = subnet(net, np);
      var color = SPLIT_COLORS[i % SPLIT_COLORS.length];
      var seg = el('span', 'split__seg'); seg.style.background = color; seg.title = intToIp(net) + '/' + np;
      bar.appendChild(seg);
      var row = el('div', 'split__row');
      var dot = el('span', 'split__dot'); dot.style.background = color;
      row.appendChild(dot);
      row.appendChild(el('b', null, intToIp(net) + '/' + np));
      row.appendChild(el('span', null, intToIp(s.first) + ' – ' + intToIp(s.last)));
      row.appendChild(el('em', null, s.usable.toLocaleString() + ' hosts'));
      list.appendChild(row);
    }
  }
  // Subnetting challenge
  var nq = { score: 0, streak: 0, answered: false };
  function nqQuestion() {
    nq.answered = false;
    $('nq-exp').textContent = '';
    var prefix = rand(19, 30), ipStr = randomCidr().split('/')[0], ip = ipToInt(ipStr), s = subnet(ip, prefix);
    var type = pick(['hosts', 'mask', 'network', 'broadcast']);
    var q, right, wrong = [];
    if (type === 'hosts') {
      q = 'How many usable hosts are in a /' + prefix + ' network?';
      right = s.usable.toLocaleString();
      wrong = [s.total.toLocaleString(), (s.usable / 2).toLocaleString(), (s.total * 2 - 2).toLocaleString()];
    } else if (type === 'mask') {
      q = 'What is the subnet mask for /' + prefix + '?';
      right = intToIp(s.mask);
      wrong = [intToIp(maskOf(prefix - 1)), intToIp(maskOf(Math.min(32, prefix + 1))), intToIp(maskOf(prefix - 2))];
    } else if (type === 'network') {
      q = 'What is the network address of ' + ipStr + '/' + prefix + '?';
      right = intToIp(s.network);
      wrong = [intToIp(ip), intToIp(s.broadcast), intToIp((s.network + s.total) >>> 0)];
    } else {
      q = 'What is the broadcast address of ' + ipStr + '/' + prefix + '?';
      right = intToIp(s.broadcast);
      wrong = [intToIp(s.network), intToIp(s.broadcast - 1), intToIp((s.broadcast + s.total) >>> 0)];
    }
    var opts = [right];
    wrong.forEach(function (w) { if (opts.indexOf(w) === -1) opts.push(w); });
    var guard = 0;
    while (opts.length < 4 && guard++ < 20) { var extra = intToIp((s.network + rand(1, 3) * s.total) >>> 0); if (type === 'hosts') extra = (s.usable + rand(2, 60)).toLocaleString(); if (opts.indexOf(extra) === -1) opts.push(extra); }
    $('nq-q').textContent = q;
    var box = $('nq-opts'); box.textContent = '';
    shuffle(opts).forEach(function (o) {
      var b = el('button', 'qz__opt', o); b.type = 'button';
      b.addEventListener('click', function () {
        if (nq.answered) return;
        nq.answered = true;
        var ok = o === right;
        box.querySelectorAll('button').forEach(function (x) { x.disabled = true; if (x.textContent === right) x.classList.add('is-right'); });
        if (!ok) b.classList.add('is-wrong');
        if (ok) { nq.streak++; nq.score += 10 * nq.streak; } else nq.streak = 0;
        $('nq-score').textContent = nq.score; $('nq-streak').textContent = nq.streak;
        $('nq-exp').textContent = (ok ? 'Correct! ' : 'Answer: ' + right + '. ') + '/' + prefix + ' = mask ' + intToIp(s.mask) + ', ' + s.total.toLocaleString() + ' addresses per subnet.';
        if (ok && nq.streak % 5 === 0) confetti($('nq-opts').parentNode);
      });
      box.appendChild(b);
    });
  }
  if ($('net-form')) {
    $('net-in').value = randomCidr();
    $('net-form').addEventListener('submit', function (e) { e.preventDefault(); renderSubnet(); });
    $('net-random').addEventListener('click', function () { $('net-in').value = randomCidr(); renderSubnet(); });
    $('net-split').addEventListener('change', renderSplit);
    $('nq-next').addEventListener('click', nqQuestion);
    renderSubnet();
    nqQuestion();
  }

  /* =====================================================================
     TASK BOARD
     ===================================================================== */
  var TB_KEY = 'pg_tasks_v2';
  var COLS = ['todo', 'doing', 'done'];
  var POOL = [
    ['Design MySQL schema for orders & inventory', 'high'], ['Build REST endpoints for product sync', 'high'],
    ['Integrate Stripe checkout with Laravel Cashier', 'medium'], ['Add RBAC roles for admin, manager, staff', 'medium'],
    ['Set up CI/CD pipeline and deploy to AWS', 'high'], ['Write API documentation', 'low'],
    ['Add Redis cache for product listings', 'medium'], ['Fix N+1 queries on the orders page', 'high'],
    ['Connect Twilio IVR for support line', 'medium'], ['Add Google Maps radius search', 'medium'],
    ['Configure firewall rules on new server', 'high'], ['Set up nightly database backups', 'high'],
    ['Add queue worker for eBay order sync', 'medium'], ['Write feature tests for checkout', 'medium'],
    ['Build Vue.js dashboard charts', 'low'], ['Add rate limiting to public API', 'high'],
    ['Translate emails to Hindi', 'low'], ['Optimize images with lazy loading', 'low'],
    ['Add webhook retries with backoff', 'medium'], ['Review pull request #42', 'low']
  ];
  function seedBoard() {
    var picks = sample(POOL, 7), cols = shuffle(['done', 'done', 'doing', 'doing', 'todo', 'todo', 'todo']);
    return picks.map(function (p, i) { return { id: i + 1, title: p[0], priority: p[1], col: cols[i] }; });
  }
  var tasks = store.get(TB_KEY, null) || seedBoard();
  var filter = 'all', query = '', dragId = null;
  function save() { store.set(TB_KEY, tasks); }
  function nextId() { return tasks.reduce(function (m, t) { return Math.max(m, t.id); }, 0) + 1; }
  function setCol(t, col) {
    var was = t.col; t.col = col; save(); renderTasks();
    if (col === 'done' && was !== 'done') {
      confetti($('tb-board'));
      if (tasks.length && tasks.every(function (x) { return x.col === 'done'; })) $('tb-progress').textContent = 'Everything shipped! 🎉';
    }
  }
  function move(id, dir) {
    var t = tasks.find(function (x) { return x.id === id; });
    if (!t) return;
    var i = COLS.indexOf(t.col) + dir;
    if (i < 0 || i >= COLS.length) return;
    setCol(t, COLS[i]);
  }
  function renderTasks() {
    var board = $('tb-board');
    if (!board) return;
    COLS.forEach(function (col) {
      var colEl = board.querySelector('[data-col="' + col + '"]');
      var list = colEl.querySelector('.tb__list');
      list.textContent = '';
      var items = tasks.filter(function (t) {
        return t.col === col && (filter === 'all' || t.priority === filter) && (!query || t.title.toLowerCase().indexOf(query) !== -1);
      });
      colEl.querySelector('.cnt').textContent = items.length;
      if (!items.length) list.appendChild(el('li', 'tb__empty', col === 'done' ? 'Nothing finished yet' : 'Drop tasks here'));
      items.forEach(function (t) {
        var li = el('li', 'tb__card' + (col === 'done' ? ' is-done' : ''));
        li.draggable = true; li.dataset.id = t.id;
        li.appendChild(el('span', 'prio prio--' + t.priority, t.priority));
        li.appendChild(el('p', 'tb__title', t.title));
        var actions = el('div', 'tb__actions');
        function mk(label, txt, cls, fn, disabled) {
          var b = el('button', 'tb__btn' + (cls ? ' ' + cls : ''), txt); b.type = 'button'; b.title = label;
          b.setAttribute('aria-label', label + ': ' + t.title); b.disabled = !!disabled;
          b.addEventListener('click', fn); actions.appendChild(b);
        }
        mk('Move left', '←', '', function () { move(t.id, -1); }, col === 'todo');
        mk('Move right', '→', '', function () { move(t.id, 1); }, col === 'done');
        mk('Delete', '×', 'tb__btn--del', function () { tasks = tasks.filter(function (x) { return x.id !== t.id; }); save(); renderTasks(); });
        li.appendChild(actions);
        li.addEventListener('dragstart', function (e) { dragId = t.id; li.classList.add('is-drag'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(t.id)); } catch (x) {} });
        li.addEventListener('dragend', function () { dragId = null; li.classList.remove('is-drag'); });
        list.appendChild(li);
      });
    });
    var done = tasks.filter(function (t) { return t.col === 'done'; }).length;
    var pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
    $('tb-bar').style.width = pct + '%';
    $('tb-progress').textContent = tasks.length ? done + ' of ' + tasks.length + ' done (' + pct + '%)' : 'No tasks yet. Add one!';
  }
  if ($('tb-board')) {
    $('tb-board').querySelectorAll('.tb__col').forEach(function (colEl) {
      colEl.addEventListener('dragover', function (e) { if (dragId != null) { e.preventDefault(); colEl.classList.add('is-over'); } });
      colEl.addEventListener('dragleave', function (e) { if (!colEl.contains(e.relatedTarget)) colEl.classList.remove('is-over'); });
      colEl.addEventListener('drop', function (e) {
        e.preventDefault(); colEl.classList.remove('is-over');
        var t = tasks.find(function (x) { return x.id === dragId; });
        if (t && t.col !== colEl.dataset.col) setCol(t, colEl.dataset.col);
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
    $('tb-random').addEventListener('click', function () {
      var titles = tasks.map(function (t) { return t.title; });
      var free = POOL.filter(function (p) { return titles.indexOf(p[0]) === -1; });
      var p = free.length ? pick(free) : pick(POOL);
      tasks.push({ id: nextId(), title: p[0], priority: p[1], col: 'todo' });
      save(); renderTasks();
    });
    $('tb-search').addEventListener('input', function (e) { query = e.target.value.trim().toLowerCase(); renderTasks(); });
    document.querySelectorAll('#panel-tasks .seg button').forEach(function (b) {
      b.addEventListener('click', function () { filter = b.dataset.filter; setSeg(b.parentNode, b); renderTasks(); });
    });
    $('tb-clear').addEventListener('click', function () { tasks = tasks.filter(function (t) { return t.col !== 'done'; }); save(); renderTasks(); });
    $('tb-reset').addEventListener('click', function () { tasks = seedBoard(); save(); renderTasks(); });
    renderTasks();
  }
})();
