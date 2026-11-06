// STOLBASZ — drobna interaktywność (nav mobile + reveal)
(function () {
  // mobilne menu
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { links.classList.remove('open'); });
    });
  }

  // reveal przy scrollu
  var els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach(function (el) { el.classList.add('in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach(function (el) { io.observe(el); });
  // od razu pokaż to, co jest w pierwszym ekranie (hero/intro) — nie czekaj na próg observera.
  // (hero bywa WYŻSZE niż viewport i nigdy nie osiąga 12% swojej powierzchni → zostawało puste do scrolla)
  requestAnimationFrame(function () {
    els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.9 && r.bottom > 0) { el.classList.add('in'); io.unobserve(el); }
    });
  });

  // BEZPIECZNIKI (audyt 09.08 TOP#1, wzór: rdzeń stron docelowych, lekcja 2026-08-06-011):
  // w karcie otwartej w tle IntersectionObserver bywa uśpiony i sekcje zostają NIEWIDOCZNE.
  // Dosłaniamy to, co jest w kadrze, na scroll/resize/powrót do karty + jeden tani timer.
  // CELOWO bez twardego "odsłoń wszystko po 3,5 s" jak w rdzeniu: zabiłby scrollowe animacje
  // (warstwa ruchu = element premium dem), a nasłuch przewijania i tak domyka tę samą lukę.
  var odslonWidoczne = function () {
    els.forEach(function (el) {
      if (el.classList.contains('in')) return;
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 1.15 && r.bottom > -40) { el.classList.add('in'); io.unobserve(el); }
    });
  };
  window.addEventListener('scroll', odslonWidoczne, { passive: true });
  window.addEventListener('resize', odslonWidoczne, { passive: true });
  document.addEventListener('visibilitychange', odslonWidoczne);
  setTimeout(odslonWidoczne, 900);
})();

// nav kondensuje się po przewinięciu (cienka linia + niższy pasek) — addytywne, lekkie
(function () {
  var nav = document.querySelector('.nav') || document.querySelector('header');
  if (!nav) return;
  var ticking = false;
  function upd() { nav.classList.toggle('is-stuck', window.scrollY > 24); ticking = false; }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(upd); }
  }, { passive: true });
  upd();
})();
// LICZNIK WAŻNOŚCI DEMA (K. 09.08: pełne odliczanie dni/godzin/minut/sekund).
// Element wstrzykuje multipage TYLKO w dema. Nie wita klienta przy wejściu - wjeżdża
// po zejściu z pierwszego ekranu i chowa się po powrocie na górę.
(function () {
  var el = document.querySelector('.demo-wazne');
  if (!el || !el.getAttribute('data-do')) return;
  var koniec = new Date(el.getAttribute('data-do') + 'T23:59:59');
  if (isNaN(koniec)) return;
  var txt = el.querySelector('.dw-txt') || el;
  var dwa = function (n) { return (n < 10 ? '0' : '') + n; };

  var cykl = parseInt(el.getAttribute('data-cykl') || '0', 10);   // dni; 0 = brak wznowienia
  function tyka() {
    var teraz = new Date(), ms = koniec - teraz;
    // po wygaśnięciu licznik rusza od nowa (K. 10.08) - dema i tak zostają, a odliczanie
    // ma dawać klientowi realne poczucie, że sprawa ma termin.
    while (ms <= 0 && cykl > 0) {
      koniec = new Date(koniec.getTime() + cykl * 86400000);
      ms = koniec - teraz;
    }
    if (ms <= 0) { txt.innerHTML = 'Wersja pokazowa wygasła'; el.classList.add('is-koniec'); return false; }
    var s = Math.floor(ms / 1000), d = Math.floor(s / 86400);
    var g = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sek = s % 60;
    var zegar = dwa(g) + ':' + dwa(m) + ':' + dwa(sek);
    txt.innerHTML = d > 0
      ? 'Wersja pokazowa · <b>' + d + ' dni</b> <span class="dw-zeg">' + zegar + '</span>'
      : 'Wersja pokazowa · <b class="dw-pilne">' + zegar + '</b>';
    el.classList.toggle('is-pilne', d === 0);
    return true;
  }
  if (tyka() !== false) setInterval(tyka, 1000);
  el.hidden = false;

  var tick = false;
  function stan() {
    el.classList.toggle('is-on', (window.scrollY || 0) > window.innerHeight * 0.55);
    tick = false;
  }
  window.addEventListener('scroll', function () {
    if (tick) return; tick = true; requestAnimationFrame(stan);
  }, { passive: true });
  stan();
})();


/* === DOLNY PASEK MOBILE: chowa się przy stopce ===
   Lekcja 13.08.2026 (Zielony Azymut): klient zgłosił, że pasek „Zapytaj o termin"
   zasłania treść na dole strony. Rezerwę pod treścią daje CSS (razem z safe-area
   iPhone'a), a tu drugie zabezpieczenie: gdy w kadrze jest stopka albo sekcja CTA
   — czyli te same przyciski — pasek zjeżdża w dół i wraca po odjechaniu w górę.
   Brak IntersectionObserver = pasek zostaje widoczny, czyli stan sprzed zmiany. */
(function () {
  try {
    var pasek = document.querySelector('.sticky-reserve, .sticky-call');
    if (!pasek || !('IntersectionObserver' in window)) return;
    var cele = document.querySelectorAll('footer, .cta');
    if (!cele.length) return;
    var widoczne = 0;
    var io = new IntersectionObserver(function (wpisy) {
      wpisy.forEach(function (w) { widoczne += w.isIntersecting ? 1 : -1; });
      if (widoczne < 0) widoczne = 0;
      pasek.classList.toggle('schowany', widoczne > 0);
    }, { threshold: 0.01 });
    cele.forEach(function (el) { io.observe(el); });
  } catch (e) {}
})();

/* === licznik otwarć demo (buy-signal) v3 — geo po stronie serwera === */
(function(){try{if(String(location.protocol).indexOf('http')!==0)return;try{if(/[?&#]team=1/.test(location.search+location.hash)){localStorage.setItem('nb_team','1');}}catch(e){}try{if(localStorage.getItem('nb_team')==='1')return;}catch(e){}if(/crm-newbeginning|crm\.impulseo\.pl/.test(document.referrer||''))return;try{if(navigator.webdriver)return;}catch(e){}try{if(/^https?:\/\/(kris20032|impulseo-pl)\.github\.io\/?$/i.test(document.referrer||''))return;}catch(e){}if(sessionStorage.getItem('_dv'))return;sessionStorage.setItem('_dv','1');var seg=(location.pathname.split('/').filter(Boolean)[0])||'';var base=location.origin+(seg?('/'+seg):'');var ua='';try{ua=(navigator.userAgent||'').slice(0,300);}catch(e){}var EP='https://zngfubfinbojfgaxdrbf.supabase.co/functions/v1/demo-view';try{fetch(EP,{method:'POST',keepalive:true,headers:{'Content-Type':'text/plain'},body:JSON.stringify({demo_url:base,page:location.pathname,referrer:(document.referrer||null),user_agent:(ua||null)})}).catch(function(){});}catch(e){}}catch(e){}})();

/* === stopklatka: tło przyszpilone tylko wtedy, gdy sekcja jest blisko kadru (iVolty 06.11) === */
(function () {
  var s = document.querySelectorAll('.stopklatka');
  if (!s.length) return;
  if (!('IntersectionObserver' in window)) { s.forEach(function (el) { el.classList.add('vis'); }); return; }
  var io = new IntersectionObserver(function (w) {
    w.forEach(function (e) { e.target.classList.toggle('vis', e.isIntersecting); });
  }, { rootMargin: '200px 0px 200px 0px' });
  s.forEach(function (el) { io.observe(el); });
})();
