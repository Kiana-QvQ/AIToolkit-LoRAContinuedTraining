'use client';

import { useEffect, useState } from 'react';
import useSettings from '@/hooks/useSettings';
import { TopBar, MainContent } from '@/components/layout';
import { apiClient } from '@/utils/api';

export default function Settings() {
  const { settings, setSettings } = useSettings();
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('saving');

    apiClient
      .post('/api/settings', settings)
      .then(() => {
        setStatus('success');
      })
      .catch(error => {
        console.error('Error saving settings:', error);
        setStatus('error');
      })
      .finally(() => {
        setTimeout(() => setStatus('idle'), 2000);
      });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  return (
    <>
      <TopBar>
        <div>
          <h1 className="text-lg">Settings</h1>
        </div>
        <div className="flex-1"></div>
      </TopBar>
      <MainContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="HF_TOKEN" className="block text-sm font-medium mb-2">
                    Hugging Face Token
                    <div className="text-gray-500 text-sm ml-1">
                      Create a Read token on{' '}
                      <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer">
                        {' '}
                        Huggingface
                      </a>{' '}
                      if you need to access gated/private models.
                    </div>
                  </label>
                  <input
                    type="password"
                    id="HF_TOKEN"
                    name="HF_TOKEN"
                    value={settings.HF_TOKEN}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                    placeholder="Enter your Hugging Face token"
                  />
                </div>

                <div>
                  <label htmlFor="TRAINING_FOLDER" className="block text-sm font-medium mb-2">
                    Training Folder Path
                    <div className="text-gray-500 text-sm ml-1">
                      We will store your training information here. Must be an absolute path. If blank, it will default
                      to the output folder in the project root.
                    </div>
                  </label>
                  <input
                    type="text"
                    id="TRAINING_FOLDER"
                    name="TRAINING_FOLDER"
                    value={settings.TRAINING_FOLDER}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                    placeholder="Enter training folder path"
                  />
                </div>

                <div>
                  <label htmlFor="DATASETS_FOLDER" className="block text-sm font-medium mb-2">
                    Dataset Folder Path
                    <div className="text-gray-500 text-sm ml-1">
                      AutoDL / 秋叶: 常为 <code className="text-gray-400">/root/autodl-tmp/train</code>（与 Jupyter 运行.ipynb
                      一致）
                    </div>
                  </label>
                  <input
                    type="text"
                    id="DATASETS_FOLDER"
                    name="DATASETS_FOLDER"
                    value={settings.DATASETS_FOLDER}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                    placeholder="/root/autodl-tmp/train"
                  />
                </div>

                <div>
                  <label htmlFor="LORAS_FOLDER" className="block text-sm font-medium mb-2">
                    LoRA Folder (Base LoRA scan)
                    <div className="text-gray-500 text-sm ml-1">
                      Civitai / 秋叶训练输出的 <code className="text-gray-400">.safetensors</code> 扫描目录，默认{' '}
                      <code className="text-gray-400">/root/autodl-tmp/loras</code>
                    </div>
                  </label>
                  <input
                    type="text"
                    id="LORAS_FOLDER"
                    name="LORAS_FOLDER"
                    value={settings.LORAS_FOLDER || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                    placeholder="/root/autodl-tmp/loras"
                  />
                </div>

                <div>
                  <label htmlFor="MODELS_FOLDER" className="block text-sm font-medium mb-2">
                    Base Models Folder
                    <div className="text-gray-500 text-sm ml-1">
                      仅用于扫描秋叶 ckpt（<code className="text-gray-400">Stable-diffusion/*.safetensors</code>）。
                      训练底模请在任务里填 <strong>Name or Path</strong>，不要填本目录本身。
                    </div>
                  </label>
                  <input
                    type="text"
                    id="MODELS_FOLDER"
                    name="MODELS_FOLDER"
                    value={settings.MODELS_FOLDER || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                    placeholder="/root/autodl-tmp/models"
                  />
                </div>

                <div>
                  <label htmlFor="HF_HOME" className="block text-sm font-medium mb-2">
                    Hugging Face Cache (HF_HOME)
                    <div className="text-gray-500 text-sm ml-1">
                      <code className="text-gray-400">download_sd15.py</code> 与在线拉模缓存，建议{' '}
                      <code className="text-gray-400">/root/autodl-tmp/huggingface_cache</code>
                    </div>
                  </label>
                  <input
                    type="text"
                    id="HF_HOME"
                    name="HF_HOME"
                    value={settings.HF_HOME || ''}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                    placeholder="/root/autodl-tmp/huggingface_cache"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={status === 'saving'}
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'saving' ? 'Saving...' : 'Save Settings'}
          </button>

          {status === 'success' && <p className="text-green-500 text-center">Settings saved successfully!</p>}
          {status === 'error' && <p className="text-red-500 text-center">Error saving settings. Please try again.</p>}
        </form>
      </MainContent>
    </>
  );
}
