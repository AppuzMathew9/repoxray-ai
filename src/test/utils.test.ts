import { describe, it, expect } from 'vitest';
import { formatScore, cleanGithubUrl } from '../utils.ts';

describe('formatScore', () => {
  it('should categorize scores correctly', () => {
    expect(formatScore(95)).toBe('Exceptional');
    expect(formatScore(80)).toBe('Strong');
    expect(formatScore(60)).toBe('Needs Improvement');
    expect(formatScore(30)).toBe('Critical');
  });
});

describe('cleanGithubUrl', () => {
  it('should remove trailing slashes and spaces', () => {
    expect(cleanGithubUrl('  https://github.com/vuejs/core/  ')).toBe('https://github.com/vuejs/core');
    expect(cleanGithubUrl('')).toBe('');
  });
});
