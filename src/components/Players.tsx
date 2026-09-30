import React, { useState, useEffect } from 'react';
import { Player, Session, AttendanceRecord, LeagueMatch } from '../types';
import { 
  Users, 
  Plus, 
  Search, 
  Mail, 
  Calendar, 
  Check, 
  X, 
  Award, 
  Grid, 
  List, 
  ToggleLeft, 
  UserPlus, 
  User, 
  MoreVertical,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Trash2,
  Edit2
} from 'lucide-react';

export const getInitialsColor = (name: string) => {
  const colors = [
    'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60',
    'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800/60',
    'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800/60',
    'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700',
    'bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400 border-rose-200 dark:border-rose-800/60',
    'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

interface PlayersProps {
  players: Player[];
  sessions: Session[];
  attendance: AttendanceRecord[];
  matches?: LeagueMatch[];
  onAddPlayer: (player: Omit<Player, 'id'>) => void;
  onUpdatePlayer: (player: Player) => void;
  onDeletePlayer: (playerId: string) => void;
}

export default function Players({ 
  players, 
  sessions, 
  attendance, 
  matches = [],
  onAddPlayer, 
  onUpdatePlayer,
  onDeletePlayer
}: PlayersProps) {
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);

  const getGoalsScored = (playerId: string) => {
    let count = 0;
    matches.forEach(m => {
      if (m.goals) {
        m.goals.forEach(g => {
          if (g.playerId === playerId) {
            count++;
          }
        });
      }
    });
    return count;
  };

  // Edit player states
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editName, setEditName] = useState('');
  const [editAnnualDue, setEditAnnualDue] = useState(false);
  const [editFood, setEditFood] = useState(false);
  const [editCookDate, setEditCookDate] = useState('');
  const [editParty, setEditParty] = useState(false);

  // Sync isUserEditing state to window object for snapshot locking
  useEffect(() => {
    const isEditing = !!editingPlayer;
    if (typeof (window as any).setIsUserEditing === 'function') {
      (window as any).setIsUserEditing(isEditing);
    } else {
      (window as any).isUserEditing = isEditing;
    }
    // Clean up on unmount
    return () => {
      if (typeof (window as any).setIsUserEditing === 'function') {
        (window as any).setIsUserEditing(false);
      } else {
        (window as any).isUserEditing = false;
      }
    };
  }, [editingPlayer]);

  const startEditing = (player: Player) => {
    setEditingPlayer(player);
    setEditName(player.name);
    setEditAnnualDue(!!player.annualDuePaid);
    setEditFood(!!player.volunteeredToCook);
    setEditCookDate(player.cookDate || '');
    setEditParty(!!player.endOfYearPartyAttendee);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;
    if (!editName.trim()) {
      alert('Please fill out all required fields');
      return;
    }

    onUpdatePlayer({
      ...editingPlayer,
      name: editName.trim(),
      annualDuePaid: editAnnualDue,
      volunteeredToCook: editFood,
      cookDate: editFood ? editCookDate : undefined,
      endOfYearPartyAttendee: editParty
    });

    setEditingPlayer(null);
  };

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Form state for adding players
  const [newName, setNewName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      alert('Please fill out all required fields');
      return;
    }

    // Default avatars using random high-quality athlete portraits
    const portraitIds = [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150'
    ];
    const finalAvatar = portraitIds[Math.floor(Math.random() * portraitIds.length)];

    onAddPlayer({
      name: newName.trim(),
      phone: '',
      status: 'Active',
      avatar: finalAvatar,
      joinDate: new Date().toISOString().split('T')[0]
    });

    // Reset Form
    setNewName('');
    setShowAddForm(false);
  };

  // Compute profile statistics for the currently selected player in modal
  const getPlayerStats = (playerId: string) => {
    const playerRecords = attendance.filter(a => a.playerId === playerId);
    const presentRecords = playerRecords.filter(r => r.status === 'Present');
    const absentRecords = playerRecords.filter(r => r.status === 'Absent');
    const excusedRecords = playerRecords.filter(r => r.status === 'Excused');

    const totalEligible = playerRecords.length;
    const attendanceRate = totalEligible > 0 
      ? Math.round((presentRecords.length / totalEligible) * 100) 
      : 0;

    // Detailed history list
    const history = sessions
      .filter(s => s.status === 'Completed')
      .map(session => {
        const record = attendance.find(a => a.sessionId === session.id && a.playerId === playerId);
        return {
          sessionId: session.id,
          title: session.title,
          date: session.date,
          status: record?.status || 'Not Registered',
          notes: record?.notes || ''
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      attendanceRate,
      presentCount: presentRecords.length,
      absentCount: absentRecords.length,
      excusedCount: excusedRecords.length,
      history
    };
  };

  const filteredPlayers = players.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.email || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.jerseyNumber !== undefined && p.jerseyNumber.toString() === searchQuery);
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6" id="players-tab">
      
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Players</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{players.length}</span> club players registered &bull; <span className="font-semibold text-emerald-600 dark:text-emerald-450">{players.filter(p => p.status === 'Active').length} active</span> &bull; <span className="font-semibold text-slate-500">{players.filter(p => p.status === 'Inactive').length} inactive</span>
          </p>
        </div>
        <button
          id="toggle-add-player-btn"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-center gap-2 bg-emerald-550 hover:bg-emerald-600 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition duration-200 cursor-pointer shadow-sm"
        >
          {showAddForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          {showAddForm ? 'Cancel Form' : 'Register Player'}
        </button>
      </div>

      {/* Add Player Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 animate-in fade-in duration-200" id="add-player-form">
          <h3 className="text-md font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-550" /> Register New Club Player
          </h3>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Full Name *</label>
              <input 
                id="player-name-input"
                type="text" 
                placeholder="Alex Morgan"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full text-sm p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:outline-emerald-550 bg-white"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              id="cancel-player-form-btn"
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-player-btn"
              type="submit"
              className="text-xs font-semibold bg-emerald-550 hover:bg-emerald-600 text-white px-5 py-2 rounded-xl cursor-pointer shadow-xs"
            >
              Add Player
            </button>
          </div>
        </form>
      )}

      {/* Interactive Filters Panel */}
      <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex gap-2 flex-wrap">
          {/* Status Selector */}
          <select
            id="filter-status-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 font-semibold text-slate-600 dark:text-slate-300 focus:outline-emerald-550"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="player-search-input"
            type="text"
            placeholder="Search players..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-emerald-550 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Players Roster Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredPlayers.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-slate-900 p-12 text-center rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center">
            <Users className="w-10 h-10 mb-3 text-slate-300 dark:text-slate-650 stroke-1" />
            <h4 className="font-semibold text-slate-700 dark:text-slate-300">No Roster Players Found</h4>
            <p className="text-xs mt-1 text-slate-400 dark:text-slate-500">Clear filters or register a new player.</p>
          </div>
        ) : (
          filteredPlayers.map(player => {
            const stats = getPlayerStats(player.id);
            return (
              <div 
                key={player.id} 
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-600/60 hover:shadow-md transition-all duration-300 overflow-hidden relative group cursor-pointer"
                onClick={() => setSelectedPlayer(player)}
                id={`player-card-${player.id}`}
              >
                {/* Roster card layout */}
                <div className="p-5 flex flex-col items-center text-center space-y-4">
                  {/* Status Badge */}
                  <span className={`absolute top-4 right-4 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    player.status === 'Active' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {player.status}
                  </span>

                  {/* Initial avatar badge without photo */}
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center font-black text-2xl uppercase border-2 shadow-xs select-none ${getInitialsColor(player.name)}`}>
                    {player.name.charAt(0)}
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-base font-black text-slate-950 dark:text-white leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center justify-center gap-1 flex-wrap">
                      <span>{player.name}</span>
                      {player.annualDuePaid && <span className="text-sm shrink-0" title="Annual Due Paid">✅</span>}
                      {player.volunteeredToCook && <span className="text-sm shrink-0" title="Volunteered to Cook">🍲 🍗</span>}
                      {player.endOfYearPartyAttendee && <span className="text-sm shrink-0" title="End of Year Party Attendee">🎉</span>}
                    </h4>
                  </div>

                  {/* Tiny attendance overview widget */}
                  <div className="w-full grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 font-mono text-center">
                    <div className="bg-slate-50 dark:bg-slate-950/60 p-2 rounded-xl">
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase">Attend Rate</p>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{stats.attendanceRate}%</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950/60 p-2 rounded-xl">
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase">Present Days</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-350">
                        {stats.presentCount}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Hover Quick actions bar */}
                <div className="bg-slate-50 dark:bg-slate-950/40 p-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                  <button
                    id={`card-edit-player-btn-${player.id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(player);
                    }}
                    className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Player
                  </button>
                  <span className="text-slate-400 dark:text-slate-500 font-semibold">Stats &rarr;</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Detailed Player Stats Modal Popup */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="player-profile-modal">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-950 dark:bg-slate-950 p-6 text-white flex justify-between items-start relative">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center font-extrabold text-white text-xl border-2 border-white/20 shrink-0 uppercase select-none">
                  {selectedPlayer.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold flex items-center gap-1.5 flex-wrap">
                      <span>{selectedPlayer.name}</span>
                      {selectedPlayer.annualDuePaid && <span className="text-sm shrink-0" title="Annual Due Paid">✅</span>}
                      {selectedPlayer.volunteeredToCook && <span className="text-sm shrink-0" title="Volunteered to Cook">🍲 🍗</span>}
                      {selectedPlayer.endOfYearPartyAttendee && <span className="text-sm shrink-0" title="End of Year Party Attendee">🎉</span>}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-mono">
                    <Calendar className="w-3.5 h-3.5" /> Registered: {selectedPlayer.joinDate}
                  </p>
                </div>
              </div>
              
              <button
                id="close-player-modal-btn"
                onClick={() => setSelectedPlayer(null)}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-full text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50 dark:bg-slate-950/40">
              {/* Profile stats widgets */}
              {(() => {
                const stats = getPlayerStats(selectedPlayer.id);
                const goalsScored = getGoalsScored(selectedPlayer.id);
                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 font-mono">
                      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs text-center">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">Attendance Rate</p>
                        <p className="text-xl font-bold text-emerald-650 dark:text-emerald-450 mt-1">{stats.attendanceRate}%</p>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs text-center">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">Present count</p>
                        <p className="text-xl font-bold text-emerald-550 dark:text-emerald-450 mt-1">{stats.presentCount}</p>
                      </div>

                      {selectedPlayer.annualDuePaid && (
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs text-center">
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">Annual Due</p>
                          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-450 mt-1 flex items-center justify-center gap-1">
                            Paid <span className="text-sm">✅</span>
                          </p>
                        </div>
                      )}

                      {selectedPlayer.volunteeredToCook && (
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs text-center">
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">Food</p>
                          <p className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-1 flex flex-col items-center justify-center">
                            <span className="flex items-center gap-1 justify-center">Cook <span className="text-sm">🍲</span></span>
                            {selectedPlayer.cookDate && (
                              <span className="text-[9px] text-slate-500 font-medium font-mono block mt-0.5">
                                {selectedPlayer.cookDate}
                              </span>
                            )}
                          </p>
                        </div>
                      )}

                      {selectedPlayer.endOfYearPartyAttendee && (
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs text-center">
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">End of Year Party</p>
                          <p className="text-lg font-bold text-emerald-555 dark:text-emerald-450 mt-1 flex items-center justify-center gap-1">
                            Attending <span className="text-sm">🎉</span>
                          </p>
                        </div>
                      )}

                      {goalsScored > 0 && (
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs text-center">
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">Goals Scored</p>
                          <p className="text-xl font-bold text-amber-550 dark:text-amber-450 mt-1 flex items-center justify-center gap-1">
                            {goalsScored} ⚽
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
              <button
                id="delete-player-btn"
                type="button"
                onClick={() => {
                  setPlayerToDelete(selectedPlayer);
                }}
                className="flex items-center gap-1 text-red-600 hover:text-red-700 font-bold text-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Player Registry
              </button>

              <div className="flex gap-2">
                <button
                  id="modal-edit-profile-btn"
                  type="button"
                  onClick={() => {
                    const playerToEdit = selectedPlayer;
                    setSelectedPlayer(null);
                    startEditing(playerToEdit);
                  }}
                  className="bg-emerald-550 text-white text-xs font-bold px-4 py-1.5 rounded-xl hover:bg-emerald-650 transition cursor-pointer shadow-xs"
                >
                  Edit Profile
                </button>
                <button
                  id="modal-close-btn"
                  onClick={() => setSelectedPlayer(null)}
                  className="bg-slate-900 text-white text-xs font-bold px-4 py-1.5 rounded-xl hover:bg-slate-850 transition cursor-pointer shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Player Profile Modal Popup */}
      {editingPlayer && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="edit-player-profile-modal">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-extrabold text-slate-700 dark:text-slate-300 text-lg">
                {editName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Edit Player Profile</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{editingPlayer.name}</p>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Player Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Player Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full text-sm p-3 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-550/20 focus:border-emerald-550 bg-white font-semibold"
                  placeholder="e.g. Alex"
                />
              </div>

              {/* Options List */}
              <div className="space-y-3">
                {/* Annual Due */}
                <label className="flex items-start justify-between p-4 border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-950/20 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-950/40 transition">
                  <div className="flex gap-3">
                    <span className="text-2xl mt-0.5 shrink-0" role="img" aria-label="annual-due">✅</span>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Annual Due</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Membership fee paid</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editAnnualDue}
                    onChange={e => setEditAnnualDue(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 cursor-pointer accent-emerald-500"
                  />
                </label>

                {/* Food */}
                <div className="border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-950/20 rounded-2xl p-4 space-y-4">
                  <label className="flex items-start justify-between cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-950/10 transition">
                    <div className="flex gap-3">
                      <span className="text-2xl mt-0.5 shrink-0" role="img" aria-label="food">🍲 🍗</span>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Food</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Volunteered to cook</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={editFood}
                      onChange={e => setEditFood(e.target.checked)}
                      className="mt-1 w-5 h-5 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 cursor-pointer accent-emerald-500"
                    />
                  </label>

                  {editFood && (
                    <div className="space-y-1.5 pl-11 animate-in slide-in-from-top-1 duration-150">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Cook Date
                      </label>
                      <input
                        type="date"
                        value={editCookDate}
                        onChange={e => setEditCookDate(e.target.value)}
                        className="w-full text-xs p-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-550/20 focus:border-emerald-550 bg-white"
                      />
                    </div>
                  )}
                </div>

                {/* End of Year Party */}
                <label className="flex items-start justify-between p-4 border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-950/20 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-950/40 transition">
                  <div className="flex gap-3">
                    <span className="text-2xl mt-0.5 shrink-0" role="img" aria-label="party">🎉</span>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">End of Year Party</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Party attendee</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editParty}
                    onChange={e => setEditParty(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 cursor-pointer accent-emerald-500"
                  />
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPlayer(null)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-slate-950 text-white dark:bg-white dark:text-slate-950 text-xs font-bold px-6 py-2.5 rounded-xl hover:bg-slate-850 dark:hover:bg-slate-100 transition cursor-pointer shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Custom Delete Player Confirmation Modal */}
      {playerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-150 dark:border-slate-800 shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-red-100 dark:bg-red-950/30 text-red-600 rounded-full shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="text-lg font-black text-slate-950 dark:text-slate-50 leading-tight">
                  Delete Player?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                  Are you sure you want to delete <span className="font-bold text-slate-850 dark:text-slate-100">"{playerToDelete.name}"</span>? All their registered details and attendance histories across all sessions will be permanently wiped from the database. This action is irreversible.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                id="confirm-delete-player-btn"
                onClick={() => {
                  onDeletePlayer(playerToDelete.id);
                  setPlayerToDelete(null);
                  setSelectedPlayer(null); // Close detail modal too
                }}
                className="w-full sm:flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-sm active:scale-95"
              >
                Confirm Delete
              </button>
              <button
                id="cancel-delete-player-btn"
                onClick={() => setPlayerToDelete(null)}
                className="w-full sm:flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-xs font-black rounded-xl transition cursor-pointer active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
