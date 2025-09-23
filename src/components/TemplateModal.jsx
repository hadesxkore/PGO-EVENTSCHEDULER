import React, { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import jsPDF from 'jspdf';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import {
  X,
  FileText,
  Download,
  Eye,
  Loader2
} from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

const TemplateModal = ({ 
  isOpen, 
  onClose, 
  title, 
  description, 
  icon: Icon = FileText,
  fields = [],
  onFileGenerated = () => {},
  templateType = "template"
}) => {
  const { isDarkMode } = useTheme();
  const [formData, setFormData] = useState(() => {
    const initialData = {};
    fields.forEach(field => {
      initialData[field.key] = "";
    });
    return initialData;
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const handleInputChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // Load and add logo
      try {
        const logoImg = new Image();
        logoImg.src = '/images/bataanlogo.png';
        
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve;
          logoImg.onerror = reject;
        });

        // Add logo (top left)
        const logoSize = 25;
        pdf.addImage(logoImg, 'PNG', margin, yPosition, logoSize, logoSize);
        
        // Header text next to logo
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('PROVINCIAL GOVERNMENT OF BATAAN', margin + logoSize + 10, yPosition + 8);
        
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Republic of the Philippines', margin + logoSize + 10, yPosition + 15);
        
        // Generation date and time
        const now = new Date();
        const dateTime = now.toLocaleString('en-PH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Generated: ${dateTime}`, margin + logoSize + 10, yPosition + 22);
        
        yPosition += logoSize + 10;
      } catch (error) {
        console.warn('Could not load logo, proceeding without it');
        // Fallback header without logo
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('PROVINCIAL GOVERNMENT OF BATAAN', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 8;
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Republic of the Philippines', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 20;
      }

      // Main title
      yPosition += 5;
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title.toUpperCase(), pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Add a line separator
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Create table for form fields
      const tableWidth = pageWidth - 2 * margin;
      const labelColumnWidth = tableWidth * 0.35;
      const valueColumnWidth = tableWidth * 0.65;
      const rowHeight = 12;
      
      pdf.setFontSize(10);
      pdf.setLineWidth(0.3);
      
      fields.forEach((field, index) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = margin;
        }

        let currentRowHeight = rowHeight;
        const fieldValue = formData[field.key] || 'N/A';
        
        // Calculate height needed for text areas
        if (field.type === 'textarea' && fieldValue !== 'N/A') {
          const lines = pdf.splitTextToSize(fieldValue, valueColumnWidth - 4);
          currentRowHeight = Math.max(rowHeight, lines.length * 4 + 8);
        }

        // Draw cell borders
        pdf.rect(margin, yPosition, labelColumnWidth, currentRowHeight);
        pdf.rect(margin + labelColumnWidth, yPosition, valueColumnWidth, currentRowHeight);

        // Add label text
        pdf.setFont('helvetica', 'bold');
        pdf.text(field.label, margin + 2, yPosition + 7);

        // Add value text
        pdf.setFont('helvetica', 'normal');
        if (field.type === 'textarea' && fieldValue !== 'N/A') {
          const lines = pdf.splitTextToSize(fieldValue, valueColumnWidth - 4);
          pdf.text(lines, margin + labelColumnWidth + 2, yPosition + 7);
        } else {
          pdf.text(fieldValue, margin + labelColumnWidth + 2, yPosition + 7);
        }
        
        yPosition += currentRowHeight;
      });

      return pdf;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = async () => {
    try {
      const pdf = await generatePDF();
      const fileName = `${templateType}_${formData[fields[0]?.key] || 'Template'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      // Create a file object for the parent component
      const pdfBlob = pdf.output('blob');
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      onFileGenerated(file);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const previewPDF = async () => {
    try {
      const pdf = await generatePDF();
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
    } catch (error) {
      console.error('Error previewing PDF:', error);
      alert('Error previewing PDF. Please try again.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "!max-w-6xl !w-[85vw] max-h-[90vh] overflow-y-auto",
        "bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700"
      )}>
        {/* Header */}
        <DialogHeader className="text-center relative">
          <button
            onClick={onClose}
            className="absolute right-0 top-0 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
            {title}
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400 text-sm">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 w-1/3">
                      Field
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 w-2/3">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {fields.map((field, index) => (
                    <tr key={field.key}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 align-top">
                        {field.label}
                      </td>
                      <td className="px-4 py-3">
                        {field.type === 'textarea' ? (
                          <textarea
                            value={formData[field.key]}
                            onChange={(e) => handleInputChange(field.key, e.target.value)}
                            placeholder={field.placeholder || `Enter ${field.label.toLowerCase().replace(':', '')}`}
                            className="w-full border-0 p-0 text-sm bg-transparent focus:ring-0 resize-none min-h-[80px] placeholder:text-gray-400"
                            rows={3}
                          />
                        ) : (
                          <Input
                            type="text"
                            value={formData[field.key]}
                            onChange={(e) => handleInputChange(field.key, e.target.value)}
                            placeholder={field.placeholder || `Enter ${field.label.toLowerCase().replace(':', '')}`}
                            className="w-full border-0 p-0 text-sm bg-transparent focus:ring-0 placeholder:text-gray-400"
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-between items-center gap-4">
              <div className="flex gap-3">
                <Button
                  onClick={previewPDF}
                  disabled={isGenerating}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  Preview PDF
                </Button>
                <Button
                  onClick={downloadPDF}
                  disabled={isGenerating}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download PDF
                </Button>
              </div>
              <Button
                variant="outline"
                className="hover:bg-gray-50 dark:hover:bg-slate-800"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

export default TemplateModal;
