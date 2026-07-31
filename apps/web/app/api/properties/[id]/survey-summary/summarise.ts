/**
 * Rolls room-anchored assessments up into one picture of a property.
 *
 * A walkthrough now produces one survey per room, which answers "what is wrong
 * with the kitchen" but not "what is the state of this house". This is the
 * aggregation that answers the second question.
 *
 * The load-bearing decision: a property's condition is the LATEST survey per
 * room, not every survey ever taken. Film the kitchen three times and the
 * kitchen is however it looked the third time — counting all three would let
 * a fixed problem keep dragging the property's rating down forever.
 *
 * Pure and separate from `route.ts` (App Router route files may only export
 * handlers), which also makes the ranking rules directly testable.
 */

/** Severity values accepted by the building_assessments CHECK, worst last. */
const SEVERITY_RANK: Record<string, number> = {
  early: 1,
  developing: 2,
  significant: 3,
  dangerous: 4,
};

/**
 * Urgency values accepted by the CHECK, most pressing last. `monitor` and
 * `planned` are "later"; `needs_attention` sits above them but below anything
 * with a deadline.
 */
const URGENCY_RANK: Record<string, number> = {
  monitor: 1,
  planned: 2,
  needs_attention: 3,
  soon: 4,
  urgent: 5,
  immediate: 6,
  emergency: 7,
};

/** A room is "needing attention" from significant upwards. */
const NEEDS_ATTENTION_FROM = SEVERITY_RANK.significant!;

export interface SurveyRow {
  id: string;
  room_id: string | null;
  severity: string | null;
  urgency: string | null;
  damage_type: string | null;
  confidence: number | null;
  created_at: string | null;
}

export interface RoomRow {
  id: string;
  name: string;
  room_type: string;
}

export interface RoomSurveySummary {
  roomId: string;
  name: string;
  type: string;
  surveyCount: number;
  latest: {
    assessmentId: string;
    severity: string | null;
    urgency: string | null;
    damageType: string | null;
    confidence: number | null;
    createdAt: string | null;
  } | null;
}

export interface PropertySurveySummary {
  roomsTotal: number;
  roomsSurveyed: number;
  /** Surveys covering the whole property rather than one room. */
  propertyLevelSurveys: number;
  lastSurveyedAt: string | null;
  worstSeverity: string | null;
  mostUrgent: string | null;
  roomsNeedingAttention: number;
  rooms: RoomSurveySummary[];
}

function time(iso: string | null): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * @param rooms  every room on the property, so coverage counts unsurveyed ones
 * @param surveys assessments for the property, room-anchored or not
 */
export function summariseRoomSurveys(
  rooms: RoomRow[],
  surveys: SurveyRow[]
): PropertySurveySummary {
  const byRoom = new Map<string, SurveyRow[]>();
  let propertyLevelSurveys = 0;

  for (const survey of surveys) {
    // A survey whose room was deleted has room_id NULL (the FK is SET NULL, so
    // history outlives the room). It counts as property-level, not as a room
    // that was never filmed.
    if (!survey.room_id) {
      propertyLevelSurveys++;
      continue;
    }
    const list = byRoom.get(survey.room_id) ?? [];
    list.push(survey);
    byRoom.set(survey.room_id, list);
  }

  const roomSummaries: RoomSurveySummary[] = rooms.map((room) => {
    const forRoom = byRoom.get(room.id) ?? [];
    // Newest wins — see the note at the top about why this is not an average.
    const latest = forRoom.reduce<SurveyRow | null>(
      (best, s) =>
        !best || time(s.created_at) > time(best.created_at) ? s : best,
      null
    );

    return {
      roomId: room.id,
      name: room.name,
      type: room.room_type,
      surveyCount: forRoom.length,
      latest: latest
        ? {
            assessmentId: latest.id,
            severity: latest.severity,
            urgency: latest.urgency,
            damageType: latest.damage_type,
            confidence: latest.confidence,
            createdAt: latest.created_at,
          }
        : null,
    };
  });

  const surveyed = roomSummaries.filter((r) => r.latest !== null);

  let worstSeverity: string | null = null;
  let worstRank = 0;
  let mostUrgent: string | null = null;
  let urgentRank = 0;
  let roomsNeedingAttention = 0;

  for (const room of surveyed) {
    const sev = room.latest?.severity ?? null;
    const rank = sev ? (SEVERITY_RANK[sev] ?? 0) : 0;
    if (rank > worstRank) {
      worstRank = rank;
      worstSeverity = sev;
    }
    if (rank >= NEEDS_ATTENTION_FROM) roomsNeedingAttention++;

    const urg = room.latest?.urgency ?? null;
    const uRank = urg ? (URGENCY_RANK[urg] ?? 0) : 0;
    if (uRank > urgentRank) {
      urgentRank = uRank;
      mostUrgent = urg;
    }
  }

  // Newest survey anywhere on the property, room-anchored or not.
  const lastSurveyedAtMs = surveys.reduce((max, s) => {
    const t = time(s.created_at);
    return t > max ? t : max;
  }, 0);

  return {
    roomsTotal: rooms.length,
    roomsSurveyed: surveyed.length,
    propertyLevelSurveys,
    lastSurveyedAt:
      lastSurveyedAtMs > 0 ? new Date(lastSurveyedAtMs).toISOString() : null,
    worstSeverity,
    mostUrgent,
    roomsNeedingAttention,
    rooms: roomSummaries,
  };
}
