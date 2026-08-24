import { getUserPreference } from '@/lib/preferences';
import type { BrandConfig } from '@/types';
import { DEFAULT_BRAND_CONFIG } from './brand-constants';

export { DEFAULT_BRAND_CONFIG };

/** 读取品牌配置 */
export async function getBrandConfig(): Promise<BrandConfig> {
  const brand = await getUserPreference<BrandConfig>(
    'brand',
    DEFAULT_BRAND_CONFIG,
  );

  return {
    title: brand.title?.trim() || DEFAULT_BRAND_CONFIG.title,
    logo: brand.logo?.trim() || DEFAULT_BRAND_CONFIG.logo,
  };
}
