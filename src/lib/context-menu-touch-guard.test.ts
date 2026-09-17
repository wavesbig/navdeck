// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { installContextMenuTouchGuard } from './context-menu-touch-guard';

describe('installContextMenuTouchGuard', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  function mountContextMenuSheet() {
    const dialog = document.createElement('dialog');
    dialog.open = true;
    const menu = document.createElement('div');
    menu.className = 'astryx-context-menu';
    dialog.appendChild(menu);
    const outside = document.createElement('button');
    document.body.append(dialog, outside);
    return { dialog, menu, outside };
  }

  function dispatchTouchEnd(target: Element) {
    const event = new Event('touchend', {
      bubbles: true,
      cancelable: true,
    }) as TouchEvent;
    target.dispatchEvent(event);
    return event;
  }

  it('长按打开菜单后，松手在 Sheet 外时阻止合成点击', () => {
    const { outside } = mountContextMenuSheet();
    const uninstall = installContextMenuTouchGuard();

    expect(dispatchTouchEnd(outside).defaultPrevented).toBe(true);
    uninstall();
  });

  it('松手在菜单或 Sheet 内时不拦截', () => {
    const { menu, dialog } = mountContextMenuSheet();
    const uninstall = installContextMenuTouchGuard();

    expect(dispatchTouchEnd(menu).defaultPrevented).toBe(false);
    expect(dispatchTouchEnd(dialog).defaultPrevented).toBe(false);
    uninstall();
  });

  it('卸载后不再拦截', () => {
    const { outside } = mountContextMenuSheet();
    const uninstall = installContextMenuTouchGuard();
    uninstall();

    expect(dispatchTouchEnd(outside).defaultPrevented).toBe(false);
  });
});
