import { CHAPTERS, BRAND, SERVICE_COUNT } from './content.js';
import { clamp, sstep, lerp } from './util.js';

const ICON = {
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.800 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/></svg>',
  at: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/></svg>',
};

const pad = (n) => String(n).padStart(2, '0');

export function buildUI(lenis, goTo) {
  const panelsEl = document.getElementById('panels');
  const panels = CHAPTERS.map((c, i) => {
    const el = document.createElement('section');
    el.className = `panel ${c.id}` + (c.side === -1 ? ' right' : '');
    el.dataset.i = i;
    let html = '';
    if (c.id === 'intro') {
      html = `<div class="col"><h1>We turn connections into real value.</h1><div class="hint"><span>Scroll to cross the bridge</span><i></i></div></div>`;
    } else if (c.id === 'about') {
      html = `<div class="col"><div class="kicker"><b>${pad(i)}</b> ${c.kicker}</div><h2 data-r>${c.title}</h2><p class="lead" data-r>${c.lead}</p>
        <div class="split" data-r><div class="card"><h3>Vision</h3><p>${c.vision}</p></div><div class="card"><h3>Mission</h3><p>${c.mission}</p></div></div>
        <div class="stats" data-r><div class="stat"><b data-count="25" data-suffix="+">25+</b><span>Years of experience</span></div><div class="stat"><b data-count="5">5</b><span>Service pillars</span></div><div class="stat"><b data-count="${SERVICE_COUNT}">${SERVICE_COUNT}</b><span>Ways we connect you</span></div></div></div>`;
    } else if (c.id === 'contact') {
      html = `<div class="col"><div class="paper" data-r><h2>Contact<br>us !</h2></div><div class="contact-info">
        <p class="lead" data-r>Let’s collaborate to bring your vision to life and drive real results!</p>
        <ul class="clist" data-r>
          <li><a href="tel:${BRAND.phone}" data-cursor="Call">${ICON.phone}${BRAND.phoneDisplay}</a></li>
          <li><a href="https://wa.me/${BRAND.phone.replace('+', '')}" target="_blank" rel="noopener" data-cursor="Chat">${ICON.phone}${BRAND.phoneDisplay} · WhatsApp</a></li>
          <li><a href="mailto:${BRAND.email}" data-cursor="Write">${ICON.mail}${BRAND.email}</a></li>
          <li><span>${ICON.pin}${BRAND.place}</span></li>
          <li><span>${ICON.ig}${BRAND.handle}</span></li>
          <li><span>${ICON.at}${BRAND.social} · TikTok · Facebook · LinkedIn</span></li>
        </ul>
        <div class="cta" data-r><a class="btn solid" href="mailto:${BRAND.email}" data-cursor="Write"><span>Start a conversation</span></a><button class="btn" id="again" data-cursor="Again"><span>Cross again</span></button></div>
        <p class="thanks" data-r>Thank you.</p></div></div>`;
    } else {
      html = `<div class="col"><div class="kicker"><b>${pad(i)}</b> ${c.kicker}</div><h2 data-r>${c.title}</h2><p class="tag" data-r>${c.tag}</p>
        <ul class="list${c.items.length > 6 ? ' dense' : ''}" data-r>${c.items.map((it, k) => `<li data-k="${k}"><small>${pad(k + 1)}</small>${it[0]}</li>`).join('')}</ul>
        <p class="detail" data-detail></p></div>`;
    }
    el.innerHTML = html; panelsEl.appendChild(el);
    return { c, el, rev: [...el.querySelectorAll('[data-r]')], lis: [...el.querySelectorAll('.list li')], detail: el.querySelector('[data-detail]'), last: -1, counts: [...el.querySelectorAll('[data-count]')] };
  });

  // scale each text column down when it would not fit the viewport height
  const fit = () => {
    const avail = innerHeight - (innerWidth < 860 ? 150 : 160);
    panels.forEach((pn) => {
      const col = pn.el.querySelector('.col'); if (!col) return;
      col.style.transform = ''; const h = col.offsetHeight, s = Math.min(1, avail / h);
      const right = pn.el.classList.contains('right'), bottom = pn.c.id === 'intro' || pn.c.id === 'contact' || innerWidth < 860;
      col.style.transformOrigin = `${right ? '100%' : pn.c.id === 'contact' ? '50%' : '0'} ${bottom ? '100%' : '50%'}`;
      if (s < 1) col.style.transform = `scale(${s.toFixed(3)})`;
    });
  };
  fit(); addEventListener('resize', fit); document.fonts?.ready.then(fit);

  // rail + menu
  const rail = document.getElementById('rail'), menuList = document.getElementById('menu-list'), menu = document.getElementById('menu');
  const mid = (c) => (c.range[0] + c.range[1]) / 2;
  const rb = CHAPTERS.map((c, i) => {
    const b = document.createElement('button'); b.innerHTML = `<span>${c.label}</span><i></i>`; b.dataset.cursor = c.label; b.onclick = () => goTo(i); rail.appendChild(b);
    const li = document.createElement('li'); li.innerHTML = `<button data-cursor="Go"><small>${pad(i + 1)}</small>${c.label}</button>`; li.firstChild.onclick = () => { closeMenu(); goTo(i); }; menuList.appendChild(li);
    return b;
  });
  const openMenu = () => { menu.classList.add('open'); menu.setAttribute('aria-hidden', 'false'); lenis.stop(); };
  const closeMenu = () => { menu.classList.remove('open'); menu.setAttribute('aria-hidden', 'true'); lenis.start(); };
  document.getElementById('menu-btn').onclick = () => (menu.classList.contains('open') ? closeMenu() : openMenu());
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  const again = document.getElementById('again'); if (again) again.onclick = () => goTo(0);

  const nowNum = document.getElementById('now-num'), nowLabel = document.getElementById('now-label'), meter = document.getElementById('meter'), pct = document.getElementById('pct');
  let cur = -1, lastPct = -1;

  return {
    panels,
    update(p) {
      let act = 0;
      panels.forEach((pn, i) => {
        const [a, b] = pn.c.range, t = clamp((p - a) / (b - a)), pad_ = i === 0 ? .0 : .1;
        const inn = i === 0 ? 1 : sstep(0, .14, t), out = i === panels.length - 1 ? 1 : 1 - sstep(.88, 1, t);
        const o = Math.min(inn, out), live = p >= a - .002 && p < b + .002 || (i === panels.length - 1 && p >= a);
        if (p >= a && p < b) act = i; if (i === panels.length - 1 && p >= a) act = i;
        pn.el.style.visibility = o > .01 ? 'visible' : 'hidden'; pn.el.style.opacity = o.toFixed(3);
        pn.el.classList.toggle('on', o > .5);
        pn.rev.forEach((r, k) => {
          const s = sstep(.02 + k * .045, .1 + k * .045, t) * (i === 0 ? 1 : 1);
          r.style.opacity = i === 0 ? 1 : s.toFixed(3); r.style.transform = `translate3d(0,${((1 - s) * 34).toFixed(1)}px,0)`;
        });
        if (pn.lis.length) {
          const n = pn.lis.length, k = clamp(Math.floor(sstep(.16, .9, t) * n * .999), 0, n - 1);
          if (k !== pn.last) { pn.last = k; pn.lis.forEach((l, j) => l.classList.toggle('act', j === k));
            pn.detail.classList.add('sw'); setTimeout(() => { pn.detail.textContent = pn.c.items[k][1]; pn.detail.classList.remove('sw'); }, 160); }
          pn.activeIndex = k; pn.local = sstep(.16, .9, t);
        }
        pn.t = t;
      });
      if (act !== cur) { cur = act; nowNum.textContent = pad(act + 1); nowLabel.textContent = CHAPTERS[act].label; rb.forEach((b, i) => b.classList.toggle('act', i === act));
        document.documentElement.style.setProperty('--accent', CHAPTERS[act].accent || '#d4476f'); }
      meter.style.transform = `scaleX(${p.toFixed(4)})`;
      const pc = Math.round(p * 100); if (pc !== lastPct) { lastPct = pc; pct.textContent = String(pc).padStart(3, '0'); }
      return act;
    },
  };
}
