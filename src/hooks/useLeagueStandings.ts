import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../utils/auth';

export interface StandingItem {
  player_id: string;
  canonical_name: string;
  league_id: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  total_goals: number;
  total_mvps: number;
  points: number;
  ppg: number;
}

/**
 * Custom React Hook subscribing to real-time changes on matches and match_performances,
 * fetching computed standings dynamically from the Firestore backend REST API.
 */
export function useLeagueStandings(leagueId: string | null) {
  const [standings, setStandings] = useState<StandingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches computed standings dynamically from our REST API (which uses Firestore)
   */
  const fetchStandings = useCallback(async () => {
    if (!leagueId) {
      setStandings([]);
      return;
    }

    if ((window as any).isFirestoreDisabled) {
      setStandings([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/computed-standings?leagueId=${leagueId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.isFirestoreDisabled) {
        (window as any).isFirestoreDisabled = true;
        setStandings([]);
        return;
      }
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch standings');
      }
      setStandings((result.standings as StandingItem[]) || []);
    } catch (err: any) {
      console.warn('Error fetching league standings (falling back silently):', err);
      setError(err.message || 'An error occurred while loading standings.');
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  useEffect(() => {
    if ((window as any).isFirestoreDisabled) {
      return;
    }

    // Initial fetch
    fetchStandings();

    if (!leagueId) return;

    let isMounted = true;

    // Set up Firestore real-time snapshot subscription on matches collection
    const unsubscribeMatches = onSnapshot(collection(db, 'go_matches_prod'), (snapshot) => {
      if (!isMounted) return;
      if (snapshot.metadata.hasPendingWrites) return;
      const isEditing = document.activeElement && 
                        (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName) || 
                         document.querySelector('.modal.open') ||
                         (window as any).isUserEditing);
      if (isEditing) return;
      console.log('Real-time Firestore matches update detected');
      fetchStandings();
    }, (err: any) => {
      console.warn('Firestore matches subscription error (pausing subscriptions):', err.message || err);
      if (err.message && (err.message.includes('permission-denied') || err.message.includes('PERMISSION_DENIED') || err.message.includes('API has not been used'))) {
        (window as any).isFirestoreDisabled = true;
      }
    });

    // Set up Firestore real-time snapshot subscription on match_performances collection
    const unsubscribePerformances = onSnapshot(collection(db, 'match_performances'), (snapshot) => {
      if (!isMounted) return;
      if (snapshot.metadata.hasPendingWrites) return;
      const isEditing = document.activeElement && 
                        (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName) || 
                         document.querySelector('.modal.open') ||
                         (window as any).isUserEditing);
      if (isEditing) return;
      console.log('Real-time Firestore match performances update detected');
      fetchStandings();
    }, (err: any) => {
      console.warn('Firestore performances subscription error (non-fatal):', err.message || err);
    });

    return () => {
      isMounted = false;
      try { unsubscribeMatches(); } catch (e) {}
      try { unsubscribePerformances(); } catch (e) {}
    };
  }, [leagueId, fetchStandings]);

  return {
    standings,
    loading,
    error,
    refreshStandings: fetchStandings,
  };
}
