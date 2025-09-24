/**
 * ClientValidationService
 * 
 * Handles validation logic for client creation, updates, and business rules.
 */

import {
  CreateClientRequest,
  UpdateClientRequest,
  Client,
} from './types';

export class ClientValidationService {
  /**
   * Validate a create client request
   */
  async validateCreateClientRequest(request: CreateClientRequest): Promise<void> {
    const errors: string[] = [];

    // Validate required fields
    if (!request.contractorId) {
      errors.push('Contractor ID is required');
    }

    if (!request.firstName || request.firstName.trim().length === 0) {
      errors.push('First name is required');
    }

    if (!request.lastName || request.lastName.trim().length === 0) {
      errors.push('Last name is required');
    }

    if (!request.email || request.email.trim().length === 0) {
      errors.push('Email is required');
    }

    if (!request.type) {
      errors.push('Client type is required');
    }

    if (!request.source || request.source.trim().length === 0) {
      errors.push('Source is required');
    }

    // Validate email format
    if (request.email && !this.isValidEmail(request.email)) {
      errors.push('Invalid email format');
    }

    // Validate phone format if provided
    if (request.phone && !this.isValidPhone(request.phone)) {
      errors.push('Invalid phone number format');
    }

    // Validate address
    if (!request.address) {
      errors.push('Address is required');
    } else {
      this.validateAddress(request.address, errors);
    }

    // Validate name lengths
    if (request.firstName && request.firstName.length > 50) {
      errors.push('First name must be 50 characters or less');
    }

    if (request.lastName && request.lastName.length > 50) {
      errors.push('Last name must be 50 characters or less');
    }

    if (request.companyName && request.companyName.length > 100) {
      errors.push('Company name must be 100 characters or less');
    }

    // Validate tags
    if (request.tags && request.tags.length > 10) {
      errors.push('Maximum 10 tags allowed');
    }

    if (request.tags) {
      request.tags.forEach(tag => {
        if (tag.length > 20) {
          errors.push('Each tag must be 20 characters or less');
        }
      });
    }

    // Validate preferences if provided
    if (request.preferences) {
      this.validatePreferences(request.preferences, errors);
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Validate an update client request
   */
  async validateUpdateClientRequest(request: UpdateClientRequest): Promise<void> {
    const errors: string[] = [];

    if (!request.id) {
      errors.push('Client ID is required');
    }

    if (!request.updates || Object.keys(request.updates).length === 0) {
      errors.push('At least one field must be updated');
    }

    // Validate individual fields if provided
    if (request.updates.firstName !== undefined) {
      if (!request.updates.firstName || request.updates.firstName.trim().length === 0) {
        errors.push('First name cannot be empty');
      }
      if (request.updates.firstName.length > 50) {
        errors.push('First name must be 50 characters or less');
      }
    }

    if (request.updates.lastName !== undefined) {
      if (!request.updates.lastName || request.updates.lastName.trim().length === 0) {
        errors.push('Last name cannot be empty');
      }
      if (request.updates.lastName.length > 50) {
        errors.push('Last name must be 50 characters or less');
      }
    }

    if (request.updates.email !== undefined) {
      if (!request.updates.email || request.updates.email.trim().length === 0) {
        errors.push('Email cannot be empty');
      }
      if (!this.isValidEmail(request.updates.email)) {
        errors.push('Invalid email format');
      }
    }

    if (request.updates.phone !== undefined && request.updates.phone) {
      if (!this.isValidPhone(request.updates.phone)) {
        errors.push('Invalid phone number format');
      }
    }

    if (request.updates.companyName !== undefined && request.updates.companyName) {
      if (request.updates.companyName.length > 100) {
        errors.push('Company name must be 100 characters or less');
      }
    }

    if (request.updates.address) {
      this.validateAddress(request.updates.address, errors);
    }

    if (request.updates.tags) {
      if (request.updates.tags.length > 10) {
        errors.push('Maximum 10 tags allowed');
      }
      request.updates.tags.forEach(tag => {
        if (tag.length > 20) {
          errors.push('Each tag must be 20 characters or less');
        }
      });
    }

    if (request.updates.preferences) {
      this.validatePreferences(request.updates.preferences, errors);
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Validate client lifecycle stage transition
   */
  validateLifecycleTransition(currentStage: string, newStage: string): void {
    const validTransitions: Record<string, string[]> = {
      'lead': ['prospect', 'customer'],
      'prospect': ['customer', 'lead'],
      'customer': ['repeat_customer', 'advocate', 'prospect'],
      'repeat_customer': ['advocate', 'customer'],
      'advocate': ['repeat_customer'], // Can demote advocates
    };

    const allowedTransitions = validTransitions[currentStage] || [];
    if (!allowedTransitions.includes(newStage)) {
      throw new Error(`Invalid lifecycle transition from ${currentStage} to ${newStage}`);
    }
  }

  /**
   * Validate client interaction data
   */
  validateInteractionData(interactionData: {
    type: string;
    subject: string;
    description: string;
    duration?: number;
  }): void {
    const errors: string[] = [];

    if (!interactionData.type) {
      errors.push('Interaction type is required');
    }

    if (!interactionData.subject || interactionData.subject.trim().length === 0) {
      errors.push('Subject is required');
    }

    if (!interactionData.description || interactionData.description.trim().length === 0) {
      errors.push('Description is required');
    }

    if (interactionData.subject && interactionData.subject.length > 100) {
      errors.push('Subject must be 100 characters or less');
    }

    if (interactionData.description && interactionData.description.length > 1000) {
      errors.push('Description must be 1000 characters or less');
    }

    if (interactionData.duration !== undefined && interactionData.duration < 0) {
      errors.push('Duration cannot be negative');
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Validate follow-up task data
   */
  validateFollowUpTaskData(taskData: {
    type: string;
    title: string;
    description: string;
    dueDate: string;
    priority: string;
  }): void {
    const errors: string[] = [];

    if (!taskData.type) {
      errors.push('Task type is required');
    }

    if (!taskData.title || taskData.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (!taskData.description || taskData.description.trim().length === 0) {
      errors.push('Description is required');
    }

    if (!taskData.dueDate) {
      errors.push('Due date is required');
    }

    if (!taskData.priority) {
      errors.push('Priority is required');
    }

    if (taskData.title && taskData.title.length > 100) {
      errors.push('Title must be 100 characters or less');
    }

    if (taskData.description && taskData.description.length > 500) {
      errors.push('Description must be 500 characters or less');
    }

    // Validate due date is in the future
    if (taskData.dueDate && new Date(taskData.dueDate) <= new Date()) {
      errors.push('Due date must be in the future');
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Validate address
   */
  private validateAddress(address: any, errors: string[]): void {
    if (!address.street || address.street.trim().length === 0) {
      errors.push('Street address is required');
    }

    if (!address.city || address.city.trim().length === 0) {
      errors.push('City is required');
    }

    if (!address.state || address.state.trim().length === 0) {
      errors.push('State is required');
    }

    if (!address.zipCode || address.zipCode.trim().length === 0) {
      errors.push('ZIP code is required');
    }

    if (!address.country || address.country.trim().length === 0) {
      errors.push('Country is required');
    }

    // Validate field lengths
    if (address.street && address.street.length > 100) {
      errors.push('Street address must be 100 characters or less');
    }

    if (address.city && address.city.length > 50) {
      errors.push('City must be 50 characters or less');
    }

    if (address.state && address.state.length > 50) {
      errors.push('State must be 50 characters or less');
    }

    if (address.zipCode && address.zipCode.length > 20) {
      errors.push('ZIP code must be 20 characters or less');
    }

    if (address.country && address.country.length > 50) {
      errors.push('Country must be 50 characters or less');
    }
  }

  /**
   * Validate preferences
   */
  private validatePreferences(preferences: any, errors: string[]): void {
    if (preferences.communicationMethod && !['email', 'phone', 'sms', 'app'].includes(preferences.communicationMethod)) {
      errors.push('Invalid communication method');
    }

    if (preferences.urgencyPreference && !['immediate', 'scheduled', 'flexible'].includes(preferences.urgencyPreference)) {
      errors.push('Invalid urgency preference');
    }

    if (preferences.paymentMethod && !['cash', 'check', 'card', 'bank_transfer'].includes(preferences.paymentMethod)) {
      errors.push('Invalid payment method');
    }

    if (preferences.budgetRange && Array.isArray(preferences.budgetRange)) {
      if (preferences.budgetRange.length !== 2) {
        errors.push('Budget range must have exactly 2 values');
      } else {
        const [min, max] = preferences.budgetRange;
        if (min < 0 || max < 0) {
          errors.push('Budget values cannot be negative');
        }
        if (min > max) {
          errors.push('Minimum budget cannot be greater than maximum budget');
        }
      }
    }

    if (preferences.serviceTypes && !Array.isArray(preferences.serviceTypes)) {
      errors.push('Service types must be an array');
    }

    if (preferences.serviceTypes && preferences.serviceTypes.length > 20) {
      errors.push('Maximum 20 service types allowed');
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone format
   */
  private isValidPhone(phone: string): boolean {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    // Check if it has 10 or 11 digits (US format)
    return digits.length === 10 || digits.length === 11;
  }
}
