/* ============================================
   Team Access Visibility
   Hide member-login links for public visitors
   ============================================ */

const TeamAccess = {
  SESSION_KEY: 'mak_session',
  TEAM_ACCESS_KEY: 'mak_team_access',

  hasTeamAccess() {
    try {
      const hasSession = sessionStorage.getItem(this.SESSION_KEY) !== null;
      const hasFlag = localStorage.getItem(this.TEAM_ACCESS_KEY) === '1';
      return hasSession || hasFlag;
    } catch (error) {
      return false;
    }
  },

  init() {
    const visible = this.hasTeamAccess();
    document.querySelectorAll('[data-team-login]').forEach(el => {
      if (visible) {
        el.style.display = '';
        const li = el.closest('li');
        if (li) li.style.display = '';
        return;
      }

      const li = el.closest('li');
      if (li && li.children.length === 1) {
        li.style.display = 'none';
      } else {
        el.style.display = 'none';
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  TeamAccess.init();
});

