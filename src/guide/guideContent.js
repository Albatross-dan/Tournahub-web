/**
 * All guide, tour, tip, and help content for TournaHub.
 * Edit wording here without modifying components.
 */

export const welcomeTourSteps = [
  {
    id: 'find_tournament',
    step: 1,
    title: 'Find & Join Tournaments',
    description: 'Browse upcoming football competitions, pick your bracket, and register with one tap.',
    media: null, // Optional media asset placeholder for future use
  },
  {
    id: 'play_match',
    step: 2,
    title: 'Play Your Match',
    description: 'Meet your opponent in eFootball using the match details and connect via match chat when ready.',
    media: null,
  },
  {
    id: 'submit_result',
    step: 3,
    title: 'Submit Your Result',
    description: 'Snap a screenshot of your match score and upload it to confirm your game standing.',
    media: null,
  },
  {
    id: 'wallet_prizes',
    step: 4,
    title: 'Wallet & Instant Prizes',
    description: 'Prize winnings land directly in your wallet. Withdraw to local cash accounts safely anytime.',
    media: null,
  },
];

export const contextualTips = {
  wallet: {
    title: 'Wallet Safety',
    text: 'Your balance is protected. Deposits and withdrawals are handled quickly and securely.',
  },
  tournament: {
    title: 'Tournament Overview',
    text: 'Check fixture times, bracket seeds, and rules here. You will get an alert when your match is up.',
  },
  result_submit: {
    title: 'Score Verification',
    text: 'Always take a clear screenshot of the final score screen in eFootball before submitting.',
  },
  challenges: {
    title: '1v1 Instant Challenges',
    text: 'Challenge other players directly with stakes. Prize funds are held securely until match results are verified.',
  },
  disputes: {
    title: 'Fair Dispute Resolution',
    text: 'If results disagree, moderators inspect submitted screenshots and chat to resolve match outcomes fairly.',
  },
};

export const formatExplorations = {
  knockout: {
    name: 'Knockout (Single Elimination)',
    summary: 'A classic bracket format. Win your match to advance to the next round. If you lose, your tournament run ends. High stakes with every game.',
  },
  league: {
    name: 'League (Round Robin)',
    summary: 'Every team plays against all other contenders. You earn 3 points for a win, 1 for a draw, and 0 for a loss. The top point earner takes the cup.',
  },
  group_knockout: {
    name: 'Group Stage + Knockout',
    summary: 'Contenders compete in mini-leagues first. Top finishers in each group qualify into the championship knockout bracket.',
  },
  champions_league: {
    name: 'Champions League System',
    summary: 'Top-tier tournament structure combining group qualification and two-legged playoff matches leading to a grand single-match final.',
  },
  swiss: {
    name: 'Swiss System',
    summary: 'Non-elimination rounds where winners face winners and contenders with similar records play each other. Ensures multiple games for everyone.',
  },
};

export const helpGuides = [
  {
    id: 'join_tournament',
    title: 'Joining a Tournament',
    icon: 'Trophy',
    steps: [
      'Open the Tournaments page from the navigation bar.',
      'Tap on any tournament with "Open" status to review entry fees, rules, and schedule.',
      'Tap "Join Tournament" to register. If an entry fee applies, it is deducted from your wallet.',
      'Once the bracket is generated, your match fixture will appear on your dashboard.',
    ],
  },
  {
    id: 'submit_result',
    title: 'Submitting a Match Result',
    icon: 'CheckCircle2',
    steps: [
      'Complete your match with your opponent in eFootball.',
      'Take a clear screenshot of the final score summary screen.',
      'Open your match page in TournaHub, enter the scores, and attach the screenshot.',
      'When both players submit matching scores, the bracket advances automatically.',
    ],
  },
  {
    id: 'escrow_prizes',
    title: 'How Escrow & Prizes Work',
    icon: 'Shield',
    steps: [
      'Tournament and challenge prize pools are held in escrow before matches begin.',
      'Funds are never released until both players verify the score or moderators approve.',
      'Prizes are automatically credited to your in-app wallet balance as soon as the tournament concludes.',
    ],
  },
  {
    id: 'dispute_resolution',
    title: 'What to Do in a Dispute',
    icon: 'Gavel',
    steps: [
      'If you and your opponent enter conflicting scores, the match is marked Disputed.',
      'Use the match chat to reach out politely to your opponent.',
      'Both players submit their photo proof on the match page.',
      'A staff moderator inspects match logs and image proof to finalize the official result.',
    ],
  },
  {
    id: 'wallet_transactions',
    title: 'Wallet Deposits & Withdrawals',
    icon: 'Wallet',
    steps: [
      'Visit the Wallet page to check your balance, payouts, and activity.',
      'Tap "Deposit" to top up using supported local mobile money or card payments.',
      'Tap "Withdraw" to send your winnings straight to your registered phone or account.',
      'Most local transfers are processed quickly during operating hours.',
    ],
  },
  {
    id: 'formats',
    title: 'Tournament Formats Explained',
    icon: 'Layers',
    steps: [
      'Knockout: 1 loss and you are eliminated. Highest adrenaline.',
      'League: Play every opponent. Standings ranked by points, goal difference, and goals.',
      'Group Stage + Knockout: Round-robin groups first, then top seeds advance to bracket.',
      'Swiss: Play multiple rounds against opponents with matching records.',
    ],
  },
];
