// /view/js/auth-ui.js
(function () {
  function cap(s){ return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

  function showRoleOnly(roleName) {
    const role = (roleName || '').toLowerCase();
    document.querySelectorAll('.role-only').forEach(el => {
      const allow = (el.dataset.roles || '')
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);
      if (allow.includes(role)) {
        el.style.removeProperty('display');
        if (getComputedStyle(el).display === 'none') {
          el.style.display = 'list-item';
        }
      }
    });
  }

  async function initHeader({ protect = true } = {}) {
    try {
      let res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) { if (protect) window.location.href = '/login.html'; return; }
      const { user } = await res.json();

      let rol = (user?.rolNombre || '').toLowerCase();
      if (!rol) {
        try {
          const r2 = await fetch('/api/users/me', { credentials: 'include' });
          if (r2.ok) {
            const u2 = await r2.json();
            rol = (u2?.rolNombre || 'estudiante').toLowerCase();
          } else {
            rol = 'estudiante';
          }
        } catch { rol = 'estudiante'; }
      }

      const home =
        rol === 'profesor' ? '/index-profesor.html' :
        rol === 'administrador' ? '/index-admin.html' :
        '/index-estudiante.html';
      const homeLink = document.getElementById('homeLink');
      if (homeLink) homeLink.href = home;

      const info = document.getElementById('userInfo');
      if (info) {
        info.textContent = `${user.nombre} · ${cap(rol)}`;
        info.style.display = 'inline-flex';
      }

      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.style.display = 'inline-block';
        logoutBtn.onclick = async () => {
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
          window.location.href = '/login.html';
        };
      }

      window.__USER__ = { ...user, rolNombre: rol };
      showRoleOnly(rol);
    } catch (e) {
      console.error('initHeader error:', e);
      if (protect) window.location.href = '/login.html';
    }
  }

  window.AuthUI = { initHeader, showRoleOnly };
})();
