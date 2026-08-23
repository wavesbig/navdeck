import { describe, expect, it } from 'vitest';
import { normalizeFontSize } from './font-size';
import { validatePreferenceValue } from './validation';

describe('font size preference', () => {
  it('accepts percentages in the supported range', () => {
    expect(validatePreferenceValue('fontSize', 90)).toBe(true);
    expect(validatePreferenceValue('fontSize', 100)).toBe(true);
    expect(validatePreferenceValue('fontSize', 150)).toBe(true);
  });

  it('rejects percentages outside the supported range', () => {
    expect(validatePreferenceValue('fontSize', 89)).toBe(false);
    expect(validatePreferenceValue('fontSize', 151)).toBe(false);
    expect(validatePreferenceValue('fontSize', 100.5)).toBe(false);
  });

  it('normalizes legacy size labels and invalid values', () => {
    expect(normalizeFontSize('small')).toBe(90);
    expect(normalizeFontSize('medium')).toBe(100);
    expect(normalizeFontSize('large')).toBe(110);
    expect(normalizeFontSize('x-large')).toBe(125);
    expect(normalizeFontSize('invalid')).toBe(100);
  });
});
