/* ============================================
   MAK TEAM HQ - Charts Module
   Simple chart rendering without external libraries
   ============================================ */

const Charts = {
    /**
     * Render a bar chart
     */
    renderBarChart(container, data, options = {}) {
        const {
            maxValue = Math.max(...data.map(d => d.value)),
            barColor = 'var(--accent-blue)',
            showLabels = true,
            animated = true
        } = options;

        const barsHTML = data.map((item, index) => {
            const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
            const delay = animated ? `animation-delay: ${index * 0.1}s;` : '';

            return `
        <div class="chart-bar-item">
          <div class="chart-bar-label">${item.label}</div>
          <div class="chart-bar-container">
            <div class="chart-bar" style="width: ${percentage}%; ${delay} background: ${item.color || barColor}"></div>
          </div>
          ${showLabels ? `<span class="chart-bar-value">${item.value}</span>` : ''}
        </div>
      `;
        }).join('');

        container.innerHTML = `<div class="chart-bars">${barsHTML}</div>`;
    },

    /**
     * Render a donut chart
     */
    renderDonutChart(container, data, options = {}) {
        const {
            size = 200,
            thickness = 30,
            showLegend = true
        } = options;

        const total = data.reduce((sum, d) => sum + d.value, 0);
        let currentAngle = 0;
        const radius = size / 2;
        const innerRadius = radius - thickness;

        let pathsHTML = '';
        data.forEach((item, index) => {
            if (item.value === 0) return;

            const angle = (item.value / total) * 360;
            const endAngle = currentAngle + angle;

            const x1 = radius + radius * Math.cos((currentAngle - 90) * Math.PI / 180);
            const y1 = radius + radius * Math.sin((currentAngle - 90) * Math.PI / 180);
            const x2 = radius + radius * Math.cos((endAngle - 90) * Math.PI / 180);
            const y2 = radius + radius * Math.sin((endAngle - 90) * Math.PI / 180);

            const ix1 = radius + innerRadius * Math.cos((currentAngle - 90) * Math.PI / 180);
            const iy1 = radius + innerRadius * Math.sin((currentAngle - 90) * Math.PI / 180);
            const ix2 = radius + innerRadius * Math.cos((endAngle - 90) * Math.PI / 180);
            const iy2 = radius + innerRadius * Math.sin((endAngle - 90) * Math.PI / 180);

            const largeArc = angle > 180 ? 1 : 0;

            const path = `
        M ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
        L ${ix2} ${iy2}
        A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}
        Z
      `;

            pathsHTML += `<path d="${path}" fill="${item.color}" class="donut-segment" style="animation-delay: ${index * 0.1}s"/>`;
            currentAngle = endAngle;
        });

        const legendHTML = showLegend ? `
      <div class="chart-legend">
        ${data.map(item => `
          <div class="legend-item">
            <span class="legend-color" style="background: ${item.color}"></span>
            <span class="legend-label">${item.label}</span>
            <span class="legend-value">${item.value}</span>
          </div>
        `).join('')}
      </div>
    ` : '';

        container.innerHTML = `
      <div class="donut-chart-container">
        <svg width="${size}" height="${size}" class="donut-chart">
          ${pathsHTML}
          <circle cx="${radius}" cy="${radius}" r="${innerRadius - 5}" fill="var(--bg-card)"/>
          <text x="${radius}" y="${radius}" text-anchor="middle" dominant-baseline="middle" class="donut-center-text">
            <tspan x="${radius}" dy="-10" class="donut-total">${total}</tspan>
            <tspan x="${radius}" dy="25" class="donut-label">إجمالي</tspan>
          </text>
        </svg>
        ${legendHTML}
      </div>
    `;
    },

    /**
     * Render progress circle
     */
    renderProgressCircle(container, value, max, options = {}) {
        const {
            size = 120,
            strokeWidth = 8,
            color = 'var(--accent-blue)',
            label = ''
        } = options;

        const radius = (size - strokeWidth) / 2;
        const circumference = 2 * Math.PI * radius;
        const percentage = max > 0 ? (value / max) * 100 : 0;
        const offset = circumference - (percentage / 100) * circumference;

        container.innerHTML = `
      <div class="progress-circle-container">
        <svg width="${size}" height="${size}" class="progress-circle">
          <circle
            cx="${size / 2}" cy="${size / 2}" r="${radius}"
            fill="none"
            stroke="var(--bg-secondary)"
            stroke-width="${strokeWidth}"
          />
          <circle
            cx="${size / 2}" cy="${size / 2}" r="${radius}"
            fill="none"
            stroke="${color}"
            stroke-width="${strokeWidth}"
            stroke-linecap="round"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${offset}"
            transform="rotate(-90 ${size / 2} ${size / 2})"
            class="progress-circle-fill"
          />
          <text x="${size / 2}" y="${size / 2}" text-anchor="middle" dominant-baseline="middle" class="progress-text">
            ${Math.round(percentage)}%
          </text>
        </svg>
        ${label ? `<div class="progress-label">${label}</div>` : ''}
      </div>
    `;
    },

    /**
     * Animate counter
     */
    animateCounter(element, target, duration = 1000) {
        const start = parseInt(element.textContent) || 0;
        const increment = (target - start) / (duration / 16);
        let current = start;

        const timer = setInterval(() => {
            current += increment;
            if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
                element.textContent = target;
                clearInterval(timer);
            } else {
                element.textContent = Math.round(current);
            }
        }, 16);
    },

    /**
     * Render stats overview
     */
    renderStatsOverview(container) {
        const stats = Projects.getStats();
        const memberStats = Members.getTotalStats();

        container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card blue">
          <div class="stat-card-icon">📋</div>
          <div class="stat-card-value" data-count="${stats.total}">${stats.total}</div>
          <div class="stat-card-label">إجمالي المشاريع</div>
        </div>
        <div class="stat-card green">
          <div class="stat-card-icon">✅</div>
          <div class="stat-card-value" data-count="${stats.byStatus.completed}">${stats.byStatus.completed}</div>
          <div class="stat-card-label">مكتملة</div>
        </div>
        <div class="stat-card yellow">
          <div class="stat-card-icon">⏳</div>
          <div class="stat-card-value" data-count="${stats.byStatus.in_progress + stats.byStatus.new}">${stats.byStatus.in_progress + stats.byStatus.new}</div>
          <div class="stat-card-label">جارية</div>
        </div>
        <div class="stat-card orange">
          <div class="stat-card-icon">👥</div>
          <div class="stat-card-value" data-count="${memberStats.totalMembers}">${memberStats.totalMembers}</div>
          <div class="stat-card-label">الأعضاء</div>
        </div>
      </div>
    `;

        // Animate counters
        container.querySelectorAll('[data-count]').forEach(el => {
            const target = parseInt(el.dataset.count);
            el.textContent = '0';
            setTimeout(() => this.animateCounter(el, target), 300);
        });
    }
};

// Add chart styles dynamically
const chartStyles = document.createElement('style');
chartStyles.textContent = `
  .chart-bars {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  
  .chart-bar-item {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .chart-bar-label {
    min-width: 100px;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }
  
  .chart-bar-container {
    flex: 1;
    height: 24px;
    background: var(--bg-secondary);
    border-radius: 12px;
    overflow: hidden;
  }
  
  .chart-bar {
    height: 100%;
    border-radius: 12px;
    animation: progressFill 1s ease forwards;
  }
  
  .chart-bar-value {
    min-width: 40px;
    text-align: left;
    font-weight: 600;
    color: var(--accent-blue);
  }
  
  .donut-chart-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }
  
  .donut-segment {
    opacity: 0;
    animation: fadeIn 0.5s ease forwards;
  }
  
  .donut-center-text {
    fill: var(--text-primary);
  }
  
  .donut-total {
    font-size: 2rem;
    font-weight: 700;
  }
  
  .donut-label {
    font-size: 0.8rem;
    fill: var(--text-secondary);
  }
  
  .chart-legend {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 15px;
  }
  
  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
  }
  
  .legend-color {
    width: 12px;
    height: 12px;
    border-radius: 3px;
  }
  
  .legend-value {
    color: var(--text-muted);
  }
  
  .progress-circle-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
  
  .progress-circle-fill {
    transition: stroke-dashoffset 1s ease;
  }
  
  .progress-text {
    font-size: 1.5rem;
    font-weight: 700;
    fill: var(--text-primary);
  }
  
  .progress-label {
    color: var(--text-secondary);
    font-size: 0.9rem;
  }
`;
document.head.appendChild(chartStyles);

