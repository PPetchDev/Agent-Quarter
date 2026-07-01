'use client';
import { useState, useCallback, useRef } from 'react';

interface TiledMapImporterProps {
  onImport: (objects: unknown) => void;
  onError: (message: string) => void;
}

/**
 * Handles drag-and-drop + file input for importing Tiled JSON maps.
 * Shows a translucent overlay during drag, and provides a fallback file picker button.
 */
export function TiledMapImporter({ onImport, onError }: TiledMapImporterProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const json = JSON.parse(reader.result as string);
          onImport(json);
        } catch {
          onError('Invalid JSON file. Please drop a valid Tiled Editor export.');
        }
      };
      reader.onerror = () => {
        onError('Failed to read file.');
      };
      reader.readAsText(file);
    },
    [onImport, onError],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (!file) return;
      if (!file.name.endsWith('.json') && !file.name.endsWith('.tmj')) {
        onError('Please drop a .json or .tmj Tiled Editor export.');
        return;
      }
      handleFile(file);
    },
    [handleFile, onError],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [handleFile],
  );

  return (
    <>
      {/* Drag overlay */}
      {dragOver && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="rounded-2xl border-2 border-dashed border-white/60 bg-white/10 px-8 py-6 text-center backdrop-blur-md">
            <span className="text-3xl">📂</span>
            <p className="mt-2 text-sm font-semibold text-white drop-shadow">
              Drop Tiled JSON here
            </p>
          </div>
        </div>
      )}

      {/* Hidden file input + trigger button */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.tmj"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Import Tiled map"
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        title="Import Tiled map"
        className="flex flex-col items-center justify-center gap-0 rounded-xl border border-[#6a9a5c] bg-[#c8e8b8]/90 px-2.5 py-1.5 shadow-md hover:bg-[#b0dca0] active:scale-95 transition min-w-[54px] max-sm:min-w-[44px] max-sm:px-2 max-sm:py-1"
      >
        <span className="text-[18px] leading-none max-sm:text-[16px]">📂</span>
        <span className="text-[9px] font-bold text-[#2a5a1c] mt-0.5 max-sm:text-[7px]">
          Import
        </span>
      </button>
    </>
  );
}