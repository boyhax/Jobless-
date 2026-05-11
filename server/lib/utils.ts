import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fetchAPI = async (endpoint: string, options: RequestInit = {}) => {
  const headers: any = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      try {
        const user = JSON.parse(saved);
        if (user && user.id) {
          headers['Authorization'] = `Bearer ${user.id}`;
        }
      } catch (e) {}
    }
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });
  
  const text = await res.text();
  
  if (!res.ok) {
    if (res.status === 401) {
      // Automatic logout on unauthorized
      if (typeof window !== 'undefined') {
        localStorage.removeItem('currentUser');
        window.dispatchEvent(new Event('auth-unauthorized'));
      }
    }
    let errorMessage = 'API Error';
    try {
      const errorData = JSON.parse(text);
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch (e) {
      errorMessage = `API Error: ${res.status} ${res.statusText}`;
    }
    throw new Error(errorMessage);
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    console.error('Failed to parse JSON for endpoint:', endpoint, 'Response:', text.substring(0, 100));
    throw err;
  }
};
