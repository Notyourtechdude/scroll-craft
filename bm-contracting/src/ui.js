import { CHAPTERS, FLOORS, SITE } from './content.js';
import { smoothstep } from './env.js';

const $ = (s) => document.querySelector(s);
const pad = (n, l) => String(Math.round(n)).padStart(l, '0');

function splitWords(line, counter) {
  return line.split(' ').map((w) => {
    const chars = [...w].map((c) => `<span class="ch" style="--i:${counter.n++}">${c}</span>`).join('');
    return `<span class="w">${chars}</span>`;
  }).join(' ');
}

export function createUI({ onJump, onSoundToggle }) {
  const host = $('#chapters');
  const panels = CHAPTERS.map((c, idx) => {
    const el = document.createElement('section');
    el.className = `panel side-${c.side}${c.hold ? ' hold' : ''}`;
    el.dataset.id = c.id;
    el.innerHTML = `
      <p class="kicker"><span class="k-line"></span>${c.kicker}</p>
      <h2>${c.title.map((l) => `<span class="line">${splitWords(l, { n: 0 })}</span>`).join('')}</h2>
      <p class="body">${c.body}</p>
      ${c.tags.length ? `<ul class="tags">${c.tags.map((t) => `<li>${t}</li>`).join('')}</ul>` : ''}
      ${c.stat === 'floors' ? `<div class="stat"><b id="statFloors">00</b><span>floors erected<br>and counting</span></div>` : ''}
      ${c.cta ? `<a class="cta" href="${SITE.url}" target="_blank" rel="noopener" data-hover><span>${SITE.ctaLabel}</span><i>→</i></a>` : ''}
      ${c.id === 'arrival' ? `<div class="scroll-cue" aria-hidden="true"><i></i></div>` : ''}`;
    host.appendChild(el);
    return { el, c, idx };
  });

  // chapter rail
  const rail = $('#rail');
  rail.innerHTML = CHAPTERS.map((c, i) => `<button type="button" data-i="${i}" data-hover aria-label="${c.label}"><span>${c.label}</span><i></i></button>`).join('');
  const ticks = [...rail.querySelectorAll('button')];
  ticks.forEach((b) => b.addEventListener('click', () => {
    const c = CHAPTERS[+b.dataset.i];
    onJump(c.start + (c.end - c.start) * (c.hold ? .9 : .4));
  }));

  $('#siteLink').href = SITE.url;
  $('#sound').addEventListener('click', (e) => {
    const on = onSoundToggle();
    e.currentTarget.setAttribute('aria-pressed', on);
    e.currentTarget.querySelector('i').textContent = on ? 'on' : 'off';
  });

  const els = {
    prog: $('#rProg'), floor: $('#rFloor'), elev: $('#rElev'), coords: $('#coords'),
    phase: $('#phase'), bar: $('#bar'), hint: $('#hint'), statFloors: $('#statFloors'),
  };
  let current = -1;

  return {
    update(p, cam, onChapter) {
      let cur = 0;
      panels.forEach(({ el, c }, i) => {
        const t = (p - c.start) / (c.end - c.start);
        const inn = smoothstep(0, .2, t);
        const out = c.hold ? 1 : 1 - smoothstep(.8, 1, t);
        const v = Math.min(inn, out);
        el.style.setProperty('--t', v.toFixed(3));
        el.style.setProperty('--p', Math.min(Math.max(t, 0), 1).toFixed(3));
        el.style.visibility = v > .001 ? 'visible' : 'hidden';
        el.style.pointerEvents = v > .6 ? 'auto' : 'none';
        if (p >= c.start) cur = i;
      });
      if (cur !== current) {
        current = cur;
        els.phase.textContent = CHAPTERS[cur].label;
        ticks.forEach((b, i) => b.classList.toggle('on', i === cur));
        onChapter?.(cur);
      }
      const floors = Math.min(Math.max(((p - .34) / .26) * FLOORS, 0), FLOORS);
      els.prog.textContent = pad(p * 100, 3);
      els.floor.textContent = pad(Math.floor(floors), 2);
      els.elev.textContent = `+${(Math.floor(floors) * 1.1).toFixed(1).padStart(4, '0')}`;
      if (els.statFloors) els.statFloors.textContent = pad(Math.floor(floors), 2);
      els.coords.textContent = `X ${cam.x.toFixed(1).padStart(6, ' ')} · Y ${cam.y.toFixed(1).padStart(5, ' ')} · Z ${cam.z.toFixed(1).padStart(6, ' ')}`;
      els.bar.style.transform = `scaleX(${p})`;
      els.hint.style.opacity = 1 - smoothstep(.0, .03, p);
      document.documentElement.style.setProperty('--day', smoothstep(.25, .45, p) * (1 - smoothstep(.7, .85, p)));
    },
  };
}

export function createCursor() {
  const c = $('#cursor');
  if (!c || matchMedia('(hover: none)').matches) { c?.remove(); return { x: 0, y: 0 }; }
  const dot = c.querySelector('i'), ring = c.querySelector('b');
  const pos = { x: innerWidth / 2, y: innerHeight / 2 }, rp = { ...pos };
  let hover = false;
  addEventListener('pointermove', (e) => { pos.x = e.clientX; pos.y = e.clientY; hover = !!e.target.closest?.('[data-hover]'); });
  const tick = () => {
    rp.x += (pos.x - rp.x) * .16; rp.y += (pos.y - rp.y) * .16;
    dot.style.transform = `translate(${pos.x}px,${pos.y}px)`;
    ring.style.transform = `translate(${rp.x}px,${rp.y}px) scale(${hover ? 1.9 : 1})`;
    requestAnimationFrame(tick);
  };
  tick();
  return pos;
}
