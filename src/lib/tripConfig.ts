/**
 * Trip Configuration
 *
 * Centraal config-object dat alle trip-type-specifieke labels, categorieën,
 * vereisten en vote-topics bevat. Momenteel hardcoded voor "golf",
 * maar voorbereid om later per trip-type te switchen.
 */

export interface RequirementDef {
  key: string;               // maps to submission field: require_<key>
  submissionField: string;    // exact field name on Submission
  label: string;
  emoji?: string;
}

export interface PriorityDef {
  key: string;               // maps to submission field: points_<key>
  submissionField: string;    // exact field name on Submission
  label: string;
  emoji: string;
  maxPoints: number;
}

export interface VoteTopicOption {
  value: string;
  label: string;
}

export interface VoteTopicDef {
  key: string;
  submissionField: string;
  label: string;
  options: VoteTopicOption[];
}

export interface TravelTimeDef {
  key: string;
  submissionField: string;
  label: string;
  emoji: string;
  unit: string;
}

export interface PointOfInterest {
  name: string;
  emoji?: string;
  url?: string;
  description?: string;
  /** Travel times from location labels (accommodation locations) in minutes */
  travelTimes: Record<string, number>;
}

export interface POICategoryDef {
  key: string;
  label: string;
  emoji: string;
  /** Color thresholds: [good, ok] in minutes. ≤good=green, ≤ok=yellow, >ok=red */
  colorThresholds: [number, number];
  pois: PointOfInterest[];
}

export interface TripConfig {
  type: string;
  name: string;
  /** Requirements voters can toggle as must-haves */
  requirements: RequirementDef[];
  /** Priority axes for the dilemma game */
  priorities: PriorityDef[];
  /** Multi-choice vote topics (vervoer, locatie, etc.) */
  voteTopics: VoteTopicDef[];
  /** Travel time constraint (e.g. max golf minutes) */
  travelTime: TravelTimeDef | null;
  /** Field for preferred rounds/sessions */
  roundsField: { submissionField: string; label: string; options: number[] } | null;
  /** Points of interest with travel time matrix */
  poiCategories: POICategoryDef[];
}

// ─── GOLF TRIP CONFIG ───────────────────────────────────────────────
export const golfTripConfig: TripConfig = {
  type: "golf",
  name: "Golfreis",

  requirements: [
    { key: "fixed_beds", submissionField: "require_fixed_beds", label: "Vaste bedden", emoji: "🛏️" },
    { key: "bedrooms_3", submissionField: "require_bedrooms_3", label: "3 slaapkamers", emoji: "🚪" },
    { key: "cancelable", submissionField: "require_cancelable", label: "Annuleerbaar", emoji: "🔄" },
    { key: "transparent_price", submissionField: "require_transparent_price", label: "Transparante prijs", emoji: "💶" },
    { key: "pool", submissionField: "require_pool", label: "Zwembad", emoji: "🏊" },
    { key: "airco", submissionField: "require_airco", label: "Airco", emoji: "❄️" },
    { key: "wifi", submissionField: "require_wifi", label: "Wifi", emoji: "📶" },
    { key: "parking", submissionField: "require_parking", label: "Parking", emoji: "🅿️" },
    { key: "terrace", submissionField: "require_terrace", label: "Terras", emoji: "☀️" },
  ],

  priorities: [
    { key: "luxury", submissionField: "points_luxury", label: "Luxe", emoji: "✨", maxPoints: 25 },
    { key: "golf_ease", submissionField: "points_golf_ease", label: "Golf", emoji: "⛳", maxPoints: 25 },
    { key: "beach_life", submissionField: "points_beach_life", label: "Strand", emoji: "🏖️", maxPoints: 25 },
    { key: "low_hassle", submissionField: "points_low_hassle", label: "Gedoe ↓", emoji: "🧘", maxPoints: 25 },
    { key: "exploring", submissionField: "points_exploring", label: "Omgeving", emoji: "🗺️", maxPoints: 25 },
    { key: "budget", submissionField: "points_budget", label: "Budget", emoji: "💰", maxPoints: 25 },
  ],

  voteTopics: [
    {
      key: "rounds",
      submissionField: "preferred_rounds",
      label: "Rondes",
      options: [
        { value: "2", label: "2 rondes" },
        { value: "3", label: "3 rondes" },
      ],
    },
    {
      key: "mobility",
      submissionField: "mobility_choice",
      label: "Vervoer",
      options: [
        { value: "car", label: "Auto huren" },
        { value: "transfers", label: "Taxi/transfer" },
        { value: "neutral", label: "Neutraal" },
      ],
    },
    {
      key: "base",
      submissionField: "base_choice",
      label: "Locatie",
      options: [
        { value: "beach", label: "🏖️ Strand" },
        { value: "golf", label: "⛳ Golf" },
        { value: "neutral", label: "Neutraal" },
      ],
    },
  ],

  travelTime: {
    key: "max_golf_minutes",
    submissionField: "max_golf_minutes",
    label: "Golf reistijd",
    emoji: "⛳",
    unit: "min",
  },

  roundsField: {
    submissionField: "preferred_rounds",
    label: "Rondes",
    options: [2, 3],
  },

  poiCategories: [
    {
      key: "golf",
      label: "Golfbanen",
      emoji: "⛳",
      colorThresholds: [15, 25],
      pois: [
        {
          name: "La Cala Golf & Country Club",
          emoji: "⛳",
          url: "https://www.lacala.com",
          description: "3 banen van 18 holes",
          travelTimes: { "Fuengirola": 27, "La Cala de Mijas": 12, "Calahonda": 8, "Mijas": 20, "Torremolinos": 35 },
        },
        {
          name: "Chaparral Golf Club",
          emoji: "⛳",
          url: "https://golfelchaparral.com/en/",
          description: "Direct bij het strand. Green fee €80–€110",
          travelTimes: { "Fuengirola": 15, "La Cala de Mijas": 8, "Calahonda": 5, "Mijas": 18, "Torremolinos": 25 },
        },
        {
          name: "Santana Golf",
          emoji: "⛳",
          url: "https://santanagolf.com",
          description: "Par 72, goed onderhouden",
          travelTimes: { "Fuengirola": 20, "La Cala de Mijas": 10, "Calahonda": 12, "Mijas": 15, "Torremolinos": 30 },
        },
        {
          name: "Calanova Golf Club",
          emoji: "⛳",
          url: "https://calanovagolf.es",
          description: "18 holes, par 72",
          travelTimes: { "Fuengirola": 25, "La Cala de Mijas": 18, "Calahonda": 15, "Mijas": 10, "Torremolinos": 35 },
        },
        {
          name: "Miraflores Golf Club",
          emoji: "⛳",
          url: "https://www.mirafloresgolf.es",
          description: "18 holes, heuvels van Calahonda",
          travelTimes: { "Fuengirola": 20, "La Cala de Mijas": 10, "Calahonda": 5, "Mijas": 22, "Torremolinos": 30 },
        },
      ],
    },
  ],
};

// ─── Get config for current trip (for now always golf) ──────────────
export function getTripConfig(_tripType?: string): TripConfig {
  // Later: switch on tripType
  return golfTripConfig;
}
