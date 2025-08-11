import React, { useState } from 'react';
import { Button } from './ui/button';
import { uploadFile } from '../lib/cloudinary';
import { Progress } from './ui/progress';

const FileUpload = ({ onUploadComplete }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
            setError('Please upload only PDF or Word documents');
            return;
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            setError('File size must be less than 10MB');
            return;
        }

        setIsUploading(true);
        setError(null);
        setUploadProgress(0);

        try {
            // Simulate upload progress
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 90) clearInterval(progressInterval);
                    return Math.min(prev + 10, 90);
                });
            }, 500);

            const result = await uploadFile(file);
            clearInterval(progressInterval);

            if (result.success) {
                setUploadProgress(100);
                onUploadComplete?.(result);
            } else {
                setError('Upload failed: ' + result.error);
                setUploadProgress(0);
            }
        } catch (err) {
            setError('Upload failed: ' + err.message);
            setUploadProgress(0);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-4">
            <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx"
                className="hidden"
                id="file-upload"
                disabled={isUploading}
            />
            <label htmlFor="file-upload">
                <Button
                    as="span"
                    disabled={isUploading}
                    className="cursor-pointer"
                    variant="outline"
                >
                    {isUploading ? 'Uploading...' : 'Upload Document'}
                </Button>
            </label>

            {isUploading && (
                <div className="w-full space-y-2">
                    <Progress value={uploadProgress} className="w-full" />
                    <p className="text-sm text-gray-500 text-center">
                        {uploadProgress}% uploaded
                    </p>
                </div>
            )}

            {error && (
                <div className="text-red-500 text-sm mt-2 p-2 bg-red-50 rounded-md">
                    {error}
                </div>
            )}
        </div>
    );
};

export default FileUpload;