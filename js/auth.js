/* ============================================
   MAK TEAM HQ - Authentication Module
   Passwordless access via leader + invite links
   ============================================ */

const Auth = {
    SESSION_KEY: 'mak_session',
    TEAM_ACCESS_KEY: 'mak_team_access',
    INVITES_KEY: 'mak_invites',
    LEADER_TOKEN_HASH_KEY: 'mak_leader_token_hash',
    LEADER_MEMBER_ID: 'member_001',

    PERMISSIONS: {
        PROJECTS_VIEW: 'projects_view',
        PROJECTS_CREATE: 'projects_create',
        PROJECTS_MANAGE: 'projects_manage',
        MEMBERS_VIEW: 'members_view',
        ACTIVITY_VIEW: 'activity_view',
        SETTINGS_VIEW: 'settings_view',
        ANALYTICS_VIEW: 'analytics_view'
    },

    DEFAULT_MEMBER_PERMISSIONS: ['projects_view'],

    init() {
        Storage.init();
        this.cleanupLegacyAuth();
    },

    cleanupLegacyAuth() {
        localStorage.removeItem('mak_member_pins');
    },

    getPermissionCatalog() {
        return [
            { key: this.PERMISSIONS.PROJECTS_VIEW, label: 'عرض المشاريع' },
            { key: this.PERMISSIONS.PROJECTS_CREATE, label: 'إنشاء مشروع' },
            { key: this.PERMISSIONS.PROJECTS_MANAGE, label: 'إدارة المشاريع' },
            { key: this.PERMISSIONS.MEMBERS_VIEW, label: 'عرض الأعضاء' },
            { key: this.PERMISSIONS.ACTIVITY_VIEW, label: 'عرض سجل النشاط' },
            { key: this.PERMISSIONS.SETTINGS_VIEW, label: 'الوصول للإعدادات' },
            { key: this.PERMISSIONS.ANALYTICS_VIEW, label: 'الوصول للتحليلات' }
        ];
    },

    getAllPermissionKeys() {
        return this.getPermissionCatalog().map(p => p.key);
    },

    normalizePermissions(permissions) {
        const allowed = new Set(this.getAllPermissionKeys());
        const list = Array.isArray(permissions) ? permissions : [];
        return [...new Set(list.filter(p => allowed.has(p)))];
    },

    getMembers() {
        return Storage.get(Storage.KEYS.MEMBERS) || [];
    },

    saveMembers(members) {
        Storage.set(Storage.KEYS.MEMBERS, members);
    },

    getLeaderMember() {
        const members = this.getMembers();
        return members.find(m => m.id === this.LEADER_MEMBER_ID) || null;
    },

    ensureLeaderMember() {
        const members = this.getMembers();
        let leader = members.find(m => m.id === this.LEADER_MEMBER_ID);

        if (!leader) {
            leader = {
                id: this.LEADER_MEMBER_ID,
                name: 'القائد',
                role: 'القائد',
                avatar: 'ق',
                email: '',
                stats: this.getDefaultStats(),
                availability: 'available',
                skills: [],
                permissions: this.getAllPermissionKeys()
            };
            members.unshift(leader);
            this.saveMembers(members);
        }

        return leader;
    },

    getDefaultStats() {
        const settings = Storage.get(Storage.KEYS.SETTINGS);
        const subjectExpertise = {};

        (settings?.subjects || []).forEach(subject => {
            subjectExpertise[subject.id] = 3;
        });

        if (Object.keys(subjectExpertise).length === 0) {
            ['linux', 'programming', 'ethics', 'democracy', 'math', 'english', 'engineering_drawing']
                .forEach(id => { subjectExpertise[id] = 3; });
        }

        return {
            totalProjects: 0,
            completedProjects: 0,
            activeProjects: 0,
            lastProjectDate: null,
            contributionScore: 100,
            subjectExpertise
        };
    },

    generateSecureToken(length = 64) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
        let token = '';

        if (window.crypto?.getRandomValues) {
            const array = new Uint8Array(length);
            window.crypto.getRandomValues(array);
            for (let i = 0; i < length; i += 1) {
                token += chars[array[i] % chars.length];
            }
            return token;
        }

        for (let i = 0; i < length; i += 1) {
            token += chars[Math.floor(Math.random() * chars.length)];
        }

        return token;
    },

    async hashToken(token) {
        if (window.crypto?.subtle && window.TextEncoder) {
            const bytes = new TextEncoder().encode(token);
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', bytes);
            return Array.from(new Uint8Array(hashBuffer))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        }

        return btoa(token);
    },

    getLoginUrl(params = {}) {
        const url = new URL('login.html', window.location.href);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                url.searchParams.set(key, String(value));
            }
        });
        return url.toString();
    },

    async ensureLeaderToken(forceCreate = false) {
        let tokenHash = localStorage.getItem(this.LEADER_TOKEN_HASH_KEY);

        if (!tokenHash && typeof FirebaseDB !== 'undefined' && FirebaseDB.get) {
            try {
                tokenHash = await FirebaseDB.get('auth/leaderTokenHash');
                if (tokenHash) {
                    localStorage.setItem(this.LEADER_TOKEN_HASH_KEY, tokenHash);
                }
            } catch (error) {
                console.warn('Leader token fetch failed:', error);
            }
        }

        if (tokenHash) {
            return { tokenHash, created: false };
        }

        if (!forceCreate) {
            return null;
        }

        const token = this.generateSecureToken(72);
        tokenHash = await this.hashToken(token);
        localStorage.setItem(this.LEADER_TOKEN_HASH_KEY, tokenHash);

        if (typeof FirebaseDB !== 'undefined' && FirebaseDB.set) {
            try {
                await FirebaseDB.set('auth/leaderTokenHash', tokenHash);
            } catch (error) {
                console.warn('Leader token sync failed:', error);
            }
        }

        return { token, tokenHash, created: true };
    },

    async hasLeaderAccessConfigured() {
        const config = await this.ensureLeaderToken(false);
        return !!config?.tokenHash;
    },

    async rotateLeaderToken() {
        const token = this.generateSecureToken(72);
        const tokenHash = await this.hashToken(token);

        localStorage.setItem(this.LEADER_TOKEN_HASH_KEY, tokenHash);

        if (typeof FirebaseDB !== 'undefined' && FirebaseDB.set) {
            try {
                await FirebaseDB.set('auth/leaderTokenHash', tokenHash);
            } catch (error) {
                console.warn('Leader token rotation sync failed:', error);
            }
        }

        return {
            token,
            link: this.getLoginUrl({ leaderToken: token })
        };
    },

    async loginLeaderWithToken(token) {
        const cleanedToken = (token || '').trim();
        if (!cleanedToken) {
            return { success: false, message: 'رابط القائد غير صالح' };
        }

        const config = await this.ensureLeaderToken(false);
        if (!config?.tokenHash) {
            return { success: false, message: 'لم يتم تهيئة رابط القائد بعد' };
        }

        const providedHash = await this.hashToken(cleanedToken);
        if (providedHash !== config.tokenHash) {
            return { success: false, message: 'رابط القائد غير صحيح' };
        }

        const leader = this.ensureLeaderMember();
        const session = this.createSession(leader, {
            isLeader: true,
            permissions: this.getAllPermissionKeys(),
            authType: 'leader_link'
        });

        ActivityLog.log('leader_login', leader.id, {
            message: `${leader.name} دخل عبر رابط القائد`
        });

        return { success: true, session };
    },

    createSession(member, options = {}) {
        const isLeader = options.isLeader === true || member.id === this.LEADER_MEMBER_ID;
        const permissions = isLeader
            ? this.getAllPermissionKeys()
            : this.normalizePermissions(options.permissions || member.permissions || this.DEFAULT_MEMBER_PERMISSIONS);

        const session = {
            memberId: member.id,
            name: member.name,
            avatar: member.avatar || (member.name || 'ع').charAt(0),
            role: member.role || 'عضو',
            permissions,
            isLeader,
            authType: options.authType || 'invite_link',
            loginTime: new Date().toISOString()
        };

        sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
        localStorage.setItem(this.TEAM_ACCESS_KEY, '1');

        return session;
    },

    isLoggedIn() {
        return this.getSession() !== null;
    },

    getSession() {
        try {
            const session = sessionStorage.getItem(this.SESSION_KEY);
            return session ? JSON.parse(session) : null;
        } catch (error) {
            sessionStorage.removeItem(this.SESSION_KEY);
            return null;
        }
    },

    isLeader(session = this.getSession()) {
        return !!session && !!session.isLeader;
    },

    can(permission, session = this.getSession()) {
        if (!session) return false;
        if (!permission) return true;
        if (session.isLeader) return true;

        const permissions = Array.isArray(session.permissions) ? session.permissions : [];
        return permissions.includes(permission);
    },

    getCurrentMember() {
        const session = this.getSession();
        if (!session) return null;

        const member = this.getMembers().find(m => m.id === session.memberId);
        if (member) {
            return member;
        }

        return {
            id: session.memberId,
            name: session.name,
            avatar: session.avatar,
            role: session.role,
            permissions: session.permissions || []
        };
    },

    hasTeamAccess() {
        if (this.isLoggedIn()) return true;
        return localStorage.getItem(this.TEAM_ACCESS_KEY) === '1';
    },

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

    protectPage(permission = null) {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html';
            return false;
        }

        if (permission && !this.can(permission)) {
            window.location.href = 'dashboard.html';
            return false;
        }

        return true;
    },

    getStoredInvites() {
        const invites = Storage.get(this.INVITES_KEY);
        return Array.isArray(invites) ? invites : [];
    },

    saveInvites(invites) {
        Storage.set(this.INVITES_KEY, invites);
    },

    upsertInvite(invite) {
        const invites = this.getStoredInvites();
        const index = invites.findIndex(item => item.id === invite.id);

        if (index === -1) {
            invites.unshift(invite);
        } else {
            invites[index] = invite;
        }

        this.saveInvites(invites);
    },

    async syncInvite(invite) {
        this.upsertInvite(invite);

        if (typeof FirebaseDB !== 'undefined' && FirebaseDB.set) {
            try {
                await FirebaseDB.set(`invites/${invite.id}`, invite);
            } catch (error) {
                console.warn('Invite sync failed:', error);
            }
        }
    },

    async fetchInvite(id) {
        const localInvite = this.getStoredInvites().find(invite => invite.id === id);
        if (localInvite) {
            return localInvite;
        }

        if (typeof FirebaseDB !== 'undefined' && FirebaseDB.get) {
            try {
                const remoteInvite = await FirebaseDB.get(`invites/${id}`);
                if (remoteInvite) {
                    this.upsertInvite(remoteInvite);
                    return remoteInvite;
                }
            } catch (error) {
                console.warn('Invite fetch failed:', error);
            }
        }

        return null;
    },

    async updateInvite(id, updates) {
        const invites = this.getStoredInvites();
        const index = invites.findIndex(invite => invite.id === id);
        if (index === -1) return false;

        invites[index] = { ...invites[index], ...updates };
        this.saveInvites(invites);

        if (typeof FirebaseDB !== 'undefined' && FirebaseDB.update) {
            try {
                await FirebaseDB.update(`invites/${id}`, updates);
            } catch (error) {
                console.warn('Invite update sync failed:', error);
            }
        }

        return true;
    },

    createMemberId() {
        return `member_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    },

    async createInvite(payload = {}) {
        const session = this.getSession();
        if (!this.isLeader(session)) {
            return { success: false, message: 'فقط القائد يمكنه إنشاء الروابط' };
        }

        const expiresInMinutes = Math.max(1, Number(payload.expiresInMinutes) || 60);
        const name = (payload.name || '').trim() || 'عضو جديد';
        const role = (payload.role || '').trim() || 'عضو';
        const avatar = ((payload.avatar || '').trim() || name.charAt(0) || 'ع').slice(0, 2);
        const permissions = this.normalizePermissions(payload.permissions);
        const memberId = payload.memberId || this.createMemberId();

        const invite = {
            id: `invite_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            token: this.generateSecureToken(48),
            memberId,
            name,
            role,
            avatar,
            permissions: permissions.length ? permissions : [...this.DEFAULT_MEMBER_PERMISSIONS],
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + (expiresInMinutes * 60 * 1000)).toISOString(),
            used: false,
            revoked: false,
            createdBy: session.memberId
        };

        await this.syncInvite(invite);

        ActivityLog.log('invite_create', session.memberId, {
            message: `${session.name} أنشأ رابط دعوة لـ ${name}`
        });

        return {
            success: true,
            invite,
            link: this.getLoginUrl({ invite: invite.id, token: invite.token })
        };
    },

    async revokeInvite(id) {
        const session = this.getSession();
        if (!this.isLeader(session)) {
            return { success: false, message: 'فقط القائد يمكنه إلغاء الروابط' };
        }

        const ok = await this.updateInvite(id, {
            revoked: true,
            revokedAt: new Date().toISOString(),
            revokedBy: session.memberId
        });

        if (!ok) {
            return { success: false, message: 'الرابط غير موجود' };
        }

        ActivityLog.log('invite_revoke', session.memberId, {
            message: `${session.name} ألغى رابط دعوة`
        });

        return { success: true };
    },

    async consumeInvite({ id, token }) {
        const invite = await this.fetchInvite(id);
        if (!invite) {
            return { success: false, message: 'رابط الدعوة غير موجود' };
        }

        if (invite.token !== token) {
            return { success: false, message: 'رمز الدعوة غير صحيح' };
        }

        if (invite.revoked) {
            return { success: false, message: 'تم إلغاء هذا الرابط' };
        }

        if (invite.used) {
            return { success: false, message: 'تم استخدام هذا الرابط مسبقاً' };
        }

        if (new Date(invite.expiresAt).getTime() <= Date.now()) {
            return { success: false, message: 'انتهت صلاحية الرابط' };
        }

        if (invite.memberId === this.LEADER_MEMBER_ID) {
            return { success: false, message: 'هذا الرابط غير صالح' };
        }

        const members = this.getMembers();
        const memberIndex = members.findIndex(m => m.id === invite.memberId);
        const memberPayload = {
            id: invite.memberId,
            name: invite.name || 'عضو جديد',
            role: invite.role || 'عضو',
            avatar: invite.avatar || 'ع',
            email: '',
            availability: 'available',
            skills: [],
            stats: this.getDefaultStats(),
            permissions: this.normalizePermissions(invite.permissions)
        };

        let member;
        if (memberIndex === -1) {
            member = memberPayload;
            members.push(member);
        } else {
            member = {
                ...members[memberIndex],
                ...memberPayload,
                stats: members[memberIndex].stats || memberPayload.stats
            };
            members[memberIndex] = member;
        }

        this.saveMembers(members);

        if (typeof FirebaseDB !== 'undefined' && FirebaseDB.set) {
            try {
                await FirebaseDB.set(`${FirebaseDB.PATHS.MEMBERS}/${member.id}`, member);
            } catch (error) {
                console.warn('Member sync failed:', error);
            }
        }

        await this.updateInvite(invite.id, {
            used: true,
            usedAt: new Date().toISOString(),
            usedByMemberId: member.id
        });

        const session = this.createSession(member, {
            permissions: member.permissions,
            isLeader: false,
            authType: 'invite_link'
        });

        ActivityLog.log('invite_accept', member.id, {
            message: `${member.name} انضم عبر رابط دعوة`
        });

        return { success: true, session, member };
    },

    listInvites() {
        return this.getStoredInvites()
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    getMemberPins() {
        // Backward-compatibility for old log rendering code.
        const members = this.getMembers();
        const mapped = {};
        members.forEach(member => {
            mapped[member.id] = {
                pin: '----',
                name: member.name,
                avatar: member.avatar,
                role: member.role
            };
        });
        return mapped;
    },

    authenticate() {
        return null;
    },

    changePin() {
        return { success: false, message: 'تم إلغاء نظام كلمات المرور والـ PIN' };
    }
};

/* ============================================
   Activity Log Module
   Tracks all user actions
   ============================================ */

const ActivityLog = {
    LOG_KEY: 'mak_activity_log',
    MAX_LOGS: 500,

    log(action, memberId, details = {}) {
        const logs = this.getAll();
        const entry = {
            id: 'log_' + Date.now(),
            timestamp: new Date().toISOString(),
            action,
            memberId,
            details
        };

        logs.unshift(entry);
        if (logs.length > this.MAX_LOGS) logs.length = this.MAX_LOGS;

        localStorage.setItem(this.LOG_KEY, JSON.stringify(logs));
    },

    getAll() {
        const logs = localStorage.getItem(this.LOG_KEY);
        return logs ? JSON.parse(logs) : [];
    },

    getByMember(memberId) {
        return this.getAll().filter(log => log.memberId === memberId);
    },

    getByAction(action) {
        return this.getAll().filter(log => log.action === action);
    },

    getRecent(count = 20) {
        return this.getAll().slice(0, count);
    },

    clear() {
        localStorage.removeItem(this.LOG_KEY);
    },

    getActionInfo(action) {
        const actions = {
            login: { icon: 'log-in', label: 'تسجيل دخول', color: 'var(--success)' },
            leader_login: { icon: 'crown', label: 'دخول القائد', color: 'var(--accent-orange)' },
            logout: { icon: 'log-out', label: 'تسجيل خروج', color: 'var(--text-secondary)' },
            invite_create: { icon: 'link-2', label: 'إنشاء رابط دعوة', color: 'var(--accent-blue)' },
            invite_accept: { icon: 'user-plus', label: 'انضمام عبر دعوة', color: 'var(--success)' },
            invite_revoke: { icon: 'link-2-off', label: 'إلغاء رابط دعوة', color: 'var(--danger)' },
            project_create: { icon: 'folder-plus', label: 'إنشاء مشروع', color: 'var(--accent-blue)' },
            project_update: { icon: 'edit', label: 'تعديل مشروع', color: 'var(--accent-orange)' },
            project_complete: { icon: 'check-circle', label: 'إكمال مشروع', color: 'var(--success)' },
            project_delete: { icon: 'trash-2', label: 'حذف مشروع', color: 'var(--danger)' },
            file_upload: { icon: 'upload', label: 'رفع ملف', color: 'var(--accent-blue)' },
            file_delete: { icon: 'file-minus', label: 'حذف ملف', color: 'var(--danger)' },
            status_change: { icon: 'refresh-cw', label: 'تغيير الحالة', color: 'var(--accent-orange)' },
            data_export: { icon: 'download', label: 'تصدير البيانات', color: 'var(--accent-blue)' },
            data_import: { icon: 'upload', label: 'استيراد البيانات', color: 'var(--accent-blue)' }
        };

        return actions[action] || { icon: 'activity', label: action, color: 'var(--text-secondary)' };
    },

    render(container, options = {}) {
        const logs = options.memberId
            ? this.getByMember(options.memberId)
            : this.getRecent(options.count || 20);

        const memberMap = {};
        (Storage.get(Storage.KEYS.MEMBERS) || []).forEach(member => {
            memberMap[member.id] = member;
        });

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
            const member = memberMap[log.memberId] || { name: 'غير معروف', avatar: '👤' };
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

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

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

document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
});



