// Threat-card animations carried over from the previous lazarussensors.com (script.js): the environmental monitor and the acoustic impact chart. Verbatim, wrapped to run on load.
(function () { function init() {
  (function initEnvMonitor() {
    const container = document.getElementById('envMonitor');
    if (!container) return;

    const canvas  = document.getElementById('envCanvas');
    const tipEl   = document.getElementById('envTooltip');
    const ctx     = canvas.getContext('2d');
    const dpr     = window.devicePixelRatio || 1;

    const PAD     = { left: 52, right: 8, top: 8, bottom: 28 };
    const VISIBLE = 200;
    const SPEED   = 4;
    const INIT_BUF = 800;

    const channels = [
      { name: 'CO',  unit: 'ppm', color: '#FF7828', yMin: 0.08, yMax: 0.30, base: 24,  vRange: 10 },
      { name: 'AQI', unit: '',    color: '#64C8FF', yMin: 0.33, yMax: 0.55, base: 86,  vRange: 30 },
      { name: 'RH',  unit: '%',   color: '#FFC864', yMin: 0.58, yMax: 0.80, base: 67,  vRange: 12 },
    ];

    function makeNoise(n, yMin, yMax) {
      const mid = (yMin + yMax) / 2;
      const half = (yMax - yMin) / 2 * 0.72;
      const arr = [];
      let v = mid;
      for (let i = 0; i < n; i++) {
        v += (Math.random() - 0.5) * half * 0.09;
        v += (mid - v) * 0.005;
        v = Math.min(yMax, Math.max(yMin, v));
        arr.push(v);
      }
      return arr;
    }

    const data = channels.map(ch => makeNoise(INIT_BUF, ch.yMin, ch.yMax));

    function extendData(count) {
      channels.forEach((ch, i) => {
        const mid  = (ch.yMin + ch.yMax) / 2;
        const half = (ch.yMax - ch.yMin) / 2 * 0.72;
        let v = data[i][data[i].length - 1];
        for (let j = 0; j < count; j++) {
          v += (Math.random() - 0.5) * half * 0.09;
          v += (mid - v) * 0.005;
          v = Math.min(ch.yMax, Math.max(ch.yMin, v));
          data[i].push(v);
        }
      });
    }

    function lerp(arr, idx) {
      const i = Math.floor(idx);
      const f = idx - i;
      if (i < 0) return arr[0];
      if (i >= arr.length - 1) return arr[arr.length - 1];
      return arr[i] * (1 - f) + arr[i + 1] * f;
    }

    function yToVal(ci, ny) {
      const ch   = channels[ci];
      const mid  = (ch.yMin + ch.yMax) / 2;
      const half = (ch.yMax - ch.yMin) / 2;
      return ch.base + ch.vRange * (mid - ny) / half;
    }

    function aqiLabel(v) {
      if (v <= 50)  return 'Good';
      if (v <= 100) return 'Moderate';
      if (v <= 150) return 'Sensitive';
      return 'Unhealthy';
    }

    let w, h, chartW, chartH;
    let offset   = 0;
    let lastTime = performance.now();
    let mouseX   = -1;
    let hovering = false;

    function resize() {
      canvas.style.width  = '';
      canvas.style.height = '';
      const r = canvas.getBoundingClientRect();
      w = r.width;  h = r.height;
      canvas.width  = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      chartW = w - PAD.left - PAD.right;
      chartH = h - PAD.top  - PAD.bottom;
    }

    function toY(ny) { return PAD.top + ny * chartH; }

    function draw() {
      const now = performance.now();
      const dt  = Math.min((now - lastTime) / 1000, 0.1);
      lastTime  = now;
      offset   += SPEED * dt;

      if (offset + VISIBLE + 50 > data[0].length) extendData(400);

      ctx.clearRect(0, 0, w, h);

      /* baseline */
      const blY = toY(0.87);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#7B7575';
      ctx.lineWidth   = 0.5;
      ctx.beginPath();
      ctx.moveTo(PAD.left, blY);
      ctx.lineTo(w - PAD.right, blY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font      = '9px monospace';
      ctx.fillStyle = '#7B7575';
      ctx.fillText('BASELINE', PAD.left, blY - 4);

      /* time axis */
      const axY = toY(0.93);
      ctx.strokeStyle = '#7B7575';
      ctx.lineWidth   = 0.5;
      ctx.beginPath();
      ctx.moveTo(PAD.left, axY);
      ctx.lineTo(w - PAD.right, axY);
      ctx.stroke();

      ctx.font      = '8px monospace';
      ctx.fillStyle = '#7B7575';
      ctx.fillText('00:00', PAD.left, axY + 12);
      ctx.fillText('12:00', PAD.left + chartW * 0.47, axY + 12);
      ctx.fillText('24:00', w - PAD.right - 28, axY + 12);

      /* waveform lines */
      const step = Math.max(1, Math.floor(chartW / 300));
      channels.forEach((ch, ci) => {
        ctx.strokeStyle = ch.color;
        ctx.lineWidth   = 1.5;
        ctx.lineJoin    = 'round';
        ctx.lineCap     = 'round';
        ctx.beginPath();
        for (let px = 0; px <= chartW; px += step) {
          const di = offset + (px / chartW) * VISIBLE;
          const sy = toY(lerp(data[ci], di));
          const sx = PAD.left + px;
          px === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      });

      /* channel labels (left edge) */
      ctx.textBaseline = 'top';
      channels.forEach((ch, ci) => {
        const di  = offset + VISIBLE;
        const ny  = lerp(data[ci], di);
        const val = yToVal(ci, ny);
        ctx.font      = 'bold 9px monospace';
        ctx.fillStyle = ch.color;
        let lbl = ch.name + ' ';
        if (ch.unit === 'ppm') lbl += val.toFixed(0) + ' ppm';
        else if (ch.name === 'AQI') lbl += val.toFixed(0) + ' (' + aqiLabel(val) + ')';
        else lbl += val.toFixed(0) + '%';
        ctx.fillText(lbl, 4, toY(ch.yMin) + 2);
      });
      ctx.textBaseline = 'alphabetic';

      /* hover cursor + tooltip */
      if (hovering && mouseX >= PAD.left && mouseX <= w - PAD.right) {
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth   = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(mouseX, PAD.top);
        ctx.lineTo(mouseX, blY);
        ctx.stroke();
        ctx.setLineDash([]);

        const px  = mouseX - PAD.left;
        const di  = offset + (px / chartW) * VISIBLE;
        const rows = [];

        channels.forEach((ch, ci) => {
          const ny  = lerp(data[ci], di);
          const sy  = toY(ny);
          const val = yToVal(ci, ny);

          ctx.fillStyle = ch.color;
          ctx.beginPath();
          ctx.arc(mouseX, sy, 3.5, 0, Math.PI * 2);
          ctx.fill();

          let txt;
          if (ch.unit === 'ppm') txt = val.toFixed(1) + ' ppm';
          else if (ch.name === 'AQI') txt = val.toFixed(0) + ' (' + aqiLabel(val) + ')';
          else txt = val.toFixed(1) + '%';

          rows.push('<div style="color:' + ch.color + '"><strong>' + ch.name + '</strong>  ' + txt + '</div>');
        });

        if (tipEl) {
          tipEl.style.display = 'block';
          tipEl.innerHTML = rows.join('');
          const cs = getComputedStyle(container);
          const padL = parseFloat(cs.paddingLeft) || 0;
          const padT = parseFloat(cs.paddingTop)  || 0;
          let tx = mouseX + padL + 14;
          const tipW = tipEl.offsetWidth;
          if (tx + tipW + 4 > container.offsetWidth) tx = mouseX + padL - tipW - 14;
          const ty = toY(0.25) + padT;
          tipEl.style.left = tx + 'px';
          tipEl.style.top  = ty + 'px';
        }
      } else if (tipEl) {
        tipEl.style.display = 'none';
      }

      requestAnimationFrame(draw);
    }

    canvas.addEventListener('mouseenter', () => { hovering = true; });
    canvas.addEventListener('mouseleave', () => { hovering = false; mouseX = -1; });
    canvas.addEventListener('mousemove', e => {
      const r = canvas.getBoundingClientRect();
      mouseX  = e.clientX - r.left;
    });

    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(draw);
  })();
  (function initOpsAccident() {
    const container = document.getElementById('opsAccident');
    if (!container) return;

    const canvas = document.getElementById('opsCanvas');
    const ctx    = canvas.getContext('2d');
    const dpr    = window.devicePixelRatio || 1;

    const PAD          = { left: 8, right: 8, top: 8, bottom: 8 };
    const VISIBLE      = 250;
    const SPEED        = 8;
    const INIT_BUF     = 800;
    const SPIKE_INT    = 320;
    const SPIKE_W      = 35;
    const SPIKE_AMP    = 0.20;

    const CH = [
      { label: 'CH1 ACOUSTIC', yC: 0.38, color: '#7B7575', alpha: 1 },
      { label: 'CH2 ACOUSTIC', yC: 0.70, color: '#7B7575', alpha: 0.5 },
    ];

    const ZONE = { x1: 0.30, x2: 0.58, y1: 0.10, y2: 0.90 };

    function spikeShape(t) {
      if (t < 0.08) return t / 0.08;
      if (t < 0.12) return 1.0 - (t - 0.08) / 0.04 * 1.8;
      if (t < 0.18) return -0.8 + (t - 0.12) / 0.06 * 1.1;
      if (t < 0.25) return 0.3 * Math.exp(-(t - 0.18) * 25);
      return 0;
    }

    function getSpikeAt(i) {
      const d = i % SPIKE_INT;
      if (d >= SPIKE_INT - SPIKE_W) {
        const t = (d - (SPIKE_INT - SPIKE_W)) / SPIKE_W;
        return spikeShape(t) * SPIKE_AMP;
      }
      return 0;
    }

    function makeNoise(n) {
      const arr = [];
      let v = 0;
      for (let i = 0; i < n; i++) {
        v += (Math.random() - 0.5) * 0.14;
        v *= 0.78;
        arr.push(v);
      }
      return arr;
    }

    const noise = CH.map(() => makeNoise(INIT_BUF));

    function extendNoise(ci, count) {
      const arr = noise[ci];
      let v = arr.length > 0 ? arr[arr.length - 1] : 0;
      for (let i = 0; i < count; i++) {
        v += (Math.random() - 0.5) * 0.14;
        v *= 0.78;
        arr.push(v);
      }
    }

    function nlerp(arr, idx) {
      const i = Math.floor(idx);
      const f = idx - i;
      if (i < 0) return arr[0] || 0;
      if (i >= arr.length - 1) return arr[arr.length - 1] || 0;
      return arr[i] * (1 - f) + arr[i + 1] * f;
    }

    let w, h, chartW, chartH;
    let offset    = 0;
    let lastTime  = performance.now();
    let impactA   = 0;

    function resize() {
      canvas.style.width  = '';
      canvas.style.height = '';
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width  = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      chartW = w - PAD.left - PAD.right;
      chartH = h - PAD.top  - PAD.bottom;
    }

    function toX(nx) { return PAD.left + nx * chartW; }
    function toY(ny) { return PAD.top  + ny * chartH; }

    function draw() {
      const now = performance.now();
      const dt  = Math.min((now - lastTime) / 1000, 0.1);
      lastTime  = now;
      offset   += SPEED * dt;

      CH.forEach((_, ci) => {
        if (offset + VISIBLE + 50 > noise[ci].length) extendNoise(ci, 400);
      });

      ctx.clearRect(0, 0, w, h);

      /* ── detect spike in zone ── */
      let spikeInZone = false;
      const zS = Math.floor(offset + ZONE.x1 * VISIBLE);
      const zE = Math.ceil(offset + ZONE.x2 * VISIBLE);
      for (let di = zS; di <= zE; di++) {
        if (Math.abs(getSpikeAt(di)) > SPIKE_AMP * 0.25) { spikeInZone = true; break; }
      }

      if (spikeInZone) impactA = Math.min(1, impactA + dt * 5);
      else             impactA = Math.max(0, impactA - dt * 2);

      /* ── crosshair zone ── */
      const zx1 = toX(ZONE.x1), zx2 = toX(ZONE.x2);
      const zy1 = toY(ZONE.y1), zy2 = toY(ZONE.y2);
      const zw  = zx2 - zx1, zh = zy2 - zy1;

      const activeBlend = impactA;
      const fillA   = 0.02 + activeBlend * 0.04;
      const borderA = 0.3  + activeBlend * 0.5;

      ctx.fillStyle   = 'rgba(255, 0, 0,' + fillA + ')';
      ctx.fillRect(zx1, zy1, zw, zh);

      ctx.strokeStyle = 'rgba(131, 43, 43,' + borderA + ')';
      ctx.lineWidth   = 0.5;
      ctx.strokeRect(zx1, zy1, zw, zh);

      /* corner brackets */
      const bLen = Math.min(zw, zh) * 0.2;
      ctx.strokeStyle = 'rgba(132, 44, 44,' + (0.8 + activeBlend * 0.2) + ')';
      ctx.lineWidth   = 2.5;
      ctx.lineCap     = 'square';

      [[zx1, zy1, zx1 + bLen, zy1, zx1, zy1 + bLen],
       [zx2, zy1, zx2 - bLen, zy1, zx2, zy1 + bLen],
       [zx1, zy2, zx1 + bLen, zy2, zx1, zy2 - bLen],
       [zx2, zy2, zx2 - bLen, zy2, zx2, zy2 - bLen]
      ].forEach(([cx, cy, hx, hy, vx, vy]) => {
        ctx.beginPath();
        ctx.moveTo(hx, hy); ctx.lineTo(cx, cy); ctx.lineTo(vx, vy);
        ctx.stroke();
      });

      /* tick marks */
      const tick = 5;
      const zmx = (zx1 + zx2) / 2, zmy = (zy1 + zy2) / 2;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(zmx, zy1 - tick); ctx.lineTo(zmx, zy1);
      ctx.moveTo(zmx, zy2);        ctx.lineTo(zmx, zy2 + tick);
      ctx.moveTo(zx1 - tick, zmy); ctx.lineTo(zx1, zmy);
      ctx.moveTo(zx2, zmy);        ctx.lineTo(zx2 + tick, zmy);
      ctx.stroke();

      /* ── waveform lines ── */
      CH.forEach((ch, ci) => {
        ctx.globalAlpha  = ch.alpha;
        ctx.strokeStyle  = ch.color;
        ctx.lineWidth    = 1;
        ctx.lineJoin     = 'round';
        ctx.lineCap      = 'round';
        ctx.beginPath();
        for (let px = 0; px <= chartW; px++) {
          const di  = offset + (px / chartW) * VISIBLE;
          const n   = nlerp(noise[ci], di);
          const s   = getSpikeAt(di);
          /* reduce noise when spike is present so the big wave doesn't look like it's vibrating */
          const spikeStrength = Math.min(1, Math.abs(s) / (SPIKE_AMP * 0.2));
          const noiseMix = 1 - spikeStrength * 0.95;
          const val = n * 0.06 * noiseMix + s;
          const sy  = toY(ch.yC + val);
          const sx  = PAD.left + px;
          px === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      });

      /* ── channel labels ── */
      ctx.font = '8px monospace';
      CH.forEach((ch, ci) => {
        ctx.globalAlpha = ch.alpha;
        ctx.fillStyle   = ch.color;
        ctx.fillText(ch.label, PAD.left + 4, toY(ch.yC - 0.08));
        ctx.globalAlpha = 1;
      });

      /* ── IMPACT callout ── */
      if (impactA > 0.01) {
        const pulse = 0.8 + 0.2 * Math.sin(now / 120);
        ctx.globalAlpha   = impactA * pulse;
        ctx.fillStyle     = '#A53231';
        ctx.shadowColor   = 'rgba(165, 50, 49, 0.6)';
        ctx.shadowBlur    = 12;
        ctx.font          = 'bold 14px monospace';
        ctx.textAlign     = 'center';
        ctx.textBaseline  = 'bottom';
        ctx.fillText('IMPACT', (zx1 + zx2) / 2, zy1 - 10);
        ctx.shadowBlur    = 0;
        ctx.shadowColor   = 'transparent';
        ctx.textAlign     = 'start';
        ctx.textBaseline  = 'alphabetic';
        ctx.globalAlpha   = 1;
      }

      /* ── timestamp ── */
      const sec = Math.floor(offset / SPEED);
      const ts  = '14:' + String(Math.floor(sec / 60) % 60).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
      ctx.font      = '8px monospace';
      ctx.fillStyle = '#7B7575';
      ctx.textAlign = 'right';
      ctx.fillText(ts, w - PAD.right - 4, h - PAD.bottom - 4);
      ctx.textAlign = 'start';

      requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(draw);
  })();
} if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init(); })();
