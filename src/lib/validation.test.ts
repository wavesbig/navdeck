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

describe('portAddressFormat preference validation', () => {
  it('允许合法取值 port、ip-port 和 url', async () => {
    const { validatePreferenceValue } = await import('./validation');
    expect(validatePreferenceValue('portAddressFormat', 'port')).toBe(true);
    expect(validatePreferenceValue('portAddressFormat', 'ip-port')).toBe(true);
    expect(validatePreferenceValue('portAddressFormat', 'url')).toBe(true);
  });

  it('拒绝非法取值', async () => {
    const { validatePreferenceValue } = await import('./validation');
    expect(validatePreferenceValue('portAddressFormat', 'http')).toBe(false);
    expect(validatePreferenceValue('portAddressFormat', 123)).toBe(false);
  });
});

describe('portCustomIp preference validation', () => {
  it('允许空字符串或合法 IP 字符串', async () => {
    const { validatePreferenceValue } = await import('./validation');
    expect(validatePreferenceValue('portCustomIp', '')).toBe(true);
    expect(validatePreferenceValue('portCustomIp', '192.168.1.100')).toBe(true);
    expect(validatePreferenceValue('portCustomIp', '10.0.0.5')).toBe(true);
  });

  it('拒绝非字符串类型', async () => {
    const { validatePreferenceValue } = await import('./validation');
    expect(validatePreferenceValue('portCustomIp', 12345)).toBe(false);
    expect(validatePreferenceValue('portCustomIp', null)).toBe(false);
    expect(validatePreferenceValue('portCustomIp', {})).toBe(false);
  });
});

describe('manualOccupiedPorts preference validation', () => {
  it('允许合法的端口标记数组', async () => {
    const { validatePreferenceValue } = await import('./validation');
    expect(
      validatePreferenceValue('manualOccupiedPorts', [
        { port: 8001, name: 'Web服务', note: '测试', protocol: 'tcp' },
      ]),
    ).toBe(true);
    expect(validatePreferenceValue('manualOccupiedPorts', [])).toBe(true);
  });

  it('拒绝非法端口', async () => {
    const { validatePreferenceValue } = await import('./validation');
    expect(
      validatePreferenceValue('manualOccupiedPorts', [
        { port: 99999, name: '越界端口' },
      ]),
    ).toBe(false);
    expect(validatePreferenceValue('manualOccupiedPorts', [{ port: -1 }])).toBe(
      false,
    );
  });
});
