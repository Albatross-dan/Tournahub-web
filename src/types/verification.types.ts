export type VerificationStatus =
  | 'none'
  | 'single_submission'
  | 'matched'
  | 'disputed'
  | 'verified'

export type UiState =
  | 'awaiting_submissions'
  | 'waiting_for_opponent'
  | 'auto_verified'
  | 'under_admin_review'
  | 'admin_verified'

export interface ResultSubmission {
  id: string
  submitted_by: string
  username: string
  avatar_url: string | null
  score1: number
  score2: number
  player1_score?: number
  player2_score?: number
  screenshot_url: string | null
  status: 'submitted' | 'verified' | 'rejected' | 'disputed' | 'superseded'
  created_at: string
  is_canonical: boolean
}

export interface MatchVerificationState {
  match_id: string
  match_status: string
  verification_status: VerificationStatus
  ui_state: UiState
  approved_result_id: string | null
  final_score1: number | null
  final_score2: number | null
  winner: string | null
  locked: boolean
  submission_count: number
  submissions: ResultSubmission[]
}

export interface DisputedMatch {
  match_id: string
  tournament_id: string
  tournament_name: string
  tournament_type: 'knockout' | 'league' | 'group_stage' | 'swiss' | 'hybrid'
  round: number
  stage: string
  verification_status: VerificationStatus
  match_status: string
  player1_id: string
  player2_id: string
  player1_username: string
  player2_username: string
  submissions: ResultSubmission[]
}

export interface SubmitResultPayload {
  matchId: string
  submitterId: string
  score1: number
  score2: number
  screenshotUrl?: string | null
}

export interface ResolveDisputePayload {
  adminId: string
  matchId: string
  winningSubId?: string
  overrideScore1?: number
  overrideScore2?: number
  adminNotes?: string
}
