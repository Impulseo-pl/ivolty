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

// Pasek nawigacji: rezerwa miejsca pod CTA odpiete absolutnie na prawo (K. 05.08.2026).
// Rezerwa byla STALA (12rem = 192px), a przycisk rosnie razem z numerem telefonu
// ("Zadzwon +48 730 696 616" = 230px) - wtedy "Kontakt" wchodzil na ramke przycisku.
// Liczymy ja z realnej szerokosci przycisku, wiec dziala dla kazdej dlugosci numeru i nazwy.
(function () {
  var links = document.querySelector('.nav-links');
  var cta = links && links.querySelector('a.btn-accent');
  if (!links || !cta) return;
  function upd() {
    if (window.innerWidth <= 680) { links.style.paddingRight = ''; return; }  // mobile: CTA jest w flow
    var w = cta.getBoundingClientRect().width;
    if (w) links.style.paddingRight = Math.ceil(w + 32) + 'px';
  }
  upd();
  window.addEventListener('resize', upd, { passive: true });
  window.addEventListener('load', upd);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(upd);  // font zmienia szerokosc
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

/* === rodzina: fachowcy === */
/* === rodzina FACHOWCY ===
   TYLKO suwak PRZED/PO (before/after). NAV NIE chowa się (auto-hide) - telefon-CTA ma być ZAWSZE widoczny (decyzja FAZA 3).
   is-stuck (przezroczysty->cień) obsługuje base.js. */
(function () {
  var sliders = document.querySelectorAll('[data-ba]');
  if (!sliders.length) return;
  sliders.forEach(function (s) {
    var dragging = false;
    function setPos(clientX) {
      var r = s.getBoundingClientRect();
      var p = ((clientX - r.left) / r.width) * 100;
      p = Math.max(3, Math.min(97, p));
      s.style.setProperty('--ba-pos', p + '%');
    }
    function down(e) { dragging = true; setPos(e.touches ? e.touches[0].clientX : e.clientX); }
    function move(e) { if (dragging) setPos(e.touches ? e.touches[0].clientX : e.clientX); }
    function up() { dragging = false; }
    s.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up);
    s.addEventListener('touchstart', down, { passive: true });
    s.addEventListener('touchmove', move, { passive: true });
    s.addEventListener('touchend', up);
  });
})();

/* === NAV NOBU kontroler (silnik) === */
(function () {
  var nav = document.querySelector('.nav');
  if (!nav) return;
  var last = window.scrollY || 0, TOP = 8, TH = 6, ticking = false;
  function upd() {
    var y = window.scrollY || 0;
    if (y <= TOP) { nav.classList.remove('nav-hidden', 'nav-solid'); last = y; ticking = false; return; }
    var d = y - last;
    if (Math.abs(d) <= TH) { ticking = false; return; }
    if (d > 0) nav.classList.add('nav-hidden');
    else { nav.classList.remove('nav-hidden'); nav.classList.add('nav-solid'); }
    last = y; ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; window.requestAnimationFrame(upd); } }, { passive: true });
  upd();
})();

/* === MOTION LAYER v2 (silnik) === */
/* ============================================================
   MOTION LAYER v2 — logika ruchu (2026-07-26). Para do motion.css.
   ------------------------------------------------------------
   FILOZOFIA BEZPIECZEŃSTWA: ten plik może paść w całości i strona ma dalej
   wyglądać jak przed nim. Dlatego:
     - klasę `mt-on` (która dopiero WŁĄCZA stany początkowe w CSS) dodajemy
       na samym KOŃCU udanej inicjalizacji, w try/catch,
     - każdy podział tekstu zapamiętuje oryginalny HTML i cofa go przy błędzie,
     - watchdog po 2.5 s odsłania wszystko, co widać na ekranie (gdyby
       IntersectionObserver z jakiegoś powodu nie zadziałał).
   Nie dotykamy hero-obrazu ani niczego w pierwszej sekcji — hero rusza się
   wyłącznie tekstem (zakaz ruchu geometrycznego na .hero-cine>img).
   ============================================================ */
(function () {
  'use strict';

  var docEl = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;                       // user woli spokój — zero ruchu
  if (!('IntersectionObserver' in window)) return;

  var STEP = 0.09;                          // odstęp między liniami nagłówka (s)

  /* ---------- pomocnicze ---------- */
  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function firstScreen(el) {                // czy element leży w sekcji-hero (nie ruszamy)
    return !!el.closest('header, .nav, section:first-of-type, .hero-cine, .pagehead, [class*="hero"]');
  }

  /* ---------- 1) NAGŁÓWKI: podział na realne linie ----------
     Mierzymy pozycję każdego słowa po złamaniu tekstu, grupujemy słowa o tym
     samym offsetTop w jedną linię i owijamy w maskę. Robione PO załadowaniu
     fontów — inaczej linie policzyłyby się dla fontu zastępczego. */
  function splitLines(el) {
    if (!el || el.dataset.mtDone) return false;
    var raw = el.innerHTML;
    var txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
    // złożony markup (span z akcentem, link, ikona) albo bardzo długi tekst → prostszy wariant
    // 27.07.2026: dopisane em,b,strong,i,mark - hero fachowców ma akcent w H1 jako <em>,
    // a splitLines przepisywał nagłówek z samego textContent i kasował ten znacznik
    // (akcent po cichu znikał - wyglądało jak martwy CSS). Zgodne z intencją reguły wyżej.
    if (!txt || txt.length > 180 || el.querySelector('img,svg,a,button,picture,span,small,br,em,b,strong,i,mark')) return false;
    try {
      var words = txt.split(' ');
      el.textContent = '';
      words.forEach(function (w, i) {
        var s = document.createElement('i');
        s.className = 'mt-w';
        s.style.fontStyle = 'inherit';
        s.style.display = 'inline-block';
        s.textContent = w;
        el.appendChild(s);
        if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      });
      // grupowanie po pozycji pionowej = realne linie po złamaniu
      var lines = [], last = null;
      all('.mt-w', el).forEach(function (w) {
        var top = w.offsetTop;
        if (last === null || Math.abs(top - last) > 4) { lines.push([]); last = top; }
        lines[lines.length - 1].push(w.textContent);
      });
      if (!lines.length) throw new Error('brak linii');
      el.textContent = '';
      lines.forEach(function (words2, i) {
        var line = document.createElement('span');
        line.className = 'mt-line';
        var inner = document.createElement('i');
        inner.textContent = words2.join(' ');
        inner.style.setProperty('--mt-d', (i * STEP).toFixed(2) + 's');
        line.appendChild(inner);
        el.appendChild(line);
      });
      el.classList.add('mt-lines');
      el.dataset.mtDone = '1';
      return true;
    } catch (e) {
      el.innerHTML = raw;                   // awaria → oryginalny nagłówek wraca
      return false;
    }
  }

  function prepHeadings() {
    // h1 pierwszego ekranu (hero) — jedyny ruch, jaki hero dostaje
    var h1 = document.querySelector('section h1, header h1, .hero h1, .hero-cine h1');
    if (h1 && !splitLines(h1)) { h1.classList.add('mt-fade'); }
    if (h1) { requestAnimationFrame(function () { h1.classList.add('mt-in'); }); }

    // nagłówki sekcji — wchodzą, gdy sekcja pojawia się w oknie
    var heads = all('.head h2').filter(function (h) { return !firstScreen(h); });
    heads.forEach(function (h) { if (!splitLines(h)) h.classList.add('mt-fade'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('mt-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
    heads.forEach(function (h) { io.observe(h); });
    // cokolwiek jest już widoczne — pokaż od razu (nie czekaj na scroll)
    requestAnimationFrame(function () {
      heads.forEach(function (h) {
        var r = h.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.92 && r.bottom > 0) { h.classList.add('mt-in'); io.unobserve(h); }
      });
    });
  }

  /* ---------- 2) ZDJĘCIA: kurtyna + zoom-out, parallax na kaflach ---------- */
  var HOSTS_SEL = '.tile, .gateway, .split-art, .svc-row-art, .g-fig, .doc-fig, .art-fig, .zespol-card figure, .m-tile';
  function prepPhotos() {
    var HOSTS = HOSTS_SEL;
    all(HOSTS).forEach(function (host) {
      if (firstScreen(host)) return;                       // hero/pagehead zostają nietknięte (LCP)
      var img = host.querySelector(':scope > img, :scope > picture > img');
      if (!img) return;
      host.classList.add('mt-ph');
      // parallax tylko tam, gdzie kadr ma stałą wysokość (kafle bento, bramy) —
      // w masonry (height:auto) rozjechałby układ
      if ((host.classList.contains('tile') && host.closest('.gallery')) || host.classList.contains('gateway')) {
        host.classList.add('mt-para');
      }
      host.setAttribute('data-dir', kierunekKurtyny(host, img));
      // element bez .reveal nie dostanie klasy .in od base.js → własny obserwator
      if (!host.classList.contains('reveal') && !host.closest('.reveal')) {
        phIO.observe(host);
      }
    });
  }

  /* KIERUNEK KURTYNY (29.07.2026) — wynika Z UKŁADU, nigdy z losowania.
     Losowy kierunek = ta sama sekcja zachowuje się inaczej po powrocie na stronę; deterministyczny
     daje różnorodność, a mimo to jest powtarzalny i spójny w obrębie jednej sceny.
     Reguły (opis „dlaczego" w motion.css, sekcja 3b):
       zdjęcie obok tekstu  → poziomo, od strony tekstu ku zdjęciu
       kafel w siatce       → lustrzanie wg kolumny (lewa od lewej, prawa od prawej, środek pionowo)
       pojedyncze zdjęcie   → pionowo, zgodnie z przewijaniem
     Kadry bardzo wysokie (pion) zostawiamy pionowo — pozioma kurtyna na wąskim kadrze
     przelatuje w kilka pikseli i gubi się. */
  function kierunekKurtyny(host, img) {
    try {
      var r = host.getBoundingClientRect();
      if (r.width && r.height && r.height / r.width > 1.45) return 'up';   // wysoki kadr → tylko pionowo

      // 1) zdjęcie w parze z tekstem: split / wiersz oferty / artykuł
      var para = host.closest('.split, .svc-row, .art-row, .about-split, .zespol-card');
      if (para && para !== host) {
        var pr = para.getBoundingClientRect();
        var srodekZdjecia = r.left + r.width / 2;
        var srodekBloku = pr.left + pr.width / 2;
        // zdjęcie po PRAWEJ (tekst po lewej) → kurtyna jedzie w prawo, za wzrokiem
        return srodekZdjecia >= srodekBloku ? 'right' : 'left';
      }

      // 2) kafel w siatce: kolumna decyduje — siatka „otwiera się" na zewnątrz
      var siatka = host.parentElement;
      if (siatka) {
        var bracia = Array.prototype.filter.call(siatka.children, function (c) {
          return c.querySelector && (c.matches(HOSTS_SEL) || c.querySelector('img'));
        });
        if (bracia.length >= 3) {
          var lewe = [], prawe = [];
          bracia.forEach(function (b) {
            var br = b.getBoundingClientRect();
            lewe.push(br.left); prawe.push(br.right);
          });
          var minL = Math.min.apply(null, lewe), maxR = Math.max.apply(null, prawe);
          var szer = maxR - minL;
          if (szer > 0) {
            var wzgledny = (r.left + r.width / 2 - minL) / szer;   // 0 = skraj lewy, 1 = skraj prawy
            if (wzgledny < 0.36) return 'right';
            if (wzgledny > 0.64) return 'left';
            return 'up';
          }
        }
      }
    } catch (e) { /* przy jakimkolwiek problemie zostaje domyślne pionowe */ }
    return 'up';
  }
  var phIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('mt-in'); phIO.unobserve(e.target); }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });

  /* ---------- 3) STAGGER: kolejne elementy siatki wchodzą po sobie ---------- */
  function prepStagger() {
    var groups = {};
    all('.reveal').forEach(function (el) {
      var p = el.parentElement;
      if (!p) return;
      var key = p;
      if (!groups.k) groups.k = [];
      if (groups.k.indexOf(key) === -1) groups.k.push(key);
    });
    (groups.k || []).forEach(function (parent) {
      var kids = Array.prototype.filter.call(parent.children, function (c) { return c.classList.contains('reveal'); });
      if (kids.length < 2) return;
      kids.forEach(function (k, i) { k.style.setProperty('--i', Math.min(i, 7)); });
    });
  }

  /* ---------- 4) LICZBY: doliczanie od zera przy wejściu w ekran ----------
     Tylko czyste liczby (z opcjonalnym +, %, przecinkiem) — nigdy nie ruszamy
     tekstu typu „od 2011" w sposób, który zmieniłby jego treść. */
  function prepCounters() {
    // Klasy liczb-statystyk używane przez generator (per rodzina):
    //   .tb-num  fachowcy · .ds-num  dom · .kt-num  klinika · .num  pasek faktów (base)
    // ⛔ NIE ruszamy .hf-phone-num (to NUMER TELEFONU — animowanie go byłoby wpadką)
    // ani .pno (numery kroków procesu: 01, 02, 03 — to numeracja, nie statystyka).
    var DIRECT = '.tb-num, .ds-num, .kt-num, .num';
    var SCOPE = '.strip, .trust-band, .trust-grid, .spec-band, .stats, .tb-stats, .dom-stats, .kt-stats';
    var nodes = [];
    var cand = all(DIRECT).filter(function (el) {
      return !el.classList.contains('hf-phone-num') && !el.classList.contains('pno') && !el.children.length;
    });
    all(SCOPE).forEach(function (box) {
      all('b, strong, dt', box).forEach(function (el) { if (cand.indexOf(el) === -1) cand.push(el); });
    });
    cand.forEach(function (el) {
      var t = (el.textContent || '').trim();
      var m = t.match(/^(\d{1,6})([.,]\d{1,2})?(\s*)([+%a-zA-Zł]{0,3})$/);
      if (!m) return;
      if (/^0\d/.test(m[1])) return;                       // „01"-„09" = numeracja kroków, nie statystyka (audyt 09.08 TOP#15)
      if (el.closest && el.closest('.ap-no, .dp-no, .num, ol')) return;  // numery kroków oferty/procesu zostają w spokoju
      var val = parseFloat(m[1] + (m[2] ? '.' + m[2].slice(1) : ''));
      if (!isFinite(val) || val <= 0 || val > 100000) return;
      if (val > 1900 && val < 2100) return;                // rok („od 2011") — nie animujemy
      el.dataset.mtTo = String(val);
      el.dataset.mtDec = m[2] ? String(m[2].length - 1) : '0';
      el.dataset.mtSuf = (m[3] ? ' ' : '') + (m[4] || '');  // spacja przed jednostką ZOSTAJE („15 lat", nie „15lat")
      el.classList.add('mt-num');
      nodes.push(el);
    });
    if (!nodes.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        runCount(e.target);
      });
    }, { threshold: 0.4 });
    nodes.forEach(function (n) { io.observe(n); });
  }
  function runCount(el) {
    var to = parseFloat(el.dataset.mtTo), dec = parseInt(el.dataset.mtDec, 10) || 0, suf = el.dataset.mtSuf || '';
    var dur = 1100, t0 = null;
    function frame(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      var v = (to * eased).toFixed(dec).replace('.', ',');
      el.textContent = v + suf;
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = to.toFixed(dec).replace('.', ',') + suf;
    }
    requestAnimationFrame(frame);
  }

  /* ---------- 4b) ŻYWY NAGŁÓWEK — przenikanie kadrów ----------
     Kadry podaje silnik w atrybucie data-rotate (nasza biblioteka branżowa, nie klient).
     ⛔ ZERO skalowania i przesuwania — zmienia się WYŁĄCZNIE przezroczystość, bo to
     skalowanie bitmapy dawało migotanie na teksturach (3x zgłoszenie Szymona).
     Idiotoodporność: dodatkowe kadry dociągamy DOPIERO po pełnym załadowaniu strony
     (zero wpływu na szybkość wejścia), a rotacja startuje dopiero, gdy kadr faktycznie
     się wczytał. Cokolwiek zawiedzie — zostaje zwykłe, statyczne zdjęcie jak dotąd. */
  /* ⛔ BRAMKA OSZCZĘDNOŚCIOWA (27.07 — zgłoszenie „zamula demo").
     Rotacja to jedyny element warstwy, który dociąga DANE (2 kadry ≈ 0,4-0,5 MB). Sam kod
     warstwy waży 23 KB i jest bez znaczenia, ale te zdjęcia na telefonie w słabym zasięgu
     realnie mielą w tle. Dlatego kadry lecą TYLKO tam, gdzie są za darmo:
     - telefon (<900px) → NIE (hero jest mały, efektu prawie nie widać, koszt ten sam),
     - tryb oszczędzania danych albo 2G/3G → NIE,
     - słaby sprzęt (≤2 GB RAM) → NIE (przełączanie pełnoekranowej bitmapy go dławi).
     Bez rotacji strona wygląda dokładnie jak dotąd — hero po prostu stoi. */
  function rotacjaOplacalna() {
    try {
      if (window.matchMedia && !window.matchMedia('(min-width: 900px)').matches) return false;
      var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (c) {
        if (c.saveData) return false;
        if (/(^|-)2g$|^3g$/.test(c.effectiveType || '')) return false;
      }
      if (navigator.deviceMemory && navigator.deviceMemory <= 2) return false;
    } catch (e) { /* stara przeglądarka — puszczamy dalej */ }
    return true;
  }

  function prepHeroRotation() {
    var host = document.querySelector('img[data-rotate]');
    if (!host) return;
    if (!rotacjaOplacalna()) return;
    var srcs = (host.getAttribute('data-rotate') || '').split('|').filter(Boolean);
    if (!srcs.length) return;
    var box = host.parentElement;
    if (!box) return;
    if (getComputedStyle(box).position === 'static') box.style.position = 'relative';

    var layers = [];
    // Kadry pobieramy PO KOLEI, nie wszystkie naraz — drugi rusza dopiero, gdy pierwszy jest
    // na miejscu. Dzięki temu nie ma jednego skoku transferu tuż po otwarciu strony.
    (function pobierzKolejny(n) {
      if (n >= srcs.length) return;
      var im = new Image();
      im.decoding = 'async';
      im.alt = '';
      // Warstwa przejmuje klasy zdjęcia-nagłówka (np. hg-bg w gastro), żeby dziedziczyć jego
      // wygląd i ewentualny delikatny zoom tła. Bez tego ruch „zacinałby się" przy zmianie kadru.
      im.className = ('mt-hero-layer ' + (host.className || '')).trim();
      im.onload = function () {
        box.insertBefore(im, host.nextSibling);
        layers.push(im);
        if (layers.length === 1) start();
        setTimeout(function () { pobierzKolejny(n + 1); }, 3000);
      };
      im.onerror = function () { pobierzKolejny(n + 1); };  // brak kadru = pomijamy, lecimy dalej
      im.src = srcs[n];
    })(0);

    function start() {
      var all = [host].concat(layers), i = 0;
      function krok() {
        if (document.hidden) return;                 // karta w tle — nie marnujemy baterii
        all = [host].concat(layers);
        if (all.length < 2) return;
        var prev = i; i = (i + 1) % all.length;
        all[i].classList.add('mt-show');
        all[prev].classList.remove('mt-show');
        if (all[prev] === host) host.classList.add('mt-under');
      }
      // PIERWSZA zmiana kadru SZYBCIEJ (K. 10.08): klient ma zobaczyć, że hero żyje, zanim
      // zdąży odejść - dopiero potem spokojny rytm co 6,5 s.
      setTimeout(function () { krok(); setInterval(krok, 6500); }, 2200);
    }
  }

  /* ---------- 5) MAGNETYCZNE CTA (tylko mysz, maks. 4 px) ---------- */
  function prepMagnetic() {
    if (!window.matchMedia || !window.matchMedia('(pointer: fine)').matches) return;
    all('.btn-accent, .btn-light').slice(0, 12).forEach(function (b) {
      b.addEventListener('mousemove', function (ev) {
        var r = b.getBoundingClientRect();
        var dx = (ev.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (ev.clientY - (r.top + r.height / 2)) / r.height;
        b.style.translate = (dx * 8).toFixed(1) + 'px ' + (dy * 5).toFixed(1) + 'px';
      });
      b.addEventListener('mouseleave', function () { b.style.translate = '0 0'; });
    });
  }

  /* ---------- 6) PASEK POSTĘPU (tylko gdy przeglądarka umie scroll-driven) ---------- */
  function prepProgress() {
    if (!(window.CSS && CSS.supports && CSS.supports('animation-timeline', 'scroll()'))) return;
    var bar = document.createElement('div');
    bar.className = 'mt-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
  }

  /* ---------- 7) WATCHDOG — nic nie ma prawa zostać niewidoczne ---------- */
  function watchdog() {
    var doslon = function () {
      all('.mt-ph, .mt-lines, .mt-fade').forEach(function (el) {
        if (el.classList.contains('mt-in')) return;
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) { el.classList.add('mt-in', 'in'); }
      });
    };
    setTimeout(doslon, 2500);
    // audyt 09.08 TOP#1: martwy IntersectionObserver (karta w tle) zostawiał elementy
    // poniżej pierwszego ekranu ukryte NA ZAWSZE — dosłaniamy też przy przewijaniu i powrocie do karty
    window.addEventListener('scroll', doslon, { passive: true });
    document.addEventListener('visibilitychange', doslon);
  }

  /* ---------- 7b) ZWALNIANIE WARSTW GPU PO ANIMACJI ----------
     `.reveal` z base.css ma stałe `will-change:opacity,transform` — przeglądarka trzyma dla
     każdego takiego elementu osobną warstwę w pamięci karty graficznej i NIGDY jej nie oddaje
     (~26 warstw na podstronę). Na komputerze ze słabszą grafiką to niepotrzebny stały koszt.
     Gdy przejście się skończy, dokładamy `mt-settled` → CSS zwalnia warstwę.
     Bez JS wszystko zostaje jak było — zero ryzyka.
     ⚠️ `transitionend` odpadł jako hak — sprawdzone: przy elementach poza ekranem zdarzenie
     w ogóle nie przychodzi (przeglądarka nie animuje tego, czego nie widać). Dlatego pilnujemy
     samej klasy `.in`: gdy element ją dostanie, po 1,6 s (dłużej niż najdłuższe przejście: 1,15 s)
     oddajemy warstwę. Obserwator rozłącza się sam, gdy wszystko już osiadło. */
  function prepGpuRelease() {
    var cele = all('.reveal, .mt-ph');
    if (!cele.length || !window.MutationObserver) return;
    var zostalo = cele.length;

    function osiadl(el) {
      if (el.classList.contains('mt-settled')) return;
      el.classList.add('mt-settled');
      if (--zostalo <= 0) obs.disconnect();
    }
    var obs = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        var el = m.target;
        if (el.classList && el.classList.contains('in') && !el.classList.contains('mt-settled')) {
          setTimeout(function () { osiadl(el); }, 1600);
        }
      });
    });
    cele.forEach(function (el) {
      obs.observe(el, { attributes: true, attributeFilter: ['class'] });
      if (el.classList.contains('in')) setTimeout(function () { osiadl(el); }, 1600);
    });
  }

  /* ---------- START ---------- */
  function init() {
    try {
      prepGpuRelease();
      prepStagger();
      prepPhotos();
      prepCounters();
      prepMagnetic();
      prepProgress();
      if (document.readyState === 'complete') prepHeroRotation();
      else addEventListener('load', prepHeroRotation);   // kadry dopiero po załadowaniu strony
      docEl.classList.add('mt-on');    // dopiero teraz CSS ukrywa stany startowe
      prepHeadings();                  // nagłówki po pomiarze (fonty gotowe)
      watchdog();
    } catch (e) {
      docEl.classList.remove('mt-on'); // cokolwiek padło → wracamy do wyglądu bazowego
    }
  }

  function boot() {
    if (document.fonts && document.fonts.ready) {
      var done = false;
      var go = function () { if (!done) { done = true; init(); } };
      document.fonts.ready.then(go);
      setTimeout(go, 1200);            // font nie doszedł → i tak startujemy
    } else { init(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();


/* === WARSTWA PREMIUM (silnik, 08.08.2026) === */
/* ============================================================
   OŚ PROCESU „PREMIUM" + POWRÓT NA GÓRĘ + WEJŚCIE NAZWY W HERO
   (08.08.2026 — wdrożenie decyzji K. z warsztatu ruchu II)

   ZASADA (ta sama co w motion.js): stan „ukryty" nadaje WYŁĄCZNIE ten skrypt,
   klasą na <html>. Gdy go zabraknie albo rzuci wyjątek — strona wygląda jak przed
   zmianą. Nigdy pusty ekran, nigdy niewidoczna treść.

   Każdy blok jest osobną funkcją w osobnym try — błąd w jednym NIE zabija reszty
   (wpadka z 08.08: własny kod w tym samym <script> co main.js przestał działać,
   bo wyjątek wyżej ubił cały blok).
   ============================================================ */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var safe = function (name, fn) { try { fn(); } catch (e) { /* jeden efekt mniej, strona działa */ } };

  /* ---------- 1) OŚ PROCESU ----------
     10.08.2026 — mechanika obsługuje KAŻDY kształt procesu, nie tylko pionową oś.
     Powód (zgłoszenie K. po demie Patris): licznik, pasek postępu i zapalanie kroków
     żyły wyłącznie w `.proces-os` (rodziny fachowcy/klinika/studio). Rodziny auto i dom
     mają WŁASNE kształty — poziomy rząd i wiersze katalogowe — i celowo mają je zachować
     (anty-bliźniak), więc to mechanika musi się dopasować do kształtu, a nie odwrotnie.
     Kroki wskazuje `[data-os-steps]`; przy układzie POZIOMYM (wszystkie kroki na jednej
     wysokości) postęp liczymy z przejścia CAŁEJ sekcji przez ekran, bo pojedyncze kroki
     nie mijają środka ekranu po kolei. ---------- */
  safe('os', function () {
    [].slice.call(document.querySelectorAll('.proces-os, .os-mech')).forEach(function (sec) {
      var items = [].slice.call(sec.querySelectorAll('[data-os-steps] > li'));
      if (!items.length) items = [].slice.call(sec.querySelectorAll('.proces-line > li'));
      if (items.length < 2) return;
      osSekcja(sec, items);
    });
  });

  function osSekcja(sec, items) {
    document.documentElement.classList.add('os-on');
    // kierunek wjazdu naprzemiennie — wynika z POZYCJI kroku, nie z losowania
    items.forEach(function (li, i) {
      li.style.setProperty('--os-dx', (i % 2 ? '-1.4rem' : '1.4rem'));
      li.style.setProperty('--os-i', i);   // opóźnienie kaskady w układzie poziomym (CSS)
    });

    var cur = sec.querySelector('.pc-cur'), bar = sec.querySelector('.proc-bar > i'), now = sec.querySelector('.proc-now');
    var titles = items.map(function (li) { var h = li.querySelector('h3'); return h ? h.textContent : ''; });
    // POZIOMY układ = wszystkie kroki startują na tej samej wysokości (rząd kart w rodzinie auto).
    // Mierzymy przy każdym przeliczeniu, bo na telefonie ten sam rząd zawija się w kolumnę.
    function poziomy() {
      var a = items[0].getBoundingClientRect(), b = items[items.length - 1].getBoundingClientRect();
      return Math.abs(a.top - b.top) < 40;
    }

    function upd() {
      var vh = window.innerHeight, mid = vh * 0.52, best = -1, bestD = Infinity;
      if (poziomy()) {
        // Rząd kart mija ekran w całości, więc kroki NIE mogą czekać na osobne przewinięcie —
        // po wejściu sekcji zapalają się wszystkie, kaskadą (opóźnienie per krok siedzi w CSS).
        // Inaczej klient widziałby przygaszone karty i czytał to jako usterkę, nie jako efekt.
        var rs = sec.getBoundingClientRect();
        if (rs.top < vh * 0.85) items.forEach(function (li) { li.classList.add('os-seen'); });
        // licznik i pasek nadal śledzą przewijanie — pokazują, gdzie w procesie jest czytelnik
        var p = (vh * 0.82 - rs.top) / Math.max(1, rs.height + vh * 0.30);
        p = Math.max(0, Math.min(1, p));
        best = Math.max(0, Math.min(items.length - 1, Math.floor(p * items.length)));
        if (rs.top > vh) best = -1;   // sekcja jeszcze pod ekranem — nic nie zapalamy
      } else {
        items.forEach(function (li, i) {
          var r = li.getBoundingClientRect();
          if (r.top < vh * 0.92) li.classList.add('os-seen');
          var d = Math.abs((r.top + r.height / 2) - mid);
          if (r.bottom > 0 && r.top < vh && d < bestD) { bestD = d; best = i; }
        });
      }
      items.forEach(function (li, i) {
        li.classList.toggle('os-live', i === best);
        li.classList.toggle('os-done', best > -1 && i < best);
      });
      if (best > -1) {
        var n = best + 1;
        if (cur) cur.textContent = (n < 10 ? '0' : '') + n;
        if (now) now.textContent = titles[best];
        if (bar) bar.style.width = (n / items.length * 100) + '%';
        // wypełnienie osi akcentem do ŚRODKA aktywnej kropki (premium: postęp widać na linii)
        try {
          var lin = sec.querySelector('.proces-line'), akt = items[best];
          if (lin && akt) {
            var rl = lin.getBoundingClientRect(), ra = akt.getBoundingClientRect();
            var pkt = (ra.top - rl.top) + Math.min(ra.height, 44) / 2 + 6;
            lin.style.setProperty('--os-fill', Math.max(0, Math.min(100, pkt / rl.height * 100)) + '%');
          }
        } catch (e) {}
      }
    }
    var ticking = false;
    function onScroll() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () { upd(); ticking = false; });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    // Przeliczenie po doładowaniu zdjęć: układ przesuwa się PO pierwszym pomiarze, a zdarzenie
    // przewijania wtedy nie leci — bez tego kroki potrafią zostać przygaszone mimo że są na ekranie.
    window.addEventListener('load', upd);
    [60, 400, 1200, 2500].forEach(function (t) { setTimeout(upd, t); });
    upd();
  }

  /* ---------- 2) POWRÓT NA GÓRĘ ---------- */
  safe('toTop', function () {
    var btn = document.createElement('button');
    btn.className = 'to-top';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Wróć na górę strony');
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    document.body.appendChild(btn);
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
    var t = false;
    function upd() {
      if (t) return; t = true;
      requestAnimationFrame(function () {
        btn.classList.toggle('show', window.scrollY > window.innerHeight * 1.2);
        t = false;
      });
    }
    window.addEventListener('scroll', upd, { passive: true });
    upd();
  });

  /* ---------- 3) WEJŚCIE NAZWY W HERO ----------
     Wariant „nazwa ustępuje miejsca" (wybór K. z warsztatu): nazwa wchodzi duża,
     po chwili siada do swojego rozmiaru i robi miejsce nagłówkowi sprzedażowemu. */
  safe('brand', function () {
    var bm = document.querySelector('.hero-cine .brandmark');
    if (!bm || reduce) return;
    document.documentElement.classList.add('bm-on');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { bm.classList.add('bm-in'); });
    });
    // Bezpiecznik czasowy: gdyby przejście nie wystartowało (np. karta w tle przy wejściu),
    // po sekundzie i tak odsłaniamy treść — nikt nigdy nie zobaczy pustego hero.
    setTimeout(function () { bm.classList.add('bm-in'); }, 1000);
  });
})();


/* === licznik otwarć demo (buy-signal) v3 — geo po stronie serwera === */
(function(){try{if(String(location.protocol).indexOf('http')!==0)return;try{if(/[?&#]team=1/.test(location.search+location.hash)){localStorage.setItem('nb_team','1');}}catch(e){}try{if(localStorage.getItem('nb_team')==='1')return;}catch(e){}if(/crm-newbeginning|crm\.impulseo\.pl/.test(document.referrer||''))return;try{if(navigator.webdriver)return;}catch(e){}try{if(/^https?:\/\/(kris20032|impulseo-pl)\.github\.io\/?$/i.test(document.referrer||''))return;}catch(e){}if(sessionStorage.getItem('_dv'))return;sessionStorage.setItem('_dv','1');var seg=(location.pathname.split('/').filter(Boolean)[0])||'';var base=location.origin+(seg?('/'+seg):'');var ua='';try{ua=(navigator.userAgent||'').slice(0,300);}catch(e){}var EP='https://zngfubfinbojfgaxdrbf.supabase.co/functions/v1/demo-view';try{fetch(EP,{method:'POST',keepalive:true,headers:{'Content-Type':'text/plain'},body:JSON.stringify({demo_url:base,page:location.pathname,referrer:(document.referrer||null),user_agent:(ua||null)})}).catch(function(){});}catch(e){}}catch(e){}})();
