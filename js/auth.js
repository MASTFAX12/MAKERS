/* ============================================
   MAK TEAM HQ - Authentication Module
   Per-member authentication with PINs
   ============================================ */

const Auth = {
    // Session storage key
    SESSION_KEY: 'mak_session',

    /**
     * Get default PINs for members
     * Each member has a unique default PIN
     */
    getDefaultPins() {
        return {
            'mustafa': { pin: '1111', name: 'مصطفى', avatar: 'م', role: 'قائد الفريق' },
            'mohammed': { pin: '2222', name: 'محمد', avatar: 'ح', role: 'مطور' },
            'ibrahim': { pin: '3333', name: 'ابراهيم', avatar: 'إ', role: 'محلل أمني' },
            'mazen': { pin: '4444', name: 'مازن', avatar: 'ز', role: 'مختبر اختراق' },
            'murtada': { pin: '5555', name: 'مرتضى', avatar: 'ر', role: 'محلل بيانات' },
            'pavel': { pin: '6666', name: 'بافيل', avatar: 'ب', role: 'مطور ويب' }
        };
    },

    /**
     * Initialize authentication system
     * Sets up default PINs if not already set
     */
    init() {
        const existingPins = Storage.get('mak_member_pins');
        if (!existingPins) {
            Storage.set('mak_member_pins', this.getDefaultPins());
        }
    },

    /**
     * Get all member PINs
     */
    getMemberPins() {
        return Storage.get('mak_member_pins') || this.getDefaultPins();
    },

    /**
     * Authenticate member by PIN
     * @param {string} pin - The PIN entered by user
     * @returns {Object|null} - Member data if authenticated, null otherwise
     */
    authenticate(pin) {
        const memberPins = this.getMemberPins();

        for (const [memberId, memberData] of Object.entries(memberPins)) {
            if (memberData.pin === pin) {
                // Create session
                const session = {
                    memberId: memberId,
                    name: memberData.name,
                    avatar: memberData.avatar,
                    role: memberData.role,
                    loginTime: new Date().toISOString()
                };

                sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));

                // Log the login
                ActivityLog.log('login', memberId, {
                    message: `${memberData.name} سجل دخولاً`
                });

                return session;
            }
        }

        return null;
    },

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return sessionStorage.getItem(this.SESSION_KEY) !== null;
    },

    /**
     * Get current logged-in session
     */
    getSession() {
        const session = sessionStorage.getItem(this.SESSION_KEY);
        return session ? JSON.parse(session) : null;
    },

    /**
     * Get current logged-in member
     */
    getCurrentMember() {
        const session = this.getSession();
        if (!session) return null;

        const members = Storage.get(Storage.KEYS.MEMBERS) || [];
        return members.find(m => m.id === session.memberId) || {
            id: session.memberId,
            name: session.name,
            avatar: session.avatar,
            role: session.role
        };
    },

    /**
     * Logout current user
     */
    logout() {
        const session = this.getSession();
        if (session) {
            ActivityLog.log('logout', session.memberId, {
                message: `${session.name} سجل خروجاً`
            });
        }

        sessionStorage.removeItem(this.SESSION_KEY);
        window.location.href = 'login.html';
    },

    /**
     * Change PIN for a member
     * @param {string} memberId - Member ID
     * @param {string} oldPin - Current PIN
     * @param {string} newPin - New PIN
     */
    changePin(memberId, oldPin, newPin) {
        const memberPins = this.getMemberPins();

        if (!memberPins[memberId]) {
            return { success: false, message: 'العضو غير موجود' };
        }

        if (memberPins[memberId].pin !== oldPin) {
            return { success: false, message: 'الرمز الحالي غير صحيح' };
        }

        if (newPin.length < 4) {
            return { success: false, message: 'الرمز يجب أن يكون 4 أرقام على الأقل' };
        }

        // Check if PIN is already used by another member
        for (const [id, data] of Object.entries(memberPins)) {
            if (id !== memberId && data.pin === newPin) {
                return { success: false, message: 'هذا الرمز مستخدم من قبل عضو آخر' };
            }
        }

        memberPins[memberId].pin = newPin;
        Storage.set('mak_member_pins', memberPins);

        ActivityLog.log('pin_change', memberId, {
            message: `${memberPins[memberId].name} غيّر رمزه الشخصي`
        });

        return { success: true, message: 'تم تغيير الرمز بنجاح' };
    },

    /**
     * Protect a page - redirect to login if not authenticated
     */
    protectPage() {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },

    /**
     * Initialize login form
     */
    initLoginForm() {
        this.init();

        const form = document.getElementById('loginForm');
        const errorDiv = document.getElementById('loginError');

        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const pin = document.getElementById('pin').value;
            const result = this.authenticate(pin);

            if (result) {
                window.location.href = 'dashboard.html';
            } else {
                errorDiv.textContent = 'الرمز غير صحيح';
                errorDiv.style.display = 'block';
                form.classList.add('shake');
                setTimeout(() => form.classList.remove('shake'), 500);
            }
        });
    }
};

/* ============================================
   Activity Log Module
   Tracks all user actions
   ============================================ */

const ActivityLog = {
    LOG_KEY: 'mak_activity_log',
    MAX_LOGS: 500, // Keep last 500 entries

    /**
     * Log an activity
     * @param {string} action - Action type
     * @param {string} memberId - Who performed the action
     * @param {Object} details - Additional details
     */
    log(action, memberId, details = {}) {
        const logs = this.getAll();

        const entry = {
            id: 'log_' + Date.now(),
            timestamp: new Date().toISOString(),
            action: action,
            memberId: memberId,
            details: details
        };

        logs.unshift(entry);

        // Keep only last MAX_LOGS entries
        if (logs.length > this.MAX_LOGS) {
            logs.length = this.MAX_LOGS;
        }

        localStorage.setItem(this.LOG_KEY, JSON.stringify(logs));
    },

    /**
     * Get all logs
     */
    getAll() {
        const logs = localStorage.getItem(this.LOG_KEY);
        return logs ? JSON.parse(logs) : [];
    },

    /**
     * Get logs by member
     */
    getByMember(memberId) {
        return this.getAll().filter(log => log.memberId === memberId);
    },

    /**
     * Get logs by action type
     */
    getByAction(action) {
        return this.getAll().filter(log => log.action === action);
    },

    /**
     * Get recent logs
     */
    getRecent(count = 20) {
        return this.getAll().slice(0, count);
    },

    /**
     * Clear all logs
     */
    clear() {
        localStorage.removeItem(this.LOG_KEY);
    },

    /**
     * Get action display info
     */
    getActionInfo(action) {
        const actions = {
            'login': { icon: 'log-in', label: 'تسجيل دخول', color: 'var(--success)' },
            'logout': { icon: 'log-out', label: 'تسجيل خروج', color: 'var(--text-secondary)' },
            'project_create': { icon: 'folder-plus', label: 'إنشاء مشروع', color: 'var(--accent-blue)' },
            'project_update': { icon: 'edit', label: 'تعديل مشروع', color: 'var(--accent-orange)' },
            'project_complete': { icon: 'check-circle', label: 'إكمال مشروع', color: 'var(--success)' },
            'project_delete': { icon: 'trash-2', label: 'حذف مشروع', color: 'var(--danger)' },
            'file_upload': { icon: 'upload', label: 'رفع ملف', color: 'var(--accent-blue)' },
            'file_delete': { icon: 'file-minus', label: 'حذف ملف', color: 'var(--danger)' },
            'pin_change': { icon: 'key', label: 'تغيير الرمز', color: 'var(--accent-orange)' },
            'status_change': { icon: 'refresh-cw', label: 'تغيير الحالة', color: 'var(--accent-orange)' },
            'data_export': { icon: 'download', label: 'تصدير البيانات', color: 'var(--accent-blue)' },
            'data_import': { icon: 'upload', label: 'استيراد البيانات', color: 'var(--accent-blue)' }
        };

        return actions[action] || { icon: 'activity', label: action, color: 'var(--text-secondary)' };
    },

    /**
     * Render activity log
     */
    render(container, options = {}) {
        const logs = options.memberId
            ? this.getByMember(options.memberId)
            : this.getRecent(options.count || 20);

        const memberPins = Auth.getMemberPins();

        if (logs.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    <i data-lucide="activity" style="width: 48px; height: 48px; margin-bottom: 1rem;"></i>
                    <p>لا توجد أنشطة مسجلة</p>
                </div>
            `;
            return;
        }

        container.innerHTML = logs.map(log => {
            const actionInfo = this.getActionInfo(log.action);
            const member = memberPins[log.memberId] || { name: 'غير معروف', avatar: '👤' };
            const date = new Date(log.timestamp);
            const timeAgo = this.getTimeAgo(date);

            return `
                <div class="log-item">
                    <div class="log-icon" style="color: ${actionInfo.color};">
                        <i data-lucide="${actionInfo.icon}"></i>
                    </div>
                    <div class="log-content">
                        <div class="log-action">${log.details.message || actionInfo.label}</div>
                        <div class="log-meta">
                            <span class="log-member">${member.avatar} ${member.name}</span>
                            <span class="log-time">${timeAgo}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

    /**
     * Get time ago string
     */
    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'الآن';
        if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
        if (diffHours < 24) return `منذ ${diffHours} ساعة`;
        if (diffDays < 7) return `منذ ${diffDays} يوم`;

        return date.toLocaleDateString('ar-IQ');
    }
};

// Initialize Auth on load
document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
});
