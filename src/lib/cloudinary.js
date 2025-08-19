const CLOUD_NAME = 'dz8rbjfa1';
const UPLOAD_PRESET = 'images-files';

export const uploadFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'event-scheduler-docs');
    formData.append('tags', 'event_scheduler');

    const isImage = file.type.startsWith('image/');
    const uploadEndpoint = isImage ? 'image' : 'auto';

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${uploadEndpoint}/upload`,
      {
        method: 'POST',
        body: formData
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
      resourceType: data.resource_type,
      format: data.format,
      name: file.name,
      size: file.size,
      type: file.type
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    return { success: false, error: error.message };
  }
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Function to generate a download URL for Cloudinary files
export const getCloudinaryFileUrl = (url, { download = false } = {}) => {
  if (!url) return url;

  // Extract the version and file path from the URL
  const matches = url.match(/\/v\d+\/(.+)$/);
  if (!matches) return url;

  const filePath = matches[1];
  const fileExtension = filePath.split('.').pop().toLowerCase();

  // Base Cloudinary URL
  const baseUrl = `https://res.cloudinary.com/${CLOUD_NAME}`;

  if (download) {
    // Handle different file types appropriately
    if (fileExtension === 'pdf') {
      // For PDFs, we need to use the 'image' resource type with fl_attachment
      return `${baseUrl}/image/upload/fl_attachment/v1/${filePath}`;
    } else if (['doc', 'docx', 'xls', 'xlsx'].includes(fileExtension)) {
      // For other documents, use raw resource type
      return `${baseUrl}/raw/upload/fl_attachment/v1/${filePath}`;
    } else {
      // For images and other files
      return `${baseUrl}/image/upload/fl_attachment/v1/${filePath}`;
    }
  }

  // For viewing, return the original URL
  return url;
};