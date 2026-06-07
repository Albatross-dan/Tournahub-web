import React from 'react';
import { Info } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NoShowUnderReviewProps {
  reportedBy: string;
  absentPlayer: string;
  currentUserId: string;
  tournamentId?: string;
}

export function NoShowUnderReview({ reportedBy, absentPlayer, currentUserId, tournamentId }: NoShowUnderReviewProps) {
  const isReporter = currentUserId === reportedBy;
  const isAbsent = currentUserId === absentPlayer;

  let subtitle = "A no-show report has been filed and is awaiting admin review.";
  if (isReporter) {
    subtitle = "Your report has been submitted and is awaiting admin review. You will be notified of the decision.";
  } else if (isAbsent) {
    subtitle = "A no-show report has been filed against you for this match. An admin is currently reviewing your case.";
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in duration-500">
      <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
        {/* Top icon: ⏳ in amber/orange circle */}
        <div className="w-16 h-16 bg-amber-500/15 border border-amber-500/30 rounded-full flex items-center justify-center text-3xl animate-pulse">
          ⏳
        </div>
        
        {/* Title: "NO-SHOW REPORT FILED" in amber/orange */}
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-amber-500 uppercase italic tracking-wider leading-none">
            NO-SHOW REPORT FILED
          </h3>
          <p className="text-zinc-400 font-bold max-w-md text-xs leading-relaxed uppercase tracking-wider">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="p-8 pt-0 space-y-8">
        {/* Protocol alert box */}
        <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-start space-x-4 text-left">
          <div className="bg-orange-500/20 p-2 rounded-xl shrink-0">
            <Info className="w-5 h-5 text-orange-500" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-black text-white uppercase italic tracking-widest">Protocol Alert</h4>
            <p className="text-[10px] font-bold text-zinc-400 leading-relaxed uppercase tracking-tight">
              NO-SHOW REPORT SUBMITTED. AN ADMIN WILL REVIEW THE EVIDENCE AND ISSUE A DECISION. NO FURTHER ACTION REQUIRED.
            </p>
          </div>
        </div>

        {/* Single button: BACK TO TOURNAMENT */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-zinc-800">
          <Link 
            to={tournamentId ? `/tournaments/${tournamentId}` : "/tournaments"}
            className="w-full h-14 bg-white text-black hover:bg-zinc-200 transition-all rounded-2xl flex items-center justify-center font-black uppercase italic tracking-widest text-xs"
          >
            Back to Tournament
          </Link>
        </div>

        {/* Footer text */}
        <div className="text-center">
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest italic animate-pulse">
            REPORT UNDER ADMIN REVIEW... NO FURTHER ACTION REQUIRED.
          </p>
        </div>
      </div>
    </div>
  );
}
