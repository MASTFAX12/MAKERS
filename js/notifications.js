/**
 * MAK Platform v3.0 - Notifications System
 * Real-time notifications with Firebase
 */

const Notifications = {
    // Notification types
    TYPES: {
        PROJECT_CREATED: 'project_created',
        PROJECT_COMPLETED: 'project_completed',
        DEADLINE_APPROACHING: 'deadline_approaching',
        DEADLINE_PASSED: 'deadline_passed',
        RISK_ALERT: 'risk_alert',
        MEMBER_ASSIGNED: 'member_assigned',
        FILE_UPLOADED: 'file_uploaded',
        COMMENT_ADDED: 'comment_added',
        AI_SUGGESTION: 'ai_suggestion',
        SYSTEM: 'system'
    },

    // Unread count
    unreadCount: 0,

    // Notifications list
    notifications: [],

    // Event callbacks
    onUpdate: null,

    /**
     * Initialize notifications
     */
    async init() {
        // Load initial notifications
        await this.loadNotifications();

        // Listen for real-time updates
        document.addEventListener('firebase:notifications', (e) => {
            this.notifications = e.detail || [];
            this.updateUnreadCount();
            if (this.onUpdate) this.onUpdate(this.notifications);
        });

        // Check deadlines periodically
        this.startDeadlineChecker();
    },

    /**
     * Load notifications from Firebase
     */
    async loadNotifications() {
        try {
            const session = Auth.getSession();
            if (!session) return;

            const allNotifications = await FirebaseDB.get(FirebaseDB.PATHS.NOTIFICATIONS);

            if (allNotifications) {
                // Filter notifications for current user
                this.notifications = Object.values(allNotifications)
                    .filter(n => !n.targetMember || n.targetMember === session.memberId)
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .slice(0, 50); // Keep last 50
            }

            this.updateUnreadCount();

        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    },

    /**
     * Create a new notification
     */
    async create(notification) {
        try {
            const fullNotification = {
                ...notification,
                id: 'notif_' + Date.now(),
                read: false,
                createdAt: new Date().toISOString()
            };

            await FirebaseDB.createNotification(fullNotification);

            // Show toast for real-time feedback
            this.showToast(fullNotification);

            return fullNotification.id;

        } catch (error) {
            console.error('Failed to create notification:', error);
            return null;
        }
    },

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId) {
        try {
            await FirebaseDB.markNotificationRead(notificationId);

            const notif = this.notifications.find(n => n.id === notificationId);
            if (notif) notif.read = true;

            this.updateUnreadCount();

        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    },

    /**
     * Mark all as read
     */
    async markAllAsRead() {
        for (const notif of this.notifications.filter(n => !n.read)) {
            await this.markAsRead(notif.id);
        }
    },

    /**
     * Update unread count
     */
    updateUnreadCount() {
        this.unreadCount = this.notifications.filter(n => !n.read).length;

        // Update UI badge
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            badge.style.display = this.unreadCount > 0 ? 'flex' : 'none';
        }
    },

    /**
     * Show toast notification
     */
    showToast(notification) {
        const icon = this.getIcon(notification.type);
        App.showToast(`${notification.title}`, 'info');
    },

    /**
     * Get notification icon
     */
    getIcon(type) {
        const icons = {
            'project_created': 'folder-plus',
            'project_completed': 'check-circle',
            'deadline_approaching': 'clock',
            'deadline_passed': 'alert-triangle',
            'risk_alert': 'alert-octagon',
            'member_assigned': 'user-plus',
            'file_uploaded': 'upload',
            'comment_added': 'message-circle',
            'ai_suggestion': 'sparkles',
            'system': 'info'
        };
        return icons[type] || 'bell';
    },

    /**
     * Get notification color
     */
    getColor(type) {
        const colors = {
            'project_completed': 'var(--success)',
            'deadline_approaching': 'var(--accent-orange)',
            'deadline_passed': 'var(--danger)',
            'risk_alert': 'var(--danger)',
            'ai_suggestion': 'var(--accent-purple, #8b5cf6)'
        };
        return colors[type] || 'var(--accent-blue)';
    },

    /**
     * Start deadline checker
     */
    startDeadlineChecker() {
        // Check every hour
        setInterval(() => this.checkDeadlines(), 60 * 60 * 1000);

        // Initial check
        setTimeout(() => this.checkDeadlines(), 5000);
    },

    /**
     * Check project deadlines
     */
    async checkDeadlines() {
        try {
            const projects = await FirebaseDB.getProjects() || Projects.getAll();
            const now = new Date();
            const session = Auth.getSession();
            if (!session) return;

            for (const project of projects) {
                if (project.status === 'completed') continue;
                if (!project.assignedMembers?.includes(session.memberId)) continue;

                const deadline = new Date(project.deadline);
                const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

                // Check if already notified today
                const notifiedKey = `notified_${project.id}_${now.toDateString()}`;
                if (localStorage.getItem(notifiedKey)) continue;

                if (daysLeft < 0) {
                    // Deadline passed
                    await this.create({
                        type: this.TYPES.DEADLINE_PASSED,
                        title: `موعد "${project.title}" انتهى!`,
                        message: `تجاوز الموعد النهائي بـ ${Math.abs(daysLeft)} يوم`,
                        targetMember: session.memberId,
                        projectId: project.id
                    });
                    localStorage.setItem(notifiedKey, 'true');

                } else if (daysLeft <= 2) {
                    // Deadline approaching
                    await this.create({
                        type: this.TYPES.DEADLINE_APPROACHING,
                        title: `موعد "${project.title}" قريب!`,
                        message: daysLeft === 0 ? 'الموعد اليوم!' : `باقي ${daysLeft} يوم`,
                        targetMember: session.memberId,
                        projectId: project.id
                    });
                    localStorage.setItem(notifiedKey, 'true');
                }
            }

        } catch (error) {
            console.error('Deadline check failed:', error);
        }
    },

    /**
     * Render notifications panel HTML
     */
    renderPanel() {
        const empty = this.notifications.length === 0;

        return `
            <div class="notifications-panel">
                <div class="notifications-header">
                    <h3><i data-lucide="bell"></i> الإشعارات</h3>
                    ${!empty ? `<button class="btn-link" onclick="Notifications.markAllAsRead()">قراءة الكل</button>` : ''}
                </div>
                <div class="notifications-list">
                    ${empty ? `
                        <div class="notifications-empty">
                            <i data-lucide="bell-off" style="width:48px;height:48px;opacity:0.3"></i>
                            <p>لا توجد إشعارات</p>
                        </div>
                    ` : this.notifications.map(n => this.renderNotification(n)).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Render single notification
     */
    renderNotification(notif) {
        const timeAgo = this.getTimeAgo(notif.createdAt);
        const icon = this.getIcon(notif.type);
        const color = this.getColor(notif.type);

        return `
            <div class="notification-item ${notif.read ? 'read' : 'unread'}" 
                 onclick="Notifications.handleClick('${notif.id}', '${notif.projectId || ''}')">
                <div class="notification-icon" style="color: ${color}">
                    <i data-lucide="${icon}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notif.title}</div>
                    <div class="notification-message">${notif.message || ''}</div>
                    <div class="notification-time">${timeAgo}</div>
                </div>
                ${notif.aiGenerated ? '<span class="ai-badge">AI</span>' : ''}
            </div>
        `;
    },

    /**
     * Handle notification click
     */
    handleClick(notificationId, projectId) {
        this.markAsRead(notificationId);

        if (projectId) {
            window.location.href = `manage.html?id=${projectId}`;
        }
    },

    /**
     * Get relative time
     */
    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'الآن';
        if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
        if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
        if (seconds < 604800) return `منذ ${Math.floor(seconds / 86400)} يوم`;

        return date.toLocaleDateString('ar-IQ');
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Notifications;
}

