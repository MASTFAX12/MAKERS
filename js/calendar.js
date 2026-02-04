/* ============================================
   MAK TEAM HQ - Calendar Module
   Interactive calendar for deadline tracking
   ============================================ */

const Calendar = {
    currentDate: new Date(),
    selectedDate: null,

    /**
     * Initialize calendar
     */
    init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.render();
    },

    /**
     * Render calendar
     */
    render() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        const monthNames = [
            'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ];

        const dayNames = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startingDay = firstDay.getDay();
        const totalDays = lastDay.getDate();

        // Get events for this month
        const events = this.getMonthEvents(year, month);

        let html = `
      <div class="calendar">
        <div class="calendar-header">
          <button class="calendar-nav-btn" onclick="Calendar.prevMonth()">◀</button>
          <h3 class="calendar-title">${monthNames[month]} ${year}</h3>
          <button class="calendar-nav-btn" onclick="Calendar.nextMonth()">▶</button>
        </div>
        <div class="calendar-grid">
    `;

        // Day names
        dayNames.forEach(day => {
            html += `<div class="calendar-day-name">${day}</div>`;
        });

        // Previous month days
        const prevMonthDays = new Date(year, month, 0).getDate();
        for (let i = startingDay - 1; i >= 0; i--) {
            html += `<div class="calendar-day other-month">${prevMonthDays - i}</div>`;
        }

        // Current month days
        const today = new Date();
        for (let day = 1; day <= totalDays; day++) {
            const isToday = year === today.getFullYear() &&
                month === today.getMonth() &&
                day === today.getDate();

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hasEvent = events.includes(dateStr);

            const classes = ['calendar-day'];
            if (isToday) classes.push('today');
            if (hasEvent) classes.push('has-event');

            html += `<div class="${classes.join(' ')}" data-date="${dateStr}" onclick="Calendar.selectDate('${dateStr}')">${day}</div>`;
        }

        // Next month days
        const remainingDays = 42 - (startingDay + totalDays);
        for (let day = 1; day <= remainingDays; day++) {
            html += `<div class="calendar-day other-month">${day}</div>`;
        }

        html += `
        </div>
      </div>
    `;

        // Events list
        html += this.renderEventsList(events);

        this.container.innerHTML = html;
    },

    /**
     * Get events for month
     */
    getMonthEvents(year, month) {
        const projects = Storage.get(Storage.KEYS.PROJECTS) || [];
        const events = [];

        projects.forEach(project => {
            if (project.status === 'completed') return;

            const deadline = new Date(project.deadline);
            if (deadline.getFullYear() === year && deadline.getMonth() === month) {
                events.push(project.deadline);
            }
        });

        return events;
    },

    /**
     * Render events list
     */
    renderEventsList(eventDates) {
        const projects = Storage.get(Storage.KEYS.PROJECTS) || [];
        const settings = Storage.get(Storage.KEYS.SETTINGS);

        const monthProjects = projects.filter(p => {
            if (p.status === 'completed') return false;
            return eventDates.includes(p.deadline);
        }).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

        if (monthProjects.length === 0) {
            return '<div class="calendar-events"><p class="text-center" style="color: var(--text-secondary); padding: 1rem;">لا توجد مواعيد هذا الشهر 🎉</p></div>';
        }

        let html = '<div class="calendar-events" style="margin-top: 1rem;">';
        html += '<h4 style="margin-bottom: 1rem;">📅 المواعيد القادمة</h4>';

        monthProjects.forEach(project => {
            const deadline = new Date(project.deadline);
            const subject = settings.subjects.find(s => s.id === project.subject) || { icon: '📁', name: 'غير محدد' };
            const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));

            const urgentClass = daysLeft <= 2 ? 'style="border-right: 3px solid var(--danger)"' : '';

            html += `
        <div class="card" ${urgentClass} style="padding: 1rem; margin-bottom: 0.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 600;">${project.title}</div>
              <div style="font-size: 0.85rem; color: var(--text-secondary);">${subject.icon} ${subject.name}</div>
            </div>
            <div style="text-align: left;">
              <div style="font-weight: 600; color: ${daysLeft <= 2 ? 'var(--danger)' : 'var(--accent-blue)'};">
                ${daysLeft > 0 ? daysLeft + ' يوم' : 'اليوم!'}
              </div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">
                ${deadline.toLocaleDateString('ar-IQ')}
              </div>
            </div>
          </div>
        </div>
      `;
        });

        html += '</div>';
        return html;
    },

    /**
     * Previous month
     */
    prevMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.render();
    },

    /**
     * Next month
     */
    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.render();
    },

    /**
     * Select date
     */
    selectDate(dateStr) {
        this.selectedDate = dateStr;

        // Remove previous selection
        this.container.querySelectorAll('.calendar-day.selected').forEach(el => {
            el.classList.remove('selected');
        });

        // Add selection
        const dayEl = this.container.querySelector(`[data-date="${dateStr}"]`);
        if (dayEl) {
            dayEl.classList.add('selected');
        }

        // Show events for this date
        this.showDateEvents(dateStr);
    },

    /**
     * Show events for specific date
     */
    showDateEvents(dateStr) {
        const projects = Storage.get(Storage.KEYS.PROJECTS) || [];
        const dateProjects = projects.filter(p => p.deadline === dateStr && p.status !== 'completed');

        if (dateProjects.length > 0) {
            let message = `مشاريع ${new Date(dateStr).toLocaleDateString('ar-IQ')}:\n\n`;
            dateProjects.forEach(p => {
                message += `• ${p.title}\n`;
            });
            alert(message);
        }
    },

    /**
     * Go to today
     */
    goToToday() {
        this.currentDate = new Date();
        this.render();
    }
};

// Add calendar styles
const calendarStyles = document.createElement('style');
calendarStyles.textContent = `
  .calendar-nav-btn {
    width: 36px;
    height: 36px;
    border: none;
    background: var(--bg-card);
    color: var(--text-primary);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s ease;
  }
  
  .calendar-nav-btn:hover {
    background: var(--accent-blue);
  }
  
  .calendar-day.selected {
    background: var(--accent-blue) !important;
    color: white;
  }
`;
document.head.appendChild(calendarStyles);
