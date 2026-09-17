(() => {
  const config = window.WEFINANCE_SUPABASE || {};
  const shell = document.querySelector('.app-shell');
  if (!shell) return;

  const auth = document.createElement('div');
  auth.id = 'authScreen';
  auth.innerHTML = `
    <div class="auth-card">
      <div class="auth-brand"><div class="brand-mark">W</div><div><strong>WeFinance</strong><small>Money Today, Better Tomorrow</small></div></div>
      <p class="eyebrow">AKUN WEFINANCE</p>
      <h1 id="authTitle">Masuk ke WeFinance</h1>
      <p id="authSubtitle">Kelola keuanganmu dengan aman dan tersinkronisasi.</p>
      <form id="authForm">
        <label>Email<input id="authEmail" type="email" autocomplete="email" required placeholder="nama@email.com"></label>
        <label>Password<input id="authPassword" type="password" autocomplete="current-password" minlength="6" required placeholder="Minimal 6 karakter"></label>
        <label id="authNameWrap" hidden>Nama<input id="authName" type="text" autocomplete="name" maxlength="80" placeholder="Nama kamu"></label>
        <button class="primary full" id="authSubmit" type="submit">Masuk</button>
      </form>
      <p id="authError" class="auth-error" role="alert"></p>
      <button class="auth-switch" id="authSwitch" type="button">Belum punya akun? Daftar</button>
      <small class="auth-note">Data keuangan hanya dapat diakses oleh akun yang sedang login.</small>
    </div>`;
  document.body.appendChild(auth);

  if (!window.supabase || !config.url || !config.anonKey || config.url.includes('YOUR_PROJECT') || config.anonKey.includes('YOUR_')) {
    shell.hidden = true;
    auth.classList.add('open');
    auth.querySelector('#authSubmit').disabled = true;
    auth.querySelector('#authError').textContent = 'Konfigurasi Supabase frontend belum diisi. Isi supabase-config.js terlebih dahulu.';
    return;
  }

  const client = window.supabase.createClient(config.url, config.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.wefinanceAuth = client;

  let mode = 'login';
  const form = auth.querySelector('#authForm');
  const submit = auth.querySelector('#authSubmit');
  const errorBox = auth.querySelector('#authError');
  const switchBtn = auth.querySelector('#authSwitch');
  const nameWrap = auth.querySelector('#authNameWrap');
  const title = auth.querySelector('#authTitle');
  const subtitle = auth.querySelector('#authSubtitle');

  function setMode(next) {
    mode = next;
    const signup = mode === 'signup';
    title.textContent = signup ? 'Buat akun WeFinance' : 'Masuk ke WeFinance';
    subtitle.textContent = signup ? 'Mulai mencatat keuangan secara terstruktur.' : 'Kelola keuanganmu dengan aman dan tersinkronisasi.';
    submit.textContent = signup ? 'Daftar' : 'Masuk';
    switchBtn.textContent = signup ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar';
    nameWrap.hidden = !signup;
    errorBox.textContent = '';
  }

  switchBtn.addEventListener('click', () => setMode(mode === 'login' ? 'signup' : 'login'));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.textContent = '';
    submit.disabled = true;
    try {
      const email = auth.querySelector('#authEmail').value.trim();
      const password = auth.querySelector('#authPassword').value;
      const name = auth.querySelector('#authName').value.trim();
      const result = mode === 'signup'
        ? await client.auth.signUp({ email, password, options: { data: { name } } })
        : await client.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (mode === 'signup' && !result.data.session) {
        errorBox.textContent = 'Akun dibuat. Periksa email untuk konfirmasi sebelum masuk.';
        form.reset();
      }
    } catch (error) {
      errorBox.textContent = error?.message || 'Autentikasi gagal.';
    } finally {
      submit.disabled = false;
    }
  });

  async function applySession(session) {
    const loggedIn = Boolean(session?.user);
    shell.hidden = !loggedIn;
    auth.classList.toggle('open', !loggedIn);
    if (!loggedIn) {
      window.dispatchEvent(new CustomEvent('wefinance:logout'));
      return;
    }

    const user = session.user;
    const name = user.user_metadata?.name || user.email?.split('@')[0] || 'Pengguna';
    document.querySelectorAll('.profile strong').forEach(el => { el.textContent = name; });
    document.querySelectorAll('.avatar').forEach(el => { el.textContent = name.slice(0, 2).toUpperCase(); });
    const heading = document.querySelector('#page-dashboard h1');
    if (heading) heading.textContent = `Selamat Datang, ${name}`;
    document.querySelector('[data-auth-action]')?.remove();

    const profile = document.querySelector('.profile');
    if (profile && !document.querySelector('[data-auth-action]')) {
      const button = document.createElement('button');
      button.className = 'auth-logout';
      button.dataset.authAction = 'logout';
      button.textContent = 'Keluar';
      button.addEventListener('click', () => client.auth.signOut());
      profile.appendChild(button);
    }

    window.dispatchEvent(new CustomEvent('wefinance:ready', { detail: { user } }));
  }

  client.auth.onAuthStateChange((_event, session) => applySession(session));
  client.auth.getSession().then(({ data }) => applySession(data.session));
})();
