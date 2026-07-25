import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Button} from '@astryxdesign/core/Button';
import {Plus} from 'lucide-react';

/**
 * 主页内容区（M1.3 占位）
 *
 * M1.3：空状态展示
 * M1.4：替换为分类分区纵向铺开 + 卡片网格
 */
export function HomeContent() {
  return (
    <EmptyState
      title="还没有任何卡片"
      description="创建第一张卡片来开始管理你的导航"
      icon={<Plus size={32} />}
      actions={<Button label="创建卡片" variant="primary" />}
    />
  );
}
