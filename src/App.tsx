import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Calendar, 
  Users, 
  Settings, 
  Plus, 
  Trash2, 
  ChevronRight, 
  MapPin, 
  Clock,
  Lock,
  X,
  Check,
  RotateCcw,
  Edit2
} from 'lucide-react';

// Types
interface Team {
  id: number;
  name: string;
  category: string;
  group_name: string;
  logo_url?: string;
}

interface Match {
  id: number;
  category: string;
  team_a_id: number;
  team_b_id: number;
  team_a_name: string;
  team_b_name: string;
  team_a_logo?: string;
  team_b_logo?: string;
  score_a: number;
  score_b: number;
  date: string;
  time: string;
  location: string;
  status: 'scheduled' | 'finished';
  is_final?: number;
  is_third_place?: number;
}

const CATEGORIES = [
  'Alevin Mixto',
  'Infantil Mixto',
  'Cadete Masculino',
  'Cadete Femenino',
  'Juvenil Masculino'
];

const SECTIONS = ['Partidos', 'Equipos', 'Grupo', 'Final'] as const;
type Section = typeof SECTIONS[number];

export default function App() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [activeSection, setActiveSection] = useState<Section>('Partidos');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournamentLogo, setTournamentLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamGroup, setNewTeamGroup] = useState('Grupo Único');
  const [newTeamLogo, setNewTeamLogo] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  const [newMatchTeamA, setNewMatchTeamA] = useState('');
  const [newMatchTeamB, setNewMatchTeamB] = useState('');
  const [newMatchDate, setNewMatchDate] = useState('2026-04-03');
  const [newMatchTime, setNewMatchTime] = useState('10:00');
  const [newMatchLocation, setNewMatchLocation] = useState('');
  const [isFinalMatch, setIsFinalMatch] = useState(false);
  const [isThirdPlaceMatch, setIsThirdPlaceMatch] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewTeamLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // WebSocket for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'DATA_UPDATED') {
        fetchData();
      } else if (data.type === 'SETTINGS_UPDATED') {
        fetchSettings();
      }
    };

    return () => ws.close();
  }, []);

  useEffect(() => {
    fetchData();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setTournamentLogo(data.tournament_logo);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchData = async () => {
    try {
      const [teamsRes, matchesRes] = await Promise.all([
        fetch('/api/teams'),
        fetch('/api/matches')
      ]);
      
      if (!teamsRes.ok) throw new Error(`Teams fetch error! status: ${teamsRes.status}`);
      if (!matchesRes.ok) throw new Error(`Matches fetch error! status: ${matchesRes.status}`);

      const teamsData = await teamsRes.json();
      const matchesData = await matchesRes.json();
      setTeams(teamsData);
      setMatches(matchesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTournamentLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tournament_logo: base64 })
        });
        fetchSettings();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Fe07012007*') {
      setIsAdmin(true);
      setShowLogin(false);
      setPassword('');
    } else {
      alert('Contraseña incorrecta');
    }
  };

  const addTeam = async () => {
    if (!newTeamName) return;
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTeamName,
          category: activeCategory,
          group_name: newTeamGroup,
          logo_url: newTeamLogo
        })
      });
      if (res.ok) {
        setNewTeamName('');
        setNewTeamLogo(null);
        setNewTeamGroup('Grupo Único');
        fetchData();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Error al guardar el equipo');
      }
    } catch (error) {
      console.error('Error adding team:', error);
      alert('Error de conexión al guardar el equipo');
    }
  };

  const updateTeam = async () => {
    if (!editingTeam) return;
    const res = await fetch(`/api/teams/${editingTeam.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editingTeam.name,
        category: editingTeam.category,
        group_name: editingTeam.group_name,
        logo_url: editingTeam.logo_url
      })
    });
    if (res.ok) {
      setEditingTeam(null);
      fetchData();
    }
  };

  const deleteTeam = async (id: number) => {
    try {
      const res = await fetch(`/api/teams/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json();
        console.error(errorData.error || 'Error al eliminar el equipo');
        return;
      }
      fetchData();
    } catch (error: any) {
      console.error('Error deleting team:', error);
    }
  };

  const addMatch = async () => {
    if (!newMatchTeamA || !newMatchTeamB) return;
    const res = await fetch('/api/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: activeCategory,
        team_a_id: parseInt(newMatchTeamA),
        team_b_id: parseInt(newMatchTeamB),
        date: newMatchDate,
        time: newMatchTime,
        location: newMatchLocation,
        is_final: isFinalMatch,
        is_third_place: isThirdPlaceMatch
      })
    });
    if (res.ok) {
      setNewMatchTeamA('');
      setNewMatchTeamB('');
      setIsFinalMatch(false);
      setIsThirdPlaceMatch(false);
      fetchData();
    }
  };

  const updateMatch = async () => {
    if (!editingMatch) return;
    const res = await fetch(`/api/matches/${editingMatch.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        team_a_id: editingMatch.team_a_id,
        team_b_id: editingMatch.team_b_id,
        date: editingMatch.date,
        time: editingMatch.time,
        location: editingMatch.location,
        score_a: editingMatch.score_a,
        score_b: editingMatch.score_b,
        status: editingMatch.status,
        is_final: editingMatch.is_final,
        is_third_place: editingMatch.is_third_place
      })
    });
    if (res.ok) {
      setEditingMatch(null);
      fetchData();
    }
  };

  const undoLastAction = async () => {
    const res = await fetch('/api/undo', { method: 'POST' });
    if (res.ok) {
      fetchData();
    } else {
      const data = await res.json();
      alert(data.error || 'No hay acciones para deshacer');
    }
  };

  const updateScore = async (id: number, scoreA: number, scoreB: number, status: string) => {
    await fetch(`/api/matches/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score_a: scoreA, score_b: scoreB, status })
    });
    fetchData();
  };

  const deleteMatch = async (id: number) => {
    await fetch(`/api/matches/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const filteredTeams = useMemo(() => 
    teams.filter(t => t.category === activeCategory),
    [teams, activeCategory]
  );

  const filteredMatches = useMemo(() => 
    matches.filter(m => m.category === activeCategory),
    [matches, activeCategory]
  );

  const regularMatches = useMemo(() => 
    filteredMatches.filter(m => !m.is_final && !m.is_third_place),
    [filteredMatches]
  );

  const finalMatches = useMemo(() => 
    filteredMatches.filter(m => m.is_final),
    [filteredMatches]
  );

  const thirdPlaceMatches = useMemo(() => 
    filteredMatches.filter(m => m.is_third_place),
    [filteredMatches]
  );

  const standings = useMemo<Record<string, any[]>>(() => {
    const groups: Record<string, any[]> = {};
    
    filteredTeams.forEach(team => {
      if (!groups[team.group_name]) groups[team.group_name] = [];
      
      let stats = {
        id: team.id,
        name: team.name,
        pj: 0,
        pg: 0,
        pe: 0,
        pp: 0,
        gf: 0,
        gc: 0,
        pts: 0
      };

      regularMatches.filter(m => m.status === 'finished' && (m.team_a_id === team.id || m.team_b_id === team.id))
        .forEach(m => {
          stats.pj++;
          const isTeamA = m.team_a_id === team.id;
          const teamScore = isTeamA ? m.score_a : m.score_b;
          const oppScore = isTeamA ? m.score_b : m.score_a;
          
          stats.gf += teamScore;
          stats.gc += oppScore;

          if (teamScore > oppScore) {
            stats.pg++;
            stats.pts += 2;
          } else if (teamScore === oppScore) {
            stats.pe++;
            stats.pts += 1;
          } else {
            stats.pp++;
          }
        });

      groups[team.group_name].push(stats);
    });

    // Sort by points, then goal difference
    Object.keys(groups).forEach(g => {
      groups[g].sort((a, b) => (b.pts - a.pts) || ((b.gf - b.gc) - (a.gf - a.gc)));
    });

    return groups;
  }, [filteredTeams, regularMatches]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-indigo-900 text-white pt-12 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-800 rounded-full -mr-32 -mt-32 opacity-50 blur-3xl"></div>
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-6xl font-display font-extrabold tracking-tight"
              >
                MARENOSTRUM CUP <span className="text-indigo-400">2026</span>
              </motion.h1>
              <p className="mt-2 text-indigo-200 font-medium flex items-center gap-2">
                <Calendar size={18} /> 3 - 5 de Abril, 2026
              </p>
            </div>
            <div className="flex items-center gap-6">
              {tournamentLogo && (
                <div className="w-20 h-20 md:w-28 md:h-28 bg-white/10 rounded-3xl backdrop-blur-md border border-white/20 p-2 overflow-hidden flex items-center justify-center">
                  <img src={tournamentLogo} alt="Tournament Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                </div>
              )}
              {isAdmin && (
                <div className="relative group">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={updateTournamentLogo}
                    className="absolute inset-0 opacity-0 cursor-pointer z-20"
                    title="Cambiar Logo Torneo"
                  />
                  <div className="p-3 rounded-full bg-white/10 text-white/60 hover:bg-white/20 transition-all">
                    <Settings size={20} />
                  </div>
                </div>
              )}
              <button 
                onClick={() => isAdmin ? setIsAdmin(false) : setShowLogin(true)}
                className={`p-3 rounded-full transition-all ${isAdmin ? 'bg-indigo-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
              >
                {isAdmin ? <Check size={20} /> : <Lock size={20} />}
              </button>
              {isAdmin && (
                <button 
                  onClick={undoLastAction}
                  className="p-3 rounded-full bg-white/10 text-white/60 hover:bg-white/20 transition-all"
                  title="Deshacer última acción"
                >
                  <RotateCcw size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 -mt-12">
        {/* Category Navigation - Dropdown */}
        <div className="relative group">
          <label className="block text-xs font-bold text-indigo-300 uppercase tracking-widest mb-2 ml-1">
            Categoría Seleccionada
          </label>
          <div className="relative">
            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              className="w-full bg-white text-slate-800 px-6 py-4 rounded-2xl font-bold shadow-lg appearance-none cursor-pointer border-2 border-transparent focus:border-indigo-500 outline-none transition-all text-lg"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-600">
              <ChevronRight className="rotate-90" size={24} />
            </div>
          </div>
        </div>

        {/* Section Navigation */}
        <div className="flex gap-1 bg-white p-1 rounded-2xl shadow-sm mt-6 border border-slate-100">
          {SECTIONS.map(sec => (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                activeSection === sec 
                ? 'bg-indigo-50 text-indigo-600' 
                : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="mt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeCategory}-${activeSection}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeSection === 'Partidos' && (
                <div className="space-y-4">
                  {isAdmin && (
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-indigo-100 mb-8">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-900">
                        <Plus size={20} /> Añadir Partido
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select 
                          value={newMatchTeamA} 
                          onChange={e => setNewMatchTeamA(e.target.value)}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 ring-indigo-500 outline-none"
                        >
                          <option value="">Equipo A</option>
                          {filteredTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <select 
                          value={newMatchTeamB} 
                          onChange={e => setNewMatchTeamB(e.target.value)}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 ring-indigo-500 outline-none"
                        >
                          <option value="">Equipo B</option>
                          {filteredTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <input 
                          type="date" 
                          value={newMatchDate} 
                          onChange={e => setNewMatchDate(e.target.value)}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50"
                        />
                        <input 
                          type="time" 
                          value={newMatchTime} 
                          onChange={e => setNewMatchTime(e.target.value)}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50"
                        />
                        <input 
                          placeholder="Pabellón / Localización" 
                          value={newMatchLocation} 
                          onChange={e => setNewMatchLocation(e.target.value)}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50"
                        />
                        <div className="flex items-center gap-4 p-3 col-span-1 md:col-span-2">
                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              id="isFinal"
                              checked={isFinalMatch}
                              onChange={e => {
                                setIsFinalMatch(e.target.checked);
                                if (e.target.checked) setIsThirdPlaceMatch(false);
                              }}
                              className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="isFinal" className="text-sm font-bold text-slate-700">¿Es una Final?</label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              id="isThirdPlace"
                              checked={isThirdPlaceMatch}
                              onChange={e => {
                                setIsThirdPlaceMatch(e.target.checked);
                                if (e.target.checked) setIsFinalMatch(false);
                              }}
                              className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="isThirdPlace" className="text-sm font-bold text-slate-700">¿Es 3er/4to Puesto?</label>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={addMatch}
                        className="mt-4 w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                      >
                        Programar Partido
                      </button>
                    </div>
                  )}

                  {regularMatches.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                      <Calendar className="mx-auto text-slate-300 mb-4" size={48} />
                      <p className="text-slate-500 font-medium">No hay partidos programados aún.</p>
                    </div>
                  ) : (
                    regularMatches.map(match => (
                      <div key={match.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:border-indigo-200 transition-colors group">
                        {editingMatch?.id === match.id ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <select 
                                value={editingMatch.team_a_id} 
                                onChange={e => setEditingMatch({...editingMatch, team_a_id: parseInt(e.target.value)})}
                                className="p-2 rounded-lg border border-slate-200"
                              >
                                {filteredTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                              </select>
                              <select 
                                value={editingMatch.team_b_id} 
                                onChange={e => setEditingMatch({...editingMatch, team_b_id: parseInt(e.target.value)})}
                                className="p-2 rounded-lg border border-slate-200"
                              >
                                {filteredTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                              </select>
                              <input 
                                type="date" 
                                value={editingMatch.date} 
                                onChange={e => setEditingMatch({...editingMatch, date: e.target.value})}
                                className="p-2 rounded-lg border border-slate-200"
                              />
                              <input 
                                type="time" 
                                value={editingMatch.time} 
                                onChange={e => setEditingMatch({...editingMatch, time: e.target.value})}
                                className="p-2 rounded-lg border border-slate-200"
                              />
                              <input 
                                placeholder="Lugar" 
                                value={editingMatch.location} 
                                onChange={e => setEditingMatch({...editingMatch, location: e.target.value})}
                                className="p-2 rounded-lg border border-slate-200 col-span-2"
                              />
                              <div className="flex items-center gap-4 col-span-2 p-1">
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="checkbox" 
                                    id={`edit-final-${editingMatch.id}`}
                                    checked={!!editingMatch.is_final}
                                    onChange={e => setEditingMatch({...editingMatch, is_final: e.target.checked ? 1 : 0, is_third_place: 0})}
                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                                  />
                                  <label htmlFor={`edit-final-${editingMatch.id}`} className="text-xs font-bold text-slate-600">Final</label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="checkbox" 
                                    id={`edit-third-${editingMatch.id}`}
                                    checked={!!editingMatch.is_third_place}
                                    onChange={e => setEditingMatch({...editingMatch, is_third_place: e.target.checked ? 1 : 0, is_final: 0})}
                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                                  />
                                  <label htmlFor={`edit-third-${editingMatch.id}`} className="text-xs font-bold text-slate-600">3er/4to</label>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={updateMatch} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold">Guardar</button>
                              <button onClick={() => setEditingMatch(null)} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg font-bold">Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                              <div className="flex-1 flex flex-col md:flex-row items-center justify-end gap-4 text-center md:text-right w-full">
                                <span className="text-xl font-bold text-slate-800 order-2 md:order-1">{match.team_a_name}</span>
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 order-1 md:order-2">
                                  {match.team_a_logo ? (
                                    <img src={match.team_a_logo} alt={match.team_a_name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                  ) : (
                                    <Users className="text-slate-300" size={32} />
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex flex-col items-center gap-2 shrink-0">
                                <div className="flex items-center gap-4">
                                  {isAdmin ? (
                                    <>
                                      <input 
                                        type="number" 
                                        value={match.score_a} 
                                        onChange={e => updateScore(match.id, parseInt(e.target.value), match.score_b, 'finished')}
                                        className="w-16 h-16 text-center text-3xl font-black bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none"
                                      />
                                      <span className="text-2xl font-black text-slate-300">-</span>
                                      <input 
                                        type="number" 
                                        value={match.score_b} 
                                        onChange={e => updateScore(match.id, match.score_a, parseInt(e.target.value), 'finished')}
                                        className="w-16 h-16 text-center text-3xl font-black bg-slate-50 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none"
                                      />
                                    </>
                                  ) : (
                                    <div className="flex items-center gap-4">
                                      <span className={`text-4xl font-black ${match.status === 'finished' ? 'text-slate-900' : 'text-slate-200'}`}>
                                        {match.status === 'finished' ? match.score_a : '-'}
                                      </span>
                                      <span className="text-2xl font-black text-slate-300">VS</span>
                                      <span className={`text-4xl font-black ${match.status === 'finished' ? 'text-slate-900' : 'text-slate-200'}`}>
                                        {match.status === 'finished' ? match.score_b : '-'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                                  <span className="flex items-center gap-1"><Clock size={12} /> {match.time}</span>
                                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                  <span className="flex items-center gap-1"><MapPin size={12} /> {match.location || 'TBD'}</span>
                                </div>
                              </div>

                              <div className="flex-1 flex flex-col md:flex-row items-center justify-start gap-4 text-center md:text-left w-full">
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100">
                                  {match.team_b_logo ? (
                                    <img src={match.team_b_logo} alt={match.team_b_name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                  ) : (
                                    <Users className="text-slate-300" size={32} />
                                  )}
                                </div>
                                <span className="text-xl font-bold text-slate-800">{match.team_b_name}</span>
                              </div>
                            </div>
                            
                            {isAdmin && (
                              <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => setEditingMatch(match)}
                                  className="flex-1 flex items-center justify-center gap-2 py-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-colors"
                                >
                                  <Edit2 size={16} /> Editar
                                </button>
                                <button 
                                  onClick={() => deleteMatch(match.id)}
                                  className="flex-1 flex items-center justify-center gap-2 py-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                >
                                  <Trash2 size={16} /> Eliminar
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeSection === 'Equipos' && (
                <div className="space-y-6">
                  {isAdmin && (
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-indigo-100">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-900">
                        <Plus size={20} /> Añadir Equipo
                      </h3>
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row gap-4">
                          <input 
                            placeholder="Nombre del Equipo" 
                            value={newTeamName} 
                            onChange={e => setNewTeamName(e.target.value)}
                            className="flex-1 p-3 rounded-xl border border-slate-200 bg-slate-50"
                          />
                        </div>
                        <div className="flex flex-col md:flex-row items-center gap-4">
                          <div className="flex-1 w-full">
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Logo del Equipo</label>
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            />
                          </div>
                          {newTeamLogo && (
                            <div className="w-16 h-16 bg-slate-50 rounded-2xl overflow-hidden border border-indigo-100">
                              <img src={newTeamLogo} alt="Preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                            </div>
                          )}
                          <button 
                            onClick={addTeam}
                            className="w-full md:w-auto bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700"
                          >
                            Añadir Equipo
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTeams.map(team => (
                      <div key={team.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center group">
                        {editingTeam?.id === team.id ? (
                          <div className="flex-1 flex flex-col gap-2">
                            <input 
                              value={editingTeam.name} 
                              onChange={e => setEditingTeam({...editingTeam, name: e.target.value})}
                              className="p-2 rounded-lg border border-slate-200"
                            />
                            <div className="flex gap-2">
                              <button onClick={updateTeam} className="flex-1 bg-indigo-600 text-white py-1 rounded-lg text-sm">OK</button>
                              <button onClick={() => setEditingTeam(null)} className="flex-1 bg-slate-100 text-slate-600 py-1 rounded-lg text-sm">X</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-50">
                                {team.logo_url ? (
                                  <img src={team.logo_url} alt={team.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                ) : (
                                  <Users className="text-indigo-600" size={24} />
                                )}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-800">{team.name}</h4>
                              </div>
                            </div>
                            {isAdmin && (
                              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => setEditingTeam(team)}
                                  className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button 
                                  onClick={() => deleteTeam(team.id)}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === 'Grupo' && (
                <div className="space-y-12">
                  {(Object.entries(standings) as [string, any[]][]).map(([groupName, groupTeams]) => (
                    <div key={groupName} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                      <div className="bg-indigo-600 px-6 py-4">
                        <h3 className="text-white font-display font-bold text-xl">Clasificación</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider">
                              <th className="px-6 py-4">Pos</th>
                              <th className="px-6 py-4">Equipo</th>
                              <th className="px-4 py-4 text-center">PJ</th>
                              <th className="px-4 py-4 text-center">PG</th>
                              <th className="px-4 py-4 text-center">PE</th>
                              <th className="px-4 py-4 text-center">PP</th>
                              <th className="px-4 py-4 text-center">GF</th>
                              <th className="px-4 py-4 text-center">GC</th>
                              <th className="px-6 py-4 text-center text-indigo-600">PTS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {groupTeams.map((stats: any, idx: number) => (
                              <tr key={stats.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-400">{idx + 1}</td>
                                <td className="px-6 py-4 font-bold text-slate-800">{stats.name}</td>
                                <td className="px-4 py-4 text-center text-slate-600">{stats.pj}</td>
                                <td className="px-4 py-4 text-center text-emerald-600 font-medium">{stats.pg}</td>
                                <td className="px-4 py-4 text-center text-slate-400">{stats.pe}</td>
                                <td className="px-4 py-4 text-center text-red-400">{stats.pp}</td>
                                <td className="px-4 py-4 text-center text-slate-500">{stats.gf}</td>
                                <td className="px-4 py-4 text-center text-slate-500">{stats.gc}</td>
                                <td className="px-6 py-4 text-center font-black text-indigo-600 text-lg">{stats.pts}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeSection === 'Final' && (
                <div className="space-y-12">
                  {/* Gran Final Section */}
                  <div className="space-y-8">
                    <div className="text-center py-8">
                      <Trophy className="mx-auto text-amber-400 mb-4" size={64} />
                      <h2 className="text-3xl font-display font-black text-slate-900 uppercase tracking-tight">Gran Final</h2>
                      <p className="text-slate-500 font-medium">{activeCategory}</p>
                    </div>

                    <div className="space-y-6">
                      {finalMatches.length === 0 ? (
                        <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200">
                          <p className="text-slate-400 font-medium">La final aún no ha sido programada</p>
                        </div>
                      ) : (
                        finalMatches.map(match => (
                          <div key={match.id} className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[2rem] shadow-xl shadow-indigo-200 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                              <Trophy size={120} />
                            </div>
                            
                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                              <div className="flex-1 flex flex-col items-center gap-4 text-center">
                                <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center overflow-hidden border border-white/30 shadow-lg">
                                  {match.team_a_logo ? (
                                    <img src={match.team_a_logo} alt={match.team_a_name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                  ) : (
                                    <Users className="text-white/60" size={40} />
                                  )}
                                </div>
                                <span className="text-2xl font-black text-white uppercase tracking-tight">{match.team_a_name}</span>
                              </div>
                              
                              <div className="flex flex-col items-center gap-4">
                                <div className="flex items-center gap-6">
                                  {isAdmin ? (
                                    <>
                                      <input 
                                        type="number" 
                                        value={match.score_a} 
                                        onChange={e => updateScore(match.id, parseInt(e.target.value), match.score_b, 'finished')}
                                        className="w-20 h-20 text-center text-4xl font-black bg-white/10 text-white rounded-3xl border-2 border-white/20 focus:border-white outline-none"
                                      />
                                      <span className="text-3xl font-black text-white/40">VS</span>
                                      <input 
                                        type="number" 
                                        value={match.score_b} 
                                        onChange={e => updateScore(match.id, match.score_a, parseInt(e.target.value), 'finished')}
                                        className="w-20 h-20 text-center text-4xl font-black bg-white/10 text-white rounded-3xl border-2 border-white/20 focus:border-white outline-none"
                                      />
                                    </>
                                  ) : (
                                    <div className="flex items-center gap-6">
                                      <span className="text-6xl font-black text-white">
                                        {match.status === 'finished' ? match.score_a : '-'}
                                      </span>
                                      <div className="px-4 py-1 bg-white/20 rounded-full backdrop-blur-sm">
                                        <span className="text-sm font-black text-white uppercase tracking-widest">Final</span>
                                      </div>
                                      <span className="text-6xl font-black text-white">
                                        {match.status === 'finished' ? match.score_b : '-'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col items-center gap-1 text-white/70 font-bold uppercase tracking-widest text-sm">
                                  <span className="flex items-center gap-2"><Clock size={16} /> {match.time}</span>
                                  <span className="flex items-center gap-2"><MapPin size={16} /> {match.location || 'Pabellón Principal'}</span>
                                </div>
                              </div>

                              <div className="flex-1 flex flex-col items-center gap-4 text-center">
                                <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center overflow-hidden border border-white/30 shadow-lg">
                                  {match.team_b_logo ? (
                                    <img src={match.team_b_logo} alt={match.team_b_name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                  ) : (
                                    <Users className="text-white/60" size={40} />
                                  )}
                                </div>
                                <span className="text-2xl font-black text-white uppercase tracking-tight">{match.team_b_name}</span>
                              </div>
                            </div>

                            {isAdmin && (
                              <button 
                                onClick={() => deleteMatch(match.id)}
                                className="mt-8 w-full flex items-center justify-center gap-2 py-3 bg-white/10 text-white/60 hover:bg-white/20 rounded-2xl transition-all font-bold"
                              >
                                <Trash2 size={18} /> Eliminar Final
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* 3rd/4th Place Section */}
                  <div className="space-y-8">
                    <div className="text-center py-8">
                      <Users className="mx-auto text-indigo-400 mb-4" size={48} />
                      <h2 className="text-2xl font-display font-black text-slate-900 uppercase tracking-tight">3er y 4to Puesto</h2>
                    </div>

                    <div className="space-y-6">
                      {thirdPlaceMatches.length === 0 ? (
                        <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200">
                          <p className="text-slate-400 font-medium">El partido por el 3er puesto aún no ha sido programado</p>
                        </div>
                      ) : (
                        thirdPlaceMatches.map(match => (
                          <div key={match.id} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden">
                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                              <div className="flex-1 flex flex-col items-center gap-4 text-center">
                                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center overflow-hidden border border-slate-100 shadow-sm">
                                  {match.team_a_logo ? (
                                    <img src={match.team_a_logo} alt={match.team_a_name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                  ) : (
                                    <Users className="text-slate-300" size={32} />
                                  )}
                                </div>
                                <span className="text-xl font-bold text-slate-800 uppercase tracking-tight">{match.team_a_name}</span>
                              </div>
                              
                              <div className="flex flex-col items-center gap-4">
                                <div className="flex items-center gap-6">
                                  {isAdmin ? (
                                    <>
                                      <input 
                                        type="number" 
                                        value={match.score_a} 
                                        onChange={e => updateScore(match.id, parseInt(e.target.value), match.score_b, 'finished')}
                                        className="w-16 h-16 text-center text-3xl font-black bg-slate-50 text-slate-900 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none"
                                      />
                                      <span className="text-2xl font-black text-slate-200">VS</span>
                                      <input 
                                        type="number" 
                                        value={match.score_b} 
                                        onChange={e => updateScore(match.id, match.score_a, parseInt(e.target.value), 'finished')}
                                        className="w-16 h-16 text-center text-3xl font-black bg-slate-50 text-slate-900 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 outline-none"
                                      />
                                    </>
                                  ) : (
                                    <div className="flex items-center gap-6">
                                      <span className="text-5xl font-black text-slate-900">
                                        {match.status === 'finished' ? match.score_a : '-'}
                                      </span>
                                      <div className="px-4 py-1 bg-slate-100 rounded-full">
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">3º Puesto</span>
                                      </div>
                                      <span className="text-5xl font-black text-slate-900">
                                        {match.status === 'finished' ? match.score_b : '-'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col items-center gap-1 text-slate-400 font-bold uppercase tracking-widest text-xs">
                                  <span className="flex items-center gap-2"><Clock size={14} /> {match.time}</span>
                                  <span className="flex items-center gap-2"><MapPin size={14} /> {match.location || 'Pabellón Principal'}</span>
                                </div>
                              </div>

                              <div className="flex-1 flex flex-col items-center gap-4 text-center">
                                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center overflow-hidden border border-slate-100 shadow-sm">
                                  {match.team_b_logo ? (
                                    <img src={match.team_b_logo} alt={match.team_b_name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                  ) : (
                                    <Users className="text-slate-300" size={32} />
                                  )}
                                </div>
                                <span className="text-xl font-bold text-slate-800 uppercase tracking-tight">{match.team_b_name}</span>
                              </div>
                            </div>

                            {isAdmin && (
                              <button 
                                onClick={() => deleteMatch(match.id)}
                                className="mt-8 w-full flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-400 hover:bg-slate-100 rounded-2xl transition-all font-bold"
                              >
                                <Trash2 size={18} /> Eliminar Partido
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Login Modal */}
      <AnimatePresence>
        {showLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogin(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-display font-bold text-slate-900">Acceso Admin</h2>
                <button onClick={() => setShowLogin(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Contraseña</label>
                  <input 
                    type="password" 
                    autoFocus
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
                >
                  Entrar
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <footer className="mt-20 py-12 border-t border-slate-100 text-center">
        <p className="text-slate-400 font-medium">© 2026 Marenostrum Cup - Balonmano</p>
      </footer>
    </div>
  );
}
