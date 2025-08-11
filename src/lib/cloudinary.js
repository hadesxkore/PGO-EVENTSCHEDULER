// Function to upload file to Cloudinary
export const uploadFile = async (file) => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'files-images'); // Your upload preset
        formData.append('folder', 'event-scheduler-docs'); // Optional: organize files in folders

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/dz8rbjfa1/auto/upload`,
            {
                method: 'POST',
                body: formData,
            }
        );

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }

        return {
            success: true,
            url: data.secure_url,
            publicId: data.public_id,
            format: data.format,
            size: data.bytes,
            resourceType: data.resource_type
        };
    } catch (error) {
        console.error('Upload error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Function to get file size in readable format
export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};