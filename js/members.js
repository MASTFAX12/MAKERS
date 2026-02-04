/* ============================================
   MAK TEAM HQ - Members Module
   Handles member-related operations
   ============================================ */

const Members = {
    /**
     * Get all members
     */
    getAll() {
        return Storage.get(Storage.KEYS.MEMBERS) || [];
    },

    /**
     * Get member by ID
     */
    getById(id) {
        const members = this.getAll();
        return members.find(m => m.id === id);
    },

    /**
     * Update member
     */
    update(id, updates) {
        const members = this.getAll();
        const index = members.findIndex(m => m.id === id);

        if (index !== -1) {
            members[index] = { ...members[index], ...updates };
            Storage.set(Storage.KEYS.MEMBERS, members);
            return members[index];
        }
        return null;
    },

    /**
     * Update member availability
     */
    setAvailability(id, availability) {
        return this.update(id, { availability });
    },

    /**
     * Get member statistics
     */
    getStats(id) {
        const member = this.getById(id);
        return member ? member.stats : null;
    },

    /**
     * Render member card HTML
     */
    renderCard(member, showStats = true) {
        const statsHTML = showStats ? `
      <div class="member-stats">
        <div class="member-stat">
          <span class="member-stat-value">${member.stats.completedProjects}</span>
          <span class="member-stat-label">مكتمل</span>
        </div>
        <div class="member-stat">
          <span class="member-stat-value">${member.stats.activeProjects}</span>
          <span class="member-stat-label">جاري</span>
        </div>
        <div class="member-stat">
          <span class="member-stat-value">${member.stats.contributionScore}</span>
          <span class="member-stat-label">نقاط</span>
        </div>
      </div>
    ` : '';

        return `
      <div class="card member-card" data-id="${member.id}">
        <div class="member-avatar">${member.avatar}</div>
        <h3 class="member-name">${member.name}</h3>
        <span class="member-role">${member.role}</span>
        <div class="availability-badge ${member.availability}">
          ${this.getAvailabilityText(member.availability)}
        </div>
        ${statsHTML}
      </div>
    `;
    },

    /**
     * Render all member cards
     */
    renderAllCards(container, showStats = true) {
        const members = this.getAll();
        container.innerHTML = members.map(m => this.renderCard(m, showStats)).join('');
    },

    /**
     * Render contribution chart
     */
    renderContributionChart(container) {
        const members = this.getAll();
        const maxScore = Math.max(...members.map(m => m.stats.contributionScore));

        const html = members
            .sort((a, b) => b.stats.contributionScore - a.stats.contributionScore)
            .map(member => {
                const percentage = maxScore > 0
                    ? (member.stats.contributionScore / maxScore) * 100
                    : 0;

                return `
          <li class="contribution-item">
            <div class="contribution-avatar">${member.avatar}</div>
            <div class="contribution-info">
              <div class="contribution-name">${member.name}</div>
              <div class="contribution-bar">
                <div class="contribution-fill" style="width: ${percentage}%"></div>
              </div>
            </div>
            <span class="contribution-value">${member.stats.contributionScore}</span>
          </li>
        `;
            })
            .join('');

        container.innerHTML = html;
    },

    /**
     * Get availability text
     */
    getAvailabilityText(availability) {
        const texts = {
            'available': '✅ متاح',
            'busy': '⏳ مشغول',
            'away': '🔴 غير متاح'
        };
        return texts[availability] || availability;
    },

    /**
     * Get total stats
     */
    getTotalStats() {
        const members = this.getAll();
        return {
            totalMembers: members.length,
            totalProjects: members.reduce((sum, m) => sum + m.stats.totalProjects, 0),
            completedProjects: members.reduce((sum, m) => sum + m.stats.completedProjects, 0),
            activeProjects: members.reduce((sum, m) => sum + m.stats.activeProjects, 0)
        };
    }
};
