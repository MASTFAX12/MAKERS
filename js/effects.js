/* ============================================
   MAK TEAM HQ - Advanced Effects JavaScript
   Particles, sounds, notifications, achievements
   ============================================ */

const Effects = {
    // Sound effects
    sounds: {
        click: null,
        success: null,
        notification: null,
        levelUp: null
    },
    soundEnabled: true,

    /**
     * Initialize all effects
     */
    init() {
        this.createLoadingScreen();
        this.createParticles();
        this.initSounds();
        this.initNotifications();
        this.initQuickActions();
        this.initAchievements();

        // Hide loading screen immediately
        this.hideLoadingScreen();
    },

    /**
     * Create loading screen
     */
    createLoadingScreen() {
        if (document.querySelector('.loading-screen')) return;

        const loading = document.createElement('div');
        loading.className = 'loading-screen';
        loading.innerHTML = `
      <img src="assets/images/logo.jpg" alt="MAK" class="loading-logo">
      <div class="loading-text">MAK Team HQ</div>
      <div class="loading-bar">
        <div class="loading-progress"></div>
      </div>
    `;
        document.body.prepend(loading);
    },

    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        const loading = document.querySelector('.loading-screen');
        if (loading) {
            loading.classList.add('hidden');
            loading.style.opacity = '0';
            loading.style.pointerEvents = 'none';
            setTimeout(() => loading.remove(), 500);
        }
    },

    /**
     * Create particle background
     */
    createParticles() {
        if (document.getElementById('particles-container')) return;

        const container = document.createElement('div');
        container.id = 'particles-container';

        // Create 30 particles
        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDuration = (Math.random() * 20 + 10) + 's';
            particle.style.animationDelay = (Math.random() * 10) + 's';
            particle.style.width = (Math.random() * 4 + 2) + 'px';
            particle.style.height = particle.style.width;
            container.appendChild(particle);
        }

        document.body.prepend(container);
    },

    /**
     * Create matrix rain effect
     */
    createMatrixRain() {
        const container = document.createElement('div');
        container.className = 'matrix-rain';

        const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノ';
        const columns = Math.floor(window.innerWidth / 20);

        for (let i = 0; i < columns; i++) {
            const column = document.createElement('div');
            column.className = 'matrix-column';
            column.style.left = (i * 20) + 'px';
            column.style.animationDuration = (Math.random() * 10 + 5) + 's';
            column.style.animationDelay = (Math.random() * 5) + 's';

            // Random characters
            let text = '';
            for (let j = 0; j < 30; j++) {
                text += chars[Math.floor(Math.random() * chars.length)];
            }
            column.textContent = text;
            container.appendChild(column);
        }

        document.body.prepend(container);
    },

    /**
     * Initialize sounds (using Web Audio API for simple tones)
     */
    initSounds() {
        // Check if sound was previously disabled
        this.soundEnabled = localStorage.getItem('mak_sound') !== 'false';
        this.createSoundToggle();
    },

    /**
     * Create sound toggle button
     */
    createSoundToggle() {
        const toggle = document.createElement('div');
        toggle.className = 'sound-toggle' + (this.soundEnabled ? '' : ' muted');
        toggle.innerHTML = this.soundEnabled ? '🔊' : '🔇';
        toggle.onclick = () => this.toggleSound();
        document.body.appendChild(toggle);
    },

    /**
     * Toggle sound
     */
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        localStorage.setItem('mak_sound', this.soundEnabled);

        const toggle = document.querySelector('.sound-toggle');
        if (toggle) {
            toggle.innerHTML = this.soundEnabled ? '🔊' : '🔇';
            toggle.classList.toggle('muted', !this.soundEnabled);
        }
    },

    /**
     * Play click sound
     */
    playClick() {
        if (!this.soundEnabled) return;
        this.playTone(800, 0.05);
    },

    /**
     * Play success sound
     */
    playSuccess() {
        if (!this.soundEnabled) return;
        this.playTone(523, 0.1);
        setTimeout(() => this.playTone(659, 0.1), 100);
        setTimeout(() => this.playTone(784, 0.15), 200);
    },

    /**
     * Play notification sound
     */
    playNotification() {
        if (!this.soundEnabled) return;
        this.playTone(880, 0.1);
        setTimeout(() => this.playTone(1047, 0.1), 150);
    },

    /**
     * Play tone using Web Audio API
     */
    playTone(frequency, duration) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        } catch (e) {
            // Audio not supported
        }
    },

    /**
     * Initialize notifications
     */
    initNotifications() {
        this.checkDeadlineNotifications();

        // Check every minute
        setInterval(() => this.checkDeadlineNotifications(), 60000);
    },

    /**
     * Check for deadline notifications
     */
    checkDeadlineNotifications() {
        const projects = Storage.get(Storage.KEYS.PROJECTS) || [];
        const now = new Date();

        const notifications = [];

        projects.forEach(project => {
            if (project.status === 'completed') return;

            const deadline = new Date(project.deadline);
            const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

            if (daysLeft <= 0) {
                notifications.push({
                    type: 'urgent',
                    icon: '🚨',
                    title: 'مشروع متأخر!',
                    message: project.title,
                    time: 'الآن'
                });
            } else if (daysLeft <= 2) {
                notifications.push({
                    type: 'warning',
                    icon: '⚠️',
                    title: `${daysLeft} يوم متبقي`,
                    message: project.title,
                    time: App.formatDate(deadline)
                });
            } else if (daysLeft <= 7) {
                notifications.push({
                    type: 'info',
                    icon: '📅',
                    title: `${daysLeft} أيام متبقية`,
                    message: project.title,
                    time: App.formatDate(deadline)
                });
            }
        });

        this.updateNotificationBadge(notifications.length);
        this.renderNotifications(notifications);
    },

    /**
     * Update notification badge
     */
    updateNotificationBadge(count) {
        let badge = document.querySelector('.notification-bell .badge');
        const bell = document.querySelector('.notification-bell');

        if (!bell) return;

        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'badge';
                bell.appendChild(badge);
            }
            badge.textContent = count > 9 ? '9+' : count;
        } else if (badge) {
            badge.remove();
        }
    },

    /**
     * Render notifications dropdown
     */
    renderNotifications(notifications) {
        const container = document.querySelector('.notification-list');
        if (!container) return;

        if (notifications.length === 0) {
            container.innerHTML = '<div class="notification-item"><div class="notification-content">لا توجد إشعارات 🎉</div></div>';
            return;
        }

        container.innerHTML = notifications.map(n => `
      <div class="notification-item unread">
        <div class="notification-icon">${n.icon}</div>
        <div class="notification-content">
          <div class="notification-title">${n.title}</div>
          <div class="notification-message">${n.message}</div>
          <div class="notification-time">${n.time}</div>
        </div>
      </div>
    `).join('');
    },

    /**
     * Initialize quick actions
     */
    initQuickActions() {
        if (document.querySelector('.quick-actions')) return;
        if (!Auth.isLoggedIn()) return;

        const quickActions = document.createElement('div');
        quickActions.className = 'quick-actions';
        quickActions.innerHTML = `
      <button class="quick-actions-toggle">+</button>
      <div class="quick-actions-menu">
        <button class="quick-action-btn" onclick="showSection('add-project')" title="مشروع جديد">📋</button>
        <button class="quick-action-btn" onclick="App.exportData()" title="تصدير">📤</button>
        <button class="quick-action-btn" onclick="location.href='projects.html'" title="المشاريع">📂</button>
      </div>
    `;

        quickActions.querySelector('.quick-actions-toggle').onclick = function () {
            quickActions.classList.toggle('active');
            this.classList.toggle('active');
        };

        document.body.appendChild(quickActions);
    },

    /**
     * Initialize achievements system
     */
    initAchievements() {
        const achievements = this.calculateAchievements();
        this.saveAchievements(achievements);
    },

    /**
     * Calculate achievements
     */
    calculateAchievements() {
        const projects = Storage.get(Storage.KEYS.PROJECTS) || [];
        const members = Storage.get(Storage.KEYS.MEMBERS) || [];

        const completedProjects = projects.filter(p => p.status === 'completed').length;
        const totalProjects = projects.length;

        return {
            firstProject: totalProjects >= 1,
            fiveProjects: totalProjects >= 5,
            tenProjects: totalProjects >= 10,
            firstComplete: completedProjects >= 1,
            fiveComplete: completedProjects >= 5,
            perfectTeam: projects.some(p => p.assignedMembers.length === 6),
            speedster: projects.some(p => {
                const created = new Date(p.createdDate);
                const completed = p.completedDate ? new Date(p.completedDate) : null;
                if (!completed) return false;
                return (completed - created) < (24 * 60 * 60 * 1000); // Less than 1 day
            }),
            allSubjects: this.hasAllSubjectsProjects()
        };
    },

    /**
     * Check if has projects in all subjects
     */
    hasAllSubjectsProjects() {
        const projects = Storage.get(Storage.KEYS.PROJECTS) || [];
        const settings = Storage.get(Storage.KEYS.SETTINGS);
        const subjects = settings.subjects.map(s => s.id);

        const usedSubjects = new Set(projects.map(p => p.subject));
        return subjects.every(s => usedSubjects.has(s));
    },

    /**
     * Save achievements
     */
    saveAchievements(achievements) {
        localStorage.setItem('mak_achievements', JSON.stringify(achievements));
    },

    /**
     * Get achievements
     */
    getAchievements() {
        const stored = localStorage.getItem('mak_achievements');
        return stored ? JSON.parse(stored) : {};
    },

    /**
     * Render achievements
     */
    renderAchievements(container) {
        const achievements = this.getAchievements();

        const badgesList = [
            { id: 'firstProject', icon: '🎯', name: 'البداية', description: 'أول مشروع' },
            { id: 'fiveProjects', icon: '⭐', name: 'نجم صاعد', description: '5 مشاريع' },
            { id: 'tenProjects', icon: '🏆', name: 'متميز', description: '10 مشاريع' },
            { id: 'firstComplete', icon: '✅', name: 'منجز', description: 'أول إنجاز' },
            { id: 'fiveComplete', icon: '🎖️', name: 'محترف', description: '5 إنجازات' },
            { id: 'perfectTeam', icon: '👥', name: 'فريق كامل', description: 'مشروع بكل الأعضاء' },
            { id: 'speedster', icon: '⚡', name: 'سريع', description: 'إنجاز في يوم' },
            { id: 'allSubjects', icon: '📚', name: 'شامل', description: 'مشاريع بكل المواد' }
        ];

        container.innerHTML = badgesList.map(badge => `
      <div class="achievement-badge ${achievements[badge.id] ? 'earned' : 'locked'}">
        ${badge.icon}
        <span class="tooltip">${badge.name}: ${badge.description}</span>
      </div>
    `).join('');
    },

    /**
     * Show confetti animation
     */
    showConfetti() {
        const container = document.createElement('div');
        container.className = 'confetti-container';

        const colors = ['#00a8ff', '#ff8c00', '#00ff88', '#ff4444', '#ffcc00'];

        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 2 + 's';
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            container.appendChild(confetti);
        }

        document.body.appendChild(container);

        this.playSuccess();

        setTimeout(() => container.remove(), 5000);
    },

    /**
     * Calculate team level
     */
    calculateLevel() {
        const projects = Storage.get(Storage.KEYS.PROJECTS) || [];
        const completed = projects.filter(p => p.status === 'completed').length;

        const xp = completed * 100 + projects.length * 20;
        const level = Math.floor(xp / 500) + 1;
        const currentXP = xp % 500;
        const nextLevelXP = 500;

        const levelNames = [
            'مبتدئ', 'متعلم', 'ناشط', 'متقدم', 'محترف',
            'خبير', 'ماهر', 'أسطورة', 'عبقري', 'أيقونة'
        ];

        return {
            level,
            name: levelNames[Math.min(level - 1, levelNames.length - 1)],
            xp: currentXP,
            nextXP: nextLevelXP,
            percentage: (currentXP / nextLevelXP) * 100
        };
    },

    /**
     * Render level badge
     */
    renderLevelBadge(container) {
        const levelData = this.calculateLevel();

        container.innerHTML = `
      <div class="level-badge">
        <div class="level-icon">${levelData.level}</div>
        <div class="level-info">
          <div class="level-name">${levelData.name}</div>
          <div class="level-progress">
            <div class="level-fill" style="width: ${levelData.percentage}%"></div>
          </div>
          <div class="level-xp">${levelData.xp} / ${levelData.nextXP} XP</div>
        </div>
      </div>
    `;
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    Effects.init();
});

// Add click sounds to buttons
document.addEventListener('click', (e) => {
    if (e.target.matches('button, .btn, a')) {
        Effects.playClick();
    }
});

