/**
 * MAK Platform v3.0 - Firebase Configuration
 * Initializes Firebase services: Realtime Database, Storage, Analytics
 */

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBjUm4D5BJUA5U-Rq0dpkcyeUjU6ee-Ds0",
    authDomain: "mak1-67d64.firebaseapp.com",
    projectId: "mak1-67d64",
    storageBucket: "mak1-67d64.firebasestorage.app",
    messagingSenderId: "103002489478",
    appId: "1:103002489478:web:138730b65caac74eb6c707",
    measurementId: "G-57RW1RYJ2M",
    databaseURL: "https://mak1-67d64-default-rtdb.europe-west1.firebasedatabase.app"
};

// Firebase Module
const Firebase = {
    app: null,
    db: null,
    storage: null,
    analytics: null,
    isInitialized: false,
    isOnline: true,

    /**
     * Initialize Firebase
     */
    async init() {
        if (this.isInitialized) return true;

        try {
            // Check if Firebase SDK is loaded
            if (typeof firebase === 'undefined') {
                console.warn('Firebase SDK not loaded, using offline mode');
                this.isOnline = false;
                return false;
            }

            // Initialize Firebase App
            if (!firebase.apps.length) {
                this.app = firebase.initializeApp(firebaseConfig);
            } else {
                this.app = firebase.apps[0];
            }

            // Initialize services
            this.db = firebase.database();
            this.storage = firebase.storage();

            // Analytics (optional)
            if (firebase.analytics) {
                this.analytics = firebase.analytics();
            }

            // Monitor connection state
            this.setupConnectionMonitor();

            this.isInitialized = true;
            console.log('✅ Firebase initialized successfully');
            return true;

        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
            this.isOnline = false;
            return false;
        }
    },

    /**
     * Monitor online/offline state
     */
    setupConnectionMonitor() {
        const connectedRef = this.db.ref('.info/connected');
        connectedRef.on('value', (snapshot) => {
            this.isOnline = snapshot.val() === true;

            if (this.isOnline) {
                console.log('🟢 Connected to Firebase');
                document.dispatchEvent(new Event('firebase:online'));
            } else {
                console.log('🔴 Disconnected from Firebase');
                document.dispatchEvent(new Event('firebase:offline'));
            }
        });
    },

    /**
     * Get database reference
     */
    ref(path) {
        if (!this.db) return null;
        return this.db.ref(path);
    },

    /**
     * Get storage reference
     */
    storageRef(path) {
        if (!this.storage) return null;
        return this.storage.ref(path);
    },

    /**
     * Log analytics event
     */
    logEvent(eventName, params = {}) {
        if (this.analytics) {
            this.analytics.logEvent(eventName, params);
        }
    },

    /**
     * Check if online
     */
    checkOnline() {
        return this.isOnline && this.isInitialized;
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Firebase;
}
