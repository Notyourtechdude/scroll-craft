// Tiny generative score: detuned pad per chapter, filtered air that opens with scroll speed, and soft chimes.
const CHORDS = [[0, 7, 12, 16], [0, 7, 14, 19], [-2, 5, 12, 17], [0, 5, 10, 15], [-5, 2, 7, 14], [0, 4, 11, 16], [-7, 0, 7, 12], [0, 7, 12, 19]];
export function createAudio() {
  let ctx, master, pad, padFilter, noiseFilter, voices = [], on = false, started = false, last = -1;
  const base = 110;
  const f = (n) => base * Math.pow(2, n / 12);
  function init() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    padFilter = ctx.createBiquadFilter(); padFilter.type = 'lowpass'; padFilter.frequency.value = 700; padFilter.Q.value = .6;
    pad = ctx.createGain(); pad.gain.value = .5; pad.connect(padFilter); padFilter.connect(master);
    for (let i = 0; i < 4; i++) for (const det of [-6, 6]) {
      const o = ctx.createOscillator(); o.type = i % 2 ? 'triangle' : 'sawtooth'; o.detune.value = det; o.frequency.value = f(CHORDS[0][i]);
      const g = ctx.createGain(); g.gain.value = .06; o.connect(g); g.connect(pad); o.start(); voices.push(o);
    }
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = .07; lg.gain.value = 260; lfo.connect(lg); lg.connect(padFilter.frequency); lfo.start();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const n = ctx.createBufferSource(); n.buffer = buf; n.loop = true; noiseFilter = ctx.createBiquadFilter(); noiseFilter.type = 'bandpass'; noiseFilter.frequency.value = 500; noiseFilter.Q.value = .8;
    const ng = ctx.createGain(); ng.gain.value = .035; n.connect(noiseFilter); noiseFilter.connect(ng); ng.connect(master); n.start();
    started = true;
  }
  function chime(note, vol = .08) {
    if (!on) return; const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), o2 = ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = f(note + 24); o2.type = 'sine'; o2.frequency.value = f(note + 31);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + 2.4);
    o.connect(g); o2.connect(g); g.connect(master); o.start(t); o2.start(t); o.stop(t + 2.5); o2.stop(t + 2.5);
  }
  return {
    get on() { return on; },
    async enable(v) {
      if (v && !started) init();
      if (!ctx) return; on = v; if (ctx.state === 'suspended') await ctx.resume();
      master.gain.cancelScheduledValues(ctx.currentTime); master.gain.linearRampToValueAtTime(v ? .55 : 0, ctx.currentTime + 1.2);
    },
    chime,
    update(chapter, vel, idx) {
      if (!started) return;
      const t = ctx.currentTime;
      padFilter.frequency.setTargetAtTime(500 + Math.min(1, Math.abs(vel)) * 1800 + (chapter / 7) * 500, t, .4);
      noiseFilter.frequency.setTargetAtTime(400 + Math.abs(vel) * 3000, t, .2);
      if (chapter !== last) { last = chapter; const ch = CHORDS[chapter % CHORDS.length]; voices.forEach((o, k) => o.frequency.setTargetAtTime(f(ch[(k / 2) | 0]), t, 1.4)); chime(ch[3] , .07); setTimeout(() => chime(ch[2] , .05), 180); }
    },
  };
}
