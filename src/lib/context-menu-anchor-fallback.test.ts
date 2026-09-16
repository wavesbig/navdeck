// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clampPointToViewport,
  installContextMenuAnchorFallback,
  supportsAnchorPositioning,
} from './context-menu-anchor-fallback';

function stubAnchorSupport(supported: boolean) {
  vi.stubGlobal(
    'CSS',
    supported
      ? { supports: () => true }
      : typeof CSS === 'undefined'
        ? undefined
        : { supports: () => false },
  );
}

describe('supportsAnchorPositioning', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('检测到 anchor positioning 支持时返回 true', () => {
    stubAnchorSupport(true);
    expect(supportsAnchorPositioning()).toBe(true);
  });

  it('不支持时返回 false', () => {
    stubAnchorSupport(false);
    expect(supportsAnchorPositioning()).toBe(false);
  });
});

describe('clampPointToViewport', () => {
  it('视口内不收敛', () => {
    expect(
      clampPointToViewport({ x: 200, y: 200 }, 184, 200, 1024, 768),
    ).toEqual({ x: 200, y: 200 });
  });

  it('右溢出时左移', () => {
    expect(
      clampPointToViewport({ x: 1000, y: 200 }, 184, 200, 1024, 768),
    ).toEqual({ x: 832, y: 200 });
  });

  it('下溢出时上移', () => {
    expect(
      clampPointToViewport({ x: 200, y: 700 }, 184, 200, 1024, 768),
    ).toEqual({ x: 200, y: 560 });
  });

  it('菜单高于视口时贴 margin', () => {
    expect(
      clampPointToViewport({ x: 200, y: 700 }, 184, 900, 1024, 768),
    ).toEqual({ x: 200, y: 8 });
  });
});

describe('installContextMenuAnchorFallback', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  function mountMenu() {
    const container = document.createElement('div');
    container.setAttribute('popover', '');
    const menu = document.createElement('div');
    menu.className = 'astryx-context-menu';
    container.appendChild(menu);
    document.body.appendChild(container);
    return { container, menu };
  }

  function stubRect(el: Element, rect: Partial<DOMRect> = {}) {
    el.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 184,
        height: 200,
        ...rect,
      }) as DOMRect;
  }

  function dispatchContextMenu(x: number, y: number) {
    document.body.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        clientX: x,
        clientY: y,
      }),
    );
  }

  async function flush() {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  it('支持 anchor positioning 时不安装', () => {
    stubAnchorSupport(true);
    expect(installContextMenuAnchorFallback(document)).toBeUndefined();
  });

  it('不支持时把打开的菜单定位到光标处并收敛视口', async () => {
    stubAnchorSupport(false);
    const { container } = mountMenu();
    stubRect(container);
    const uninstall = installContextMenuAnchorFallback(document);
    expect(uninstall).toBeTypeOf('function');

    dispatchContextMenu(1000, 700);
    await flush();

    expect(container.style.position).toBe('fixed');
    expect(container.style.inset).toBe('auto');
    expect(container.style.margin).toBe('0px');
    expect(container.style.left).toBe('832px');
    expect(container.style.top).toBe('560px');

    uninstall?.();
  });

  it('再次右键会重新定位', async () => {
    stubAnchorSupport(false);
    const { container } = mountMenu();
    stubRect(container);
    const uninstall = installContextMenuAnchorFallback(document);

    dispatchContextMenu(1000, 700);
    await flush();
    dispatchContextMenu(100, 100);
    await flush();

    expect(container.style.left).toBe('100px');
    expect(container.style.top).toBe('100px');

    uninstall?.();
  });

  it('transform 祖先作为包含块时换算局部坐标', async () => {
    stubAnchorSupport(false);
    const wrapper = document.createElement('div');
    const { container } = mountMenu();
    wrapper.appendChild(container);
    document.body.appendChild(wrapper);
    stubRect(container);
    stubRect(wrapper, { left: 100, top: 50 });
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      ((el: Element) => ({
        transform:
          el === wrapper ? 'translate3d(100px, 50px, 0)' : 'none',
      })) as unknown as typeof window.getComputedStyle,
    );

    const uninstall = installContextMenuAnchorFallback(document);
    dispatchContextMenu(1000, 700);
    await flush();

    expect(container.style.left).toBe('732px');
    expect(container.style.top).toBe('510px');

    uninstall?.();
  });

  it('清理后不再介入', async () => {
    stubAnchorSupport(false);
    const { container } = mountMenu();
    stubRect(container);
    const uninstall = installContextMenuAnchorFallback(document);

    dispatchContextMenu(1000, 700);
    await flush();
    uninstall?.();
    dispatchContextMenu(100, 100);
    await flush();

    expect(container.style.left).toBe('832px');
  });
});
