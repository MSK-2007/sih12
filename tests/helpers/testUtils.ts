export function isValidCoordinates(lat: number | null | undefined, lng: number | null | undefined): boolean {
  if (lat == null || lng == null) return false;
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  if (!isFinite(lat) || !isFinite(lng)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input.trim().replace(/<[^>]*>/g, '');
}

export function maskErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';
  const msg = typeof error === 'string' ? error : error.message || '';
  if (msg.includes('PostgrestError') || msg.includes('PG::') || msg.includes('syntax error') || msg.includes('relation')) {
    return 'Unable to access database service. Please try again.';
  }
  return msg || 'An unexpected error occurred. Please try again.';
}
