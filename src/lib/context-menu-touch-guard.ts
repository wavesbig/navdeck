/**
 * Astryx BottomSheet 在长按过程中打开后，touchend 仍会派发到原触发元素。
 * 浏览器随后合成的 click 会让 Sheet 立即关闭，表现为“长按菜单打不开”。
 * 这里只拦截“菜单已打开、但松手点仍在 Sheet 外”的这一种手势。
 */
export function installContextMenuTouchGuard(
  doc: Document = window.document,
): () => void {
  const handleTouchEnd = (event: TouchEvent) => {
    const target = event.target;
    if (!(target instanceof Node)) return;

    const sheet = Array.from(
      doc.querySelectorAll<HTMLDialogElement>('dialog[open]'),
    ).find((dialog) => dialog.querySelector('.astryx-context-menu'));
    if (sheet && !sheet.contains(target)) {
      event.preventDefault();
    }
  };

  doc.addEventListener('touchend', handleTouchEnd, {
    capture: true,
    passive: false,
  });
  return () => {
    doc.removeEventListener('touchend', handleTouchEnd, { capture: true });
  };
}
