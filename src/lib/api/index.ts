import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import type { z } from 'zod';
import { auth } from '@/lib/auth';
import { extractFieldErrors } from '@/lib/validation';

/**
 * API 路由统一鉴权与校验工具
 *
 * 设计原则：
 * - 标准 JSON 路由用 `withAuth` HOC 包装，自动处理 session 校验
 * - 请求体校验用 `validateBody`（基于 zod），失败返回 400 + fieldErrors
 * - FormData / 文件路由等不便走 HOC 的场景用 `requireAuth` 辅助函数
 *
 * 单用户场景：业务里通常不需要 session.user.id，但保留参数以备扩展
 */

/** 任意路由上下文（Next.js 16 中 params 是 Promise） */
type AnyRouteContext = { params: Promise<Record<string, string>> };

/**
 * 原始 route handler 类型
 *
 * req / ctx 都标记为可选，便于无 params 的路由（如 GET 列表）和单元测试调用；
 * Next.js 框架实际调用时一定会传入 req，业务内不使用 ctx 时也可省略。
 */
type Handler = (req?: Request, ctx?: AnyRouteContext) => Promise<Response>;

/** 已登录态的 route handler 类型（ctx 必填，业务可直接 ctx.params） */
type AuthedHandler = (
  session: Session,
  req: Request,
  ctx: AnyRouteContext,
) => Promise<Response>;

/**
 * 包装 route handler，自动校验 session
 *
 * @example
 * export const GET = withAuth(async () => {
 *   const cards = await prisma.card.findMany();
 *   return NextResponse.json(cards);
 * });
 */
export function withAuth(handler: AuthedHandler): Handler {
  return async (req, ctx) => {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    // Next.js 框架实际调用时一定传 req 和 ctx，这里用断言保持类型简洁
    // biome-ignore lint/style/noNonNullAssertion: Next.js 框架保证传入 req 和 ctx
    return handler(session, req!, ctx!);
  };
}

/**
 * 请求体校验（基于 zod schema）
 *
 * @returns 校验通过返回 `{ ok: true, data }`，失败返回 `{ ok: false, response }`
 *
 * @example
 * const parsed = validateBody(cardCreateSchema, body);
 * if (!parsed.ok) return parsed.response;
 * const data = parsed.data;
 */
export function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown,
): { ok: true; data: T } | { ok: false; response: NextResponse } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: '表单校验失败',
          fieldErrors: extractFieldErrors(result.error),
        },
        { status: 400 },
      ),
    };
  }
  return { ok: true, data: result.data };
}

/**
 * 鉴权辅助函数（用于 FormData、文件路由等不便走 HOC 的场景）
 *
 * @returns `[session, null]` 表示已登录；`[null, response]` 表示未登录
 *
 * @example
 * export async function POST(req: Request) {
 *   const [session, authError] = await requireAuth();
 *   if (authError) return authError;
 *   // ...业务逻辑
 * }
 */
export async function requireAuth(): Promise<
  [Session, null] | [null, NextResponse]
> {
  const session = await auth();
  if (!session?.user) {
    return [null, NextResponse.json({ error: '未登录' }, { status: 401 })];
  }
  return [session, null];
}
