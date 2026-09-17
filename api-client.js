(() => {
  const API_BASE = window.WEFINANCE_API_BASE || '/api';

  async function request(path, options = {}) {
    const auth = window.wefinanceAuth;
    if (!auth) throw new Error('Supabase Auth belum siap.');

    const { data: { session } = {} } = await auth.auth.getSession();
    if (!session?.access_token) throw new Error('Sesi login tidak tersedia. Silakan masuk kembali.');

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        Authorization: `Bearer ${session.access_token}`
      }
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || `API error (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  window.wefinanceApi = {
    get: path => request(path),
    post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
    put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
    delete: path => request(path, { method: 'DELETE' })
  };
})();
