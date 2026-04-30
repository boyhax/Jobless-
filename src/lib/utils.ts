import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fetchAPI = async (endpoint: string, options: RequestInit = {}) => {
  const res = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error('API Error');
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error('Failed to parse JSON for endpoint:', endpoint, 'Response:', text.substring(0, 100));
    throw err;
  }
};
