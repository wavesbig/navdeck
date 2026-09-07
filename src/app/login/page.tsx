import { Suspense } from 'react';
import { getBrandConfig } from '@/lib/brand';
import { LoginForm, LoginFormFallback } from './LoginForm';

/**
 * 登录页（Server Component 外壳）
 *
 * 仅渲染 Suspense + Client Island，无客户端逻辑。
 * LoginForm 因为 useSearchParams 需要 Suspense 包裹（满足 Next.js 16 静态导出要求）。
 */
// 登录页读品牌配置（DB），与主页同理必须动态渲染
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const brand = await getBrandConfig();

  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm brand={brand} />
    </Suspense>
  );
}
