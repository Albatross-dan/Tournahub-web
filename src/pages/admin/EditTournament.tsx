import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Shell from '../../components/layout/Shell';
import { tournamentService } from '../../services/tournamentService';
import TournamentForm from '../../components/admin/TournamentForm';
import { Tournament } from '../../types/database';
import { Loader2, ArrowLeft, Trash2 } from 'lucide-react';
import LoadingState from '../../components/ui/LoadingState';

export default function EditTournament() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) loadTournament();
  }, [id]);

  async function loadTournament() {
    try {
      const data = await tournamentService.getById(id!);
      setTournament(data);
    } catch (err) {
      console.error(err);
      navigate('/admin/tournaments');
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await tournamentService.delete(id);
      navigate('/admin/tournaments');
    } catch (err: any) {
      alert(err.message || 'Delete failed: Have players already registered?');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <Shell>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate('/admin/tournaments')}
            className="flex items-center text-slate-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Management
          </button>

          {tournament && !loading && (
            <div className="flex items-center space-x-3">
              {confirmDelete ? (
                <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-right-2">
                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest mr-2">Are you sure?</span>
                  <button 
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-4 py-2 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30 flex items-center"
                  >
                    {deleting ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Trash2 className="w-3 h-3 mr-2" />}
                    Confirm Permanent Delete
                  </button>
                  <button 
                    onClick={() => setConfirmDelete(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setConfirmDelete(true)}
                  className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors flex items-center"
                >
                  <Trash2 className="w-3 h-3 mr-2" />
                  Terminate Event
                </button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
            Edit <span className="text-primary">Tournament</span>
          </h1>
          <p className="text-slate-400">Update event parameters and prize allocations.</p>
        </div>

        {loading ? (
          <LoadingState message="Fetching Event Parameters..." />
        ) : tournament ? (
          <TournamentForm mode="edit" initialData={tournament} />
        ) : (
          <div className="text-center py-20 text-slate-500 italic">Tournament not found</div>
        )}
      </div>
    </Shell>
  );
}
