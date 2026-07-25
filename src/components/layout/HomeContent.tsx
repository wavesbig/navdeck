'use client';

import {useState} from 'react';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Button} from '@astryxdesign/core/Button';
import {Plus} from 'lucide-react';
import type {Card, Category} from '@/types';
import {CategorySection} from '@/components/categories/CategorySection';
import {CardEditModal} from '@/components/cards/CardEditModal';

interface HomeContentProps {
  categories: Category[];
  unclassifiedCards: Card[];
}

/**
 * 主页内容区
 *
 * - 有卡片时：分类分区纵向铺开 + 未分类排最后
 * - 空状态：EmptyState 引导
 * - 新增卡片按钮始终可用（顶部右上角悬浮）
 */
export function HomeContent({categories, unclassifiedCards}: HomeContentProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  const hasCards =
    categories.some((c) => c.cards && c.cards.length > 0) || unclassifiedCards.length > 0;

  const handleNewCard = () => {
    setEditingCard(null);
    setModalOpen(true);
  };

  const handleEditCard = (card: Card) => {
    setEditingCard(card);
    setModalOpen(true);
  };

  const handleDeleteCard = async (card: Card) => {
    if (!confirm(`确认删除「${card.name}」吗？`)) return;
    const res = await fetch(`/api/cards/${card.id}`, {method: 'DELETE'});
    if (res.ok) {
      window.location.reload();
    } else {
      alert('删除失败');
    }
  };

  return (
    <>
      {hasCards ? (
        <div>
          {/* 新建卡片按钮 */}
          <div className="flex justify-end mb-4">
            <Button
              label="新建卡片"
              variant="primary"
              icon={<Plus size={16} />}
              onClick={handleNewCard}
            />
          </div>

          {/* 分类分区纵向铺开 */}
          {categories.map((category) => (
            <CategorySection
              key={category.id}
              title={category.name}
              cards={category.cards ?? []}
              onEditCard={handleEditCard}
              onDeleteCard={handleDeleteCard}
            />
          ))}

          {/* 未分类排在最后 */}
          {unclassifiedCards.length > 0 && (
            <CategorySection
              title={null}
              cards={unclassifiedCards}
              onEditCard={handleEditCard}
              onDeleteCard={handleDeleteCard}
            />
          )}
        </div>
      ) : (
        <EmptyState
          title="还没有任何卡片"
          description="创建第一张卡片来开始管理你的导航"
          icon={<Plus size={32} />}
          actions={
            <Button
              label="创建卡片"
              variant="primary"
              icon={<Plus size={16} />}
              onClick={handleNewCard}
            />
          }
        />
      )}

      <CardEditModal
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        card={editingCard}
        categories={categories}
        onSaved={() => window.location.reload()}
      />
    </>
  );
}
