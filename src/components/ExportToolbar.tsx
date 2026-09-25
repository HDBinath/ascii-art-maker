'use client';

import React from 'react';
import { AppOptions } from '@/lib/types';
import { soundFx } from '@/lib/soundFx';
import { Download, FileText, Code, Copy, Palette, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ExportToolbarProps {
  options: AppOptions;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  plainText: string;
  htmlContent: string;
  onToast: (msg: string) => void;
}

export const ExportToolbar: React.FC<ExportToolbarProps> = ({
  options,
  canvasRef,
  plainText,
  htmlContent,
  onToast,
}) => {
  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.9 },
        colors: ['#00ff41', '#00f0ff', '#ff71ce', '#ffe600']
      });
    } catch {}
  };

  const handleDownloadPng = () => {
    if (!canvasRef.current) return;
    soundFx.playScan();
    triggerConfetti();

    const dataUrl = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `cyber_${options.mode}_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onToast('High-Resolution PNG Downloaded!');
  };

  const handleDownloadTxt = () => {
    if (!plainText) {
      onToast('No ASCII text available to export.');
      return;
    }
    soundFx.playScan();
    triggerConfetti();

    const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cyber_ascii_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onToast('Plain Text File Saved!');
  };

  const handleDownloadHtml = () => {
    if (!htmlContent) {
      onToast('No HTML document available.');
      return;
    }
    soundFx.playScan();
    triggerConfetti();

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cyber_ascii_${Date.now()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onToast('Standalone HTML Webpage Exported!');
  };

  const handleCopyClipboard = () => {
    if (!plainText) {
      onToast('No text available to copy.');
      return;
    }
    soundFx.playClick();
    navigator.clipboard.writeText(plainText)
      .then(() => {
        onToast('Copied ASCII Art to Clipboard!');
      })
      .catch(() => {
        onToast('Clipboard access denied.');
      });
  };

  return (
    <div className="export-action-toolbar">
      <button
        type="button"
        className="btn-export-primary"
        onClick={handleDownloadPng}
        title="Download rendered image as crisp high-resolution PNG"
      >
        <Download className="w-4 h-4" />
        <span>DOWNLOAD PNG</span>
      </button>

      {(options.mode === 'ascii' || options.mode === 'hybrid') && (
        <>
          <button
            type="button"
            className="btn-export-secondary"
            onClick={handleDownloadTxt}
            title="Download plain text ASCII file"
          >
            <FileText className="w-4 h-4" />
            <span>SAVE .TXT</span>
          </button>

          <button
            type="button"
            className="btn-export-secondary"
            onClick={handleDownloadHtml}
            title="Download standalone styled HTML webpage"
          >
            <Code className="w-4 h-4" />
            <span>EXPORT .HTML</span>
          </button>

          <button
            type="button"
            className="btn-export-secondary"
            onClick={handleCopyClipboard}
            title="Copy ASCII text to clipboard"
          >
            <Copy className="w-4 h-4" />
            <span>COPY TEXT</span>
          </button>
        </>
      )}
    </div>
  );
};
