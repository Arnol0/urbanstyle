// Misma URL del servidor: en local y en Render funciona igual.
const API = '/api/products';

const grid = document.getElementById('grid');
const statusEl = document.getElementById('status');
const filters = document.getElementById('filters');
const countEl = document.getElementById('count');
const featuredEl = document.getElementById('featured');

const money = (n) => 'S/ ' + Number(n).toFixed(2);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text; // textContent evita inyección de HTML
  return e;
}

// Sin foto (o si la foto falla) se muestra la inicial del producto.
function placeholder(p, cls) {
  const d = el('div', 'ph ' + cls, (p.name || '?').charAt(0).toUpperCase());
  d.setAttribute('role', 'img');
  d.setAttribute('aria-label', p.name);
  return d;
}

function media(p, cls, eager) {
  if (!p.image_url) return placeholder(p, cls);
  const img = el('img', cls);
  img.src = p.image_url;
  img.alt = p.name;
  if (!eager) img.loading = 'lazy';
  img.addEventListener('error', () => img.replaceWith(placeholder(p, cls)));
  return img;
}

function renderCard(p) {
  const out = p.stock <= 0;
  const card = el('article', 'card' + (out ? ' is-out' : ''));

  const wrap = el('div', 'card-media');
  wrap.append(media(p, 'card-img'));
  if (out) wrap.append(el('span', 'badge-out', 'Agotado'));

  const body = el('div', 'card-body');
  body.append(el('h3', 'card-name', p.name));
  if (p.description) body.append(el('p', 'card-desc', p.description));
  body.append(el('p', 'card-price', money(p.price)));

  card.append(wrap, body);
  return card;
}

let featuredDone = false;
function renderFeatured(p) {
  featuredDone = true;
  if (!p) return;
  const body = el('div', 'feature-body');
  body.append(el('h2', 'feature-name', p.name), el('p', 'card-price', money(p.price)));
  featuredEl.replaceChildren(el('p', 'feature-label', 'Lo más nuevo'), media(p, 'feature-img', true), body);
  featuredEl.hidden = false;
}

async function load(category = '') {
  statusEl.textContent = 'Cargando productos… (la primera carga puede tardar unos segundos)';
  grid.replaceChildren();
  countEl.textContent = '';
  try {
    const url = category ? `${API}?category=${encodeURIComponent(category)}` : API;
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const products = await res.json();

    if (!category && !featuredDone) renderFeatured(products[0]); // el más nuevo

    statusEl.textContent = products.length ? '' : 'Aún no hay productos en esta categoría.';
    countEl.textContent = products.length ? `${products.length} ${products.length === 1 ? 'producto' : 'productos'}` : '';
    grid.append(...products.map(renderCard));
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'No pudimos cargar los productos. Recarga la página en un momento.';
  }
}

filters.addEventListener('click', (e) => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  filters.querySelectorAll('.chip').forEach((c) => c.classList.toggle('is-active', c === btn));
  load(btn.dataset.cat);
});

load();
