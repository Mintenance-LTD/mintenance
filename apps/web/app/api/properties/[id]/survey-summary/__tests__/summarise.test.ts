// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import {
  summariseRoomSurveys,
  type RoomRow,
  type SurveyRow,
} from '../summarise';

const room = (id: string, name: string, type = 'bedroom'): RoomRow => ({
  id,
  name,
  room_type: type,
});

const survey = (
  over: Partial<SurveyRow> & { id: string; created_at: string }
): SurveyRow => ({
  room_id: null,
  severity: 'early',
  urgency: 'monitor',
  damage_type: 'damp',
  confidence: 0.7,
  ...over,
});

describe('summariseRoomSurveys — latest wins', () => {
  it('takes the newest survey per room, not the worst one ever recorded', () => {
    const rooms = [room('r1', 'Kitchen', 'kitchen')];
    const surveys = [
      survey({
        id: 'old',
        room_id: 'r1',
        severity: 'dangerous',
        created_at: '2026-01-01T00:00:00Z',
      }),
      survey({
        id: 'new',
        room_id: 'r1',
        severity: 'early',
        created_at: '2026-06-01T00:00:00Z',
      }),
    ];

    const out = summariseRoomSurveys(rooms, surveys);

    // A fixed problem must stop dragging the property down.
    expect(out.rooms[0]!.latest?.assessmentId).toBe('new');
    expect(out.worstSeverity).toBe('early');
    expect(out.roomsNeedingAttention).toBe(0);
    expect(out.rooms[0]!.surveyCount).toBe(2);
  });

  it('is not fooled by the order rows arrive in', () => {
    const rooms = [room('r1', 'Kitchen')];
    const out = summariseRoomSurveys(rooms, [
      survey({
        id: 'new',
        room_id: 'r1',
        severity: 'early',
        created_at: '2026-06-01T00:00:00Z',
      }),
      survey({
        id: 'old',
        room_id: 'r1',
        severity: 'dangerous',
        created_at: '2026-01-01T00:00:00Z',
      }),
    ]);
    expect(out.rooms[0]!.latest?.assessmentId).toBe('new');
  });
});

describe('summariseRoomSurveys — property picture', () => {
  const rooms = [
    room('r1', 'Kitchen', 'kitchen'),
    room('r2', 'Bathroom', 'bathroom'),
    room('r3', 'Bedroom'),
  ];

  it('reports coverage over every room, including unfilmed ones', () => {
    const out = summariseRoomSurveys(rooms, [
      survey({ id: 'a', room_id: 'r1', created_at: '2026-06-01T00:00:00Z' }),
    ]);
    expect(out.roomsTotal).toBe(3);
    expect(out.roomsSurveyed).toBe(1);
    expect(out.rooms.find((r) => r.roomId === 'r3')?.latest).toBeNull();
  });

  it('surfaces the worst severity and the most pressing urgency across rooms', () => {
    const out = summariseRoomSurveys(rooms, [
      survey({
        id: 'a',
        room_id: 'r1',
        severity: 'developing',
        urgency: 'soon',
        created_at: '2026-06-01T00:00:00Z',
      }),
      survey({
        id: 'b',
        room_id: 'r2',
        severity: 'dangerous',
        urgency: 'emergency',
        created_at: '2026-06-02T00:00:00Z',
      }),
    ]);
    expect(out.worstSeverity).toBe('dangerous');
    expect(out.mostUrgent).toBe('emergency');
    expect(out.roomsNeedingAttention).toBe(1);
  });

  it('counts significant and dangerous as needing attention, milder ones not', () => {
    const out = summariseRoomSurveys(rooms, [
      survey({
        id: 'a',
        room_id: 'r1',
        severity: 'significant',
        created_at: '2026-06-01T00:00:00Z',
      }),
      survey({
        id: 'b',
        room_id: 'r2',
        severity: 'dangerous',
        created_at: '2026-06-01T00:00:00Z',
      }),
      survey({
        id: 'c',
        room_id: 'r3',
        severity: 'developing',
        created_at: '2026-06-01T00:00:00Z',
      }),
    ]);
    expect(out.roomsNeedingAttention).toBe(2);
  });

  it('treats a survey with no room as property-level, not an unfilmed room', () => {
    const out = summariseRoomSurveys(rooms, [
      survey({
        id: 'whole-house',
        room_id: null,
        created_at: '2026-06-01T00:00:00Z',
      }),
    ]);
    expect(out.propertyLevelSurveys).toBe(1);
    expect(out.roomsSurveyed).toBe(0);
  });

  it('still counts a survey whose room was deleted', () => {
    // The FK is ON DELETE SET NULL, so history outlives the room and the row
    // arrives here with room_id null.
    const out = summariseRoomSurveys(rooms, [
      survey({
        id: 'orphan',
        room_id: null,
        created_at: '2026-06-01T00:00:00Z',
      }),
    ]);
    expect(out.propertyLevelSurveys).toBe(1);
    expect(out.lastSurveyedAt).toBe('2026-06-01T00:00:00.000Z');
  });

  it('reports the newest survey date anywhere on the property', () => {
    const out = summariseRoomSurveys(rooms, [
      survey({ id: 'a', room_id: 'r1', created_at: '2026-06-01T00:00:00Z' }),
      survey({ id: 'b', room_id: null, created_at: '2026-09-09T00:00:00Z' }),
    ]);
    expect(out.lastSurveyedAt).toBe('2026-09-09T00:00:00.000Z');
  });
});

describe('summariseRoomSurveys — degenerate input', () => {
  it('handles a property with no rooms and no surveys', () => {
    const out = summariseRoomSurveys([], []);
    expect(out).toMatchObject({
      roomsTotal: 0,
      roomsSurveyed: 0,
      propertyLevelSurveys: 0,
      lastSurveyedAt: null,
      worstSeverity: null,
      mostUrgent: null,
      roomsNeedingAttention: 0,
    });
  });

  it('does not crash on unknown or missing severity and urgency values', () => {
    const out = summariseRoomSurveys(
      [room('r1', 'Kitchen')],
      [
        survey({
          id: 'a',
          room_id: 'r1',
          severity: 'not-a-real-severity',
          urgency: null,
          created_at: '2026-06-01T00:00:00Z',
        }),
      ]
    );
    expect(out.roomsSurveyed).toBe(1);
    // An unrecognised severity ranks 0, so it never becomes "the worst".
    expect(out.worstSeverity).toBeNull();
    expect(out.roomsNeedingAttention).toBe(0);
  });

  it('survives an unparseable created_at without losing the room', () => {
    const out = summariseRoomSurveys(
      [room('r1', 'Kitchen')],
      [survey({ id: 'a', room_id: 'r1', created_at: 'not a date' })]
    );
    expect(out.roomsSurveyed).toBe(1);
    expect(out.lastSurveyedAt).toBeNull();
  });
});
