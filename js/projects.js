/* ============================================
   MAK TEAM HQ - Projects Module
   Handles project-related operations
   ============================================ */

const Projects = {
    /**
     * Get all projects
     */
    getAll() {
        return Storage.get(Storage.KEYS.PROJECTS) || [];
    },

    /**
     * Get project by ID
     */
    getById(id) {
        const projects = this.getAll();
        return projects.find(p => p.id === id);
    },

    /**
     * Create new project
     */
    create(projectData) {
        const projects = this.getAll();

        const newProject = {
            id: 'project_' + Date.now(),
            title: projectData.title,
            description: projectData.description || '',
            subject: projectData.subject,
            teamSize: projectData.teamSize,
            assignedMembers: projectData.assignedMembers || [],
            createdDate: new Date().toISOString(),
            deadline: projectData.deadline,
            completedDate: null,
            status: 'new',
            priority: projectData.priority || 'normal',
            files: [],
            grade: null,
            feedback: '',
            demoUrl: projectData.demoUrl || '',
            repoUrl: projectData.repoUrl || ''
        };

        projects.push(newProject);
        Storage.set(Storage.KEYS.PROJECTS, projects);

        // Update member stats
        newProject.assignedMembers.forEach(memberId => {
            Algorithm.assignProject(memberId, newProject.id, newProject.subject);
        });

        return newProject;
    },

    /**
     * Update project
     */
    update(id, updates) {
        const projects = this.getAll();
        const index = projects.findIndex(p => p.id === id);

        if (index !== -1) {
            projects[index] = { ...projects[index], ...updates };
            Storage.set(Storage.KEYS.PROJECTS, projects);
            return projects[index];
        }
        return null;
    },

    /**
     * Delete project
     */
    delete(id) {
        const projects = this.getAll();
        const filtered = projects.filter(p => p.id !== id);
        Storage.set(Storage.KEYS.PROJECTS, filtered);
        return true;
    },

    /**
     * Change project status
     */
    changeStatus(id, status) {
        const project = this.getById(id);
        if (!project) return null;

        const updates = { status };

        if (status === 'completed') {
            updates.completedDate = new Date().toISOString();

            // Update member stats
            project.assignedMembers.forEach(memberId => {
                Algorithm.completeProject(memberId, project.subject, project.grade);
            });
        }

        return this.update(id, updates);
    },

    /**
     * Get projects by status
     */
    getByStatus(status) {
        const projects = this.getAll();
        return projects.filter(p => p.status === status);
    },

    /**
     * Get projects by subject
     */
    getBySubject(subjectId) {
        const projects = this.getAll();
        return projects.filter(p => p.subject === subjectId);
    },

    /**
     * Get upcoming deadlines
     */
    getUpcomingDeadlines(days = 7) {
        const projects = this.getAll();
        const now = new Date();
        const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

        return projects
            .filter(p => {
                if (p.status === 'completed') return false;
                const deadline = new Date(p.deadline);
                return deadline >= now && deadline <= futureDate;
            })
            .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    },

    /**
     * Get projects by member
     */
    getByMember(memberId) {
        const projects = this.getAll();
        return projects.filter(p => p.assignedMembers.includes(memberId));
    },

    /**
     * Get project statistics
     */
    getStats() {
        const projects = this.getAll();
        const settings = Storage.get(Storage.KEYS.SETTINGS);

        const byStatus = {
            new: 0,
            in_progress: 0,
            review: 0,
            completed: 0
        };

        const bySubject = {};
        settings.subjects.forEach(s => {
            bySubject[s.id] = 0;
        });

        projects.forEach(p => {
            byStatus[p.status] = (byStatus[p.status] || 0) + 1;
            bySubject[p.subject] = (bySubject[p.subject] || 0) + 1;
        });

        return {
            total: projects.length,
            byStatus,
            bySubject
        };
    },

    /**
     * Render project card HTML
     * @param {Object} project - Project data
     * @param {boolean} isAdmin - If true, link to manage page, else to public view
     */
    renderCard(project, isAdmin = false) {
        const settings = Storage.get(Storage.KEYS.SETTINGS);
        const subject = settings.subjects.find(s => s.id === project.subject) || { name: 'غير محدد', icon: 'folder' };
        const members = Members.getAll();

        const statusClasses = {
            'new': 'status-new',
            'in_progress': 'status-in-progress',
            'review': 'status-in-progress',
            'completed': 'status-completed'
        };

        const statusTexts = {
            'new': 'جديد',
            'in_progress': 'جاري',
            'review': 'مراجعة',
            'completed': 'مكتمل'
        };

        const priorityClasses = {
            'low': '',
            'normal': '',
            'high': 'priority-high',
            'urgent': 'priority-urgent'
        };

        const teamHTML = project.assignedMembers.map(id => {
            const member = members.find(m => m.id === id);
            return member ? `<span class="project-team-member">${member.avatar}</span>` : '';
        }).join('');

        const deadline = new Date(project.deadline);
        const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
        const deadlineText = daysLeft > 0 ? `${daysLeft} يوم` : (daysLeft === 0 ? 'اليوم' : 'متأخر');

        const filesCount = project.files ? project.files.length : 0;
        const targetPage = isAdmin ? 'manage.html' : 'project.html';

        return `
      <div class="card project-card card-3d ${priorityClasses[project.priority]}" data-id="${project.id}" onclick="window.location.href='${targetPage}?id=${project.id}'" style="cursor: pointer;">
        <div class="project-header">
          <span class="project-subject"><i data-lucide="${subject.icon}" style="width:14px;height:14px;"></i> ${subject.name}</span>
          <span class="project-status ${statusClasses[project.status]}">${statusTexts[project.status]}</span>
        </div>
        <h3 class="project-title">${project.title}</h3>
        <p class="project-description">${project.description || 'لا يوجد وصف'}</p>
        <div class="project-team">${teamHTML}</div>
        <div class="project-meta">
          <span><i data-lucide="clock" style="width:12px;height:12px;"></i> ${deadlineText}</span>
          <span><i data-lucide="users" style="width:12px;height:12px;"></i> ${project.assignedMembers.length}</span>
          ${filesCount > 0 ? `<span><i data-lucide="paperclip" style="width:12px;height:12px;"></i> ${filesCount}</span>` : ''}
        </div>
        ${project.status === 'completed' ? '<div class="project-complete-badge"><i data-lucide="check-circle" style="width:14px;height:14px;"></i> مكتمل</div>' : ''}
      </div>
    `;
    },

    /**
     * Render all projects
     * @param {HTMLElement} container - Container element
     * @param {Object} filter - Filter options
     * @param {boolean} isAdmin - If true, link cards to manage page
     */
    renderAll(container, filter = null, isAdmin = false) {
        let projects = this.getAll();

        if (filter) {
            if (filter.status) projects = projects.filter(p => p.status === filter.status);
            if (filter.subject) projects = projects.filter(p => p.subject === filter.subject);
            if (filter.member) projects = projects.filter(p => p.assignedMembers.includes(filter.member));
        }

        // Sort by deadline
        projects.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

        if (projects.length === 0) {
            container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📂</div>
          <h3>لا توجد مشاريع</h3>
          <p>أضف مشروعاً جديداً للبدء</p>
        </div>
      `;
            return;
        }

        container.innerHTML = projects.map(p => this.renderCard(p, isAdmin)).join('');
    },

    /**
     * Render deadlines list
     */
    renderDeadlines(container, days = 7) {
        const deadlines = this.getUpcomingDeadlines(days);
        const settings = Storage.get(Storage.KEYS.SETTINGS);

        if (deadlines.length === 0) {
            container.innerHTML = '<li class="empty-message">لا توجد مواعيد قريبة 🎉</li>';
            return;
        }

        container.innerHTML = deadlines.map(project => {
            const deadline = new Date(project.deadline);
            const subject = settings.subjects.find(s => s.id === project.subject) || { name: 'غير محدد' };
            const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
            const isUrgent = daysLeft <= 2;

            return `
        <li class="deadline-item">
          <div class="deadline-date">
            <span class="deadline-day">${deadline.getDate()}</span>
            <span class="deadline-month">${deadline.toLocaleString('ar', { month: 'short' })}</span>
          </div>
          <div class="deadline-info">
            <div class="deadline-title">${project.title}</div>
            <div class="deadline-subject">${subject.name}</div>
          </div>
          ${isUrgent ? '<span class="deadline-urgent">عاجل!</span>' : ''}
        </li>
      `;
        }).join('');
    },

    /**
     * Render subject statistics
     */
    renderSubjectStats(container) {
        const stats = this.getStats();
        const settings = Storage.get(Storage.KEYS.SETTINGS);
        const maxCount = Math.max(...Object.values(stats.bySubject), 1);

        container.innerHTML = settings.subjects.map(subject => {
            const count = stats.bySubject[subject.id] || 0;
            const percentage = (count / maxCount) * 100;

            return `
        <li class="subject-stat-item">
          <span class="subject-stat-name">${subject.icon} ${subject.name}</span>
          <div class="subject-stat-bar">
            <div class="subject-stat-fill" style="width: ${percentage}%"></div>
          </div>
          <span class="subject-stat-count">${count}</span>
        </li>
      `;
        }).join('');
    }
};
