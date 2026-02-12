/* ============================================
   MAK TEAM HQ - Storage Module
   Handles all localStorage operations
   ============================================ */

const Storage = {
  KEYS: {
    MEMBERS: 'mak_members',
    PROJECTS: 'mak_projects',
    AUTH: 'mak_auth',
    SETTINGS: 'mak_settings'
  },

  // Initialize default data
  init() {
    if (!this.get(this.KEYS.MEMBERS)) {
      this.set(this.KEYS.MEMBERS, this.getDefaultMembers());
    }
    if (!this.get(this.KEYS.PROJECTS)) {
      this.set(this.KEYS.PROJECTS, []);
    }
    if (!this.get(this.KEYS.SETTINGS)) {
      this.set(this.KEYS.SETTINGS, this.getDefaultSettings());
    }
  },

  // Get data from localStorage
  get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Storage get error:', e);
      return null;
    }
  },

  // Set data to localStorage
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage set error:', e);
      return false;
    }
  },

  // Remove data from localStorage
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error('Storage remove error:', e);
      return false;
    }
  },

  // Clear all data
  clear() {
    try {
      Object.values(this.KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      return true;
    } catch (e) {
      console.error('Storage clear error:', e);
      return false;
    }
  },

  // Default team members
  getDefaultMembers() {
    return [
      {
        id: 'member_001',
        name: 'ظ…طµط·ظپظ‰',
        role: 'ط§ظ„ظ‚ط§ط¦ط¯',
        avatar: 'ظ…',
        email: '',
        stats: {
          totalProjects: 0,
          completedProjects: 0,
          activeProjects: 0,
          lastProjectDate: null,
          contributionScore: 100,
          subjectExpertise: {
            'linux': 3,
            'programming': 3,
            'ethics': 3,
            'democracy': 3,
            'math': 3,
            'english': 3,
            'engineering_drawing': 3
          }
        },
        availability: 'available',
        skills: []
      },
      {
        id: 'member_002',
        name: 'ظ…ط­ظ…ط¯',
        role: 'ط¹ط¶ظˆ',
        avatar: 'ظ…',
        email: '',
        stats: {
          totalProjects: 0,
          completedProjects: 0,
          activeProjects: 0,
          lastProjectDate: null,
          contributionScore: 100,
          subjectExpertise: {
            'linux': 3,
            'programming': 3,
            'ethics': 3,
            'democracy': 3,
            'math': 3,
            'english': 3,
            'engineering_drawing': 3,
            'human_rights': 3
          }
        },
        availability: 'available',
        skills: []
      },
      {
        id: 'member_003',
        name: 'ط§ط¨ط±ط§ظ‡ظٹظ…',
        role: 'ط¹ط¶ظˆ',
        avatar: 'ط§',
        email: '',
        stats: {
          totalProjects: 0,
          completedProjects: 0,
          activeProjects: 0,
          lastProjectDate: null,
          contributionScore: 100,
          subjectExpertise: {
            'linux': 3,
            'programming': 3,
            'ethics': 3,
            'democracy': 3,
            'math': 3,
            'english': 3,
            'engineering_drawing': 3,
            'human_rights': 3
          }
        },
        availability: 'available',
        skills: []
      },
      {
        id: 'member_004',
        name: 'ظ…ط§ط²ظ†',
        role: 'ط¹ط¶ظˆ',
        avatar: 'ظ…',
        email: '',
        stats: {
          totalProjects: 0,
          completedProjects: 0,
          activeProjects: 0,
          lastProjectDate: null,
          contributionScore: 100,
          subjectExpertise: {
            'linux': 3,
            'programming': 3,
            'ethics': 3,
            'democracy': 3,
            'math': 3,
            'english': 3,
            'engineering_drawing': 3,
            'human_rights': 3
          }
        },
        availability: 'available',
        skills: []
      },
      {
        id: 'member_005',
        name: 'ظ…ط±طھط¶ظ‰',
        role: 'ط¹ط¶ظˆ',
        avatar: 'ظ…',
        email: '',
        stats: {
          totalProjects: 0,
          completedProjects: 0,
          activeProjects: 0,
          lastProjectDate: null,
          contributionScore: 100,
          subjectExpertise: {
            'linux': 3,
            'programming': 3,
            'ethics': 3,
            'democracy': 3,
            'math': 3,
            'english': 3,
            'engineering_drawing': 3,
            'human_rights': 3
          }
        },
        availability: 'available',
        skills: []
      },
      {
        id: 'member_006',
        name: 'ط¨ط§ظپظٹظ„',
        role: 'ط¹ط¶ظˆ',
        avatar: 'ط¨',
        email: '',
        stats: {
          totalProjects: 0,
          completedProjects: 0,
          activeProjects: 0,
          lastProjectDate: null,
          contributionScore: 100,
          subjectExpertise: {
            'linux': 3,
            'programming': 3,
            'ethics': 3,
            'democracy': 3,
            'math': 3,
            'english': 3,
            'engineering_drawing': 3,
            'human_rights': 3
          }
        },
        availability: 'available',
        skills: []
      }
    ];
  },

  // Default settings
  getDefaultSettings() {
    return {
      teamName: 'Makers Team',
      teamNameAr: 'ظپط±ظٹظ‚ ظ…ظٹظƒط±ط²',
      teamAbbr: 'MAK',
      subjects: [
        { id: 'linux', name: 'ط¥ط¯ط§ط±ط© ظ„ظٹظ†ظƒط³', icon: 'terminal' },
        { id: 'programming', name: 'ط£ط³ط§ط³ظٹط§طھ ط§ظ„ط¨ط±ظ…ط¬ط©', icon: 'code' },
        { id: 'ethics', name: 'ط£ط®ظ„ط§ظ‚ظٹط§طھ ط¹طµط± ط§ظ„ظ…ط¹ظ„ظˆظ…ط§طھ', icon: 'scale' },
        { id: 'democracy', name: 'ط§ظ„ط¯ظٹظ…ظ‚ط±ط§ط·ظٹط© ظˆط­ظ‚ظˆظ‚ ط§ظ„ط¥ظ†ط³ط§ظ†', icon: 'landmark' },
        { id: 'math', name: 'ط§ظ„ط±ظٹط§ط¶ظٹط§طھ', icon: 'calculator' },
        { id: 'english', name: 'ط§ظ„ط¥ظ†ط¬ظ„ظٹط²ظٹ', icon: 'languages' },
        { id: 'engineering_drawing', name: 'ط§ظ„ط±ط³ظ… ط§ظ„ظ‡ظ†ط¯ط³ظٹ', icon: 'ruler' }
      ]
    };
  }
};

// Initialize storage on load
Storage.init();

