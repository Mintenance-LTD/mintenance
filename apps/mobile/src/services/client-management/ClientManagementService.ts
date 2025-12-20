/**
 * ClientManagementService
 * 
 * Main service class for managing contractor clients, including CRUD operations,
 * analytics, segmentation, and lifecycle management.
 */

import { ServiceErrorHandler } from '../../utils/serviceErrorHandler';
import { ClientRepository } from './ClientRepository';
import { ClientAnalyticsService } from './ClientAnalyticsService';
import { ClientSegmentationService } from './ClientSegmentationService';
import { ClientCommunicationService } from './ClientCommunicationService';
import { ClientValidationService } from './ClientValidationService';
import {
  Client,
  CreateClientRequest,
  UpdateClientRequest,
  ClientFilters,
  ClientSortOptions,
  ClientAnalytics,
  ClientSearchParams,
  ClientImportData,
  ClientExportOptions,
  ClientFollowUpTask,
} from './types';

export class ClientManagementService {
  private clientRepository: ClientRepository;
  private analyticsService: ClientAnalyticsService;
  private segmentationService: ClientSegmentationService;
  private communicationService: ClientCommunicationService;
  private validationService: ClientValidationService;

  constructor() {
    this.clientRepository = new ClientRepository();
    this.analyticsService = new ClientAnalyticsService();
    this.segmentationService = new ClientSegmentationService();
    this.communicationService = new ClientCommunicationService();
    this.validationService = new ClientValidationService();
  }

  /**
   * Create a new client
   */
  async createClient(request: CreateClientRequest): Promise<Client> {
    try {
      // Validate the client data
      await this.validationService.validateCreateClientRequest(request);

      // Create the client
      const client = await this.clientRepository.createClient(request);

      // Initialize analytics tracking
      await this.analyticsService.initializeClientAnalytics(client.id);

      // Send welcome communication
      await this.communicationService.sendWelcomeMessage(client);

      return client;
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to create client');
    }
  }

  /**
   * Get clients for a contractor with filtering and sorting
   */
  async getClients(
    contractorId: string,
    params?: ClientSearchParams
  ): Promise<{ clients: Client[]; total: number }> {
    try {
      return await this.clientRepository.getClients(contractorId, params);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to fetch clients');
    }
  }

  /**
   * Get a specific client by ID
   */
  async getClientById(clientId: string): Promise<Client> {
    try {
      return await this.clientRepository.getClientById(clientId);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to fetch client');
    }
  }

  /**
   * Update an existing client
   */
  async updateClient(request: UpdateClientRequest): Promise<Client> {
    try {
      // Validate the update request
      await this.validationService.validateUpdateClientRequest(request);

      // Update the client
      const updatedClient = await this.clientRepository.updateClient(request);

      // Update analytics if lifecycle stage changed
      if (request.updates.status) {
        await this.analyticsService.updateClientAnalytics(updatedClient.id);
      }

      return updatedClient;
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to update client');
    }
  }

  /**
   * Delete a client
   */
  async deleteClient(clientId: string): Promise<void> {
    try {
      // Get client before deletion for cleanup
      const client = await this.clientRepository.getClientById(clientId);

      // Delete the client
      await this.clientRepository.deleteClient(clientId);

      // Clean up analytics data
      await this.analyticsService.deleteClientAnalytics(clientId);

      // Clean up communication history
      await this.communicationService.cleanupClientCommunications(clientId);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to delete client');
    }
  }

  /**
   * Get client analytics dashboard
   */
  async getClientAnalytics(contractorId: string): Promise<ClientAnalytics> {
    try {
      const clients = await this.clientRepository.getClients(contractorId);
      return await this.analyticsService.generateAnalytics(contractorId, clients.clients);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to fetch client analytics');
    }
  }

  /**
   * Update client lifecycle stage
   */
  async updateClientLifecycle(
    clientId: string,
    stage: Client['lifecycle']['stage'],
    notes?: string
  ): Promise<Client> {
    try {
      const client = await this.clientRepository.updateClientLifecycle(clientId, stage, notes);

      // Update analytics
      await this.analyticsService.updateClientAnalytics(clientId);

      // Send stage transition notification
      await this.communicationService.sendLifecycleUpdateNotification(client, stage);

      return client;
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to update client lifecycle');
    }
  }

  /**
   * Add client interaction
   */
  async addClientInteraction(
    clientId: string,
    interactionData: {
      type: 'call' | 'email' | 'meeting' | 'job' | 'follow_up' | 'complaint' | 'compliment';
      subject: string;
      description: string;
      outcome?: string;
      nextAction?: string;
      scheduledDate?: string;
      duration?: number;
      attachments?: string[];
    }
  ): Promise<void> {
    try {
      await this.clientRepository.addClientInteraction(clientId, interactionData);

      // Update analytics
      await this.analyticsService.updateClientAnalytics(clientId);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to add client interaction');
    }
  }

  /**
   * Get client segments
   */
  async getClientSegments(contractorId: string): Promise<any[]> {
    try {
      return await this.segmentationService.getClientSegments(contractorId);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to fetch client segments');
    }
  }

  /**
   * Create client segment
   */
  async createClientSegment(
    contractorId: string,
    segmentData: {
      name: string;
      description: string;
      criteria: any;
    }
  ): Promise<any> {
    try {
      return await this.segmentationService.createClientSegment(contractorId, segmentData);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to create client segment');
    }
  }

  /**
   * Import clients from external data
   */
  async importClients(
    contractorId: string,
    importData: ClientImportData
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    try {
      return await this.clientRepository.importClients(contractorId, importData);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to import clients');
    }
  }

  /**
   * Export clients data
   */
  async exportClients(
    contractorId: string,
    options: ClientExportOptions
  ): Promise<string> {
    try {
      return await this.clientRepository.exportClients(contractorId, options);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to export clients');
    }
  }

  /**
   * Get follow-up tasks for clients
   */
  async getFollowUpTasks(contractorId: string): Promise<ClientFollowUpTask[]> {
    try {
      return await this.clientRepository.getFollowUpTasks(contractorId);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to fetch follow-up tasks');
    }
  }

  /**
   * Create follow-up task
   */
  async createFollowUpTask(
    clientId: string,
    taskData: {
      type: 'call' | 'email' | 'meeting' | 'quote' | 'check_in';
      title: string;
      description: string;
      dueDate: string;
      priority: 'low' | 'medium' | 'high';
    }
  ): Promise<ClientFollowUpTask> {
    try {
      return await this.clientRepository.createFollowUpTask(clientId, taskData);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to create follow-up task');
    }
  }

  /**
   * Complete follow-up task
   */
  async completeFollowUpTask(
    taskId: string,
    notes?: string
  ): Promise<ClientFollowUpTask> {
    try {
      return await this.clientRepository.completeFollowUpTask(taskId, notes);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to complete follow-up task');
    }
  }

  /**
   * Get client communication templates
   */
  async getCommunicationTemplates(contractorId: string): Promise<any[]> {
    try {
      return await this.communicationService.getCommunicationTemplates(contractorId);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to fetch communication templates');
    }
  }

  /**
   * Send bulk communication to client segment
   */
  async sendBulkCommunication(
    segmentId: string,
    templateId: string,
    customizations?: Record<string, any>
  ): Promise<{ sent: number; failed: number }> {
    try {
      return await this.communicationService.sendBulkCommunication(segmentId, templateId, customizations);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to send bulk communication');
    }
  }

  /**
   * Get at-risk clients
   */
  async getAtRiskClients(contractorId: string): Promise<Client[]> {
    try {
      return await this.analyticsService.getAtRiskClients(contractorId);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to fetch at-risk clients');
    }
  }

  /**
   * Get client opportunities
   */
  async getClientOpportunities(contractorId: string): Promise<Client[]> {
    try {
      return await this.analyticsService.getClientOpportunities(contractorId);
    } catch (error) {
      throw ServiceErrorHandler.handleError(error, 'Failed to fetch client opportunities');
    }
  }
}
