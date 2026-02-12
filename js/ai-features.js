/**
 * MAK Platform v3.0 - AI Features
 * 10 Smart AI Features powered by Gemini (NOT a chatbot!)
 */

const AIFeatures = {
    // Feature availability
    enabled: true,

    // ============================================
    // FEATURE 1: Smart Team Composer
    // يقترح أفضل تشكيلة للفريق بناءً على خبرات الأعضاء
    // ============================================
    async suggestTeam(projectData) {
        if (!this.enabled) return null;

        try {
            const members = await FirebaseDB.getMembers() || Members.getAll();
            const membersInfo = members.map(m => ({
                name: m.name,
                id: m.id,
                expertise: m.stats?.subjectExpertise || {},
                completedProjects: m.stats?.completedProjects || 0,
                availability: m.availability || 'available'
            }));

            const prompt = `أنت خبير في تشكيل فرق العمل.

المشروع:
- العنوان: ${projectData.title}
- المادة: ${projectData.subject}
- الأولوية: ${projectData.priority}
- الموعد النهائي: ${projectData.deadline}

الأعضاء المتاحين:
${JSON.stringify(membersInfo, null, 2)}

مهمتك:
1. اقترح أفضل 2-3 أعضاء لهذا المشروع
2. اشرح سبب اختيارك لكل عضو

أجب بصيغة JSON:
{
  "suggestedMembers": ["member_001", "member_002"],
  "reasons": {
    "member_001": "السبب",
    "member_002": "السبب"
  },
  "teamStrength": "قوة الفريق المقترح",
  "tips": ["نصيحة 1", "نصيحة 2"]
}`;

            const result = await Gemini.generateJSON(prompt);

            // Log AI usage
            await FirebaseDB.logActivity('ai_team_suggestion', 'system', {
                projectTitle: projectData.title,
                suggestedCount: result?.suggestedMembers?.length || 0
            });

            return result;

        } catch (error) {
            console.error('AI Team suggestion failed:', error);
            return this.fallbackTeamSuggestion(projectData);
        }
    },

    // Fallback without AI
    fallbackTeamSuggestion(projectData) {
        const members = Members.getAll();
        const available = members.filter(m => m.availability !== 'busy');
        const suggested = available.slice(0, 2).map(m => m.id);
        return {
            suggestedMembers: suggested,
            reasons: {},
            teamStrength: 'اقتراح تلقائي بناءً على التوفر',
            tips: ['تحقق من جدول الأعضاء']
        };
    },

    // ============================================
    // FEATURE 2: Auto Project Summary
    // يكتب ملخص احترافي للمشروع تلقائياً
    // ============================================
    async generateSummary(project) {
        if (!this.enabled) return null;

        try {
            const prompt = `اكتب ملخصاً احترافياً موجزاً (3-4 جمل) لهذا المشروع الجامعي:

العنوان: ${project.title}
المادة: ${project.subject}
الوصف: ${project.description || 'لا يوجد وصف'}
الحالة: ${project.status}
${project.files ? `عدد الملفات: ${project.files.length}` : ''}

اكتب الملخص بأسلوب أكاديمي رسمي مناسب للتقارير الجامعية.`;

            const summary = await Gemini.generate(prompt, { maxTokens: 256 });
            return summary.trim();

        } catch (error) {
            console.error('AI Summary generation failed:', error);
            return null;
        }
    },

    // ============================================
    // FEATURE 3: Smart Task Breakdown
    // يقسم المشروع لمهام فرعية تلقائياً
    // ============================================
    async breakdownTasks(project) {
        if (!this.enabled) return null;

        try {
            const prompt = `قسّم هذا المشروع الجامعي إلى مهام فرعية قابلة للتنفيذ:

المشروع: ${project.title}
المادة: ${project.subject}
الوصف: ${project.description || 'لا يوجد وصف'}
الموعد النهائي: ${project.deadline}
عدد الأعضاء: ${project.assignedMembers?.length || 1}

أجب بصيغة JSON:
{
  "tasks": [
    {
      "title": "عنوان المهمة",
      "description": "وصف مختصر",
      "estimatedHours": 2,
      "priority": "high/medium/low",
      "suggestedMember": "member_id أو null"
    }
  ],
  "timeline": "خطة زمنية مقترحة",
  "totalEstimatedHours": 10
}`;

            const result = await Gemini.generateJSON(prompt);
            return result;

        } catch (error) {
            console.error('AI Task breakdown failed:', error);
            return null;
        }
    },

    // ============================================
    // FEATURE 4: Risk Predictor
    // يتنبأ بالمخاطر ويحذر من تأخر المشاريع
    // ============================================
    async predictRisk(project) {
        if (!this.enabled) return null;

        try {
            const now = new Date();
            const deadline = new Date(project.deadline);
            const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

            // Calculate progress based on status
            const statusProgress = {
                'new': 0,
                'in_progress': 40,
                'review': 75,
                'completed': 100
            };
            const progress = statusProgress[project.status] || 0;

            const prompt = `حلل مخاطر تأخر هذا المشروع:

المشروع: ${project.title}
الأيام المتبقية: ${daysLeft}
التقدم الحالي: ${progress}%
الحالة: ${project.status}
عدد الأعضاء: ${project.assignedMembers?.length || 1}
عدد الملفات المرفوعة: ${project.files?.length || 0}

أجب بصيغة JSON:
{
  "riskScore": 0.0-1.0,
  "riskLevel": "low/medium/high/critical",
  "reasons": ["سبب 1", "سبب 2"],
  "recommendations": ["توصية 1", "توصية 2"],
  "predictedDelay": "عدد أيام التأخير المتوقع أو 0"
}`;

            const result = await Gemini.generateJSON(prompt);

            // Create notification if high risk
            if (result && result.riskScore > 0.7) {
                await this.createRiskAlert(project, result);
            }

            return result;

        } catch (error) {
            console.error('AI Risk prediction failed:', error);
            return this.fallbackRiskPrediction(project);
        }
    },

    // Fallback risk calculation
    fallbackRiskPrediction(project) {
        const now = new Date();
        const deadline = new Date(project.deadline);
        const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

        let riskScore = 0;
        if (daysLeft < 0) riskScore = 1.0;
        else if (daysLeft < 2) riskScore = 0.9;
        else if (daysLeft < 5) riskScore = 0.6;
        else if (daysLeft < 10) riskScore = 0.3;
        else riskScore = 0.1;

        if (project.status === 'new' && daysLeft < 7) riskScore += 0.2;
        riskScore = Math.min(1.0, riskScore);

        return {
            riskScore,
            riskLevel: riskScore > 0.7 ? 'high' : riskScore > 0.4 ? 'medium' : 'low',
            reasons: daysLeft < 3 ? ['الموعد النهائي قريب جداً'] : [],
            recommendations: ['سارع في العمل'],
            predictedDelay: 0
        };
    },

    // Create risk alert notification
    async createRiskAlert(project, riskData) {
        await FirebaseDB.createNotification({
            type: 'risk_alert',
            title: `تحذير: مشروع "${project.title}" معرض للتأخير`,
            message: riskData.reasons.join('، '),
            projectId: project.id,
            riskScore: riskData.riskScore,
            aiGenerated: true
        });
    },

    // ============================================
    // FEATURE 5: Performance Insights
    // يحلل أداء كل عضو ويقدم نصائح
    // ============================================
    async analyzePerformance(memberId) {
        if (!this.enabled) return null;

        try {
            const members = await FirebaseDB.getMembers() || Members.getAll();
            const member = members.find(m => m.id === memberId);
            if (!member) return null;

            const projects = await FirebaseDB.getProjects() || Projects.getAll();
            const memberProjects = projects.filter(p => p.assignedMembers?.includes(memberId));

            const prompt = `حلل أداء هذا العضو وقدم نصائح للتحسين:

العضو: ${member.name}
الدور: ${member.role}
إحصائيات:
- إجمالي المشاريع: ${memberProjects.length}
- المكتملة: ${memberProjects.filter(p => p.status === 'completed').length}
- الجارية: ${memberProjects.filter(p => p.status === 'in_progress').length}

أجب بصيغة JSON:
{
  "overallScore": 0-100,
  "strengths": ["نقطة قوة 1", "نقطة قوة 2"],
  "improvements": ["مجال تحسين 1", "مجال تحسين 2"],
  "recommendations": ["توصية 1", "توصية 2"],
  "motivationalMessage": "رسالة تحفيزية قصيرة"
}`;

            const result = await Gemini.generateJSON(prompt);
            return result;

        } catch (error) {
            console.error('AI Performance analysis failed:', error);
            return null;
        }
    },

    // ============================================
    // FEATURE 6: Content Enhancer
    // يحسّن النصوص والأوصاف
    // ============================================
    async enhanceContent(text, type = 'description') {
        if (!this.enabled || !text || text.length < 10) return text;

        try {
            const typeInstructions = {
                'description': 'حسّن هذا الوصف ليكون أكثر وضوحاً واحترافية',
                'title': 'اقترح عنواناً أفضل وأكثر وضوحاً',
                'feedback': 'صِغ هذه الملاحظات بأسلوب بنّاء ومحفز',
                'report': 'أعد صياغة هذا النص بأسلوب تقرير أكاديمي رسمي'
            };

            const prompt = `${typeInstructions[type] || typeInstructions['description']}:

"${text}"

أعد كتابة النص المحسّن فقط بدون أي إضافات.`;

            const enhanced = await Gemini.generate(prompt, { maxTokens: 512 });
            return enhanced.trim().replace(/^["']|["']$/g, '');

        } catch (error) {
            console.error('AI Content enhancement failed:', error);
            return text;
        }
    },

    // ============================================
    // FEATURE 7: Smart Search
    // بحث ذكي بالمعنى وليس الكلمات فقط
    // ============================================
    async smartSearch(query, projects) {
        if (!this.enabled || !query) return projects;

        try {
            const projectsList = projects.map(p => ({
                id: p.id,
                title: p.title,
                description: p.description || '',
                subject: p.subject,
                status: p.status
            }));

            const prompt = `ابحث في هذه المشاريع عن "${query}":

${JSON.stringify(projectsList, null, 2)}

أرجع قائمة بـ IDs المشاريع المطابقة مرتبة حسب الصلة.
ابحث بالمعنى وليس فقط بالكلمات.

أجب بصيغة JSON:
{
  "matchedIds": ["id1", "id2"],
  "searchSummary": "ملخص نتائج البحث"
}`;

            const result = await Gemini.generateJSON(prompt);

            if (result && result.matchedIds) {
                return projects.filter(p => result.matchedIds.includes(p.id));
            }
            return projects;

        } catch (error) {
            console.error('AI Smart search failed:', error);
            // Fallback to basic search
            return projects.filter(p =>
                p.title?.includes(query) ||
                p.description?.includes(query)
            );
        }
    },

    // ============================================
    // FEATURE 8: Report Generator
    // يولّد تقارير احترافية
    // ============================================
    async generateReport(type, data) {
        if (!this.enabled) return null;

        try {
            let prompt = '';

            switch (type) {
                case 'project':
                    prompt = `اكتب تقريراً احترافياً كاملاً لهذا المشروع الجامعي:

${JSON.stringify(data, null, 2)}

التقرير يجب أن يشمل:
1. ملخص تنفيذي
2. أهداف المشروع
3. منهجية العمل
4. النتائج والإنجازات
5. التحديات والحلول
6. التوصيات المستقبلية

اكتب التقرير بأسلوب أكاديمي رسمي.`;
                    break;

                case 'weekly':
                    prompt = `اكتب تقريراً أسبوعياً لإنجازات الفريق:

${JSON.stringify(data, null, 2)}

شمل: ملخص، الإنجازات، التحديات، خطة الأسبوع القادم.`;
                    break;

                case 'member':
                    prompt = `اكتب تقرير أداء لهذا العضو:

${JSON.stringify(data, null, 2)}

شمل: نظرة عامة، نقاط القوة، مجالات التحسين، توصيات.`;
                    break;

                default:
                    return null;
            }

            const report = await Gemini.generate(prompt, { maxTokens: 2048 });
            return report;

        } catch (error) {
            console.error('AI Report generation failed:', error);
            return null;
        }
    },

    // ============================================
    // FEATURE 9: Priority Advisor
    // يقترح أولويات المشاريع
    // ============================================
    async suggestPriorities(projects) {
        if (!this.enabled || !projects.length) return projects;

        try {
            const projectsList = projects.map(p => ({
                id: p.id,
                title: p.title,
                deadline: p.deadline,
                status: p.status,
                priority: p.priority,
                membersCount: p.assignedMembers?.length || 0
            }));

            const prompt = `رتب هذه المشاريع حسب الأولوية الفعلية:

${JSON.stringify(projectsList, null, 2)}

ضع في اعتبارك: الموعد النهائي، الحالة الحالية، عدد الأعضاء.

أجب بصيغة JSON:
{
  "prioritizedIds": ["id1", "id2", "id3"],
  "reasoning": "سبب الترتيب",
  "urgentProjects": ["ids المشاريع العاجلة"]
}`;

            const result = await Gemini.generateJSON(prompt);

            if (result && result.prioritizedIds) {
                return result.prioritizedIds.map(id =>
                    projects.find(p => p.id === id)
                ).filter(Boolean);
            }
            return projects;

        } catch (error) {
            console.error('AI Priority suggestion failed:', error);
            return projects;
        }
    },

    // ============================================
    // FEATURE 10: Smart Suggestions
    // اقتراحات ذكية سياقية
    // ============================================
    async getSuggestions(context) {
        if (!this.enabled) return [];

        try {
            const prompt = `بناءً على هذا السياق، قدم 3 اقتراحات مفيدة وقابلة للتنفيذ:

${JSON.stringify(context, null, 2)}

أجب بصيغة JSON:
{
  "suggestions": [
    {
      "type": "action/tip/warning",
      "icon": "lightbulb/alert-triangle/check-circle",
      "title": "عنوان قصير",
      "description": "وصف الاقتراح",
      "action": "الإجراء المطلوب أو null"
    }
  ]
}`;

            const result = await Gemini.generateJSON(prompt);
            return result?.suggestions || [];

        } catch (error) {
            console.error('AI Suggestions failed:', error);
            return [];
        }
    },

    // ============================================
    // UTILITY METHODS
    // ============================================

    /**
     * Enable/disable AI features
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        localStorage.setItem('mak_ai_enabled', enabled ? 'true' : 'false');
    },

    /**
     * Check if AI is enabled
     */
    isEnabled() {
        const stored = localStorage.getItem('mak_ai_enabled');
        return stored !== 'false';
    },

    /**
     * Initialize AI features
     */
    init() {
        this.enabled = this.isEnabled();
        console.log(`🤖 AI Features: ${this.enabled ? 'Enabled' : 'Disabled'}`);
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    AIFeatures.init();
});

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIFeatures;
}

