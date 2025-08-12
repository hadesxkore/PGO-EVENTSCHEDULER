import { getCloudinaryFileUrl } from '../cloudinary';

export const downloadFile = async (url, filename) => {
  try {
    // Get the download URL with force download flag
    const downloadUrl = getCloudinaryFileUrl(url, { download: true });
    console.log('Using download URL:', downloadUrl);

    // Create a link element
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename); // Force download with original filename
    link.setAttribute('target', '_blank'); // Open in new tab
    
    // Add to document, click, and remove
    document.body.appendChild(link);
    link.click();
    
    // Remove after a short delay
    setTimeout(() => {
      document.body.removeChild(link);
    }, 100);

  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
};