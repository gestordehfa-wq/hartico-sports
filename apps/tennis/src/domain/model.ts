export const seasonStatuses = ["draft", "active", "completed", "archived"] as const;
export type SeasonStatus = (typeof seasonStatuses)[number];
export const playerStatuses = ["active", "inactive", "retired"] as const;
export type PlayerStatus = (typeof playerStatuses)[number];
export const handednessValues = ["right", "left"] as const;
export type Handedness = (typeof handednessValues)[number];
export const surfaces = ["hard", "clay", "grass", "indoor", "custom"] as const;
export type Surface = (typeof surfaces)[number];
export const tournamentStatuses = ["active", "inactive", "archived"] as const;
export type TournamentStatus = (typeof tournamentStatuses)[number];
export const tournamentCategories = ["major", "masters", "standard", "finals", "custom"] as const;
export type TournamentCategory = (typeof tournamentCategories)[number];
export const editionStatuses = [
  "draft",
  "registration",
  "active",
  "completed",
  "cancelled",
] as const;
export type EditionStatus = (typeof editionStatuses)[number];
export const entryStatuses = [
  "registered",
  "active",
  "withdrawn",
  "eliminated",
  "champion",
] as const;
export type EntryStatus = (typeof entryStatuses)[number];
export const rounds = ["round_of_16", "quarterfinal", "semifinal", "final"] as const;
export type TournamentRound = (typeof rounds)[number];
export const matchStatuses = [
  "scheduled",
  "in_progress",
  "finished",
  "walkover",
  "retired",
  "cancelled",
] as const;
export type MatchStatus = (typeof matchStatuses)[number];
export const awardTypes = ["season_mvp", "best_player", "revelation", "tournament_mvp"] as const;
export type AwardType = (typeof awardTypes)[number];

type Timestamps = Readonly<{ created_at: string; updated_at: string }>;

export type Season = Timestamps &
  Readonly<{
    id: string;
    name: string;
    slug: string;
    status: SeasonStatus;
    start_date: string;
    end_date: string;
  }>;
export type Player = Timestamps &
  Readonly<{
    id: string;
    display_name: string;
    real_name: string | null;
    nationality: string;
    country_code: string;
    avatar_url: string | null;
    handedness: Handedness | null;
    status: PlayerStatus;
  }>;
export type Tournament = Timestamps &
  Readonly<{
    id: string;
    name: string;
    short_name: string;
    logo_url: string | null;
    default_surface: Surface;
    category: TournamentCategory;
    status: TournamentStatus;
  }>;
export type TournamentEdition = Timestamps &
  Readonly<{
    id: string;
    tournament_id: string;
    season_id: string;
    name: string | null;
    surface: Surface;
    start_date: string;
    end_date: string;
    status: EditionStatus;
    draw_size: number;
    best_of: number;
  }>;
export type TournamentEntry = Readonly<{
  id: string;
  tournament_edition_id: string;
  player_id: string;
  seed: number | null;
  entry_status: EntryStatus;
  created_at: string;
}>;
export type Match = Timestamps &
  Readonly<{
    id: string;
    tournament_edition_id: string;
    round: TournamentRound;
    round_order: number;
    match_number: number;
    player1_id: string | null;
    player2_id: string | null;
    scheduled_at: string | null;
    status: MatchStatus;
    winner_id: string | null;
    next_match_id: string | null;
    next_slot: 1 | 2 | null;
    best_of: number;
  }>;
export type MatchSet = Timestamps &
  Readonly<{
    id: string;
    match_id: string;
    set_number: number;
    player1_score: number;
    player2_score: number;
  }>;
export type TournamentPointRule = Timestamps &
  Readonly<{
    id: string;
    category: TournamentCategory;
    round: TournamentRound;
    points: number;
  }>;
export type Award = Readonly<{
  id: string;
  season_id: string;
  tournament_edition_id: string | null;
  player_id: string;
  award_type: AwardType;
  title: string;
  description: string | null;
  created_at: string;
}>;

export type TennisSnapshot = Readonly<{
  seasons: readonly Season[];
  players: readonly Player[];
  tournaments: readonly Tournament[];
  editions: readonly TournamentEdition[];
  entries: readonly TournamentEntry[];
  matches: readonly Match[];
  sets: readonly MatchSet[];
  pointRules: readonly TournamentPointRule[];
  awards: readonly Award[];
}>;

export type TennisTable =
  | "seasons"
  | "players"
  | "tournaments"
  | "tournament_editions"
  | "tournament_entries"
  | "matches"
  | "match_sets"
  | "tournament_point_rules"
  | "awards";
export type MutationValue = string | number | boolean | null;
export type MutationPayload = Readonly<Record<string, MutationValue>>;

export const emptySnapshot: TennisSnapshot = {
  seasons: [],
  players: [],
  tournaments: [],
  editions: [],
  entries: [],
  matches: [],
  sets: [],
  pointRules: [],
  awards: [],
};

export const surfaceLabels: Readonly<Record<Surface, string>> = {
  hard: "Dura",
  clay: "Arcilla",
  grass: "Césped",
  indoor: "Indoor",
  custom: "Personalizada",
};
export const roundLabels: Readonly<Record<TournamentRound, string>> = {
  round_of_16: "Octavos",
  quarterfinal: "Cuartos",
  semifinal: "Semifinal",
  final: "Final",
};
