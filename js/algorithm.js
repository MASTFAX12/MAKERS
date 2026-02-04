/* ============================================
   MAK TEAM HQ - Smart Distribution Algorithm
   Calculates optimal team member selection
   ============================================ */

const Algorithm = {
    /**
     * Calculate priority score for a member
     * Higher score = higher priority for selection
     * 
     * Formula:
     * Score = (DaysSinceLastTask × 2) 
     *       + (10 - CurrentActiveProjects × 3)
     *       + (SubjectExpertise × 1.5)
     *       + AvailabilityBonus
     */
    calculatePriorityScore(member, subjectId) {
        let score = 0;
        const stats = member.stats;

        // Factor 1: Days since last task (more days = higher priority)
        const daysSinceLastTask = stats.lastProjectDate
            ? this.daysBetween(new Date(stats.lastProjectDate), new Date())
            : 30; // If never worked, give bonus
        score += Math.min(daysSinceLastTask, 30) * 2; // Cap at 30 days, ×2 weight

        // Factor 2: Current active projects (fewer = higher priority)
        const activeProjectsPenalty = stats.activeProjects * 3;
        score += Math.max(10 - activeProjectsPenalty, 0);

        // Factor 3: Subject expertise
        const expertise = stats.subjectExpertise[subjectId] || 3;
        score += expertise * 1.5;

        // Factor 4: Availability bonus
        const availabilityBonus = {
            'available': 10,
            'busy': 3,
            'away': 0
        };
        score += availabilityBonus[member.availability] || 0;

        // Factor 5: Contribution balance (lower contribution = higher priority)
        const avgContribution = this.getAverageContribution();
        if (stats.contributionScore < avgContribution) {
            score += (avgContribution - stats.contributionScore) * 0.2;
        }

        return Math.round(score);
    },

    /**
     * Get suggested team members for a project
     * @param {string} subjectId - The subject of the project
     * @param {number} teamSize - Required team size
     * @returns {Array} - Sorted array of members with scores
     */
    getSuggestedTeam(subjectId, teamSize) {
        const members = Storage.get(Storage.KEYS.MEMBERS) || [];

        // Calculate scores for all members
        const scoredMembers = members.map(member => ({
            ...member,
            priorityScore: this.calculatePriorityScore(member, subjectId)
        }));

        // Sort by priority score (highest first)
        scoredMembers.sort((a, b) => b.priorityScore - a.priorityScore);

        // Mark suggested members
        return scoredMembers.map((member, index) => ({
            ...member,
            suggested: index < teamSize
        }));
    },

    /**
     * Get average contribution score across all members
     */
    getAverageContribution() {
        const members = Storage.get(Storage.KEYS.MEMBERS) || [];
        if (members.length === 0) return 0;

        const total = members.reduce((sum, m) => sum + (m.stats.contributionScore || 0), 0);
        return total / members.length;
    },

    /**
     * Update member stats after project assignment
     */
    assignProject(memberId, projectId, subjectId) {
        const members = Storage.get(Storage.KEYS.MEMBERS) || [];
        const memberIndex = members.findIndex(m => m.id === memberId);

        if (memberIndex !== -1) {
            members[memberIndex].stats.activeProjects += 1;
            members[memberIndex].stats.totalProjects += 1;
            members[memberIndex].stats.lastProjectDate = new Date().toISOString();
            Storage.set(Storage.KEYS.MEMBERS, members);
        }
    },

    /**
     * Update member stats after project completion
     */
    completeProject(memberId, subjectId, grade = null) {
        const members = Storage.get(Storage.KEYS.MEMBERS) || [];
        const memberIndex = members.findIndex(m => m.id === memberId);

        if (memberIndex !== -1) {
            const member = members[memberIndex];
            member.stats.activeProjects = Math.max(0, member.stats.activeProjects - 1);
            member.stats.completedProjects += 1;
            member.stats.contributionScore += 10;

            // Increase subject expertise if good grade
            if (grade && grade >= 80) {
                const currentExpertise = member.stats.subjectExpertise[subjectId] || 3;
                member.stats.subjectExpertise[subjectId] = Math.min(currentExpertise + 0.5, 5);
            }

            Storage.set(Storage.KEYS.MEMBERS, members);
        }
    },

    /**
     * Calculate days between two dates
     */
    daysBetween(date1, date2) {
        const oneDay = 24 * 60 * 60 * 1000;
        return Math.round(Math.abs((date2 - date1) / oneDay));
    },

    /**
     * Get member ranking by contribution
     */
    getMemberRanking() {
        const members = Storage.get(Storage.KEYS.MEMBERS) || [];
        return [...members].sort((a, b) =>
            b.stats.contributionScore - a.stats.contributionScore
        );
    },

    /**
     * Get workload distribution
     */
    getWorkloadDistribution() {
        const members = Storage.get(Storage.KEYS.MEMBERS) || [];
        const totalProjects = members.reduce((sum, m) => sum + m.stats.totalProjects, 0);

        return members.map(member => ({
            id: member.id,
            name: member.name,
            projects: member.stats.totalProjects,
            percentage: totalProjects > 0
                ? Math.round((member.stats.totalProjects / totalProjects) * 100)
                : 0
        }));
    },

    /**
     * Check if workload is balanced
     * Returns true if difference between max and min is less than 30%
     */
    isWorkloadBalanced() {
        const distribution = this.getWorkloadDistribution();
        if (distribution.length === 0) return true;

        const percentages = distribution.map(d => d.percentage);
        const max = Math.max(...percentages);
        const min = Math.min(...percentages);

        return (max - min) <= 30;
    }
};
