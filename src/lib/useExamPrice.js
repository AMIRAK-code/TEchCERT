import { useCallback, useEffect, useState } from 'react';
import { MODE, getExamPrice } from './supabase';

// Exam price and access for the current user. Always null in local mode (no paywall).
// `userId` is a dependency so the price refreshes after sign-in (returning-learner discount).
export function useExamPrice(courseId, userId) {
  const [price, setPrice] = useState(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (MODE !== 'cloud') return null;
    try {
      const p = await getExamPrice(courseId);
      setPrice(p);
      setError('');
      return p;
    } catch (err) {
      setError(err.message || 'Could not load the price.');
      return null;
    }
  }, [courseId]);

  useEffect(() => {
    refresh();
  }, [refresh, userId]);

  return { price, error, refresh };
}
