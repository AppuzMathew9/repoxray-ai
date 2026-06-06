export function formatScore(score: number): string {
  if (score >= 90) return 'Exceptional';
  if (score >= 70) return 'Strong';
  if (score >= 50) return 'Needs Improvement';
  return 'Critical';
}

export function cleanGithubUrl(url: string): string {
  if (!url) return '';
  return url.trim().replace(/\/+$/, '');
}
