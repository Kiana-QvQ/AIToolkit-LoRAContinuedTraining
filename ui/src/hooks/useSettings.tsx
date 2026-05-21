'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/utils/api';

export interface Settings {
  HF_TOKEN: string;
  TRAINING_FOLDER: string;
  DATASETS_FOLDER: string;
  LORAS_FOLDER?: string;
  MODELS_FOLDER?: string;
  HF_HOME?: string;
  SD15_MODEL_PATHS?: string[];
  SD15_MODEL_PATH_DEFAULT?: string;
  LORA_SCAN_DIRS?: string[];
  IS_AUTODL?: boolean;
}

export default function useSettings() {
  const [settings, setSettings] = useState({
    HF_TOKEN: '',
    TRAINING_FOLDER: '',
    DATASETS_FOLDER: '',
  });
  const [isSettingsLoaded, setIsLoaded] = useState(false);
  useEffect(() => {
    apiClient
      .get('/api/settings')
      .then(res => res.data)
      .then(data => {
        console.log('Settings:', data);
        setSettings({
          HF_TOKEN: data.HF_TOKEN || '',
          TRAINING_FOLDER: data.TRAINING_FOLDER || '',
          DATASETS_FOLDER: data.DATASETS_FOLDER || '',
          LORAS_FOLDER: data.LORAS_FOLDER || '',
          MODELS_FOLDER: data.MODELS_FOLDER || '',
          HF_HOME: data.HF_HOME || '',
          SD15_MODEL_PATHS: data.SD15_MODEL_PATHS || [],
          SD15_MODEL_PATH_DEFAULT: data.SD15_MODEL_PATH_DEFAULT || '',
          LORA_SCAN_DIRS: data.LORA_SCAN_DIRS || [],
          IS_AUTODL: data.IS_AUTODL === true || data.IS_AUTODL === '1',
        });
        setIsLoaded(true);
      })
      .catch(error => console.error('Error fetching settings:', error));
  }, []);

  return { settings, setSettings, isSettingsLoaded };
}
