(function () {
  var root = document.documentElement;

  // Theme toggle
  var toggle = document.getElementById('theme-toggle');
  function currentTheme() {
    var t = root.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  toggle.addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  // Mobile menu
  var burger = document.getElementById('nav-burger');
  var links = document.getElementById('nav-links');
  burger.addEventListener('click', function () {
    var open = links.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
  });
  links.addEventListener('click', function (e) {
    if (e.target.closest('a')) {
      links.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });

  // Nav border on scroll
  var nav = document.querySelector('.nav');
  function onScroll() { nav.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Reveal on scroll + active nav link
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });

    var navMap = {};
    links.querySelectorAll('a[href^="#"]').forEach(function (a) { navMap[a.getAttribute('href').slice(1)] = a; });
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && navMap[en.target.id]) {
          Object.keys(navMap).forEach(function (k) { navMap[k].classList.remove('is-active'); });
          navMap[en.target.id].classList.add('is-active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach(function (s) { so.observe(s); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-visible'); });
  }

  // Role rotator
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var rot = document.getElementById('rotator');
  var roles = ['Laravel & PHP', 'Vue.js & React', 'REST APIs & MySQL', 'Linux servers & networking', 'AWS & CI/CD'];
  if (rot && !reduce) {
    var i = 0;
    setInterval(function () {
      i = (i + 1) % roles.length;
      rot.textContent = roles[i];
    }, 2400);
  }

  // Copy email
  var copyBtn = document.getElementById('copy-email');
  var toast = document.getElementById('toast');
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('is-visible');
    setTimeout(function () { toast.classList.remove('is-visible'); }, 2000);
  }
  copyBtn.addEventListener('click', function () {
    var email = copyBtn.getAttribute('data-email');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(email).then(function () { showToast('Email copied'); }, function () { showToast(email); });
    } else {
      showToast(email);
    }
  });

  // Year
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();

/*
 * Live experience counters.
 *   data-since="YYYY-MM"        -> "3 yrs 10 mos" (or "3 years 10 months" with data-format="long")
 *   data-years-since="YYYY-MM"  -> whole years, e.g. "4"
 * Used for the current job (Zasya Solutions). When a new job is added, change the
 * old one to a fixed duration and put data-since on the new one.
 */
(function () {
  function monthsSince(ym) {
    var p = ym.split('-'), y = +p[0], m = +p[1];
    var now = new Date();
    return Math.max(0, (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m));
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  document.querySelectorAll('[data-since]').forEach(function (el) {
    var total = monthsSince(el.getAttribute('data-since'));
    var y = Math.floor(total / 12), m = total % 12;
    var long = el.getAttribute('data-format') === 'long';
    var parts = [];
    if (y) parts.push(plural(y, long ? 'year' : 'yr', long ? 'years' : 'yrs'));
    if (m || !y) parts.push(plural(m, long ? 'month' : 'mo', long ? 'months' : 'mos'));
    el.textContent = parts.join(' ');
  });
  document.querySelectorAll('[data-years-since]').forEach(function (el) {
    el.textContent = Math.floor(monthsSince(el.getAttribute('data-years-since')) / 12);
  });
})();
