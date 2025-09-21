// /public/assets/login.js
(function () {
  const $ = s => document.querySelector(s);
  const emailEl = $('#email');
  const btn = $('#btnSend');
  const msg = $('#msg');

  // Allow Enter to trigger
  emailEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      btn.click();
    }
  });

  btn.addEventListener('click', async () => {
    const email = (emailEl.value || '').trim();
    if (!email) { emailEl.focus(); return; }

    btn.disabled = true;
    msg.textContent = 'Sending…';

    let raw;
    try {
      const r = await fetch('/api/auth/request-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email })
      });
      raw = await r.text();
    } catch (e) {
      btn.disabled = false;
      msg.textContent = 'Could not contact server.';
      console.error(e);
      return;
    }

    // Parse JSON or scrape link out of an HTML error page
    let link = null;
    try { link = JSON.parse(raw).link; } catch {}
    if (!link) {
      const m = raw && raw.match(/https?:\/\/[^"'<>\s]+\/api\/auth\/exchange\?t=[^"'<>\s]+/i);
      if (m) link = m[0];
    }

    if (!link) {
      btn.disabled = false;
      msg.textContent = 'Server did not return a link.';
      console.warn('RAW:', raw);
      return;
    }

    // Try silent exchange first (cookie set on same origin)
    try {
      await fetch(link, { redirect: 'manual', credentials: 'include' });
      const me = await fetch('/api/me', { credentials: 'include' }).then(r => r.ok ? r.json() : null);
      if (me && me.user) {
        msg.textContent = 'Signed in. Redirecting…';
        location.replace('/app.html'); // change if your library lives elsewhere
        return;
      }
    } catch (_) {}

    // Fallback: manual link
    msg.innerHTML = 'Could not set cookie automatically. '
      + 'Finish sign-in here: '
      + `<a href="${link}" rel="noopener noreferrer">exchange</a>`;
    btn.disabled = false;
  });
})();
