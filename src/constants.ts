export enum TournamentStatus {
  DRAFT = 'draft',
  REGISTRATION_OPEN = 'registration_open',
  REGISTRATION_CLOSED = 'registration_closed',
  SEEDING = 'seeding',
  FIXTURE_GENERATION = 'fixture_generation',
  READY = 'ready',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, string> = {
  [TournamentStatus.DRAFT]: 'Coming Soon',
  [TournamentStatus.REGISTRATION_OPEN]: 'Registration Open',
  [TournamentStatus.REGISTRATION_CLOSED]: 'Registration Closed',
  [TournamentStatus.SEEDING]: 'Setting Up',
  [TournamentStatus.FIXTURE_GENERATION]: 'Generating Fixtures',
  [TournamentStatus.READY]: 'Fixtures Ready',
  [TournamentStatus.ONGOING]: 'In Progress',
  [TournamentStatus.COMPLETED]: 'Completed',
  [TournamentStatus.CANCELLED]: 'Cancelled'
};

export const ALLOWED_STATUSES = Object.values(TournamentStatus);

export function sanitizeTournamentStatus(status: string | null | undefined): TournamentStatus {
  if (!status || !ALLOWED_STATUSES.includes(status as TournamentStatus)) {
    return TournamentStatus.DRAFT;
  }
  return status as TournamentStatus;
}
