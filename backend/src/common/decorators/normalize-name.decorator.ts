import { Transform } from 'class-transformer';

function normalizeName(value: string): string {
  if (!value || typeof value !== 'string') {
    return value;
  }

  return value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function NormalizeName() {
  return Transform(({ value }) => normalizeName(value));
}