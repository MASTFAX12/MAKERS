/**
 * MAK Platform v3.0 - Gemini AI Service
 * Wrapper for Google Gemini API with caching and rate limiting
 */

const Gemini = {
    // API Configuration
    API_KEY: 'AIzaSyCfWaIv3Hhn8mjLeQra0mb7CrJ8susd4Z8',
    API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',

    // Rate limiting
    requestCount: 0,
    lastReset: Date.now(),
    MAX_REQUESTS_PER_MINUTE: 30,

    // Cache
    cache: new Map(),
    CACHE_TTL: 10 * 60 * 1000, // 10 minutes

    // System context for all requests
    SYSTEM_CONTEXT: `أنت مساعد ذكي لفريق MAK (Makers Team) - فريق طلاب في قسم هندسة تقنيات الأمن السيبراني.
مهمتك هي المساعدة في إدارة المشاريع الجامعية وتحسين إنتاجية الفريق.

معلومات الفريق:
- 6 أعضاء: مصطفى (القائد)، محمد، ابراهيم، مازن، مرتضى، بافيل
- المواد: إدارة لينكس، أساسيات البرمجة، أخلاقيات عصر المعلومات، الديمقراطية، حقوق الإنسان، الرياضيات، الإنجليزي، الرسم الهندسي

تعليمات:
- أجب دائماً باللغة العربية
- كن محدداً ومختصراً
- قدم نصائح عملية
- استخدم النقاط والتعداد للوضوح`,

    /**
     * Generate content using Gemini API
     * @param {string} prompt - The prompt to send
     * @param {object} options - Additional options
     * @returns {Promise<string>} - AI response
     */
    async generate(prompt, options = {}) {
        // Check rate limit
        if (!this.checkRateLimit()) {
            throw new Error('تجاوزت الحد الأقصى من الطلبات. انتظر دقيقة.');
        }

        // Check cache
        const cacheKey = this.getCacheKey(prompt);
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            console.log('📦 Using cached AI response');
            return cached;
        }

        try {
            const response = await fetch(`${this.API_URL}?key=${this.API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `${this.SYSTEM_CONTEXT}\n\n${prompt}`
                        }]
                    }],
                    generationConfig: {
                        temperature: options.temperature || 0.7,
                        maxOutputTokens: options.maxTokens || 1024,
                        topP: 0.9,
                        topK: 40
                    },
                    safetySettings: [
                        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                    ]
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'فشل في الاتصال بـ Gemini');
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

            // Cache the response
            this.setCache(cacheKey, text);
            this.requestCount++;

            return text;

        } catch (error) {
            console.error('Gemini API error:', error);
            throw error;
        }
    },

    /**
     * Check rate limit
     */
    checkRateLimit() {
        const now = Date.now();
        if (now - this.lastReset > 60000) {
            this.requestCount = 0;
            this.lastReset = now;
        }
        return this.requestCount < this.MAX_REQUESTS_PER_MINUTE;
    },

    /**
     * Generate cache key
     */
    getCacheKey(prompt) {
        return btoa(encodeURIComponent(prompt)).slice(0, 50);
    },

    /**
     * Get from cache
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    },

    /**
     * Set cache
     */
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    },

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    },

    // ============================================
    // CONVENIENCE METHODS
    // ============================================

    /**
     * Generate JSON response
     */
    async generateJSON(prompt, options = {}) {
        const enhancedPrompt = `${prompt}\n\nأجب بصيغة JSON فقط بدون أي نص إضافي.`;
        const response = await this.generate(enhancedPrompt, options);

        try {
            // Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return null;
        } catch {
            console.error('Failed to parse JSON:', response);
            return null;
        }
    },

    /**
     * Generate structured list
     */
    async generateList(prompt, options = {}) {
        const response = await this.generate(prompt, options);
        // Extract numbered or bulleted items
        const items = response.match(/[-•*\d+\.]\s*(.+)/g) || [];
        return items.map(item => item.replace(/^[-•*\d+\.]\s*/, '').trim());
    },

    /**
     * Check if AI is available
     */
    isAvailable() {
        return this.checkRateLimit();
    },

    /**
     * Get remaining requests
     */
    getRemainingRequests() {
        return Math.max(0, this.MAX_REQUESTS_PER_MINUTE - this.requestCount);
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Gemini;
}

