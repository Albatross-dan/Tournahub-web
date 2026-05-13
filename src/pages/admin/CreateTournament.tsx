import React from 'react';
import Shell from '../../components/layout/Shell';
import TournamentForm from '../../components/admin/TournamentForm';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CreateTournament() {
  const navigate = useNavigate();

  return (
    <Shell>
      <div className="space-y-8">
        <button 
          onClick={() => navigate('/admin/tournaments')}
          className="flex items-center text-slate-400 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Management
        </button>

        <div className="space-y-2">
          <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
            Initialize <span className="text-primary">New Event</span>
          </h1>
          <p className="text-slate-400">Set the rules, prize pools, and schedule for your next major tournament.</p>
        </div>

        <TournamentForm mode="create" />
      </div>
    </Shell>
  );
}
