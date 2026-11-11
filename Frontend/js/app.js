// Misma URL del servidor: en local y en Render funciona igual.
const API = '/api/products';

const grid = document.getElementById('grid');
const statusEl = document.getElementById('status');
const filters = document.getElementById('filters');

const money = (n) => 'S/ ' + Number(n).toFixed(2);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text; // textContent evita inyección de HTML
  return e;
}

function renderCard(p) {
  const card = el('article', 'card');

  if (p.image_url) {
    const img = el('img', 'card-img');
    img.src = p.image_url;
    img.alt = p.name;
    img.loading = 'lazy';
    card.append(img);
  } else {
    card.append(el('div', 'card-img'));
  }

  const body = el('div', 'card-body');
  body.append(el('h2', 'card-name', p.name));
  if (p.description) body.append(el('p', 'card-desc', p.description));
  body.append(el('p', 'card-price', money(p.price)));
  if (p.stock <= 0) body.append(el('p', 'tag-out', 'Agotado'));
  card.append(body);
  return card;
}

async function load(category = '') {
  statusEl.textContent = 'Cargando productos… (la primera carga puede tardar unos segundos)';
  grid.replaceChildren();
  try {
    const url = category ? `${API}?category=${encodeURIComponent(category)}` : API;
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const products = await res.json();
    statusEl.textContent = products.length ? '' : 'Aún no hay productos en esta categoría.';
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
