import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { matchSchema, MatchFormValues, SEASON_START_DATE, SEASON_END_DATE } from '../utils/validation';
import { createMatch, updateMatch } from '../services/firebaseService';
import { AlertCircle, Plus, Trash2, CheckCircle2, ShieldCheck, HelpCircle } from 'lucide-react';

interface MatchSubmissionFormProps {
  leagueId: string;
  matchId?: string; // If provided, updates existing match
  initialValues?: Partial<MatchFormValues>;
  availablePlayers: { id: string; name: string }[];
  onSuccess: () => void;
  onCancel: () => void;
}

export const MatchSubmissionForm: React.FC<MatchSubmissionFormProps> = ({
  leagueId,
  matchId,
  initialValues,
  availablePlayers,
  onSuccess,
  onCancel,
}) => {
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid, isDirty },
  } = useForm<any>({
    resolver: zodResolver(matchSchema),
    mode: 'onChange',
    defaultValues: {
      leagueId,
      matchDate: initialValues?.matchDate || new Date().toISOString().split('T')[0],
      homeTeamName: initialValues?.homeTeamName || '',
      awayTeamName: initialValues?.awayTeamName || '',
      homeScore: initialValues?.homeScore ?? 0,
      awayScore: initialValues?.awayScore ?? 0,
      isCompleted: initialValues?.isCompleted ?? false,
      homeSquad: initialValues?.homeSquad || [],
      awaySquad: initialValues?.awaySquad || [],
      performances: initialValues?.performances || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'performances',
  });

  const watchHomeScore = watch('homeScore');
  const watchAwayScore = watch('awayScore');
  const watchIsCompleted = watch('isCompleted');
  const watchPerformances = watch('performances') || [];
  const watchHomeSquad = watch('homeSquad') || [];
  const watchAwaySquad = watch('awaySquad') || [];

  // Real-time sums for prompt feedback alerts
  const homeGoalsSum = watchPerformances
    .filter((p) => p.teamSide === 'home')
    .reduce((sum, p) => sum + (p.goals || 0), 0);

  const awayGoalsSum = watchPerformances
    .filter((p) => p.teamSide === 'away')
    .reduce((sum, p) => sum + (p.goals || 0), 0);

  const homeScoreMismatch = watchIsCompleted && homeGoalsSum !== watchHomeScore;
  const awayScoreMismatch = watchIsCompleted && awayGoalsSum !== watchAwayScore;
  const hasRosterOverlaps = watchAwaySquad.some((id) => watchHomeSquad.includes(id));

  // Quick automated squad helper selection
  const handleSquadToggle = (playerId: string, side: 'home' | 'away') => {
    const currentSquad = side === 'home' ? watchHomeSquad : watchAwaySquad;
    const oppositeSquad = side === 'home' ? watchAwaySquad : watchHomeSquad;

    // Prevent cross-booking
    if (oppositeSquad.includes(playerId)) {
      alert('This player is already booked on the opposite team!');
      return;
    }

    if (currentSquad.includes(playerId)) {
      // Remove from squad
      const updated = currentSquad.filter((id) => id !== playerId);
      setValue(side === 'home' ? 'homeSquad' : 'awaySquad', updated);
      
      // Remove performance sheet
      const perfIndex = watchPerformances.findIndex((p) => p.playerId === playerId);
      if (perfIndex !== -1) {
        remove(perfIndex);
      }
    } else {
      // Add to squad
      setValue(side === 'home' ? 'homeSquad' : 'awaySquad', [...currentSquad, playerId]);
      
      // Auto-append default performance entry
      const pObj = availablePlayers.find((p) => p.id === playerId);
      if (pObj) {
        append({
          playerId,
          playerName: pObj.name,
          teamSide: side,
          goals: 0,
          isMvp: false,
        });
      }
    }
  };

  const onSubmitForm = async (data: any) => {
    setSubmitting(true);
    setSubmissionError(null);
    try {
      if (matchId) {
        await updateMatch(matchId, {
          leagueId: data.leagueId,
          matchDate: data.matchDate,
          homeTeamName: data.homeTeamName,
          awayTeamName: data.awayTeamName,
          homeScore: data.homeScore,
          awayScore: data.awayScore,
          isCompleted: data.isCompleted,
        }, data.performances.map(p => ({
          playerId: p.playerId,
          teamSide: p.teamSide,
          goals: p.goals,
          isMvc: p.isMvp
        })));
      } else {
        await createMatch({
          leagueId: data.leagueId,
          matchDate: data.matchDate,
          homeTeamName: data.homeTeamName,
          awayTeamName: data.awayTeamName,
          homeScore: data.homeScore,
          awayScore: data.awayScore,
          isCompleted: data.isCompleted,
        }, data.performances.map(p => ({
          playerId: p.playerId,
          teamSide: p.teamSide,
          goals: p.goals,
          isMvc: p.isMvp
        })));
      }
      onSuccess();
    } catch (err: any) {
      setSubmissionError(err?.message || 'Database error: Submission was blocked by validation constraint checks.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden" id="match-validation-form">
      <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {matchId ? 'Edit Certified Match Card' : 'Create Certified Match Card'}
          </h2>
          <p className="text-xs text-slate-400">Enforced by Relational PostgreSQL Guardrails</p>
        </div>
        <ShieldCheck className="h-6 w-6 text-emerald-400" />
      </div>

      <div className="p-6 space-y-6">
        {submissionError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Database Constraint Violation</p>
              <p className="text-xs mt-1">{submissionError}</p>
            </div>
          </div>
        )}

        {/* Basic Meta Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Match Date</label>
            <input
              type="date"
              min={SEASON_START_DATE}
              max={SEASON_END_DATE}
              {...register('matchDate')}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
            />
            {errors.matchDate && (
              <p className="text-xs text-rose-600 mt-1">{errors.matchDate.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Home Team Name</label>
            <input
              type="text"
              placeholder="e.g. Dynamic FC"
              {...register('homeTeamName')}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
            />
            {errors.homeTeamName && (
              <p className="text-xs text-rose-600 mt-1">{errors.homeTeamName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Away Team Name</label>
            <input
              type="text"
              placeholder="e.g. Rovers United"
              {...register('awayTeamName')}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
            />
            {errors.awayTeamName && (
              <p className="text-xs text-rose-600 mt-1">{errors.awayTeamName.message}</p>
            )}
          </div>
        </div>

        {/* Scores & Completion Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Home Team Score</label>
            <input
              type="number"
              {...register('homeScore')}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950"
            />
            {errors.homeScore && (
              <p className="text-xs text-rose-600 mt-1">{errors.homeScore.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Away Team Score</label>
            <input
              type="number"
              {...register('awayScore')}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950"
            />
            {errors.awayScore && (
              <p className="text-xs text-rose-600 mt-1">{errors.awayScore.message}</p>
            )}
          </div>

          <div className="flex flex-col justify-center">
            <label className="flex items-center gap-2 cursor-pointer mt-5">
              <input
                type="checkbox"
                {...register('isCompleted')}
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-950 h-4 w-4"
              />
              <span className="text-sm font-medium text-slate-700">Mark Match Completed</span>
            </label>
            <p className="text-[11px] text-slate-400 mt-1 ml-6">Enforces live performance goal math validation</p>
          </div>
        </div>

        {/* Squad Bookings Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Home Squad Selector */}
          <div className="border border-slate-100 rounded-lg p-4">
            <h3 className="font-semibold text-sm text-slate-800 mb-2 flex items-center justify-between">
              <span>Home Team Squad</span>
              <span className="text-xs text-slate-400 font-normal">({watchHomeSquad.length} Players)</span>
            </h3>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-100">
              {availablePlayers.map((p) => {
                const isSelected = watchHomeSquad.includes(p.id);
                return (
                  <button
                    key={`home-squad-${p.id}`}
                    type="button"
                    onClick={() => handleSquadToggle(p.id, 'home')}
                    className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
            {errors.homeSquad && (
              <p className="text-xs text-rose-600 mt-1">{errors.homeSquad.message}</p>
            )}
          </div>

          {/* Away Squad Selector */}
          <div className="border border-slate-100 rounded-lg p-4">
            <h3 className="font-semibold text-sm text-slate-800 mb-2 flex items-center justify-between">
              <span>Away Team Squad</span>
              <span className="text-xs text-slate-400 font-normal">({watchAwaySquad.length} Players)</span>
            </h3>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-100">
              {availablePlayers.map((p) => {
                const isSelected = watchAwaySquad.includes(p.id);
                return (
                  <button
                    key={`away-squad-${p.id}`}
                    type="button"
                    onClick={() => handleSquadToggle(p.id, 'away')}
                    className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
            {errors.awaySquad && (
              <p className="text-xs text-rose-600 mt-1">{errors.awaySquad.message}</p>
            )}
          </div>
        </div>

        {/* Real-time Inline Error Validation Indicators (Integrity Engine) */}
        {watchIsCompleted && (
          <div className="space-y-2">
            {/* Home Side Alert */}
            <div className={`p-3 rounded-lg flex items-center justify-between text-xs font-semibold border ${
              homeScoreMismatch 
                ? 'bg-amber-50 border-amber-200 text-amber-800 animate-pulse' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <div className="flex items-center gap-2">
                {homeScoreMismatch ? <AlertCircle className="h-4 w-4 text-amber-600" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                <span>Home Stats Audit: Total Registered Goals ({homeGoalsSum}) vs Home Score ({watchHomeScore})</span>
              </div>
              <span>{homeScoreMismatch ? 'Goal Deficit' : 'Passes Integrity Check'}</span>
            </div>

            {/* Away Side Alert */}
            <div className={`p-3 rounded-lg flex items-center justify-between text-xs font-semibold border ${
              awayScoreMismatch 
                ? 'bg-amber-50 border-amber-200 text-amber-800 animate-pulse' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <div className="flex items-center gap-2">
                {awayScoreMismatch ? <AlertCircle className="h-4 w-4 text-amber-600" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                <span>Away Stats Audit: Total Registered Goals ({awayGoalsSum}) vs Away Score ({watchAwayScore})</span>
              </div>
              <span>{awayScoreMismatch ? 'Goal Deficit' : 'Passes Integrity Check'}</span>
            </div>
          </div>
        )}

        {/* Overlap Alarm */}
        {hasRosterOverlaps && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <span>Overlapping Player Error! Roster list containing duplicates across teams blocks certified submission.</span>
          </div>
        )}

        {/* Player Performances Goals details */}
        {watchPerformances.length > 0 && (
          <div className="border border-slate-100 rounded-lg p-4 bg-slate-50">
            <h3 className="font-semibold text-sm text-slate-800 mb-3">Individual Goal Scoring & Performance Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map((field, index) => {
                const side = watchPerformances[index]?.teamSide;
                return (
                  <div key={field.id} className="bg-white p-3 rounded-lg border border-slate-100 flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className={`w-2.5 h-2.5 rounded-full ${side === 'home' ? 'bg-slate-900' : 'bg-indigo-600'}`}></span>
                      <p className="text-xs font-semibold text-slate-800 truncate">{watchPerformances[index]?.playerName}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[11px] text-slate-500">Goals:</label>
                        <input
                          type="number"
                          {...register(`performances.${index}.goals` as const)}
                          className="w-12 text-center py-0.5 border border-slate-200 rounded text-xs focus:outline-none"
                        />
                      </div>

                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          {...register(`performances.${index}.isMvp` as const)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-950 h-3.5 w-3.5"
                        />
                        <span className="text-[11px] text-slate-600 font-medium">MVP</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={submitting || (watchIsCompleted && (homeScoreMismatch || awayScoreMismatch)) || hasRosterOverlaps}
          className={`px-5 py-2 rounded-lg text-xs font-bold text-white shadow transition flex items-center gap-1.5 ${
            submitting || (watchIsCompleted && (homeScoreMismatch || awayScoreMismatch)) || hasRosterOverlaps
              ? 'bg-slate-300 cursor-not-allowed shadow-none'
              : 'bg-slate-900 hover:bg-slate-800'
          }`}
        >
          {submitting ? 'Verifying...' : matchId ? 'Save Changes' : 'Certify Match Card'}
        </button>
      </div>
    </form>
  );
};
