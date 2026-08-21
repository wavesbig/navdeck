/** 首屏时钟使用的时间格式化（本地时间，不引入额外日期库） */

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatClockTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatClockDate(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日 周${WEEKDAYS[date.getDay()]}`;
}

export function getClockGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 5) return '凌晨好';
  if (hour < 12) return '早上好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
}
