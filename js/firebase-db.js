/**
 * MAK Platform v3.0 - Firebase Database Operations
 * Handles all Realtime Database CRUD operations with offline fallback
 */

const FirebaseDB = {
    // Database paths
    PATHS: {
        MEMBERS: 'members',
        PROJECTS: 'projects',
        ACTIVITY_LOG: 'activityLog',
        NOTIFICATIONS: 'notifications',
        SETTINGS: 'settings'
    },

    // Local cache for offline support
    cache: {},
    listeners: {},

    /**
     * Initialize database and sync with local storage
     */
    async init() {
        await Firebase.init();

        if (Firebase.checkOnline()) {
            await this.syncFromLocal();
            this.setupRealtimeListeners();
        }

        return true;
    },

    /**
     * Migrate data from localStorage to Firebase (first time only)
     */
    async syncFromLocal() {
        try {
            // Check if already synced
            const syncedFlag = localStorage.getItem('mak_firebase_synced');
            if (syncedFlag === 'true') return;

            // Get local data
            const localMembers = Storage.get(Storage.KEYS.MEMBERS);
            const localProjects = Storage.get(Storage.KEYS.PROJECTS);
            const localSettings = Storage.get(Storage.KEYS.SETTINGS);

            // Sync members
            if (localMembers && localMembers.length > 0) {
                for (const member of localMembers) {
                    await this.set(`${this.PATHS.MEMBERS}/${member.id}`, member);
                }
            }

            // Sync projects
            if (localProjects && localProjects.length > 0) {
                for (const project of localProjects) {
                    await this.set(`${this.PATHS.PROJECTS}/${project.id}`, project);
                }
            }

            // Sync settings
            if (localSettings) {
                await this.set(this.PATHS.SETTINGS, localSettings);
            }

            // Mark as synced
            localStorage.setItem('mak_firebase_synced', 'true');
            console.log('✅ Local data synced to Firebase');

        } catch (error) {
            console.error('❌ Sync failed:', error);
        }
    },

    /**
     * Setup real-time listeners for all collections
     */
    setupRealtimeListeners() {
        // Listen to projects
        this.listen(this.PATHS.PROJECTS, (data) => {
            this.cache.projects = data ? Object.values(data) : [];
            document.dispatchEvent(new CustomEvent('firebase:projects', { detail: this.cache.projects }));
        });

        // Listen to members
        this.listen(this.PATHS.MEMBERS, (data) => {
            this.cache.members = data ? Object.values(data) : [];
            document.dispatchEvent(new CustomEvent('firebase:members', { detail: this.cache.members }));
        });

        // Listen to notifications
        this.listen(this.PATHS.NOTIFICATIONS, (data) => {
            this.cache.notifications = data ? Object.values(data) : [];
            document.dispatchEvent(new CustomEvent('firebase:notifications', { detail: this.cache.notifications }));
        });

        // Listen to activity log
        this.listen(this.PATHS.ACTIVITY_LOG, (data) => {
            this.cache.activityLog = data ? Object.values(data) : [];
            document.dispatchEvent(new CustomEvent('firebase:activityLog', { detail: this.cache.activityLog }));
        });
    },

    /**
     * Set data at path
     */
    async set(path, data) {
        try {
            if (Firebase.checkOnline()) {
                await Firebase.ref(path).set(data);
            }
            // Update local cache
            this.updateLocalCache(path, data);
            return true;
        } catch (error) {
            console.error('Set error:', error);
            // Fallback to local storage
            this.updateLocalCache(path, data);
            return false;
        }
    },

    /**
     * Push new data to path (auto-generate ID)
     */
    async push(path, data) {
        try {
            const dataWithTimestamp = {
                ...data,
                createdAt: new Date().toISOString()
            };

            if (Firebase.checkOnline()) {
                const ref = Firebase.ref(path).push();
                dataWithTimestamp.id = ref.key;
                await ref.set(dataWithTimestamp);
                return dataWithTimestamp.id;
            } else {
                // Offline: generate local ID
                dataWithTimestamp.id = 'local_' + Date.now();
                this.updateLocalCache(`${path}/${dataWithTimestamp.id}`, dataWithTimestamp);
                return dataWithTimestamp.id;
            }
        } catch (error) {
            console.error('Push error:', error);
            return null;
        }
    },

    /**
     * Update data at path
     */
    async update(path, data) {
        try {
            const dataWithTimestamp = {
                ...data,
                updatedAt: new Date().toISOString()
            };

            if (Firebase.checkOnline()) {
                await Firebase.ref(path).update(dataWithTimestamp);
            }
            this.updateLocalCache(path, dataWithTimestamp, true);
            return true;
        } catch (error) {
            console.error('Update error:', error);
            return false;
        }
    },

    /**
     * Get data from path
     */
    async get(path) {
        try {
            if (Firebase.checkOnline()) {
                const snapshot = await Firebase.ref(path).once('value');
                return snapshot.val();
            } else {
                // Fallback to cache or local storage
                return this.getFromCache(path);
            }
        } catch (error) {
            console.error('Get error:', error);
            return this.getFromCache(path);
        }
    },

    /**
     * Delete data at path
     */
    async delete(path) {
        try {
            if (Firebase.checkOnline()) {
                await Firebase.ref(path).remove();
            }
            this.removeFromCache(path);
            return true;
        } catch (error) {
            console.error('Delete error:', error);
            return false;
        }
    },

    /**
     * Listen to real-time changes
     */
    listen(path, callback) {
        if (!Firebase.checkOnline()) return;

        const ref = Firebase.ref(path);
        ref.on('value', (snapshot) => {
            callback(snapshot.val());
        });

        // Store reference for cleanup
        this.listeners[path] = ref;
    },

    /**
     * Stop listening to path
     */
    unlisten(path) {
        if (this.listeners[path]) {
            this.listeners[path].off();
            delete this.listeners[path];
        }
    },

    /**
     * Update local cache
     */
    updateLocalCache(path, data, merge = false) {
        const parts = path.split('/');
        const collection = parts[0];

        // Also update localStorage for offline access
        if (collection === this.PATHS.PROJECTS) {
            let projects = Storage.get(Storage.KEYS.PROJECTS) || [];
            const id = parts[1] || data.id;
            const index = projects.findIndex(p => p.id === id);

            if (merge && index !== -1) {
                projects[index] = { ...projects[index], ...data };
            } else if (index !== -1) {
                projects[index] = data;
            } else {
                projects.push(data);
            }
            Storage.set(Storage.KEYS.PROJECTS, projects);
        } else if (collection === this.PATHS.MEMBERS) {
            let members = Storage.get(Storage.KEYS.MEMBERS) || [];
            const id = parts[1] || data.id;
            const index = members.findIndex(m => m.id === id);

            if (merge && index !== -1) {
                members[index] = { ...members[index], ...data };
            } else if (index !== -1) {
                members[index] = data;
            } else {
                members.push(data);
            }
            Storage.set(Storage.KEYS.MEMBERS, members);
        }
    },

    /**
     * Get from cache or local storage
     */
    getFromCache(path) {
        const parts = path.split('/');
        const collection = parts[0];
        const id = parts[1];

        if (collection === this.PATHS.PROJECTS) {
            const projects = Storage.get(Storage.KEYS.PROJECTS) || [];
            return id ? projects.find(p => p.id === id) : projects;
        } else if (collection === this.PATHS.MEMBERS) {
            const members = Storage.get(Storage.KEYS.MEMBERS) || [];
            return id ? members.find(m => m.id === id) : members;
        }

        return null;
    },

    /**
     * Remove from cache
     */
    removeFromCache(path) {
        const parts = path.split('/');
        const collection = parts[0];
        const id = parts[1];

        if (collection === this.PATHS.PROJECTS && id) {
            let projects = Storage.get(Storage.KEYS.PROJECTS) || [];
            projects = projects.filter(p => p.id !== id);
            Storage.set(Storage.KEYS.PROJECTS, projects);
        }
    },

    // ============================================
    // HIGH-LEVEL OPERATIONS
    // ============================================

    /**
     * Get all projects
     */
    async getProjects() {
        if (this.cache.projects) return this.cache.projects;
        const data = await this.get(this.PATHS.PROJECTS);
        return data ? Object.values(data) : [];
    },

    /**
     * Get project by ID
     */
    async getProject(projectId) {
        return await this.get(`${this.PATHS.PROJECTS}/${projectId}`);
    },

    /**
     * Create project
     */
    async createProject(project) {
        return await this.push(this.PATHS.PROJECTS, project);
    },

    /**
     * Update project
     */
    async updateProject(projectId, updates) {
        return await this.update(`${this.PATHS.PROJECTS}/${projectId}`, updates);
    },

    /**
     * Delete project
     */
    async deleteProject(projectId) {
        return await this.delete(`${this.PATHS.PROJECTS}/${projectId}`);
    },

    /**
     * Get all members
     */
    async getMembers() {
        if (this.cache.members) return this.cache.members;
        const data = await this.get(this.PATHS.MEMBERS);
        return data ? Object.values(data) : [];
    },

    /**
     * Log activity
     */
    async logActivity(action, memberId, details = {}) {
        const logEntry = {
            action,
            memberId,
            details,
            timestamp: new Date().toISOString()
        };
        return await this.push(this.PATHS.ACTIVITY_LOG, logEntry);
    },

    /**
     * Create notification
     */
    async createNotification(notification) {
        return await this.push(this.PATHS.NOTIFICATIONS, {
            ...notification,
            read: false,
            createdAt: new Date().toISOString()
        });
    },

    /**
     * Mark notification as read
     */
    async markNotificationRead(notificationId) {
        return await this.update(`${this.PATHS.NOTIFICATIONS}/${notificationId}`, { read: true });
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseDB;
}
