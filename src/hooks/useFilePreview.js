import { useState } from 'react';

export const useFilePreview = () => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewFileName, setPreviewFileName] = useState('');

  const openPreview = (file, fileName = '') => {
    setPreviewFile(file);
    setPreviewFileName(fileName || file?.name || 'File Preview');
    setIsPreviewOpen(true);
  };

  const closePreview = () => {
    // Clean up object URL if it was created
    if (previewFile && typeof previewFile === 'string' && previewFile.startsWith('blob:')) {
      URL.revokeObjectURL(previewFile);
    }
    setIsPreviewOpen(false);
    setPreviewFile(null);
    setPreviewFileName('');
  };

  return {
    isPreviewOpen,
    previewFile,
    previewFileName,
    openPreview,
    closePreview
  };
};

export default useFilePreview;
