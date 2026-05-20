import { ensureAuthenticated, supabase } from '../lib/supabase';
import { 
  SubmitResultPayload, 
  MatchVerificationState, 
  DisputedMatch, 
  ResolveDisputePayload,
  VerificationStatus
} from '../types/verification.types';

export const matchResultService = {
  async submitResult(payload: SubmitResultPayload): Promise<{
    success: boolean;
    verification_status: VerificationStatus;
    auto_verified?: boolean;
    final_score?: string;
    result_id?: string;
    message?: string;
    error?: string;
  }> {
    await ensureAuthenticated();
    const { data, error } = await (supabase.rpc as any)('submit_match_result', {
      p_match_id: payload.matchId,
      p_submitter_id: payload.submitterId,
      p_score1: payload.score1,
      p_score2: payload.score2,
      p_screenshot_url: payload.screenshotUrl || null,
    });

    if (error) throw error;
    return data;
  },

  async getVerificationState(matchId: string): Promise<MatchVerificationState> {
    const { data, error } = await (supabase.rpc as any)('get_match_verification_state', {
      p_match_id: matchId,
    });

    if (error) throw error;
    return data;
  },

  async getDisputedMatches(adminId: string): Promise<{
    count: number;
    disputes: DisputedMatch[];
  }> {
    const { data, error } = await (supabase.rpc as any)('get_disputed_matches', {
      p_admin_id: adminId,
    });

    if (error) throw error;
    return data;
  },

  async resolveDispute(payload: ResolveDisputePayload): Promise<{
    success: boolean;
    final_score?: string;
    override_used?: boolean;
    message?: string;
    error?: string;
  }> {
    await ensureAuthenticated();
    const rpcParams: any = {
      p_admin_id: payload.adminId,
      p_match_id: payload.matchId,
      p_admin_notes: payload.adminNotes || null,
    };

    if (payload.winningSubId) {
      rpcParams.p_winning_sub_id = payload.winningSubId;
    } else {
      rpcParams.p_override_score1 = payload.overrideScore1;
      rpcParams.p_override_score2 = payload.overrideScore2;
    }

    const { data, error } = await (supabase.rpc as any)('admin_resolve_dispute', rpcParams);

    if (error) throw error;
    if (data && (data as any).error) throw new Error((data as any).error);
    return data as any;
  },

  async verifyResult(params: {
    verifierId: string;
    resultId: string;
    action: 'approve' | 'reject';
    adminNotes?: string;
  }): Promise<{ success: boolean; error?: string }> {
    await ensureAuthenticated();
    const { data, error } = await (supabase.rpc as any)('verify_match_result', {
      p_verifier_id: params.verifierId,
      p_result_id: params.resultId,
      p_action: params.action,
      p_admin_notes: params.adminNotes || null,
    });

    if (error) throw error;
    return data;
  },

  async sendReminder(params: {
    opponentId: string;
    matchId: string;
  }): Promise<void> {
    const { error } = await (supabase as any)
      .from('notifications')
      .insert({
        user_id: params.opponentId,
        type: 'result_reminder',
        title: '⏰ Submit Your Match Result',
        body: 'Your opponent submitted their score. Submit yours to complete the match.',
        data: { match_id: params.matchId }
      });

    if (error) throw error;
  }
};
