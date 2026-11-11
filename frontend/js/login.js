const errorEl = document.getElementById('error');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Algo salió mal. Inténtalo de nuevo');
  return data;
}

// Pestañas Entrar / Crear cuenta
document.querySelectorAll('[data-mode]').forEach((tab) => {
  tab.addEventListener('click', () => {
    const isLogin = tab.dataset.mode === 'login';
    loginForm.hidden = !isLogin;
    registerForm.hidden = isLogin;
    document.querySelectorAll('[data-mode]').forEach((t) => t.classList.toggle('is-active', t === tab));
    errorEl.textContent = '';
  });
});

function handleForm(form, url) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await post(url, Object.fromEntries(new FormData(form)));
      location.href = '/';
    } catch (err) {
      errorEl.textContent = err.message;
      btn.disabled = false;
    }
  });
}
handleForm(loginForm, '/api/auth/login');
handleForm(registerForm, '/api/auth/register');

// Google
async function initGoogle(attempt = 0) {
  const wrap = document.getElementById('google-wrap');
  let clientId = null;
  try {
    clientId = (await (await fetch('/api/config')).json()).googleClientId;
  } catch (e) { /* sin config */ }
  if (!clientId) { wrap.hidden = true; return; }

  if (!window.google || !google.accounts) {
    if (attempt < 20) return setTimeout(() => initGoogle(attempt + 1), 300);
    wrap.hidden = true;
    return;
  }

  google.accounts.id.initialize({
    client_id: clientId,
    callback: async ({ credential }) => {
      try {
        await post('/api/auth/google', { credential });
        location.href = '/';
      } catch (err) {
        errorEl.textContent = err.message;
      }
    },
  });
  google.accounts.id.renderButton(document.getElementById('google-btn'), {
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    width: 320,
  });
}
window.addEventListener('load', () => initGoogle());
