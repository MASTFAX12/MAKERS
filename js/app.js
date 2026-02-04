/* ============================================
   MAK TEAM HQ - Main Application
   Core application logic and UI interactions
   ============================================ */

const App = {
    /**
     * Initialize application
     */
    init() {
        // Initialize storage
        Storage.init();

        // Setup navigation
        this.setupNavigation();

        // Setup mobile menu
        this.setupMobileMenu();

        // Add scroll effects
        this.setupScrollEffects();

        // Initialize details (will remove loading screen if Effects fails)
        setTimeout(() => {
            const loading = document.querySelector('.loading-screen');
            if (loading && !loading.classList.contains('hidden')) {
                loading.classList.add('hidden');
                setTimeout(() => loading.remove(), 500);
            }
        }, 1000); // Failsafe after 1s

        console.log('🛡️ MAK Team HQ Initialized');
    },

    /**
     * Setup navigation active state
     */
    setupNavigation() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('.nav-links a').forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage) {
                link.classList.add('active');
            }
        });
    },

    /**
     * Setup mobile menu toggle
     */
    setupMobileMenu() {
        const menuToggle = document.querySelector('.menu-toggle');
        const navLinks = document.querySelector('.nav-links');

        if (menuToggle && navLinks) {
            menuToggle.addEventListener('click', () => {
                navLinks.classList.toggle('active');
                menuToggle.classList.toggle('active');
            });

            // Close menu when clicking a link
            navLinks.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    navLinks.classList.remove('active');
                    menuToggle.classList.remove('active');
                });
            });
        }
    },

    /**
     * Setup scroll effects
     */
    setupScrollEffects() {
        // Navbar background on scroll
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 50) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
            });
        }

        // Animate elements on scroll
        this.setupScrollAnimations();
    },

    /**
     * Setup scroll-triggered animations
     */
    setupScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('[data-animate]').forEach(el => {
            observer.observe(el);
        });
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const container = document.querySelector('.toast-container') || this.createToastContainer();

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
      <span class="toast-icon">${icons[type]}</span>
      <span class="toast-message">${message}</span>
    `;

        container.appendChild(toast);

        // Remove after 4 seconds
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    /**
     * Create toast container
     */
    createToastContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    },

    /**
     * Show modal
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    },

    /**
     * Hide modal
     */
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },

    /**
     * Setup modal close handlers
     */
    setupModals() {
        // Close on overlay click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        });

        // Close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.modal-overlay').classList.remove('active');
                document.body.style.overflow = '';
            });
        });

        // ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.active').forEach(modal => {
                    modal.classList.remove('active');
                });
                document.body.style.overflow = '';
            }
        });
    },

    /**
     * Format date to Arabic
     */
    formatDate(date) {
        const d = new Date(date);
        return d.toLocaleDateString('ar-IQ', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    /**
     * Format relative date
     */
    formatRelativeDate(date) {
        const d = new Date(date);
        const now = new Date();
        const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));

        if (diff === 0) return 'اليوم';
        if (diff === 1) return 'أمس';
        if (diff < 7) return `منذ ${diff} أيام`;
        if (diff < 30) return `منذ ${Math.floor(diff / 7)} أسابيع`;
        return this.formatDate(date);
    },

    /**
     * Get greeting based on time
     */
    getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return 'صباح الخير';
        if (hour < 17) return 'مساء الخير';
        return 'مساء الخير';
    },

    /**
     * Get settings
     */
    getSettings() {
        return Storage.get(Storage.KEYS.SETTINGS);
    },

    /**
     * Update settings
     */
    updateSettings(updates) {
        const settings = this.getSettings();
        const newSettings = { ...settings, ...updates };
        Storage.set(Storage.KEYS.SETTINGS, newSettings);
        return newSettings;
    },

    /**
     * Export data as JSON
     */
    exportData() {
        const data = {
            members: Storage.get(Storage.KEYS.MEMBERS),
            projects: Storage.get(Storage.KEYS.PROJECTS),
            settings: Storage.get(Storage.KEYS.SETTINGS),
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mak-team-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showToast('تم تصدير البيانات بنجاح', 'success');
    },

    /**
     * Import data from JSON
     */
    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                if (data.members) Storage.set(Storage.KEYS.MEMBERS, data.members);
                if (data.projects) Storage.set(Storage.KEYS.PROJECTS, data.projects);
                if (data.settings) Storage.set(Storage.KEYS.SETTINGS, data.settings);

                this.showToast('تم استيراد البيانات بنجاح', 'success');
                setTimeout(() => location.reload(), 1000);
            } catch (error) {
                this.showToast('خطأ في قراءة الملف', 'error');
            }
        };
        reader.readAsText(file);
    },

    /**
     * Reset all data
     */
    resetData() {
        if (confirm('هل أنت متأكد؟ سيتم حذف جميع البيانات!')) {
            Storage.clear();
            Storage.init();
            this.showToast('تم إعادة تعيين البيانات', 'success');
            setTimeout(() => location.reload(), 1000);
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
