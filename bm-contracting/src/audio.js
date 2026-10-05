// Tiny generative score: a low drone whose filter opens with scroll speed,
// a wind bed, and a metallic "clank" when a chapter changes. Off until the user opts in.
export function createAudio() {
  let ctx, master, drone, windGain, windFilter, on = false;

  function init() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    drone = ctx.createBiquadFilter(); drone.type = 'lowpass'; drone.frequency.value = 260; drone.Q.value = 4;
    [55, 55.35, 82.4, 110.2].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = i % 2 ? 'sawtooth' : 'triangle'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = i < 2 ? .16 : .06;
      o.connect(g).connect(drone); o.start();
    });
    drone.connect(master);
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    windFilter = ctx.createBiquadFilter(); windFilter.type = 'bandpass'; windFilter.frequency.value = 500; windFilter.Q.value = .6;
    windGain = ctx.createGain(); windGain.gain.value = .0;
    src.connect(windFilter).connect(windGain).connect(master); src.start();
  }

  return {
    get on() { return on; },
    toggle() {
      if (!ctx) init();
      on = !on;
      ctx.resume();
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(on ? .5 : 0, ctx.currentTime + 1.2);
      return on;
    },
    update(p, vel) {
      if (!on) return;
      const v = Math.min(Math.abs(vel), 1.2);
      drone.frequency.setTargetAtTime(220 + p * 500 + v * 900, ctx.currentTime, .15);
      windFilter.frequency.setTargetAtTime(350 + v * 2500, ctx.currentTime, .1);
      windGain.gain.setTargetAtTime(.02 + v * .25, ctx.currentTime, .1);
    },
    clank(freq = 880) {
      if (!on) return;
      const t = ctx.currentTime;
      [1, 2.76, 5.4].forEach((m, i) => {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq * m;
        const g = ctx.createGain(); g.gain.setValueAtTime(.18 / (i + 1), t); g.gain.exponentialRampToValueAtTime(.0001, t + 1.4);
        o.connect(g).connect(master); o.start(t); o.stop(t + 1.5);
      });
    },
  };
}
