'use client';

import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { HStack } from '@astryxdesign/core/HStack';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useEffect, useState } from 'react';
import type { ChangelogRelease } from '@/lib/changelog';
import changelog from '@/lib/changelog.generated.json';

const currentVersion = changelog.currentVersion;

/**
 * 版本更新内容弹窗
 *
 * 打开首页时比对偏好里的 lastSeenVersion 与构建时的当前版本，
 * 有新版本就展示 CHANGELOG.md 中对应段落（构建期由
 * scripts/generate-changelog.ts 解析为 changelog.generated.json），
 * 「知道了」后写入偏好，同一版本不再打扰。
 */
export function UpdateChangelogDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const release: ChangelogRelease | undefined = changelog.releases.find(
    (r) => r.version === currentVersion,
  );

  useEffect(() => {
    let cancelled = false;
    fetch('/api/preferences')
      .then((res) => (res.ok ? res.json() : null))
      .then((prefs: { lastSeenVersion?: string } | null) => {
        if (!cancelled && prefs && prefs.lastSeenVersion !== currentVersion) {
          setIsOpen(true);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = () => {
    setIsOpen(false);
    void fetch('/api/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'lastSeenVersion', value: currentVersion }),
    }).catch(() => undefined);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) dismiss();
      }}
      purpose="form"
      width={420}
    >
      <Layout
        header={
          <DialogHeader
            title={`更新内容 ${currentVersion}`}
            onOpenChange={(open) => {
              if (!open) dismiss();
            }}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={3}>
              {release?.date && (
                <Text size="2xs" color="secondary">
                  发布于 {release.date}
                </Text>
              )}
              {release && release.categories.length > 0 ? (
                release.categories.map((category) => (
                  <VStack key={category.name} gap={1.5}>
                    <Text size="sm" weight="semibold" className="text-primary">
                      {category.name}
                    </Text>
                    <VStack gap={1.5}>
                      {category.items.map((item) => (
                        <HStack key={item} gap={2} align="start">
                          <span className="mt-2 h-1 w-1 flex-none rounded-full bg-accent" />
                          <Text size="sm" color="secondary">
                            {item}
                          </Text>
                        </HStack>
                      ))}
                    </VStack>
                  </VStack>
                ))
              ) : (
                <Text size="sm" color="secondary">
                  本次更新包含稳定性修复与改进。
                </Text>
              )}
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={2} justify="end">
              <Button label="知道了" variant="primary" onClick={dismiss} />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
