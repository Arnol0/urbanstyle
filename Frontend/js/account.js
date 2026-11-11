// Muestra "Entrar" o "Hola, Nombre · Salir" en el encabezado.
(async function () {
  const slot = document.getElementById('account');
  if (!slot) return;

  let user = null;
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) user = (await res.json()).user;
  } catch (e) { /* sin sesión */ }

  slot.replaceChildren();

  if (!user) {
    const a = document.createElement('a');
    a.href = 'login.html';
    a.className = 'chip';
    a.textContent = 'Entrar';
    slot.append(a);
    return;
  }

  const hello = document.createElement('span');
  hello.className = 'account-name';
  hello.textContent = 'Hola, ' + user.name.split(' ')[0];

  const out = document.createElement('button');
  out.className = 'chip';
  out.textContent = 'Salir';
  out.addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    location.reload();
  });

  slot.append(hello, out);
})();
