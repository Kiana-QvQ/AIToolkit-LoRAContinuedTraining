'use client';

import React, { useRef } from 'react';
import { apiClient } from '@/utils/api';

type BaseLoRAFilePickerProps = {
  onUploaded: (serverPath: string) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  className?: string;
  inputId?: string;
  children?: React.ReactNode;
};

/** Hidden file input + trigger; opens OS file dialog (like Windows "Open"). Uploads to server LORAS_FOLDER. */
export default function BaseLoRAFilePicker({
  onUploaded,
  onError,
  disabled,
  className,
  inputId,
  children,
}: BaseLoRAFilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openDialog = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.safetensors') && !ext.endsWith('.ckpt')) {
      onError?.('请选择 .safetensors 或 .ckpt 文件');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiClient.post('/api/loras/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const serverPath = res.data?.path as string;
      if (!serverPath) {
        onError?.('上传成功但未返回路径');
        return;
      }
      onUploaded(serverPath);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        '上传 LoRA 失败，请检查 Settings 中的 LoRA 目录是否可写';
      onError?.(msg);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept=".safetensors,.ckpt"
        className="hidden"
        onChange={handleChange}
      />
      <span className={className} onClick={openDialog} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && openDialog()}>
        {children}
      </span>
    </>
  );
}
