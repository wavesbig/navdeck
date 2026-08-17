import { describe, expect, it } from 'vitest';
import { widgetInstanceCreateSchema } from './validation';

// 日期类 widget（countdown/countup）不允许存在没有日期项的实例
describe('widgetInstanceCreateSchema', () => {
  const validItem = { name: '春节', date: '2027-02-06' };

  it('非日期类 widget 不需要日期项', () => {
    expect(
      widgetInstanceCreateSchema.safeParse({ widgetKey: 'nas-status' }).success,
    ).toBe(true);
  });

  it('倒数日必须提供首个日期项', () => {
    const result = widgetInstanceCreateSchema.safeParse({
      widgetKey: 'countdown',
    });
    expect(result.success).toBe(false);
  });

  it('正数日必须提供首个日期项', () => {
    const result = widgetInstanceCreateSchema.safeParse({
      widgetKey: 'countup',
    });
    expect(result.success).toBe(false);
  });

  it('倒数日携带合法 initialItem 通过', () => {
    expect(
      widgetInstanceCreateSchema.safeParse({
        widgetKey: 'countdown',
        initialItem: { ...validItem, recurUnit: 'year' },
      }).success,
    ).toBe(true);
  });

  it('正数日携带合法 initialItem 通过', () => {
    expect(
      widgetInstanceCreateSchema.safeParse({
        widgetKey: 'countup',
        initialItem: validItem,
      }).success,
    ).toBe(true);
  });

  it('非日期类 widget 不允许携带日期项', () => {
    expect(
      widgetInstanceCreateSchema.safeParse({
        widgetKey: 'resource-gauge',
        initialItem: validItem,
      }).success,
    ).toBe(false);
  });

  it('正数日的 initialItem 不允许循环', () => {
    expect(
      widgetInstanceCreateSchema.safeParse({
        widgetKey: 'countup',
        initialItem: { ...validItem, recurUnit: 'month' },
      }).success,
    ).toBe(false);
  });

  it('initialItem 日期非法时拒绝', () => {
    expect(
      widgetInstanceCreateSchema.safeParse({
        widgetKey: 'countdown',
        initialItem: { name: '春节', date: 'not-a-date' },
      }).success,
    ).toBe(false);
  });
});
