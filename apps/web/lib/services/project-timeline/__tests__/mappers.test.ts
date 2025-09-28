import { mapMilestoneFromRow, mapNoteFromRow, mapTemplateFromRow, mapMilestoneTemplateFromRow } from '../mappers';
import type { MilestoneNoteRow, MilestoneTemplateRow, ProjectMilestoneRow, TimelineTemplateRow } from '../types';

describe('project-timeline mappers', () => {
  test('mapMilestoneFromRow maps nullables to undefined', () => {
    const row: ProjectMilestoneRow = {
      id: 'm1', timeline_id: 't1', job_id: 'j1', title: 'Milestone', description: null,
      target_date: new Date().toISOString(), completed_date: null, status: 'pending', priority: 'medium', type: 'task',
      assigned_to: null, estimated_hours: null, actual_hours: null, payment_amount: null, dependencies: null,
      created_by: 'u1', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), users: null
    };
    const mapped = mapMilestoneFromRow(row);
    expect(mapped.description).toBeUndefined();
    expect(mapped.completedDate).toBeUndefined();
    expect(mapped.assignee).toBeUndefined();
  });

  test('mapNoteFromRow maps author', () => {
    const row: MilestoneNoteRow = {
      id: 'n1', milestone_id: 'm1', content: 'c', type: 'update', visibility: 'public', author_id: 'u1',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      users: { id: 'u1', first_name: 'A', last_name: 'B', email: 'a@b.com' }
    };
    const mapped = mapNoteFromRow(row);
    expect(mapped.author?.id).toBe('u1');
  });

  test('mapTemplateFromRow maps nested milestone templates', () => {
    const tpl: TimelineTemplateRow = {
      id: 'tpl', name: 'Template', description: 'd', category: 'general', estimated_duration: 10,
      created_by: 'u1', is_public: true, usage_count: 0, rating: 5, created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(), milestone_templates: []
    };
    const mapped = mapTemplateFromRow(tpl);
    expect(mapped.name).toBe('Template');
    expect(mapped.milestoneTemplates?.length).toBe(0);
  });

  test('mapMilestoneTemplateFromRow maps fields correctly', () => {
    const mt: MilestoneTemplateRow = {
      id: 'mt1', template_id: 'tpl', title: 'T', description: null, type: 'task', priority: 'medium',
      day_offset: 3, estimated_hours: null, payment_percentage: null, dependencies: null, is_required: false, order: 1,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    };
    const mapped = mapMilestoneTemplateFromRow(mt);
    expect(mapped.dayOffset).toBe(3);
    expect(mapped.description).toBeUndefined();
  });
});


