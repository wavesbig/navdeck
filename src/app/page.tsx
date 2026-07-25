import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="p-8 flex flex-col gap-4 items-center">
        <h1 className="text-2xl font-bold">NavDeck</h1>
        <p className="text-secondary">自托管个人导航站 · Astryx neutral 主题</p>
        <Button label="开始使用" variant="primary" />
      </Card>
    </main>
  );
}
