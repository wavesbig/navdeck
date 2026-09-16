/**
 * Astryx ContextMenu 的定位依赖 CSS anchor positioning（Chromium 125+）。
 * 老内核浏览器（如 360 极速浏览器）不支持时，菜单会退化到 popover 默认
 * 位置（视口角落）或文档流位置，表现为「右键菜单位置不确定」。
 *
 * 这里做 JS 降级：仅当浏览器不支持 anchor positioning 时介入，右键后把
 * 打开的菜单用 fixed 定位到光标处，并收敛到视口内。支持 anchor positioning
 * 的浏览器完全不走这段逻辑。
 */

export interface ViewportPoint {
  x: number;
  y: number;
}

export function supportsAnchorPositioning(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('anchor-name: --astryx-fallback-probe')
  );
}

/** 菜单必须完整落在视口内，与光标点至少留出 margin 间距。 */
export function clampPointToViewport(
  point: ViewportPoint,
  menuWidth: number,
  menuHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  margin = 8,
): ViewportPoint {
  const maxX = Math.max(margin, viewportWidth - menuWidth - margin);
  const maxY = Math.max(margin, viewportHeight - menuHeight - margin);
  return {
    x: Math.min(Math.max(point.x, margin), maxX),
    y: Math.min(Math.max(point.y, margin), maxY),
  };
}

/**
 * transform 祖先会成为 fixed 后代的包含块（RGL 网格项、dnd-kit 拖拽层
 * 都带 transform），此时 left/top 需换算到包含块的局部坐标。
 */
function findTransformedAncestor(el: HTMLElement | null): HTMLElement | null {
  let node = el;
  while (node) {
    const view = node.ownerDocument.defaultView;
    // jsdom 等环境下未设置的 transform 计算值为空串，同样视为无 transform
    const transform = view?.getComputedStyle(node).transform;
    if (transform && transform !== 'none') {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * 键盘唤起（Shift+F10）的 contextmenu 事件坐标恒为 (0,0)，Astryx 会把
 * 菜单锚到触发器左下角；降级路径同样按触发器盒模型取位。
 */
function findContextMenuTrigger(start: Element | null): HTMLElement | null {
  let node: HTMLElement | null =
    start instanceof HTMLElement ? start : (start?.parentElement ?? null);
  while (node) {
    // ContextMenu 触发器的直接子级有一个零尺寸光标锚 span
    if (node.querySelector(':scope > span[aria-hidden="true"]')) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

function resolveAnchorPoint(event: MouseEvent): ViewportPoint {
  const isKeyboardInvoked =
    event.clientX === 0 && event.clientY === 0 && event.detail === 0;
  if (!isKeyboardInvoked) {
    return { x: event.clientX, y: event.clientY };
  }
  const trigger = findContextMenuTrigger(event.target as Element | null);
  if (!trigger) return { x: 0, y: 0 };
  const rect = trigger.getBoundingClientRect();
  return { x: rect.left, y: rect.bottom };
}

/**
 * layer.render 的 popover 容器是 `.astryx-context-menu` 菜单的直接父级，
 * 定位样式必须写在容器上（UA popover 默认样式挂在容器）。
 */
function resolvePositionTarget(menu: HTMLElement): HTMLElement {
  const container = menu.parentElement;
  return container?.hasAttribute('popover') ? container : menu;
}

function positionMenuAtPoint(target: HTMLElement, point: ViewportPoint) {
  const view = target.ownerDocument.defaultView;
  if (!view) return;
  const rect = target.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  const clamped = clampPointToViewport(
    point,
    rect.width,
    rect.height,
    view.innerWidth,
    view.innerHeight,
  );
  const containingBlock = findTransformedAncestor(target.parentElement);
  target.style.position = 'fixed';
  target.style.inset = 'auto';
  target.style.margin = '0';
  target.style.zIndex = '50';
  if (containingBlock) {
    const cbRect = containingBlock.getBoundingClientRect();
    target.style.left = `${clamped.x - cbRect.left}px`;
    target.style.top = `${clamped.y - cbRect.top}px`;
  } else {
    target.style.left = `${clamped.x}px`;
    target.style.top = `${clamped.y}px`;
  }
}

/**
 * 全局安装降级定位。返回卸载函数；支持 anchor positioning 的环境返回
 * undefined 表示无需介入。
 */
export function installContextMenuAnchorFallback(
  doc: Document = window.document,
): (() => void) | undefined {
  if (supportsAnchorPositioning()) return undefined;

  let point: ViewportPoint | null = null;
  let retriesLeft = 0;
  let timer: number | undefined;

  const clearTimer = () => {
    if (timer !== undefined) {
      doc.defaultView?.clearTimeout(timer);
      timer = undefined;
    }
  };

  const scheduleApply = () => {
    if (retriesLeft <= 0 || !point) return;
    retriesLeft -= 1;
    timer = doc.defaultView?.setTimeout(applyToOpenMenus, 0);
  };

  const applyToOpenMenus = () => {
    timer = undefined;
    // forEach 回调闭包会丢失 TS 对 point 的非空收窄，先固化到局部变量
    const currentPoint = point;
    if (!currentPoint) return;
    let positionedCount = 0;
    doc
      .querySelectorAll<HTMLElement>('.astryx-context-menu')
      .forEach((menu) => {
        if (menu.hasAttribute('data-astryx-menu-fallback-applied')) return;
        const target = resolvePositionTarget(menu);
        const rect = target.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        positionMenuAtPoint(target, currentPoint);
        menu.setAttribute('data-astryx-menu-fallback-applied', '1');
        positionedCount += 1;
      });
    if (positionedCount > 0) {
      point = null;
      retriesLeft = 0;
      return;
    }
    scheduleApply();
  };

  const handleContextMenu = (event: MouseEvent) => {
    // 上一次打开残留的标记先清掉，保证本轮重新定位
    doc
      .querySelectorAll<HTMLElement>('.astryx-context-menu')
      .forEach((menu) => {
        menu.removeAttribute('data-astryx-menu-fallback-applied');
      });
    point = resolveAnchorPoint(event);
    retriesLeft = 10;
    scheduleApply();
  };

  doc.addEventListener('contextmenu', handleContextMenu, true);
  return () => {
    clearTimer();
    doc.removeEventListener('contextmenu', handleContextMenu, true);
  };
}
