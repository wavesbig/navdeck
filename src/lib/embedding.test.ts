import { describe, expect, it } from 'vitest';
import { resolveEmbeddingStatus } from './embedding';

const base = {
  targetUrl: 'https://service.example.com/app',
  appOrigin: 'https://navdeck.example.com',
};

describe('resolveEmbeddingStatus', () => {
  it('无嵌入限制响应头时允许 iframe', () => {
    expect(resolveEmbeddingStatus(base)).toBe('allowed');
  });

  it('X-Frame-Options: DENY 时阻止 iframe', () => {
    expect(resolveEmbeddingStatus({ ...base, xFrameOptions: 'DENY' })).toBe(
      'blocked',
    );
  });

  it('X-Frame-Options: SAMEORIGIN 允许同源地址', () => {
    expect(
      resolveEmbeddingStatus({
        targetUrl: 'https://navdeck.example.com/service',
        appOrigin: 'https://navdeck.example.com',
        xFrameOptions: 'SAMEORIGIN',
      }),
    ).toBe('allowed');
  });

  it('X-Frame-Options: SAMEORIGIN 阻止跨源地址', () => {
    expect(
      resolveEmbeddingStatus({ ...base, xFrameOptions: 'SAMEORIGIN' }),
    ).toBe('blocked');
  });

  it('CSP frame-ancestors none 时阻止 iframe', () => {
    expect(
      resolveEmbeddingStatus({
        ...base,
        contentSecurityPolicy: "default-src 'self'; frame-ancestors 'none'",
      }),
    ).toBe('blocked');
  });

  it('CSP frame-ancestors self 只允许与目标站点同源', () => {
    expect(
      resolveEmbeddingStatus({
        ...base,
        contentSecurityPolicy: "frame-ancestors 'self'",
      }),
    ).toBe('blocked');
    expect(
      resolveEmbeddingStatus({
        targetUrl: 'https://navdeck.example.com/service',
        appOrigin: 'https://navdeck.example.com',
        contentSecurityPolicy: "frame-ancestors 'self'",
      }),
    ).toBe('allowed');
  });

  it('CSP frame-ancestors 明确包含 NavDeck origin 时允许 iframe', () => {
    expect(
      resolveEmbeddingStatus({
        ...base,
        contentSecurityPolicy:
          "frame-ancestors 'self' https://navdeck.example.com",
      }),
    ).toBe('allowed');
  });

  it('CSP frame-ancestors 支持子域名通配符', () => {
    expect(
      resolveEmbeddingStatus({
        ...base,
        appOrigin: 'https://home.sub.navdeck.example.com',
        contentSecurityPolicy: 'frame-ancestors https://*.navdeck.example.com',
      }),
    ).toBe('allowed');
  });

  it('CSP scheme source 按 NavDeck 协议匹配', () => {
    expect(
      resolveEmbeddingStatus({
        targetUrl: 'http://service.example.com',
        appOrigin: 'https://navdeck.example.com',
        contentSecurityPolicy: 'frame-ancestors https:',
      }),
    ).toBe('allowed');
  });

  it('CSP host source 未写端口时只匹配默认端口', () => {
    expect(
      resolveEmbeddingStatus({
        targetUrl: 'https://service.example.com',
        appOrigin: 'https://navdeck.example.com:3000',
        contentSecurityPolicy: 'frame-ancestors navdeck.example.com',
      }),
    ).toBe('blocked');
    expect(
      resolveEmbeddingStatus({
        targetUrl: 'https://service.example.com',
        appOrigin: 'https://navdeck.example.com',
        contentSecurityPolicy: 'frame-ancestors navdeck.example.com',
      }),
    ).toBe('allowed');
  });

  it('无法识别的 CSP 来源时返回 unknown', () => {
    expect(
      resolveEmbeddingStatus({
        ...base,
        contentSecurityPolicy: "frame-ancestors 'nonce-abc'",
      }),
    ).toBe('unknown');
  });

  it('无效输入时返回 unknown', () => {
    expect(
      resolveEmbeddingStatus({
        targetUrl: 'not-a-url',
        appOrigin: 'https://navdeck.example.com',
      }),
    ).toBe('unknown');
  });
});
