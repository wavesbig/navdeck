import { z } from 'zod';

import { FONT_SIZE_MAX, FONT_SIZE_MIN } from '@/types';

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

// ============ 卡片 ============

/**
 * 卡片创建 schema（也用作前端表单 schema）
 *
 * - name：必填，1-50 字符
 * - internalUrl：必填，合法 URL
 * - externalUrl：必填，合法 URL
 * - icon：必填（IconPicker 已保证返回非空字符串）
 * - description：选填，最长 200 字符（空字符串 = 无描述）
 * - categoryId：选填，空字符串表示未分类
 */
export const cardCreateSchema = z.object({
  name: z.string().trim().min(1, '名称必填').max(50, '名称最多 50 个字符'),
  internalUrl: urlSchema,
  /** 外网地址选填：留空（''）时由服务端/表单回退为内网地址 */
  externalUrl: z.union([z.literal(''), urlSchema]).optional(),
  /** 图标选填：留空时卡片渲染首字母色块 */
  icon: z.string().optional(),
  /** 选填，最长 200 字符（不传或空字符串 = 无描述） */
  description: z.string().trim().max(200, '描述最多 200 个字符').optional(),
  /** 选填，空字符串 / undefined 表示未分类 */
  categoryId: z.string().optional(),
});

export type CardFormValues = z.infer<typeof cardCreateSchema>;

/** 卡片部分更新 schema（PATCH，所有字段可选） */
export const cardUpdateSchema = cardCreateSchema.partial();

/** 卡片重排项 */
export const cardReorderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        order: z.number().int().min(0),
        /** 跨分类拖拽时的新分类 id，null 表示归到未分类 */
        categoryId: z.string().nullable(),
      }),
    )
    .min(1, '至少一项'),
});

// ============ 分类 ============

/** 分类创建 schema */
export const categoryCreateSchema = z.object({
  name: z
    .string({ error: '名称必填' })
    .trim()
    .min(1, '名称必填')
    .max(30, '名称最多 30 个字符'),
  icon: z.string().nullish(),
  color: z
    .string()
    .nullish()
    .refine((v) => !v || /^#[\da-fA-F]{6}$/.test(v), '请输入合法的 hex 色值'),
});

/** 分类部分更新 schema（PATCH） */
export const categoryUpdateSchema = categoryCreateSchema.partial();

/** 分类重排 schema */
export const categoryReorderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        order: z.number().int().min(0),
      }),
    )
    .min(1, '至少一项'),
});

// ============ 账号 ============

/**
 * 账号更新 schema（PATCH，username 和 password 可同时改也可单独改）
 *
 * - newPassword 存在时 currentPassword 必填
 * - username 和 newPassword 至少有一个
 */
export const accountUpdateSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(1, '用户名必填')
      .max(50, '用户名最多 50 个字符')
      .optional(),
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .min(6, '密码至少 6 位')
      .max(100, '密码最多 100 位')
      .optional(),
  })
  .superRefine((data, ctx) => {
    // 改密码必须带原密码
    if (data.newPassword && !data.currentPassword) {
      ctx.addIssue({
        code: 'custom',
        message: '当前密码必填',
        path: ['currentPassword'],
      });
    }
    // 至少改一个字段
    if (!data.username && !data.newPassword) {
      ctx.addIssue({
        code: 'custom',
        message: '至少修改用户名或密码',
        path: ['root'],
      });
    }
  });

// ============ Widget 配置 ============

const WIDGET_KEYS = [
  'nas-status',
  'resource-gauge',
  'countdown',
  'countup',
] as const;

const DATE_ITEM_WIDGET_KEYS = ['countdown', 'countup'] as const;

/** 日期项输入（name/date/recurUnit，实例创建与单项创建共用） */
const dateItemInputSchema = z.object({
  name: z.string().trim().min(1, '名称必填').max(50, '名称最多 50 个字符'),
  date: z.string().refine((v) => !Number.isNaN(Date.parse(v)), '无效的日期'),
  recurUnit: z.enum(['week', 'month', 'year']).nullish(),
});

/**
 * Widget 实例创建 schema（多实例，可重复添加同类型）
 *
 * 日期类 widget（countdown/countup）必须随实例提供首个日期项 initialItem，
 * 服务端保证「有卡片必有日期」，不存在没有日期项的日期实例。
 */
export const widgetInstanceCreateSchema = z
  .object({
    widgetKey: z.enum(WIDGET_KEYS),
    size: z.enum(['S', 'M', 'L']).optional(),
    order: z.number().int().min(0).optional(),
    initialItem: dateItemInputSchema.optional(),
  })
  .superRefine((val, ctx) => {
    const isDateWidget = DATE_ITEM_WIDGET_KEYS.includes(
      val.widgetKey as (typeof DATE_ITEM_WIDGET_KEYS)[number],
    );
    if (isDateWidget && !val.initialItem) {
      ctx.addIssue({
        code: 'custom',
        path: ['initialItem'],
        message: '日期类 widget 必须提供首个日期项',
      });
    }
    if (!isDateWidget && val.initialItem) {
      ctx.addIssue({
        code: 'custom',
        path: ['initialItem'],
        message: '该 widget 不支持日期项',
      });
    }
    if (val.widgetKey === 'countup' && val.initialItem?.recurUnit) {
      ctx.addIssue({
        code: 'custom',
        path: ['initialItem', 'recurUnit'],
        message: '正数日不支持循环',
      });
    }
  });

/** Widget 实例更新 schema（size / order 可选） */
export const widgetInstanceUpdateSchema = z.object({
  size: z.enum(['S', 'M', 'L']).optional(),
  order: z.number().int().min(0).optional(),
});

// ============ 日期项 ============

/** 日期项创建 schema */
export const dateItemCreateSchema = dateItemInputSchema.extend({
  widgetKey: z.enum(DATE_ITEM_WIDGET_KEYS),
});

/** 日期项更新 schema（部分字段，widgetKey 不可改；recurUnit 传 null 表示取消循环） */
export const dateItemUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '名称必填')
    .max(50, '名称最多 50 个字符')
    .optional(),
  date: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), '无效的日期')
    .optional(),
  recurUnit: z.enum(['week', 'month', 'year']).nullish(),
});

// ============ 偏好 ============

/**
 * 偏好更新 schema
 *
 * value 是任意类型（前端可传 string/number/boolean），但必须有值
 */
export const preferencesUpdateSchema = z
  .object({
    key: z.string().min(1, 'key 必填'),
    value: z.unknown(),
  })
  .refine((data) => data.value !== undefined, {
    message: 'value 必填',
    path: ['value'],
  });

/** 已知偏好 key 的 value schema（未列出的 key 不校验，如 lucky 的结构在 service 层管理） */
const PREFERENCE_VALUE_SCHEMAS: Record<string, z.ZodSchema> = {
  networkMode: z.enum(['auto', 'internal', 'external']),
  theme: z.enum(['light', 'dark', 'system']),
  fontSize: z.number().int().min(FONT_SIZE_MIN).max(FONT_SIZE_MAX),
  searchEngine: z.string().min(1),
  brand: z.object({
    title: z.string().trim().min(1, '标题必填').max(30, '标题最多 30 个字符'),
    logo: z
      .string()
      .trim()
      .max(500, 'Logo 地址最多 500 个字符')
      .refine(
        (value) =>
          value === '' ||
          value.startsWith('/api/icons/file') ||
          /^https?:\/\//.test(value),
        'Logo 仅支持上传文件或 http(s) 地址',
      ),
    // 旧数据无显隐字段，缺省视为显示
    showLogo: z.boolean().default(true),
    showTitle: z.boolean().default(true),
  }),
};

/** 校验偏好值，未注册的 key 直接通过 */
export function validatePreferenceValue(key: string, value: unknown): boolean {
  const schema = PREFERENCE_VALUE_SCHEMAS[key];
  if (!schema) return true;
  return schema.safeParse(value).success;
}

// ============ 工具函数 ============

/**
 * 把 zod v4 的 $ZodErrorTree 展平成 `{ 字段名: 错误消息[] }` 结构
 *
 * 背景：zod v4 中 `error.flatten()` 与 `error.format()` 均已弃用，
 * 官方推荐 `z.treeifyError(err)`，但该函数返回树形结构（含 properties/items），
 * 前端表单需要的仍是扁平 `{ field: string[] }` 形式，故写此递归工具。
 *
 * 键名约定：
 * - 顶层字段错误 → `field`（如 `name`、`internalUrl`）
 * - 根级错误（superRefine 无 path）→ `_root`
 * - 嵌套字段 → 点号路径（如 `items.0.id`）
 *
 * @param tree z.treeifyError(error) 的返回值
 */
type ZodErrorTreeLike = {
  errors?: unknown[];
  properties?: Record<string, ZodErrorTreeLike>;
  items?: ZodErrorTreeLike[];
};

function flattenZodErrorTree(
  tree: ZodErrorTreeLike,
  prefix = '',
): Record<string, string[]> {
  const out: Record<string, string[]> = {};

  const errs = Array.isArray(tree.errors) ? tree.errors.filter(Boolean) : [];
  if (errs.length > 0) {
    out[prefix || '_root'] = errs.map(String);
  }

  if (tree.properties) {
    for (const [k, v] of Object.entries(tree.properties)) {
      const key = prefix ? `${prefix}.${k}` : k;
      Object.assign(out, flattenZodErrorTree(v, key));
    }
  }

  if (tree.items) {
    tree.items.forEach((v, i) => {
      const key = prefix ? `${prefix}.${i}` : String(i);
      Object.assign(out, flattenZodErrorTree(v, key));
    });
  }

  return out;
}

/**
 * 把 zod 校验错误转成 `{ 字段名: 错误消息[] }` 扁平结构
 *
 * 用 z.treeifyError（非弃用 API）拿到树形结构，再递归展平。
 * 供 API 路由 validateBody 在校验失败时构造响应使用。
 */
export function extractFieldErrors<T>(
  error: z.ZodError<T>,
): Record<string, string[]> {
  return flattenZodErrorTree(z.treeifyError(error) as ZodErrorTreeLike);
}
