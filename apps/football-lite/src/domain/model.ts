export const seasonStatuses = ["draft", "active", "completed", "archived"] as const;
export type SeasonStatus = (typeof seasonStatuses)[number];

export const competitionTypes = ["league", "cup", "supercup"] as const;
export type CompetitionType = (typeof competitionTypes)[number];
export const competitionStatuses = ["draft", "active", "completed", "archived"] as const;
export type CompetitionStatus = (typeof competitionStatuses)[number];

export const knockoutStages = ["round_of_16", "quarterfinal", "semifinal", "final", "supercup"] as const;
export type KnockoutStage = (typeof knockoutStages)[number];
export const legOptions = [1, 2] as const;
export type Legs = (typeof legOptions)[number];

export const entityStatuses = ["active", "inactive", "archived"] as const;
export type EntityStatus = (typeof entityStatuses)[number];
export const playerPositions = ["POR", "DEF", "MED", "ATK"] as const;
export type PlayerPosition = (typeof playerPositions)[number];

export const rosterRoles = ["player", "captain", "loan"] as const;
export type RosterRole = (typeof rosterRoles)[number];
export const rosterStatuses = ["active", "completed", "released"] as const;
export type RosterStatus = (typeof rosterStatuses)[number];

export const matchStatuses = ["scheduled", "live", "finished", "postponed", "cancelled"] as const;
export type MatchStatus = (typeof matchStatuses)[number];
export const eventTypes = ["goal", "assist", "yellow_card", "red_card", "own_goal"] as const;
export type MatchEventType = (typeof eventTypes)[number];
export const awardTypes = ["champion", "top_scorer", "top_assister", "best_player"] as const;
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

export type Competition = Timestamps &
  Readonly<{
    id: string;
    season_id: string;
    name: string;
    short_name: string;
    type: CompetitionType;
    status: CompetitionStatus;
    logo_url: string | null;
    /** Liga: 1 = una vuelta, 2 = ida y vuelta. */
    legs: Legs;
    champion_team_id: string | null;
    /** Solo Supercopa: competiciones cuyos campeones se enfrentan. */
    source_league_id: string | null;
    source_cup_id: string | null;
  }>;

export type CompetitionTeam = Readonly<{
  id: string;
  competition_id: string;
  team_id: string;
  seed: number | null;
  created_at: string;
}>;

export type Team = Timestamps &
  Readonly<{
    id: string;
    name: string;
    short_name: string;
    code: string;
    country: string;
    country_code: string;
    logo_url: string | null;
    status: EntityStatus;
  }>;

export type Player = Timestamps &
  Readonly<{
    id: string;
    display_name: string;
    real_name: string | null;
    nationality: string;
    country_code: string;
    position: PlayerPosition;
    avatar_url: string | null;
    status: EntityStatus;
  }>;

export type SeasonPlayerRoster = Timestamps &
  Readonly<{
    id: string;
    season_id: string;
    player_id: string;
    team_id: string;
    start_date: string | null;
    end_date: string | null;
    role: RosterRole;
    status: RosterStatus;
  }>;

export type Match = Timestamps &
  Readonly<{
    id: string;
    competition_id: string;
    season_id: string;
    /** Nulo en rondas de copa aún sin rival. */
    home_team_id: string | null;
    away_team_id: string | null;
    matchday: number | null;
    scheduled_at: string;
    status: MatchStatus;
    home_score: number | null;
    away_score: number | null;
    referee_name: string | null;
    stage: KnockoutStage | null;
    round_order: number | null;
    match_number: number | null;
    next_match_id: string | null;
    next_slot: 1 | 2 | null;
    winner_team_id: string | null;
    tiebreak_note: string | null;
  }>;

export type MatchEvent = Readonly<{
  id: string;
  match_id: string;
  player_id: string;
  team_id: string;
  event_type: MatchEventType;
  minute: number | null;
  related_player_id: string | null;
  created_at: string;
}>;

export type MatchPlayerAppearance = Readonly<{
  id: string;
  match_id: string;
  player_id: string;
  team_id: string;
  starter: boolean;
  created_at: string;
}>;

export type Award = Readonly<{
  id: string;
  season_id: string;
  competition_id: string | null;
  award_type: AwardType;
  player_id: string | null;
  team_id: string | null;
  title: string;
  description: string | null;
  created_at: string;
}>;

export type FootballSnapshot = Readonly<{
  seasons: readonly Season[];
  competitions: readonly Competition[];
  teams: readonly Team[];
  players: readonly Player[];
  rosters: readonly SeasonPlayerRoster[];
  competitionTeams: readonly CompetitionTeam[];
  matches: readonly Match[];
  events: readonly MatchEvent[];
  appearances: readonly MatchPlayerAppearance[];
  awards: readonly Award[];
}>;

export type FootballTable =
  | "seasons"
  | "competitions"
  | "teams"
  | "players"
  | "season_player_rosters"
  | "competition_teams"
  | "matches"
  | "match_events"
  | "match_player_appearances"
  | "awards";
export type MutationValue = string | number | boolean | null;
export type MutationPayload = Readonly<Record<string, MutationValue>>;

export const emptySnapshot: FootballSnapshot = {
  seasons: [],
  competitions: [],
  teams: [],
  players: [],
  rosters: [],
  competitionTeams: [],
  matches: [],
  events: [],
  appearances: [],
  awards: [],
};
