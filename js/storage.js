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
        name: 'مصطفى',
        role: 'القائد',
        avatar: 'م',
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
        name: 'محمد',
        role: 'عضو',
        avatar: 'م',
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
        name: 'ابراهيم',
        role: 'عضو',
        avatar: 'ا',
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
        name: 'مازن',
        role: 'عضو',
        avatar: 'م',
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
        name: 'مرتضى',
        role: 'عضو',
        avatar: 'م',
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
        name: 'بافيل',
        role: 'عضو',
        avatar: 'ب',
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
      teamNameAr: 'فريق ميكرز',
      teamAbbr: 'MAK',
      password: 'mak2026',
      subjects: [
        { id: 'linux', name: 'إدارة لينكس', icon: 'terminal' },
        { id: 'programming', name: 'أساسيات البرمجة', icon: 'code' },
        { id: 'ethics', name: 'أخلاقيات عصر المعلومات', icon: 'scale' },
        { id: 'democracy', name: 'الديمقراطية وحقوق الإنسان', icon: 'landmark' },
        { id: 'math', name: 'الرياضيات', icon: 'calculator' },
        { id: 'english', name: 'الإنجليزي', icon: 'languages' },
        { id: 'engineering_drawing', name: 'الرسم الهندسي', icon: 'ruler' }
      ]
    };
  }
};

// Initialize storage on load
Storage.init();
