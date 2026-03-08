export interface Profile { id: string; username: string; display_name: string; }
export interface InfoDetails {
  url?: string;
  urls?: string[];
  activity_date?: string;
  activity_time?: string;
  location?: string;
}
export interface Task {
  id: string; title: string; section: string; assigned_to: string | null;
  backup_to: string | null; status: string; sort_order: number;
  voting_closed: boolean; progress: number; info_text: string | null;
  info_image_urls: string[]; info_details: InfoDetails;
  cost: number | null; paid_by: string | null;
  cost_split_among?: string[] | null;
}
export interface TravelLeg {
  id: string; passengers: string[]; departure_time: string | null;
  arrival_time: string | null; travel_date: string | null;
  note: string | null; sort_order: number;
}
export interface TaskVote { id: string; task_id: string; user_id: string; voted_for_user_id: string; }
export interface Reaction { id: string; user_id: string; section: string; emoji: string; }
export interface Comment { id: string; user_id: string; section: string; message: string; created_at: string; }

export const ALL_SECTIONS = ["transport", "accommodatie", "golf", "strand"];
export const SECTION_LABELS: Record<string, string> = {
  transport: "Vervoer",
  accommodatie: "Accommodatie",
  golf: "Golf",
  strand: "Strand & omgeving",
};
export const SECTION_CONTEXT: Record<string, string> = {
  transport: "Bekijk context & info",
  accommodatie: "Bekijk context & info",
  golf: "Bekijk context & info",
  strand: "Bekijk context & info",
};
