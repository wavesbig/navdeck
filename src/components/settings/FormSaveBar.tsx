import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';

export interface FormMessage {
  type: 'success' | 'error';
  text: string;
}

interface FormSaveBarProps {
  /** 行内反馈消息（成功/失败） */
  message?: FormMessage | null;
  /** 有未保存改动 */
  isDirty: boolean;
  saving?: boolean;
  onReset: () => void;
  /** 不传时保存按钮为 submit 类型（交给外层 form onSubmit） */
  onSave?: () => void;
  saveLabel?: string;
  resetLabel?: string;
}

/**
 * 表单底部保存栏（统一「左消息 + 右撤销/保存」模式）
 *
 * 替换 AccountForm / PasswordForm / BrandForm / WallpaperManager /
 * LuckyConfigForm 各自手写的底栏样板。
 */
export function FormSaveBar({
  message,
  isDirty,
  saving = false,
  onReset,
  onSave,
  saveLabel = '保存',
  resetLabel = '撤销',
}: FormSaveBarProps) {
  return (
    <VStack gap={5}>
      <Divider />
      <HStack gap={2} justify="between" align="center">
        {message ? (
          <Text
            size="2xs"
            className={
              message.type === 'success' ? 'text-success' : 'text-danger'
            }
            role={message.type === 'error' ? 'alert' : undefined}
          >
            {message.text}
          </Text>
        ) : (
          <span />
        )}
        <HStack gap={2}>
          <Button
            label={resetLabel}
            variant="ghost"
            size="sm"
            type="button"
            isDisabled={!isDirty || saving}
            onClick={onReset}
          />
          <Button
            label={saveLabel}
            variant="primary"
            size="sm"
            type={onSave ? 'button' : 'submit'}
            isLoading={saving}
            isDisabled={!isDirty}
            onClick={onSave}
          />
        </HStack>
      </HStack>
    </VStack>
  );
}
