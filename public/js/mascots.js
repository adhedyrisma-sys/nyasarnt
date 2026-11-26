// Maskot Nyasarn't: boneka kain (felt) dengan mata goyang.
// Tiap maskot dibuat sebagai SVG mandiri supaya bisa dipakai di <img>, di peta, di mana saja.

let uid = 0;

const PALETTE = {
  awan:  { base: '#7cc4ff', light: '#d6eeff', dark: '#3f8fe0', name: 'Awan' },
  bintang: { base: '#ffcf3f', light: '#fff1b8', dark: '#f39b1c', name: 'Bintang' },
  batu:  { base: '#a9a3c4', light: '#e4e0f5', dark: '#6f6890', name: 'Batu' },
  bulan: { base: '#a77bff', light: '#e6d8ff', dark: '#6b45d6', name: 'Bulan' },
  bunga: { base: '#ff8fbf', light: '#ffd8ea', dark: '#e0528f', name: 'Bunga' },
};

// Bentuk badan (viewBox 0 0 200 200) dan posisi mata/mulut.
const SHAPES = {
  awan: {
    body: (f) => `<path d="M52 150C20 150 16 104 50 98C48 60 94 46 112 72C124 48 166 58 162 94C192 100 188 150 156 150Z" ${f}/>`,
    eyes: [[86, 108], [116, 108]], mouth: [101, 132],
  },
  bintang: {
    body: (f) => {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 34 : 74, a = -Math.PI / 2 + (i * Math.PI) / 5;
        pts.push(`${(100 + r * Math.cos(a)).toFixed(1)},${(110 + r * Math.sin(a)).toFixed(1)}`);
      }
      return `<polygon points="${pts.join(' ')}" ${f} stroke-width="26" stroke-linejoin="round"/>`;
    },
    eyes: [[86, 112], [114, 112]], mouth: [100, 134], strokeBody: true,
  },
  batu: {
    body: (f) => `<path d="M38 140C26 108 52 68 92 60C134 50 170 80 166 120C164 148 138 158 100 158C64 158 46 156 38 140Z" ${f}/>`,
    eyes: [[86, 104], [118, 102]], mouth: [103, 128],
  },
  bulan: {
    body: (f) => `<path d="M118 38A66 66 0 1 0 166 138A54 54 0 1 1 118 38Z" ${f}/>`,
    eyes: [[70, 92], [96, 84]], mouth: [80, 120],
  },
  bunga: {
    body: (f, id) => {
      let petals = '';
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 - Math.PI / 2;
        petals += `<ellipse cx="${100 + 46 * Math.cos(a)}" cy="${106 + 46 * Math.sin(a)}" rx="32" ry="32" ${f}/>`;
      }
      return `${petals}<circle cx="100" cy="106" r="40" fill="url(#c${id})" filter="url(#felt${id})"/>`;
    },
    eyes: [[86, 102], [114, 102]], mouth: [100, 124],
  },
};

function eye(x, y, r, look, id) {
  const [lx, ly] = look;
  return `<g>
    <circle cx="${x}" cy="${y + 1.5}" r="${r + 1}" fill="rgba(40,30,80,.18)"/>
    <circle cx="${x}" cy="${y}" r="${r}" fill="url(#e${id})" stroke="#d9dbe6" stroke-width="1.2"/>
    <circle cx="${x + lx * r * 0.38}" cy="${y + ly * r * 0.38}" r="${r * 0.52}" fill="#15131c"/>
    <circle cx="${x + lx * r * 0.38 - r * 0.18}" cy="${y + ly * r * 0.38 - r * 0.2}" r="${r * 0.14}" fill="#fff"/>
  </g>`;
}

/**
 * Buat SVG maskot.
 * @param {'awan'|'bintang'|'batu'|'bulan'|'bunga'} kind
 * @param {{look?: [number, number], mouth?: boolean, shadow?: boolean, extra?: string}} opt
 */
export function mascotSVG(kind, opt = {}) {
  const id = `m${kind}${uid++}`;
  const p = PALETTE[kind];
  const s = SHAPES[kind];
  const look = opt.look || [0.25, 0.15];
  const fillAttr = s.strokeBody
    ? `fill="url(#g${id})" stroke="url(#g${id})" filter="url(#felt${id})"`
    : `fill="url(#g${id})" filter="url(#felt${id})"`;
  const centerColor = kind === 'bunga' ? '#ffd45c' : p.base;
  const eyeR = kind === 'bulan' ? 12 : 15;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs>
    <radialGradient id="g${id}" cx="35%" cy="28%" r="80%">
      <stop offset="0" stop-color="${p.light}"/>
      <stop offset=".45" stop-color="${p.base}"/>
      <stop offset="1" stop-color="${p.dark}"/>
    </radialGradient>
    <radialGradient id="c${id}" cx="38%" cy="32%" r="75%">
      <stop offset="0" stop-color="#fff3c4"/>
      <stop offset=".5" stop-color="${centerColor}"/>
      <stop offset="1" stop-color="#f2a21c"/>
    </radialGradient>
    <radialGradient id="e${id}" cx="40%" cy="35%" r="70%">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#e9ebf3"/>
    </radialGradient>
    <filter id="felt${id}" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="4.5" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feTurbulence type="fractalNoise" baseFrequency="1.9" numOctaves="1" seed="2" result="n2"/>
      <feColorMatrix in="n2" type="saturate" values="0" result="g"/>
      <feComposite in="g" in2="d" operator="in" result="grain"/>
      <feBlend in="grain" in2="d" mode="soft-light" result="b"/>
      <feComposite in="b" in2="d" operator="in"/>
    </filter>
    <filter id="sh${id}"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>
  ${opt.shadow === false ? '' : `<ellipse cx="100" cy="176" rx="56" ry="9" fill="rgba(60,70,140,.22)" filter="url(#sh${id})"/>`}
  ${s.body(fillAttr, id)}
  ${s.eyes.map(([x, y]) => eye(x, y, eyeR, look, id)).join('')}
  ${opt.mouth === false ? '' : `<ellipse cx="${s.mouth[0]}" cy="${s.mouth[1]}" rx="6" ry="4.5" fill="#3a1f3d" opacity=".85"/>`}
  ${opt.extra || ''}
</svg>`;
}

export function mascotURL(kind, opt) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(mascotSVG(kind, opt));
}

export function mascotImg(kind, size = 64, opt = {}, cls = '') {
  return `<img class="mascot ${cls}" src="${mascotURL(kind, opt)}" width="${size}" height="${size}" alt="" aria-hidden="true" draggable="false">`;
}

// Gambar raster (untuk peta MapLibre)
export function mascotBitmap(kind, px = 96, opt = {}) {
  return new Promise((resolve) => {
    const img = new Image(px, px);
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = px;
      c.getContext('2d').drawImage(img, 0, 0, px, px);
      resolve(c.getContext('2d').getImageData(0, 0, px, px));
    };
    img.src = mascotURL(kind, opt);
  });
}

export const MASCOTS = Object.keys(PALETTE);
export const MASCOT_NAME = Object.fromEntries(Object.entries(PALETTE).map(([k, v]) => [k, v.name]));
