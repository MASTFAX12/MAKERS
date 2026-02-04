/**
 * MAK Platform v3.0 - Comments & Subtasks System
 * Project collaboration features
 */

const ProjectFeatures = {
    // ============================================
    // COMMENTS SYSTEM
    // ============================================

    Comments: {
        /**
         * Add comment to project
         */
        async add(projectId, content) {
            const session = Auth.getSession();
            if (!session || !content.trim()) return null;

            const comment = {
                id: 'comment_' + Date.now(),
                projectId: projectId,
                memberId: session.memberId,
                memberName: session.name,
                memberAvatar: session.avatar,
                content: content.trim(),
                createdAt: new Date().toISOString(),
                edited: false
            };

            // Get project and add comment
            const project = Projects.getById(projectId);
            if (!project) return null;

            project.comments = project.comments || [];
            project.comments.push(comment);

            // Save to Firebase
            if (Firebase.checkOnline()) {
                await FirebaseDB.updateProject(projectId, { comments: project.comments });
            }
            Projects.update(projectId, { comments: project.comments });

            // Log activity
            ActivityLog.log('comment_added', session.memberId, {
                message: `${session.name} أضاف تعليقاً على المشروع`,
                projectId: projectId
            });

            // Create notification for team
            project.assignedMembers.forEach(async (memberId) => {
                if (memberId !== session.memberId) {
                    await Notifications.create({
                        type: 'comment_added',
                        title: `تعليق جديد على "${project.title}"`,
                        message: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
                        targetMember: memberId,
                        projectId: projectId
                    });
                }
            });

            return comment;
        },

        /**
         * Delete comment
         */
        async delete(projectId, commentId) {
            const session = Auth.getSession();
            const project = Projects.getById(projectId);
            if (!project || !project.comments) return false;

            const commentIndex = project.comments.findIndex(c => c.id === commentId);
            if (commentIndex === -1) return false;

            // Only allow owner or leader to delete
            const comment = project.comments[commentIndex];
            if (comment.memberId !== session.memberId && session.role !== 'القائد') {
                return false;
            }

            project.comments.splice(commentIndex, 1);

            if (Firebase.checkOnline()) {
                await FirebaseDB.updateProject(projectId, { comments: project.comments });
            }
            Projects.update(projectId, { comments: project.comments });

            return true;
        },

        /**
         * Render comments section
         */
        render(projectId, containerId) {
            const project = Projects.getById(projectId);
            const container = document.getElementById(containerId);
            if (!container) return;

            const comments = project?.comments || [];
            const session = Auth.getSession();

            container.innerHTML = `
                <div class="comments-section">
                    <h3 class="comments-title">
                        <i data-lucide="message-circle"></i>
                        التعليقات (${comments.length})
                    </h3>
                    
                    <div class="comment-form">
                        <div class="comment-input-wrapper">
                            <textarea id="newCommentInput" 
                                      class="form-textarea comment-input" 
                                      placeholder="أضف تعليقاً..."
                                      rows="2"></textarea>
                            <button class="btn btn-primary btn-sm" onclick="ProjectFeatures.Comments.submit('${projectId}')">
                                <i data-lucide="send"></i>
                                إرسال
                            </button>
                        </div>
                    </div>

                    <div class="comments-list">
                        ${comments.length === 0 ? `
                            <div class="comments-empty">
                                <i data-lucide="message-square" style="width:32px;height:32px;opacity:0.3;"></i>
                                <p>لا توجد تعليقات بعد</p>
                            </div>
                        ` : comments.map(c => this.renderComment(c, session)).join('')}
                    </div>
                </div>
            `;

            if (typeof lucide !== 'undefined') lucide.createIcons();
        },

        /**
         * Render single comment
         */
        renderComment(comment, session) {
            const isOwner = session && comment.memberId === session.memberId;
            const isLeader = session && session.role === 'القائد';
            const canDelete = isOwner || isLeader;
            const timeAgo = this.getTimeAgo(comment.createdAt);

            return `
                <div class="comment-item" data-id="${comment.id}">
                    <div class="comment-avatar">${comment.memberAvatar || comment.memberName.charAt(0)}</div>
                    <div class="comment-body">
                        <div class="comment-header">
                            <span class="comment-author">${comment.memberName}</span>
                            <span class="comment-time">${timeAgo}</span>
                            ${canDelete ? `
                                <button class="comment-delete" onclick="ProjectFeatures.Comments.confirmDelete('${comment.projectId}', '${comment.id}')">
                                    <i data-lucide="trash-2"></i>
                                </button>
                            ` : ''}
                        </div>
                        <div class="comment-content">${this.formatContent(comment.content)}</div>
                    </div>
                </div>
            `;
        },

        /**
         * Submit new comment
         */
        async submit(projectId) {
            const input = document.getElementById('newCommentInput');
            if (!input || !input.value.trim()) return;

            const content = input.value;
            input.value = '';
            input.disabled = true;

            const comment = await this.add(projectId, content);

            if (comment) {
                App.showToast('تم إضافة التعليق', 'success');
                this.render(projectId, 'commentsContainer');
            } else {
                App.showToast('فشل في إضافة التعليق', 'error');
                input.value = content;
            }

            input.disabled = false;
        },

        /**
         * Confirm delete
         */
        confirmDelete(projectId, commentId) {
            if (confirm('هل تريد حذف هذا التعليق؟')) {
                this.delete(projectId, commentId).then(success => {
                    if (success) {
                        App.showToast('تم حذف التعليق', 'info');
                        this.render(projectId, 'commentsContainer');
                    }
                });
            }
        },

        /**
         * Format comment content
         */
        formatContent(content) {
            return content
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\n/g, '<br>')
                .replace(/@(\S+)/g, '<span class="mention">@$1</span>');
        },

        /**
         * Get relative time
         */
        getTimeAgo(dateString) {
            const date = new Date(dateString);
            const now = new Date();
            const seconds = Math.floor((now - date) / 1000);

            if (seconds < 60) return 'الآن';
            if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} د`;
            if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} س`;
            if (seconds < 604800) return `منذ ${Math.floor(seconds / 86400)} ي`;
            return date.toLocaleDateString('ar-IQ');
        }
    },

    // ============================================
    // SUBTASKS SYSTEM
    // ============================================

    Subtasks: {
        /**
         * Add subtask to project
         */
        async add(projectId, subtaskData) {
            const session = Auth.getSession();
            if (!session) return null;

            const subtask = {
                id: 'subtask_' + Date.now(),
                title: subtaskData.title,
                description: subtaskData.description || '',
                assignedTo: subtaskData.assignedTo || null,
                priority: subtaskData.priority || 'medium',
                completed: false,
                createdAt: new Date().toISOString(),
                createdBy: session.memberId
            };

            const project = Projects.getById(projectId);
            if (!project) return null;

            project.subtasks = project.subtasks || [];
            project.subtasks.push(subtask);

            if (Firebase.checkOnline()) {
                await FirebaseDB.updateProject(projectId, { subtasks: project.subtasks });
            }
            Projects.update(projectId, { subtasks: project.subtasks });

            // Log activity
            ActivityLog.log('subtask_added', session.memberId, {
                message: `${session.name} أضاف مهمة فرعية: ${subtask.title}`,
                projectId: projectId
            });

            return subtask;
        },

        /**
         * Toggle subtask completion
         */
        async toggle(projectId, subtaskId) {
            const project = Projects.getById(projectId);
            if (!project || !project.subtasks) return false;

            const subtask = project.subtasks.find(s => s.id === subtaskId);
            if (!subtask) return false;

            subtask.completed = !subtask.completed;
            subtask.completedAt = subtask.completed ? new Date().toISOString() : null;

            if (Firebase.checkOnline()) {
                await FirebaseDB.updateProject(projectId, { subtasks: project.subtasks });
            }
            Projects.update(projectId, { subtasks: project.subtasks });

            return true;
        },

        /**
         * Delete subtask
         */
        async delete(projectId, subtaskId) {
            const project = Projects.getById(projectId);
            if (!project || !project.subtasks) return false;

            project.subtasks = project.subtasks.filter(s => s.id !== subtaskId);

            if (Firebase.checkOnline()) {
                await FirebaseDB.updateProject(projectId, { subtasks: project.subtasks });
            }
            Projects.update(projectId, { subtasks: project.subtasks });

            return true;
        },

        /**
         * AI-powered task breakdown
         */
        async generateWithAI(projectId) {
            const project = Projects.getById(projectId);
            if (!project) return null;

            App.showToast('جاري تحليل المشروع بالذكاء الاصطناعي...', 'info');

            try {
                const breakdown = await AIFeatures.breakdownTasks(project);

                if (breakdown && breakdown.tasks) {
                    for (const task of breakdown.tasks) {
                        await this.add(projectId, {
                            title: task.title,
                            description: task.description,
                            priority: task.priority,
                            assignedTo: task.suggestedMember
                        });
                    }

                    App.showToast(`تم إضافة ${breakdown.tasks.length} مهام فرعية`, 'success');
                    return breakdown;
                }
            } catch (error) {
                console.error('AI breakdown failed:', error);
                App.showToast('فشل في التحليل الذكي', 'error');
            }

            return null;
        },

        /**
         * Render subtasks section
         */
        render(projectId, containerId) {
            const project = Projects.getById(projectId);
            const container = document.getElementById(containerId);
            if (!container) return;

            const subtasks = project?.subtasks || [];
            const completedCount = subtasks.filter(s => s.completed).length;
            const progress = subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0;
            const members = Members.getAll();

            container.innerHTML = `
                <div class="subtasks-section">
                    <div class="subtasks-header">
                        <h3>
                            <i data-lucide="list-checks"></i>
                            المهام الفرعية (${completedCount}/${subtasks.length})
                        </h3>
                        <div class="subtasks-actions">
                            <button class="btn btn-ai btn-sm" onclick="ProjectFeatures.Subtasks.generateWithAI('${projectId}').then(() => ProjectFeatures.Subtasks.render('${projectId}', '${containerId}'))">
                                <i data-lucide="sparkles"></i>
                                تقسيم ذكي
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="ProjectFeatures.Subtasks.showAddForm('${projectId}', '${containerId}')">
                                <i data-lucide="plus"></i>
                                إضافة
                            </button>
                        </div>
                    </div>

                    ${subtasks.length > 0 ? `
                        <div class="subtasks-progress">
                            <div class="progress-premium">
                                <div class="progress-premium-fill" style="width: ${progress}%"></div>
                            </div>
                            <span class="progress-text">${progress}% مكتمل</span>
                        </div>
                    ` : ''}

                    <div id="subtaskAddForm" class="subtask-add-form hidden"></div>

                    <div class="subtasks-list">
                        ${subtasks.length === 0 ? `
                            <div class="subtasks-empty">
                                <i data-lucide="list" style="width:32px;height:32px;opacity:0.3;"></i>
                                <p>لا توجد مهام فرعية</p>
                                <p class="text-muted">استخدم "تقسيم ذكي" للحصول على اقتراحات AI</p>
                            </div>
                        ` : subtasks.map(s => this.renderSubtask(s, projectId, containerId, members)).join('')}
                    </div>
                </div>
            `;

            if (typeof lucide !== 'undefined') lucide.createIcons();
        },

        /**
         * Render single subtask
         */
        renderSubtask(subtask, projectId, containerId, members) {
            const assignedMember = subtask.assignedTo ? members.find(m => m.id === subtask.assignedTo) : null;

            return `
                <div class="task-item ${subtask.completed ? 'completed' : ''}" data-id="${subtask.id}">
                    <div class="task-checkbox ${subtask.completed ? 'checked' : ''}" 
                         onclick="ProjectFeatures.Subtasks.toggle('${projectId}', '${subtask.id}').then(() => ProjectFeatures.Subtasks.render('${projectId}', '${containerId}'))">
                        ${subtask.completed ? '<i data-lucide="check"></i>' : ''}
                    </div>
                    <div class="task-content">
                        <div class="task-title">${subtask.title}</div>
                        ${subtask.description ? `<div class="task-description">${subtask.description}</div>` : ''}
                        <div class="task-meta">
                            <span class="task-priority ${subtask.priority}">${this.getPriorityText(subtask.priority)}</span>
                            ${assignedMember ? `<span class="task-assignee"><i data-lucide="user"></i> ${assignedMember.name}</span>` : ''}
                        </div>
                    </div>
                    <button class="task-delete" onclick="ProjectFeatures.Subtasks.confirmDelete('${projectId}', '${subtask.id}', '${containerId}')">
                        <i data-lucide="x"></i>
                    </button>
                </div>
            `;
        },

        /**
         * Show add subtask form
         */
        showAddForm(projectId, containerId) {
            const form = document.getElementById('subtaskAddForm');
            const members = Members.getAll();

            form.innerHTML = `
                <div class="subtask-form-inner">
                    <input type="text" id="subtaskTitle" class="form-input" placeholder="عنوان المهمة" required>
                    <textarea id="subtaskDesc" class="form-textarea" placeholder="وصف (اختياري)" rows="2"></textarea>
                    <div class="form-row">
                        <select id="subtaskPriority" class="form-input">
                            <option value="low">منخفضة</option>
                            <option value="medium" selected>متوسطة</option>
                            <option value="high">عالية</option>
                        </select>
                        <select id="subtaskAssignee" class="form-input">
                            <option value="">بدون تعيين</option>
                            ${members.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-actions">
                        <button class="btn btn-primary btn-sm" onclick="ProjectFeatures.Subtasks.submitForm('${projectId}', '${containerId}')">إضافة</button>
                        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('subtaskAddForm').classList.add('hidden')">إلغاء</button>
                    </div>
                </div>
            `;
            form.classList.remove('hidden');
        },

        /**
         * Submit new subtask
         */
        async submitForm(projectId, containerId) {
            const title = document.getElementById('subtaskTitle').value.trim();
            if (!title) return;

            await this.add(projectId, {
                title: title,
                description: document.getElementById('subtaskDesc').value.trim(),
                priority: document.getElementById('subtaskPriority').value,
                assignedTo: document.getElementById('subtaskAssignee').value || null
            });

            App.showToast('تم إضافة المهمة', 'success');
            this.render(projectId, containerId);
        },

        /**
         * Confirm delete
         */
        confirmDelete(projectId, subtaskId, containerId) {
            if (confirm('حذف هذه المهمة؟')) {
                this.delete(projectId, subtaskId).then(() => {
                    App.showToast('تم حذف المهمة', 'info');
                    this.render(projectId, containerId);
                });
            }
        },

        /**
         * Get priority text
         */
        getPriorityText(priority) {
            const texts = { low: 'منخفضة', medium: 'متوسطة', high: 'عالية' };
            return texts[priority] || priority;
        }
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProjectFeatures;
}
