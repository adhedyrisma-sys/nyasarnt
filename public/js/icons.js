// Ikon fungsional Nyasarn't bergaya "clay 3D": benda menggembung, warna pastel,
// bayangan dalam lembut. Maskot (awan, bintang, dst.) hanya untuk karakter.

let uid = 0;

// Filter clay: kilap di kiri-atas, bayangan dalam di kanan-bawah.
const clayFilter = (id, k = 1) => `
  <filter id="${id}" x="-10%" y="-10%" width="120%" height="120%">
    <feOffset in="SourceAlpha" dx="${-3 * k}" dy="${-4 * k}" result="o1"/>
    <feGaussianBlur in="o1" stdDeviation="${3.2 * k}" result="b1"/>
    <feComposite in="SourceAlpha" in2="b1" operator="out" result="r1"/>
    <feFlood flood-color="#3a2a5c" flood-opacity=".22"/><feComposite in2="r1" operator="in" result="shade"/>
    <feOffset in="SourceAlpha" dx="${2.5 * k}" dy="${3.5 * k}" result="o2"/>
    <feGaussianBlur in="o2" stdDeviation="${2.6 * k}" result="b2"/>
    <feComposite in="SourceAlpha" in2="b2" operator="out" result="r2"/>
    <feFlood flood-color="#fff" flood-opacity=".6"/><feComposite in2="r2" operator="in" result="hl"/>
    <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="shade"/><feMergeNode in="hl"/></feMerge>
  </filter>`;

const dropShadow = (id) => `
  <filter id="${id}" x="-20%" y="-20%" width="140%" height="150%">
    <feDropShadow dx="0" dy="4" stdDeviation="3.5" flood-color="#3c3a7a" flood-opacity=".16"/>
  </filter>`;

// Tiap ikon: fungsi (c = id filter clay) -> isi SVG, viewBox 0 0 100 100
const ART = {
  bus: (c) => `
    <rect x="22" y="78" width="14" height="12" rx="5" fill="#4a4f6a" filter="url(#${c})"/>
    <rect x="64" y="78" width="14" height="12" rx="5" fill="#4a4f6a" filter="url(#${c})"/>
    <rect x="14" y="14" width="72" height="70" rx="18" fill="#6fb6ff" filter="url(#${c})"/>
    <rect x="35" y="8" width="30" height="11" rx="5.5" fill="#ffd36b" filter="url(#${c})"/>
    <rect x="21" y="25" width="58" height="30" rx="10" fill="#e8f4ff" filter="url(#${c})"/>
    <circle cx="28" cy="68" r="6" fill="#ffe27a" filter="url(#${c})"/>
    <circle cx="72" cy="68" r="6" fill="#ffe27a" filter="url(#${c})"/>
    <rect x="40" y="64" width="20" height="8" rx="4" fill="#4f95e6" filter="url(#${c})"/>`,
  train: (c) => `
    <path d="M30 80 20 94M70 80 80 94" stroke="#8b8fa6" stroke-width="7" stroke-linecap="round"/>
    <rect x="16" y="10" width="68" height="74" rx="22" fill="#ffb14a" filter="url(#${c})"/>
    <rect x="25" y="24" width="50" height="28" rx="11" fill="#3b3f63" filter="url(#${c})"/>
    <rect x="38" y="13" width="24" height="7" rx="3.5" fill="#fff1c9" filter="url(#${c})"/>
    <circle cx="31" cy="68" r="6.5" fill="#fff6d6" filter="url(#${c})"/>
    <circle cx="69" cy="68" r="6.5" fill="#fff6d6" filter="url(#${c})"/>
    <rect x="43" y="64" width="14" height="8" rx="4" fill="#f08a2c" filter="url(#${c})"/>`,
  cctv: (c) => `
    <path d="M44 62 48 82H26" stroke="#b9b6c6" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none" filter="url(#${c})"/>
    <rect x="14" y="74" width="18" height="18" rx="7" fill="#d9d6e3" filter="url(#${c})"/>
    <g transform="rotate(-14 50 44)">
      <rect x="12" y="28" width="64" height="34" rx="15" fill="#f1eff6" filter="url(#${c})"/>
      <rect x="70" y="32" width="20" height="26" rx="9" fill="#a98bff" filter="url(#${c})"/>
      <circle cx="80" cy="45" r="6" fill="#4b3a8f"/>
      <circle cx="78" cy="43" r="2" fill="#fff" opacity=".8"/>
      <circle cx="26" cy="38" r="4" fill="#ff6b8a" filter="url(#${c})"/>
    </g>`,
  halte: (c) => `
    <rect x="44" y="40" width="12" height="50" rx="6" fill="#b9b6c6" filter="url(#${c})"/>
    <ellipse cx="50" cy="90" rx="20" ry="6" fill="#d9d6e3" filter="url(#${c})"/>
    <rect x="14" y="8" width="72" height="44" rx="18" fill="#8fd16a" filter="url(#${c})"/>
    <rect x="30" y="17" width="40" height="22" rx="7" fill="#f3fbe9" filter="url(#${c})"/>
    <rect x="35" y="21" width="30" height="9" rx="3" fill="#6bb84a"/>
    <circle cx="38" cy="35" r="2.6" fill="#6bb84a"/><circle cx="62" cy="35" r="2.6" fill="#6bb84a"/>`,
  route: (c) => `
    <path d="M26 74C26 50 74 56 74 30" stroke="#ffb3d1" stroke-width="12" stroke-linecap="round" fill="none" filter="url(#${c})"/>
    <path d="M26 6a16 16 0 0 1 16 16c0 12-16 26-16 26S10 34 10 22A16 16 0 0 1 26 6z" fill="#ff7aa8" filter="url(#${c})" transform="translate(48 0)"/>
    <circle cx="74" cy="22" r="6" fill="#fff" opacity=".9"/>
    <circle cx="26" cy="78" r="13" fill="#8a7dff" filter="url(#${c})"/>
    <circle cx="26" cy="78" r="5" fill="#fff" opacity=".9"/>`,
  banjir: (c) => `
    <path d="M50 6S24 36 24 54a26 26 0 0 0 52 0C76 36 50 6 50 6z" fill="#6cc4ff" filter="url(#${c})"/>
    <path d="M50 30S38 44 38 53a12 12 0 0 0 24 0c0-9-12-23-12-23z" fill="#c8ecff" filter="url(#${c})"/>
    <path d="M8 84c7 0 7-6 14-6s7 6 14 6 7-6 14-6 7 6 14 6 7-6 14-6 7 6 14 6" stroke="#4aa6ec" stroke-width="7" stroke-linecap="round" fill="none" filter="url(#${c})"/>`,
  more: (c) => `
    <circle cx="20" cy="54" r="14" fill="#c7b8ff" filter="url(#${c})"/>
    <circle cx="50" cy="54" r="14" fill="#ffb3d1" filter="url(#${c})"/>
    <circle cx="80" cy="54" r="14" fill="#9fdcff" filter="url(#${c})"/>`,
  // ---- cuaca ----
  cerah: (c) => `
    ${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<rect x="46" y="4" width="8" height="16" rx="4" fill="#ffc24a" transform="rotate(${a} 50 50)" filter="url(#${c})"/>`).join('')}
    <circle cx="50" cy="50" r="25" fill="#ffd257" filter="url(#${c})"/>`,
  cerah_berawan: (c) => `
    ${[0, 45, 90, 135, 180, 270, 315].map((a) => `<rect x="60" y="6" width="7" height="12" rx="3.5" fill="#ffc24a" transform="rotate(${a} 63.5 36)" filter="url(#${c})"/>`).join('')}
    <circle cx="63.5" cy="36" r="17" fill="#ffd257" filter="url(#${c})"/>
    <path d="M24 84c-11 0-15-14-4-18-1-13 15-19 23-10 5-11 26-10 27 5 12 0 14 23 0 23z" fill="#f4f6fb" filter="url(#${c})"/>`,
  berawan: (c) => `
    <path d="M38 52c-2-12 14-20 24-11 6-9 24-6 24 8 10 1 11 17 1 18H45z" fill="#c9d6ee" filter="url(#${c})"/>
    <path d="M22 84c-12 0-16-16-4-20-2-14 16-21 25-11 6-12 28-11 29 5 13 0 15 26 0 26z" fill="#f4f6fb" filter="url(#${c})"/>`,
  hujan: (c) => `
    <path d="M22 62c-12 0-16-16-4-20-2-14 16-21 25-11 6-12 28-11 29 5 13 0 15 26 0 26z" fill="#d9e3f5" filter="url(#${c})"/>
    ${[[30, 72], [50, 76], [70, 72]].map(([x, y]) => `<path d="M${x} ${y}c0 0-6 8-6 12a6 6 0 0 0 12 0c0-4-6-12-6-12z" fill="#5fb3ff" filter="url(#${c})"/>`).join('')}`,
  petir: (c) => `
    <path d="M22 60c-12 0-16-16-4-20-2-14 16-21 25-11 6-12 28-11 29 5 13 0 15 26 0 26z" fill="#b9c3da" filter="url(#${c})"/>
    <path d="M52 56 38 78h12l-6 18 20-26H52l6-14z" fill="#ffd257" filter="url(#${c})"/>`,
  kabut: (c) => `
    <path d="M22 58c-12 0-16-16-4-20-2-14 16-21 25-11 6-12 28-11 29 5 13 0 15 26 0 26z" fill="#e6e9f1" filter="url(#${c})"/>
    <rect x="14" y="68" width="60" height="8" rx="4" fill="#cfd5e3" filter="url(#${c})"/>
    <rect x="28" y="82" width="58" height="8" rx="4" fill="#cfd5e3" filter="url(#${c})"/>`,
  pin: (c) => `
    <path d="M50 6a30 30 0 0 1 30 30c0 22-30 54-30 54S20 58 20 36A30 30 0 0 1 50 6z" fill="#7ee2a6" filter="url(#${c})"/>
    <circle cx="50" cy="36" r="11" fill="#fff" filter="url(#${c})"/>`,
};

export function iconSVG(kind) {
  const n = uid++;
  const c = `cl${n}`, d = `ds${n}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" overflow="visible">
    <defs>${clayFilter(c)}${dropShadow(d)}</defs>
    <g filter="url(#${d})">${ART[kind](c)}</g>
  </svg>`;
}

export function icon(kind, size = 44, cls = '') {
  return `<span class="icon ${cls}" style="width:${size}px;height:${size}px">${iconSVG(kind)}</span>`;
}

/* ---------- gambar untuk peta ---------- */
function rasterize(svg, w, h) {
  return new Promise((resolve) => {
    const img = new Image(w, h);
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(ctx.getImageData(0, 0, w, h));
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

// Penanda CCTV: kamera clay kecil di atas alas bulat, ujung runcing di bawah
export function cctvPin(px = 96) {
  const h = Math.round(px * 1.15);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 115" width="${px}" height="${h}">
    <defs>${clayFilter('c', 0.8)}${dropShadow('d')}</defs>
    <g filter="url(#d)">
      <path d="M50 4C26 4 8 21 8 44c0 26 42 66 42 66s42-40 42-66C92 21 74 4 50 4z" fill="#9a7bff" filter="url(#c)"/>
      <g transform="translate(19 12) scale(.62)">${ART.cctv('c')}</g>
    </g>
  </svg>`;
  return rasterize(svg, px, h);
}

// Kereta tampak atas (clay), menghadap utara; diputar sesuai arah jalan
export function trainTopView(color, px = 30) {
  const h = px * 3;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 60" width="${px}" height="${h}">
    <defs>${clayFilter('c', 0.22)}
      <filter id="s" x="-40%" y="-10%" width="180%" height="120%"><feDropShadow dx="0" dy="1" stdDeviation=".9" flood-color="#1b2250" flood-opacity=".35"/></filter></defs>
    <g filter="url(#s)">
      <path d="M3.5 15C3.5 6 7 2 10 2s6.5 4 6.5 13v22h-13z" fill="#fff"/>
      <rect x="3.5" y="39" width="13" height="19.5" rx="3.5" fill="#fff"/>
      <path d="M5 15C5 7.5 7.8 3.6 10 3.6S15 7.5 15 15v20.5H5z" fill="${color}" filter="url(#c)"/>
      <rect x="5" y="40.5" width="10" height="16.5" rx="2.6" fill="${color}" filter="url(#c)"/>
    </g>
    <path d="M6.8 11C7.3 7.6 8.6 5.6 10 5.6s2.7 2 3.2 5.4z" fill="#2b3150" opacity=".85"/>
    <rect x="8.9" y="14" width="2.2" height="19" rx="1.1" fill="#fff" opacity=".55"/>
    <rect x="8.9" y="43" width="2.2" height="11.5" rx="1.1" fill="#fff" opacity=".55"/>
  </svg>`;
  return rasterize(svg, px, h);
}

// Pil label rute (bisa melebar): warna rute + garis tepi putih
export function routePill(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
    <defs><filter id="s" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#1b2250" flood-opacity=".3"/></filter></defs>
    <rect x="4" y="4" width="40" height="40" rx="18" fill="#fff" filter="url(#s)"/>
    <rect x="7.5" y="7.5" width="33" height="33" rx="15" fill="${color}"/>
  </svg>`;
  return rasterize(svg, 48, 48);
}
