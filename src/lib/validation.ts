import { z } from 'zod';

/**
 * URL 校验：支持 http(s) 协议，也允许常见自托管格式
 * - http://192.168.1.10:8096
 * - https://jellyfin.example.com
 * - http://localhost:3000
 *
 * 不强制要求 https，自托管场景内网地址常用 http。
 */
const urlSchema = z
  .string()
  .trim()
  .min(1, '地址必填')
  .refine(
    (val) => {
      try {
        const u = new URL(val);
        return u.protocol === 'http:' || u.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: '请输入合法的 http/https 地址' },
  );

/**
 * 卡片新建/编辑表单 schema
 *
 * - name：必填，1-50 字符
 * - internalUrl：必填，合法 URL
 * - externalUrl：必填，合法 URL
 * - icon：必填（IconPicker 已保证返回非空字符串）
 * - description：选填，最长 200 字符（空字符串 = 无描述）
 * - categoryId：选填，空字符串表示未分类
 */
export const cardFormSchema = z.object({
  name: z.string().trim().min(1, '名称必填').max(50, '名称最多 50 个字符'),
  internalUrl: urlSchema,
  externalUrl: urlSchema,
  icon: z.string().min(1, '请选择图标'),
  description: z.string().trim().max(200, '描述最多 200 个字符'),
  categoryId: z.string(),
});

export type CardFormValues = z.infer<typeof cardFormSchema>;

/**
 * 解析服务端 API 返回的字段级错误
 *
 * 优先使用 fieldErrors 对象（结构化），fallback 解析 error 字符串关键字
 *
 * @returns 字段名 → 错误消息的映射，无字段错误时返回 null
 */
export function parseApiFieldErrors(
  error: string,
  fieldErrors?: Record<string, string>,
): Record<string, string> | null {
  // 优先使用结构化字段错误
  if (fieldErrors && Object.keys(fieldErrors).length > 0) {
    return fieldErrors;
  }

  // fallback：解析错误消息关键字映射到字段（兼容旧格式）
  if (!error) return null;

  const fieldMap: Record<string, RegExp> = {
    name: /名称/,
    internalUrl: /内网地址/,
    externalUrl: /外网地址/,
    icon: /图标/,
    categoryId: /分类/,
  };

  for (const [field, pattern] of Object.entries(fieldMap)) {
    if (pattern.test(error)) {
      return { [field]: error };
    }
  }

  return null;
}
