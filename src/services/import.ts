import { request } from '@/lib/request/request';
import type { SunPanelImportStats, SunPanelParseResult } from '@/lib/sun-panel';

export const importApi = {
  /** 预览 Sun-Panel 配置文件解析结果（不落库） */
  previewSunPanel: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('action', 'preview');
    return request<{ success: boolean; preview: SunPanelParseResult }>(
      '/api/import/sun-panel',
      {
        method: 'POST',
        body: formData,
      },
    );
  },

  /** 执行 Sun-Panel 导入 */
  importSunPanel: (file: File, mode: 'append' | 'overwrite' = 'append') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('action', 'import');
    formData.append('mode', mode);
    return request<{ success: boolean; stats: SunPanelImportStats }>(
      '/api/import/sun-panel',
      {
        method: 'POST',
        body: formData,
      },
    );
  },
};
