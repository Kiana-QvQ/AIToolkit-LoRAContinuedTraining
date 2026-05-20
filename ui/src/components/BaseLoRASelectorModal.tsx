'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { createGlobalState } from 'react-global-hooks';
import { Modal } from './Modal';
import { getFilename } from '@/utils/basic';
import { apiClient } from '@/utils/api';

interface BaseLoRASelectorModalState {
  onSelect: (path: string) => void;
}

interface FileObject {
  path: string;
  size: number;
}

export const baseLoRASelectorModalState = createGlobalState<BaseLoRASelectorModalState | null>(null);

export const openBaseLoRASelectorModal = (onSelect: (path: string) => void) => {
  baseLoRASelectorModalState.set({ onSelect });
};

const cleanSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const BaseLoRASelectorModal: React.FC = () => {
  const [modalInfo, setModalInfo] = baseLoRASelectorModalState.use();
  const isOpen = modalInfo !== null;
  const [files, setFiles] = useState<FileObject[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [query, setQuery] = useState('');
  const [directory, setDirectory] = useState('');
  const [defaultDirectory, setDefaultDirectory] = useState('');

  const loadFiles = (targetDir?: string) => {
    setStatus('loading');
    const params = new URLSearchParams();
    if (targetDir && targetDir.trim() !== '') {
      params.set('dir', targetDir.trim());
    }
    const qs = params.toString();
    const url = qs ? `/api/files/list?${qs}` : '/api/files/list';
    apiClient
      .get(url)
      .then(res => res.data)
      .then(data => {
        setFiles(data.files ?? []);
        setStatus('success');
        if (data.default_dir) {
          setDefaultDirectory(data.default_dir);
        }
        if (data.scanned_dir) {
          setDirectory(data.scanned_dir);
        }
      })
      .catch(() => {
        setStatus('error');
      });
  };

  useEffect(() => {
    if (!isOpen) {
      setFiles([]);
      setStatus('idle');
      setQuery('');
      setDirectory('');
      setDefaultDirectory('');
      return;
    }
    loadFiles();
  }, [isOpen]);

  const filteredFiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return files;
    return files.filter(file => file.path.toLowerCase().includes(q));
  }, [files, query]);

  const onClose = () => setModalInfo(null);

  const handleSelect = (path: string) => {
    modalInfo?.onSelect(path);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Base LoRA" size="xl">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="text-xs text-gray-500">
            Default behavior scans the AI Toolkit training directory. You can also enter a custom directory and scan it.
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={directory}
              onChange={e => setDirectory(e.target.value)}
              placeholder="Directory to scan for .safetensors"
              className="flex-1 text-sm px-3 py-2 bg-gray-950 dark:bg-gray-800 border border-gray-700 rounded-sm text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-gray-600 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => loadFiles(directory)}
              className="px-3 py-2 text-sm rounded-sm bg-gray-800 hover:bg-gray-700 text-gray-100 border border-gray-700"
            >
              Scan
            </button>
            <button
              type="button"
              onClick={() => loadFiles(defaultDirectory)}
              className="px-3 py-2 text-sm rounded-sm bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-700"
            >
              Reset
            </button>
          </div>
        </div>

        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by filename or path"
          className="w-full text-sm px-3 py-2 bg-gray-950 dark:bg-gray-800 border border-gray-700 rounded-sm text-gray-100 placeholder:text-gray-500 focus:ring-2 focus:ring-gray-600 focus:border-transparent"
        />

        <div className="rounded-xl border border-gray-800 bg-gray-950/60 min-h-[360px] max-h-[60vh] overflow-y-auto">
          {status === 'loading' && <div className="p-4 text-sm text-gray-400">Loading LoRA files...</div>}
          {status === 'error' && <div className="p-4 text-sm text-rose-400">Failed to load LoRA files.</div>}
          {status === 'success' && filteredFiles.length === 0 && (
            <div className="p-4 text-sm text-gray-400">No `.safetensors` files found.</div>
          )}
          {status === 'success' &&
            filteredFiles.map(file => (
              <button
                key={file.path}
                type="button"
                onClick={() => handleSelect(file.path)}
                className="w-full text-left px-4 py-3 border-b border-gray-800 last:border-b-0 hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm text-gray-100 truncate">{getFilename(file.path)}</div>
                    <div className="text-xs text-gray-500 truncate">{file.path}</div>
                  </div>
                  <div className="text-xs text-gray-400 flex-shrink-0">{cleanSize(file.size)}</div>
                </div>
              </button>
            ))}
        </div>
      </div>
    </Modal>
  );
};

export default BaseLoRASelectorModal;
