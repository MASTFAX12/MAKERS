/**
 * MAK Platform v3.0 - Reports Module
 * Professional PDF report generation
 */

const Reports = {
    // Report templates
    TEMPLATES: {
        PROJECT: 'project',
        WEEKLY: 'weekly',
        MEMBER: 'member',
        SUMMARY: 'summary'
    },

    /**
     * Generate project report
     */
    async generateProjectReport(projectId) {
        const project = Projects.getById(projectId) || await FirebaseDB.getProject(projectId);
        if (!project) return null;

        const members = Members.getAll();
        const settings = Storage.get(Storage.KEYS.SETTINGS);
        const subject = settings.subjects.find(s => s.id === project.subject);

        // Get team members info
        const teamMembers = project.assignedMembers.map(id => {
            const member = members.find(m => m.id === id);
            return member ? member.name : 'غير معروف';
        });

        // Generate AI summary if available
        let aiSummary = '';
        if (AIFeatures.isEnabled()) {
            try {
                aiSummary = await AIFeatures.generateSummary(project);
            } catch (e) {
                console.log('AI summary skipped');
            }
        }

        // Build report content
        const report = {
            title: project.title,
            subject: subject ? subject.name : 'غير محدد',
            status: this.getStatusText(project.status),
            team: teamMembers.join('، '),
            createdDate: new Date(project.createdDate).toLocaleDateString('ar-IQ'),
            deadline: new Date(project.deadline).toLocaleDateString('ar-IQ'),
            completedDate: project.completedDate ? new Date(project.completedDate).toLocaleDateString('ar-IQ') : '-',
            description: project.description || 'لا يوجد وصف',
            aiSummary: aiSummary,
            grade: project.grade || '-',
            feedback: project.feedback || '-',
            filesCount: project.files?.length || 0
        };

        return this.formatReportHTML(report, 'project');
    },

    /**
     * Generate weekly summary report
     */
    async generateWeeklyReport() {
        const projects = Projects.getAll();
        const members = Members.getAll();
        const now = new Date();
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

        // Projects completed this week
        const completedThisWeek = projects.filter(p =>
            p.status === 'completed' &&
            new Date(p.completedDate) >= weekAgo
        );

        // Projects in progress
        const inProgress = projects.filter(p => p.status === 'in_progress');

        // Upcoming deadlines
        const upcomingDeadlines = projects.filter(p => {
            const deadline = new Date(p.deadline);
            return p.status !== 'completed' && deadline <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        });

        // Member stats
        const memberStats = members.map(m => ({
            name: m.name,
            completed: projects.filter(p =>
                p.assignedMembers?.includes(m.id) && p.status === 'completed'
            ).length,
            active: projects.filter(p =>
                p.assignedMembers?.includes(m.id) && p.status !== 'completed'
            ).length
        }));

        const report = {
            weekStart: weekAgo.toLocaleDateString('ar-IQ'),
            weekEnd: now.toLocaleDateString('ar-IQ'),
            completedCount: completedThisWeek.length,
            completedProjects: completedThisWeek.map(p => p.title),
            inProgressCount: inProgress.length,
            upcomingDeadlinesCount: upcomingDeadlines.length,
            upcomingProjects: upcomingDeadlines.map(p => ({
                title: p.title,
                deadline: new Date(p.deadline).toLocaleDateString('ar-IQ')
            })),
            memberStats: memberStats
        };

        return this.formatReportHTML(report, 'weekly');
    },

    /**
     * Generate member performance report
     */
    async generateMemberReport(memberId) {
        const member = Members.getById(memberId);
        if (!member) return null;

        const projects = Projects.getAll();
        const memberProjects = projects.filter(p => p.assignedMembers?.includes(memberId));

        // Calculate stats
        const completed = memberProjects.filter(p => p.status === 'completed');
        const averageGrade = completed.length > 0
            ? completed.reduce((sum, p) => sum + (p.grade || 0), 0) / completed.filter(p => p.grade).length
            : 0;

        // Get AI insights
        let aiInsights = null;
        if (AIFeatures.isEnabled()) {
            try {
                aiInsights = await AIFeatures.analyzePerformance(memberId);
            } catch (e) {
                console.log('AI insights skipped');
            }
        }

        const report = {
            name: member.name,
            role: member.role,
            totalProjects: memberProjects.length,
            completedProjects: completed.length,
            averageGrade: averageGrade.toFixed(1),
            projectsList: memberProjects.map(p => ({
                title: p.title,
                status: this.getStatusText(p.status),
                grade: p.grade || '-'
            })),
            aiInsights: aiInsights
        };

        return this.formatReportHTML(report, 'member');
    },

    /**
     * Format report as HTML
     */
    formatReportHTML(data, type) {
        const header = `
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #0ea5e9; margin: 0;">MAK Team HQ</h1>
                <p style="color: #888; margin: 5px 0;">فريق ميكرز - هندسة تقنيات الأمن السيبراني</p>
                <p style="color: #666; font-size: 12px;">تاريخ التقرير: ${new Date().toLocaleDateString('ar-IQ')}</p>
            </div>
            <hr style="border: 1px solid #333; margin: 20px 0;">
        `;

        let body = '';

        switch (type) {
            case 'project':
                body = `
                    <h2 style="color: #fff;">تقرير المشروع: ${data.title}</h2>
                    
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <tr>
                            <td style="padding: 10px; border: 1px solid #333; background: #1a1a2e;"><strong>المادة</strong></td>
                            <td style="padding: 10px; border: 1px solid #333;">${data.subject}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #333; background: #1a1a2e;"><strong>الحالة</strong></td>
                            <td style="padding: 10px; border: 1px solid #333;">${data.status}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #333; background: #1a1a2e;"><strong>فريق العمل</strong></td>
                            <td style="padding: 10px; border: 1px solid #333;">${data.team}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #333; background: #1a1a2e;"><strong>تاريخ الإنشاء</strong></td>
                            <td style="padding: 10px; border: 1px solid #333;">${data.createdDate}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #333; background: #1a1a2e;"><strong>الموعد النهائي</strong></td>
                            <td style="padding: 10px; border: 1px solid #333;">${data.deadline}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #333; background: #1a1a2e;"><strong>تاريخ الإنجاز</strong></td>
                            <td style="padding: 10px; border: 1px solid #333;">${data.completedDate}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #333; background: #1a1a2e;"><strong>الدرجة</strong></td>
                            <td style="padding: 10px; border: 1px solid #333;">${data.grade}/100</td>
                        </tr>
                    </table>

                    <h3 style="color: #0ea5e9;">الوصف</h3>
                    <p style="line-height: 1.8;">${data.description}</p>

                    ${data.aiSummary ? `
                        <h3 style="color: #8b5cf6;">ملخص ذكي (AI)</h3>
                        <p style="line-height: 1.8; background: #1a1a2e; padding: 15px; border-radius: 8px; border-right: 3px solid #8b5cf6;">${data.aiSummary}</p>
                    ` : ''}

                    ${data.feedback ? `
                        <h3 style="color: #0ea5e9;">ملاحظات التقييم</h3>
                        <p style="line-height: 1.8;">${data.feedback}</p>
                    ` : ''}
                `;
                break;

            case 'weekly':
                body = `
                    <h2 style="color: #fff;">التقرير الأسبوعي</h2>
                    <p style="color: #888;">الفترة: ${data.weekStart} - ${data.weekEnd}</p>

                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0;">
                        <div style="background: #1a1a2e; padding: 20px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 2rem; color: #22c55e;">${data.completedCount}</div>
                            <div style="color: #888;">مشاريع مكتملة</div>
                        </div>
                        <div style="background: #1a1a2e; padding: 20px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 2rem; color: #fb923c;">${data.inProgressCount}</div>
                            <div style="color: #888;">قيد العمل</div>
                        </div>
                        <div style="background: #1a1a2e; padding: 20px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 2rem; color: #ef4444;">${data.upcomingDeadlinesCount}</div>
                            <div style="color: #888;">مواعيد قريبة</div>
                        </div>
                    </div>

                    <h3 style="color: #22c55e;">المشاريع المكتملة</h3>
                    <ul style="line-height: 2;">
                        ${data.completedProjects.map(p => `<li>${p}</li>`).join('') || '<li>لا توجد مشاريع مكتملة هذا الأسبوع</li>'}
                    </ul>

                    <h3 style="color: #fb923c;">مواعيد قادمة</h3>
                    <ul style="line-height: 2;">
                        ${data.upcomingProjects.map(p => `<li>${p.title} - ${p.deadline}</li>`).join('') || '<li>لا توجد مواعيد قريبة</li>'}
                    </ul>
                `;
                break;

            case 'member':
                body = `
                    <h2 style="color: #fff;">تقرير أداء: ${data.name}</h2>
                    <p style="color: #888;">${data.role}</p>

                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0;">
                        <div style="background: #1a1a2e; padding: 20px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 2rem; color: #0ea5e9;">${data.totalProjects}</div>
                            <div style="color: #888;">إجمالي المشاريع</div>
                        </div>
                        <div style="background: #1a1a2e; padding: 20px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 2rem; color: #22c55e;">${data.completedProjects}</div>
                            <div style="color: #888;">مكتملة</div>
                        </div>
                        <div style="background: #1a1a2e; padding: 20px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 2rem; color: #8b5cf6;">${data.averageGrade}</div>
                            <div style="color: #888;">متوسط الدرجات</div>
                        </div>
                    </div>

                    ${data.aiInsights ? `
                        <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.05)); padding: 20px; border-radius: 8px; border-right: 3px solid #8b5cf6; margin: 20px 0;">
                            <h3 style="color: #8b5cf6; margin-top: 0;">تحليل AI</h3>
                            <p><strong>نقاط القوة:</strong> ${data.aiInsights.strengths?.join('، ') || '-'}</p>
                            <p><strong>مجالات التحسين:</strong> ${data.aiInsights.improvements?.join('، ') || '-'}</p>
                            <p style="color: #a78bfa; font-style: italic;">"${data.aiInsights.motivationalMessage || ''}"</p>
                        </div>
                    ` : ''}

                    <h3 style="color: #0ea5e9;">قائمة المشاريع</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr style="background: #1a1a2e;">
                            <th style="padding: 10px; border: 1px solid #333; text-align: right;">المشروع</th>
                            <th style="padding: 10px; border: 1px solid #333; text-align: center;">الحالة</th>
                            <th style="padding: 10px; border: 1px solid #333; text-align: center;">الدرجة</th>
                        </tr>
                        ${data.projectsList.map(p => `
                            <tr>
                                <td style="padding: 10px; border: 1px solid #333;">${p.title}</td>
                                <td style="padding: 10px; border: 1px solid #333; text-align: center;">${p.status}</td>
                                <td style="padding: 10px; border: 1px solid #333; text-align: center;">${p.grade}</td>
                            </tr>
                        `).join('')}
                    </table>
                `;
                break;
        }

        const footer = `
            <hr style="border: 1px solid #333; margin: 30px 0;">
            <div style="text-align: center; color: #666; font-size: 12px;">
                <p>تم إنشاء هذا التقرير تلقائياً بواسطة MAK Platform v3.0</p>
                <p>© 2026 Makers Team - جميع الحقوق محفوظة</p>
            </div>
        `;

        return `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>تقرير - MAK Team HQ</title>
                <style>
                    body {
                        font-family: 'Tajawal', Arial, sans-serif;
                        background: #0a0a0f;
                        color: #e0e0e0;
                        padding: 40px;
                        max-width: 800px;
                        margin: 0 auto;
                        line-height: 1.6;
                    }
                    h1, h2, h3 { font-weight: 700; }
                    table { font-size: 14px; }
                    @media print {
                        body { background: white; color: black; }
                        table, td, th { border-color: #ccc !important; }
                    }
                </style>
            </head>
            <body>
                ${header}
                ${body}
                ${footer}
            </body>
            </html>
        `;
    },

    /**
     * Get status text
     */
    getStatusText(status) {
        const texts = {
            'new': 'جديد',
            'in_progress': 'قيد العمل',
            'review': 'مراجعة',
            'completed': 'مكتمل'
        };
        return texts[status] || status;
    },

    /**
     * Open report in new window for printing/saving
     */
    openReport(html) {
        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();

        // Add print button
        const printBtn = win.document.createElement('button');
        printBtn.textContent = 'طباعة / حفظ PDF';
        printBtn.style.cssText = 'position: fixed; top: 20px; left: 20px; padding: 10px 20px; background: #0ea5e9; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; z-index: 1000;';
        printBtn.onclick = () => win.print();
        win.document.body.appendChild(printBtn);
    },

    /**
     * Generate and open project report
     */
    async printProjectReport(projectId) {
        App.showToast('جاري إنشاء التقرير...', 'info');
        const html = await this.generateProjectReport(projectId);
        if (html) {
            this.openReport(html);
            App.showToast('تم إنشاء التقرير', 'success');
        }
    },

    /**
     * Generate and open weekly report
     */
    async printWeeklyReport() {
        App.showToast('جاري إنشاء التقرير...', 'info');
        const html = await this.generateWeeklyReport();
        if (html) {
            this.openReport(html);
            App.showToast('تم إنشاء التقرير', 'success');
        }
    },

    /**
     * Generate and open member report
     */
    async printMemberReport(memberId) {
        App.showToast('جاري إنشاء التقرير...', 'info');
        const html = await this.generateMemberReport(memberId);
        if (html) {
            this.openReport(html);
            App.showToast('تم إنشاء التقرير', 'success');
        }
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Reports;
}

