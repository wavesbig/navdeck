import {
  FONT_SIZE_DEFAULT,
  FONT_SIZE_LEGACY_SCALES,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  type FontSizePreference,
} from '@/types';

function isFontSizePreference(value: unknown): value is FontSizePreference {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= FONT_SIZE_MIN &&
    value <= FONT_SIZE_MAX
  );
}

export function normalizeFontSize(value: unknown): FontSizePreference {
  if (isFontSizePreference(value)) return value;

  if (typeof value === 'string') {
    const numericValue = FONT_SIZE_LEGACY_SCALES[value] ?? Number(value);
    if (isFontSizePreference(numericValue)) return numericValue;
  }

  return FONT_SIZE_DEFAULT;
}
