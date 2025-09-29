import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { X, Download, FileText, AlertCircle } from "lucide-react";

const FilePreviewModal = ({ 
  isOpen, 
  onClose, 
  file, 
  fileName = "File Preview" 
}) => {
  const [fileUrl, setFileUrl] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!file) {
      setFileUrl(null);
      setFileType(null);
      setError(null);
      return;
    }

    try {
      let url = null;
      let type = null;

      // If file is already a URL string, use it directly
      if (typeof file === 'string') {
        url = file;
        type = 'url';
      } 
      // If file is a File object, create object URL
      else if (file instanceof File) {
        url = URL.createObjectURL(file);
        type = file.type;
        
        // Determine file type based on MIME type or extension
        if (file.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
          type = 'pdf';
        } else if (file.type.includes('word') || fileName.toLowerCase().endsWith('.doc') || fileName.toLowerCase().endsWith('.docx')) {
          type = 'document';
        } else if (file.type.startsWith('image/')) {
          type = 'image';
        } else {
          type = 'other';
        }
      }

      setFileUrl(url);
      setFileType(type);
      setError(null);

      // Cleanup function to revoke object URL
      return () => {
        if (url && file instanceof File) {
          URL.revokeObjectURL(url);
        }
      };
    } catch (err) {
      console.error('Error creating file preview:', err);
      setError('Failed to load file preview');
    }
  }, [file, fileName]);

  const handleClose = () => {
    onClose();
  };

  const handleDownload = () => {
    if (fileUrl && file instanceof File) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderFilePreview = () => {
    if (error) {
      return (
        <div className="w-full h-[75vh] border border-gray-200 dark:border-slate-600 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-slate-800">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              {error}
            </p>
            <Button onClick={handleDownload} variant="outline" className="mt-2">
              <Download className="h-4 w-4 mr-2" />
              Download File Instead
            </Button>
          </div>
        </div>
      );
    }

    if (!fileUrl) {
      return (
        <div className="w-full h-[75vh] border border-gray-200 dark:border-slate-600 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-slate-800">
          <div className="text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              No file to preview
            </p>
          </div>
        </div>
      );
    }

    // Handle different file types
    if (fileType === 'pdf') {
      return (
        <div className="w-full h-[75vh] border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden bg-white">
          <iframe
            src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1`}
            className="w-full h-full"
            title="PDF Preview"
            style={{ border: 'none' }}
          />
        </div>
      );
    }

    if (fileType === 'image') {
      return (
        <div className="w-full h-[75vh] border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden bg-white flex items-center justify-center">
          <img
            src={fileUrl}
            alt={fileName}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      );
    }

    if (fileType === 'document') {
      return (
        <div className="w-full h-[75vh] border border-gray-200 dark:border-slate-600 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-slate-800">
          <div className="text-center">
            <FileText className="h-16 w-16 text-blue-500 mx-auto mb-4" />
            <p className="text-gray-700 dark:text-gray-300 mb-2 font-medium">
              {fileName}
            </p>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Word documents cannot be previewed in browser
            </p>
            <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700">
              <Download className="h-4 w-4 mr-2" />
              Download to View
            </Button>
          </div>
        </div>
      );
    }

    // Default iframe for other file types
    return (
      <div className="w-full h-[75vh] border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden bg-white">
        <iframe
          src={fileUrl}
          className="w-full h-full"
          title="File Preview"
          style={{ border: 'none' }}
        />
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="!max-w-5xl !w-[90vw] max-h-[90vh] overflow-hidden bg-white dark:bg-slate-900">
        <DialogHeader className="relative pb-4">
          <button
            onClick={handleClose}
            className="absolute right-0 top-0 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors z-10"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white pr-10">
            📄 {fileName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          {renderFilePreview()}
        </div>
        
        <div className="flex justify-between items-center gap-3 pt-4 border-t border-gray-200 dark:border-slate-600">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {file instanceof File && (
              <span>
                Size: {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            )}
          </div>
          <div className="flex gap-3">
            {file instanceof File && (
              <Button
                variant="outline"
                onClick={handleDownload}
                className="px-6"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleClose}
              className="px-6"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilePreviewModal;
