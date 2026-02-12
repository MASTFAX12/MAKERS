/**
 * MAK Platform v3.0 - Firebase Storage Operations
 * Handles file uploads to Firebase Cloud Storage
 */

const FirebaseStorage = {
    // Maximum file size (50MB)
    MAX_FILE_SIZE: 50 * 1024 * 1024,

    // Allowed file types (all types allowed)
    ALLOWED_TYPES: '*',

    /**
     * Upload file to Firebase Storage
     * @param {File} file - File object
     * @param {string} projectId - Project ID for organizing files
     * @param {function} onProgress - Progress callback
     * @returns {Promise<object>} - File metadata with download URL
     */
    async uploadFile(file, projectId, onProgress = null) {
        try {
            // Validate file size
            if (file.size > this.MAX_FILE_SIZE) {
                throw new Error(`الملف كبير جداً. الحد الأقصى: ${this.formatFileSize(this.MAX_FILE_SIZE)}`);
            }

            // Check if Firebase is available
            if (!Firebase.checkOnline()) {
                // Fallback: store as base64 in localStorage
                return await this.uploadFileLocal(file, projectId);
            }

            // Generate unique filename
            const timestamp = Date.now();
            const safeName = this.sanitizeFilename(file.name);
            const path = `projects/${projectId}/${timestamp}_${safeName}`;

            // Get storage reference
            const storageRef = Firebase.storageRef(path);

            // Upload with progress tracking
            const uploadTask = storageRef.put(file);

            return new Promise((resolve, reject) => {
                uploadTask.on('state_changed',
                    // Progress
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        if (onProgress) onProgress(progress);
                    },
                    // Error
                    (error) => {
                        console.error('Upload error:', error);
                        reject(error);
                    },
                    // Complete
                    async () => {
                        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();

                        const fileData = {
                            id: 'file_' + timestamp,
                            name: file.name,
                            type: file.type || this.getFileType(file.name),
                            size: this.formatFileSize(file.size),
                            sizeBytes: file.size,
                            path: path,
                            url: downloadURL,
                            uploadedAt: new Date().toISOString(),
                            storageType: 'firebase'
                        };

                        // Log activity
                        const session = Auth.getSession();
                        if (session) {
                            FirebaseDB.logActivity('file_upload', session.memberId, {
                                message: `${session.name} رفع ملف: ${file.name}`,
                                fileName: file.name,
                                projectId: projectId
                            });
                        }

                        resolve(fileData);
                    }
                );
            });

        } catch (error) {
            console.error('Upload failed:', error);
            throw error;
        }
    },

    /**
     * Upload file locally (fallback for offline)
     */
    async uploadFileLocal(file, projectId) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const fileData = {
                    id: 'file_' + Date.now(),
                    name: file.name,
                    type: file.type || this.getFileType(file.name),
                    size: this.formatFileSize(file.size),
                    sizeBytes: file.size,
                    data: e.target.result,
                    uploadedAt: new Date().toISOString(),
                    storageType: 'local'
                };
                resolve(fileData);
            };

            reader.onerror = () => reject(new Error('فشل في قراءة الملف'));
            reader.readAsDataURL(file);
        });
    },

    /**
     * Delete file from Firebase Storage
     */
    async deleteFile(fileData) {
        try {
            if (fileData.storageType === 'firebase' && fileData.path && Firebase.checkOnline()) {
                const storageRef = Firebase.storageRef(fileData.path);
                await storageRef.delete();
            }
            return true;
        } catch (error) {
            console.error('Delete file error:', error);
            return false;
        }
    },

    /**
     * Get download URL for file
     */
    async getDownloadURL(path) {
        try {
            if (!Firebase.checkOnline()) return null;
            const storageRef = Firebase.storageRef(path);
            return await storageRef.getDownloadURL();
        } catch (error) {
            console.error('Get URL error:', error);
            return null;
        }
    },

    /**
     * Sanitize filename for storage
     */
    sanitizeFilename(filename) {
        return filename
            .replace(/[^a-zA-Z0-9\u0600-\u06FF._-]/g, '_')
            .replace(/__+/g, '_');
    },

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Get file type from filename
     */
    getFileType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const mimeTypes = {
            // Documents
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt': 'application/vnd.ms-powerpoint',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'txt': 'text/plain',

            // Images
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml',

            // Audio
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'ogg': 'audio/ogg',

            // Video
            'mp4': 'video/mp4',
            'webm': 'video/webm',
            'avi': 'video/x-msvideo',

            // Archives
            'zip': 'application/zip',
            'rar': 'application/x-rar-compressed',
            '7z': 'application/x-7z-compressed',

            // Code
            'js': 'text/javascript',
            'html': 'text/html',
            'css': 'text/css',
            'json': 'application/json',
            'py': 'text/x-python'
        };

        return mimeTypes[ext] || 'application/octet-stream';
    },

    /**
     * Get file icon (Lucide icon name)
     */
    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            // Documents
            'pdf': 'file-text', 'doc': 'file-text', 'docx': 'file-text',
            'xls': 'file-spreadsheet', 'xlsx': 'file-spreadsheet', 'csv': 'file-spreadsheet',
            'ppt': 'presentation', 'pptx': 'presentation',
            'txt': 'file-text', 'md': 'file-text',

            // Images
            'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image',
            'webp': 'image', 'svg': 'image', 'bmp': 'image',

            // Video
            'mp4': 'video', 'mov': 'video', 'avi': 'video', 'mkv': 'video', 'webm': 'video',

            // Audio
            'mp3': 'music', 'wav': 'music', 'ogg': 'music', 'flac': 'music',

            // Archives
            'zip': 'archive', 'rar': 'archive', '7z': 'archive', 'tar': 'archive',

            // Code
            'js': 'file-code', 'ts': 'file-code', 'py': 'file-code',
            'html': 'file-code', 'css': 'file-code', 'json': 'file-json',

            'default': 'file'
        };

        return icons[ext] || icons['default'];
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseStorage;
}

