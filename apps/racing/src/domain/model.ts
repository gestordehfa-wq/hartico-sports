export const seasonStatuses = ["draft", "active", "completed", "archived"] as const;
export type SeasonStatus = (typeof seasonStatuses)[number];

export const driverStatuses = ["active", "inactive", "retired"] as const;
export type DriverStatus = (typeof driverStatuses)[number];

export const teamStatuses = ["active", "inactive", "archived"] as const;
export type TeamStatus = (typeof teamStatuses)[number];

export const entryRoles = ["primary", "reserve", "substitute"] as const;
export type EntryRole = (typeof entryRoles)[number];
export const entryStatuses = ["active", "withdrawn", "completed"] as const;
export type EntryStatus = (typeof entryStatuses)[number];

export const circuitStatuses = ["active", "inactive", "archived"] as const;
export type CircuitStatus = (typeof circuitStatuses)[number];
export const grandPrixStatuses = [
  "scheduled",
  "active",
  "completed",
  "cancelled",
  "postponed",
] as const;
export type GrandPrixStatus = (typeof grandPrixStatuses)[number];

export const attemptStatuses = ["valid", "invalid", "not_recorded"] as const;
export type AttemptStatus = (typeof attemptStatuses)[number];

export const raceResultStatuses = ["finished", "dnf", "dns", "dsq"] as const;
export type RaceResultStatus = (typeof raceResultStatuses)[number];

type Timestamps = Readonly<{ created_at: string; updated_at: string }>;

export type Season = Timestamps &
  Readonly<{
    id: string;
    name: string;
    slug: string;
    year: number | null;
    status: SeasonStatus;
    start_date: string;
    end_date: string;
  }>;

export type Driver = Timestamps &
  Readonly<{
    id: string;
    display_name: string;
    real_name: string | null;
    nationality: string;
    country_code: string;
    racing_number: number | null;
    avatar_url: string | null;
    date_of_birth: string | null;
    status: DriverStatus;
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
    primary_color: string | null;
    secondary_color: string | null;
    status: TeamStatus;
  }>;

export type SeasonDriverEntry = Readonly<{
  id: string;
  season_id: string;
  driver_id: string;
  team_id: string;
  racing_number: number | null;
  role: EntryRole;
  status: EntryStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}>;

export type Circuit = Timestamps &
  Readonly<{
    id: string;
    name: string;
    slug: string;
    short_name: string | null;
    country: string;
    country_code: string;
    city: string | null;
    image_url: string | null;
    length_km: number | null;
    default_laps: number;
    status: CircuitStatus;
  }>;

export type GrandPrixEvent = Timestamps &
  Readonly<{
    id: string;
    season_id: string;
    circuit_id: string;
    name: string;
    slug: string;
    round_number: number;
    scheduled_date: string;
    race_laps: number | null;
    status: GrandPrixStatus;
  }>;

export type PointsScaleEntry = Timestamps &
  Readonly<{ id: string; season_id: string; race_position: number; points: number }>;

export type QualifyingResult = Timestamps &
  Readonly<{
    id: string;
    grand_prix_id: string;
    driver_id: string;
    team_id: string;
    attempt_1_status: AttemptStatus;
    attempt_1_ms: number | null;
    attempt_2_status: AttemptStatus;
    attempt_2_ms: number | null;
    best_time_ms: number | null;
  }>;

export type RaceResult = Timestamps &
  Readonly<{
    id: string;
    grand_prix_id: string;
    driver_id: string;
    team_id: string;
    grid_position: number | null;
    status: RaceResultStatus;
    final_position: number | null;
    laps_completed: number;
    total_time_ms: number | null;
    pit_stop_completed: boolean;
    pit_stop_lap: number | null;
    pit_resolution_note: string | null;
    points: number | null;
  }>;

export type ResultConfirmation = Readonly<{
  id: string;
  grand_prix_id: string;
  confirmed_at: string;
}>;

export type RacingSnapshot = Readonly<{
  seasons: readonly Season[];
  drivers: readonly Driver[];
  teams: readonly Team[];
  entries: readonly SeasonDriverEntry[];
  circuits: readonly Circuit[];
  grandPrix: readonly GrandPrixEvent[];
  pointsScale: readonly PointsScaleEntry[];
  qualifying: readonly QualifyingResult[];
  raceResults: readonly RaceResult[];
  confirmations: readonly ResultConfirmation[];
}>;

export type RacingTable =
  | "seasons"
  | "drivers"
  | "teams"
  | "season_driver_entries"
  | "circuits"
  | "grand_prix_events"
  | "points_scale"
  | "qualifying_results"
  | "race_results";

export type MutationValue = string | number | boolean | null;
export type MutationPayload = Readonly<Record<string, MutationValue>>;

export const emptySnapshot: RacingSnapshot = {
  seasons: [],
  drivers: [],
  teams: [],
  entries: [],
  circuits: [],
  grandPrix: [],
  pointsScale: [],
  qualifying: [],
  raceResults: [],
  confirmations: [],
};
