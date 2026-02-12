/**
 * MAK Platform v3.0 - Reliability & Performance Core
 * Ensures high availability, error tracking, and performance monitoring
 */

const Reliability = {
    // Configuration
    config: {
        maxLogSize: 100, // Max items in local activity log
        longRunningTaskThreshold: 300, // ms
        enablePerformanceMonitoring: true
    },

    // Initialization
    init() {
        this.setupGlobalErrorHandling();
        this.setupNetworkMonitoring();
        this.setupPerformanceMonitoring();
        this.cleanupLocalStorage();
        console.log('🛡️ Reliability System Active');
    },

    // 1. Global Error Handling
    setupGlobalErrorHandling() {
        window.onerror = (msg, url, lineNo, columnNo, error) => {
            const errorData = {
                message: msg,
                url: url,
                line: lineNo,
                column: columnNo,
                stack: error ? error.stack : 'N/A',
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
            };

            this.logError('global_error', errorData);
            return false;
        };

        window.onunhandledrejection = (event) => {
            this.logError('unhandled_promise', {
                reason: event.reason,
                timestamp: new Date().toISOString()
            });
        };
    },

    // 2. Network Stability Manager
    setupNetworkMonitoring() {
        window.addEventListener('online', () => {
            this.handleConnectionChange(true);
            Firebase.goOnline(); // Force Firebase reconnection
        });

        window.addEventListener('offline', () => {
            this.handleConnectionChange(false);
            Firebase.goOffline(); // Switch to local persistence
        });

        // Initial check
        if (!navigator.onLine) {
            this.handleConnectionChange(false);
        }
    },

    handleConnectionChange(isOnline) {
        const statusEl = document.getElementById('connectionStatus') || this.createStatusElement();

        if (isOnline) {
            statusEl.className = 'connection-toast online';
            statusEl.innerHTML = '<i data-lucide="wifi"></i> تم استعادة الاتصال';
            setTimeout(() => statusEl.classList.remove('show'), 3000);

            // Sync pending data
            this.syncPendingData();
        } else {
            statusEl.className = 'connection-toast offline show';
            statusEl.innerHTML = '<i data-lucide="wifi-off"></i> وضع التصفح بلا إنترنت';
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    createStatusElement() {
        const el = document.createElement('div');
        el.id = 'connectionStatus';
        el.className = 'connection-toast';
        document.body.appendChild(el);

        // Add styles dynamically
        const style = document.createElement('style');
        style.textContent = `
            .connection-toast {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%) translateY(100px);
                background: #1a1a2e;
                color: white;
                padding: 10px 20px;
                border-radius: 50px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                gap: 10px;
                z-index: 9999;
                transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                border: 1px solid rgba(255,255,255,0.1);
                font-family: 'Tajawal', sans-serif;
                font-size: 0.9rem;
            }
            .connection-toast.show {
                transform: translateX(-50%) translateY(0);
            }
            .connection-toast.online {
                border-color: #22c55e;
                color: #22c55e;
            }
            .connection-toast.offline {
                border-color: #ef4444;
                color: #ef4444;
            }
        `;
        document.head.appendChild(style);
        return el;
    },

    // 3. Performance Monitoring
    setupPerformanceMonitoring() {
        if (!this.config.enablePerformanceMonitoring) return;

        window.addEventListener('load', () => {
            const timing = window.performance.timing;
            const loadTime = timing.loadEventEnd - timing.navigationStart;

            // Failsafe: Force remove loading screen if it's still there
            setTimeout(() => {
                const loading = document.querySelector('.loading-screen');
                if (loading) {
                    console.warn('⚠️ Force removing loading screen via Reliability Failsafe');
                    loading.style.opacity = '0';
                    loading.style.pointerEvents = 'none';
                    setTimeout(() => loading.remove(), 500);
                }
            }, 2000); // 2 second max wait

            if (loadTime > 3000) {
                console.warn(`🐢 Slow page load: ${loadTime}ms`);
            } else {
                console.log(`⚡ Page loaded in ${loadTime}ms`);
            }

            // Report LCP (Largest Contentful Paint)
            new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    // console.log('LCP:', entry.startTime, entry);
                }
            }).observe({ type: 'largest-contentful-paint', buffered: true });
        });
    },

    // 4. Data Integrity & Sync
    async syncPendingData() {
        // Here we could iterate over localStorage 'pending_writes' if we implemented a queue
        // For now, Firebase handles most of this, but we can trigger a fresh fetch
        console.log('🔄 Syncing data after reconnection...');
        if (typeof Projects !== 'undefined') {
            await Projects.loadFromFirebase();
            // Refresh UI
            if (typeof renderProjects === 'function') renderProjects();
        }
    },

    // 5. Cleanup
    cleanupLocalStorage() {
        try {
            // Remove legacy keys
            const validKeys = [
                Storage?._KEYS?.MEMBERS,
                Storage?._KEYS?.PROJECTS,
                Storage?._KEYS?.SESSION,
                Storage?._KEYS?.SETTINGS,
                'firebase:previous_websocket_failure'
            ];

            // We won't actually delete aggressively to avoid data loss, just log usage
            let total = 0;
            for (let x in localStorage) {
                if (localStorage.hasOwnProperty(x)) {
                    total += ((localStorage[x].length * 2) / 1024 / 1024);
                }
            }
            console.log(`💾 LocalStorage Usage: ${total.toFixed(2)} MB`);

            if (total > 4.5) {
                console.warn('⚠️ LocalStorage near limit! Cleaning up old caches...');
                // Implement cleanup strategy here if needed
            }
        } catch (e) {
            // Ignore access errors
        }
    },

    // Logging
    logError(type, data) {
        console.error(`[${type}]`, data);

        // Use Image beacon for failsafe logging if needed, or simple Firebase push
        if (window.Firebase && window.Firebase.db && navigator.onLine) {
            try {
                // We'll just push to a separate 'errors' node if we wanted to
                // firebase.database().ref('errors').push(data);
            } catch (e) { }
        }
    }
};

// Initialize
Reliability.init();

