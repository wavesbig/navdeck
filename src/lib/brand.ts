import { getUserPreference } from '@/lib/preferences';
import type { BrandConfig } from '@/types';
import { DEFAULT_BRAND_CONFIG } from './brand-constants';

export { DEFAULT_BRAND_CONFIG };

/** 读取品牌配置（DB 不可用时降级为默认品牌，保证根布局渲染不中断） */
export async function getBrandConfig(): Promise<BrandConfig> {
  let brand: BrandConfig;
  try {
    brand = await getUserPreference<BrandConfig>('brand', DEFAULT_BRAND_CONFIG);
  } catch (error) {
    console.error('读取品牌配置失败，使用默认值', error);
    brand = DEFAULT_BRAND_CONFIG;
  }

  return {
    title: brand.title?.trim() || DEFAULT_BRAND_CONFIG.title,
    logo: brand.logo?.trim() || DEFAULT_BRAND_CONFIG.logo,
    // 旧数据无显隐字段，默认显示
    showLogo: brand.showLogo ?? true,
    showTitle: brand.showTitle ?? true,
  };
}
