import { useState, useEffect, useRef } from 'react';

interface UseFileDropOptions {
  onDrop?: (files: FileList) => void;
  onEmptyDrop?: () => void;
  onDragStartFiles?: () => void;
  accept?: string[];
}

export function useFileDrop(options: UseFileDropOptions = {}) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const hasFilesInTransfer = (e: DragEvent) =>
      Boolean(e.dataTransfer?.types && Array.from(e.dataTransfer.types).some(t => t.toLowerCase() === 'files'));

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      if (hasFilesInTransfer(e)) {
        dragCounter.current++;
        if (dragCounter.current === 1) {
          setIsDragging(true);
          optionsRef.current.onDragStartFiles?.();
        }
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current--;
      if (dragCounter.current <= 0) {
        dragCounter.current = 0;
        setIsDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      const wasDraggingFiles = dragCounter.current > 0 || hasFilesInTransfer(e);
      setIsDragging(false);
      dragCounter.current = 0;

      // DropZone側等で既に処理済みの場合は二重発火を防止
      if ((e as unknown as { _pbHandled?: boolean })._pbHandled) {
        return;
      }

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        optionsRef.current.onDrop?.(files);
      } else if (wasDraggingFiles) {
        optionsRef.current.onEmptyDrop?.();
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  return { isDragging };
}
