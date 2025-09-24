import { supabase } from '../../config/supabase';

export interface DigitalChecklist {
  id: string;
  template_id: string;
  checklist_name: string;
  description?: string;
  category?: string;
  is_required: boolean;
  pass_fail_scoring: boolean;
  weighted_scoring: boolean;
  checklist_items: any[];
  scoring_rules?: any;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  item_text: string;
  item_type: 'check' | 'text' | 'numeric' | 'photo' | 'signature';
  is_required: boolean;
  weight?: number;
  pass_criteria?: any;
  help_text?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ChecklistCompletion {
  id: string;
  job_sheet_id: string;
  checklist_id: string;
  completed_by: string;
  completion_data: any;
  score?: number;
  passed: boolean;
  notes?: string;
  completed_at: string;
  created_at: string;
}

export class DigitalChecklistService {
  static async createDigitalChecklist(
    templateId: string,
    checklistData: Omit<
      DigitalChecklist,
      'id' | 'template_id' | 'usage_count' | 'created_at' | 'updated_at'
    >
  ): Promise<DigitalChecklist> {
    try {
      const { data, error } = await supabase
        .from('digital_checklists')
        .insert({
          template_id: templateId,
          ...checklistData,
          usage_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating digital checklist:', error);
      throw new Error('Failed to create digital checklist');
    }
  }

  static async getDigitalChecklists(templateId: string): Promise<DigitalChecklist[]> {
    try {
      const { data, error } = await supabase
        .from('digital_checklists')
        .select('*')
        .eq('template_id', templateId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching digital checklists:', error);
      throw new Error('Failed to fetch digital checklists');
    }
  }

  static async getDigitalChecklist(checklistId: string): Promise<DigitalChecklist | null> {
    try {
      const { data, error } = await supabase
        .from('digital_checklists')
        .select('*')
        .eq('id', checklistId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching digital checklist:', error);
      throw new Error('Failed to fetch digital checklist');
    }
  }

  static async updateDigitalChecklist(
    checklistId: string,
    checklistData: Partial<DigitalChecklist>
  ): Promise<DigitalChecklist> {
    try {
      const { data, error } = await supabase
        .from('digital_checklists')
        .update({
          ...checklistData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', checklistId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating digital checklist:', error);
      throw new Error('Failed to update digital checklist');
    }
  }

  static async deleteDigitalChecklist(checklistId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('digital_checklists')
        .delete()
        .eq('id', checklistId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting digital checklist:', error);
      throw new Error('Failed to delete digital checklist');
    }
  }

  static async addChecklistItem(
    checklistId: string,
    itemData: Omit<ChecklistItem, 'id' | 'checklist_id' | 'created_at' | 'updated_at'>
  ): Promise<ChecklistItem> {
    try {
      const { data, error } = await supabase
        .from('checklist_items')
        .insert({
          checklist_id: checklistId,
          ...itemData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding checklist item:', error);
      throw new Error('Failed to add checklist item');
    }
  }

  static async getChecklistItems(checklistId: string): Promise<ChecklistItem[]> {
    try {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('checklist_id', checklistId)
        .order('sort_order');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching checklist items:', error);
      throw new Error('Failed to fetch checklist items');
    }
  }

  static async updateChecklistItem(
    itemId: string,
    itemData: Partial<ChecklistItem>
  ): Promise<ChecklistItem> {
    try {
      const { data, error } = await supabase
        .from('checklist_items')
        .update({
          ...itemData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating checklist item:', error);
      throw new Error('Failed to update checklist item');
    }
  }

  static async deleteChecklistItem(itemId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('checklist_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting checklist item:', error);
      throw new Error('Failed to delete checklist item');
    }
  }

  static async completeChecklist(
    jobSheetId: string,
    checklistId: string,
    completedBy: string,
    completionData: any,
    notes?: string
  ): Promise<ChecklistCompletion> {
    try {
      // Get checklist details for scoring
      const checklist = await this.getDigitalChecklist(checklistId);
      if (!checklist) throw new Error('Checklist not found');

      const items = await this.getChecklistItems(checklistId);

      // Calculate score and pass/fail
      const { score, passed } = this.calculateChecklistScore(
        completionData,
        items,
        checklist
      );

      const { data, error } = await supabase
        .from('checklist_completions')
        .insert({
          job_sheet_id: jobSheetId,
          checklist_id: checklistId,
          completed_by: completedBy,
          completion_data: completionData,
          score: score,
          passed: passed,
          notes: notes,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Update usage count
      await supabase
        .from('digital_checklists')
        .update({
          usage_count: checklist.usage_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', checklistId);

      return data;
    } catch (error) {
      console.error('Error completing checklist:', error);
      throw new Error('Failed to complete checklist');
    }
  }

  static async getChecklistCompletions(jobSheetId: string): Promise<ChecklistCompletion[]> {
    try {
      const { data, error } = await supabase
        .from('checklist_completions')
        .select(`
          *,
          digital_checklists:checklist_id (
            checklist_name,
            category
          )
        `)
        .eq('job_sheet_id', jobSheetId)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching checklist completions:', error);
      throw new Error('Failed to fetch checklist completions');
    }
  }

  static calculateChecklistScore(
    completionData: any,
    items: ChecklistItem[],
    checklist: DigitalChecklist
  ): { score: number; passed: boolean } {
    if (checklist.pass_fail_scoring) {
      // Simple pass/fail scoring
      const completedItems = items.filter(item => {
        const value = completionData[item.id];
        return value !== undefined && value !== null && value !== '';
      });

      const requiredItems = items.filter(item => item.is_required);
      const requiredCompleted = requiredItems.filter(item => {
        const value = completionData[item.id];
        return value !== undefined && value !== null && value !== '';
      });

      const passed = requiredCompleted.length === requiredItems.length;
      const score = (completedItems.length / items.length) * 100;

      return { score, passed };
    } else if (checklist.weighted_scoring) {
      // Weighted scoring
      let totalWeight = 0;
      let achievedWeight = 0;

      for (const item of items) {
        const weight = item.weight || 1;
        totalWeight += weight;

        const value = completionData[item.id];
        if (value !== undefined && value !== null && value !== '') {
          achievedWeight += weight;
        }
      }

      const score = totalWeight > 0 ? (achievedWeight / totalWeight) * 100 : 0;
      const passed = score >= (checklist.scoring_rules?.pass_threshold || 80);

      return { score, passed };
    } else {
      // Simple percentage scoring
      const completedItems = items.filter(item => {
        const value = completionData[item.id];
        return value !== undefined && value !== null && value !== '';
      });

      const score = items.length > 0 ? (completedItems.length / items.length) * 100 : 0;
      const passed = score >= (checklist.scoring_rules?.pass_threshold || 80);

      return { score, passed };
    }
  }

  static async duplicateChecklist(
    checklistId: string,
    newName?: string
  ): Promise<DigitalChecklist> {
    try {
      const originalChecklist = await this.getDigitalChecklist(checklistId);
      if (!originalChecklist) throw new Error('Checklist not found');

      const items = await this.getChecklistItems(checklistId);

      // Create new checklist
      const newChecklist = await this.createDigitalChecklist(
        originalChecklist.template_id,
        {
          checklist_name: newName || `${originalChecklist.checklist_name} (Copy)`,
          description: originalChecklist.description,
          category: originalChecklist.category,
          is_required: originalChecklist.is_required,
          pass_fail_scoring: originalChecklist.pass_fail_scoring,
          weighted_scoring: originalChecklist.weighted_scoring,
          checklist_items: originalChecklist.checklist_items,
          scoring_rules: originalChecklist.scoring_rules,
        }
      );

      // Copy items
      for (const item of items) {
        await this.addChecklistItem(newChecklist.id, {
          item_text: item.item_text,
          item_type: item.item_type,
          is_required: item.is_required,
          weight: item.weight,
          pass_criteria: item.pass_criteria,
          help_text: item.help_text,
          sort_order: item.sort_order,
        });
      }

      return newChecklist;
    } catch (error) {
      console.error('Error duplicating checklist:', error);
      throw new Error('Failed to duplicate checklist');
    }
  }
}