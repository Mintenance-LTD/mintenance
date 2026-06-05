import { logger } from '../../utils/logger';
import type {
  OfflineAction,
  JobData,
  BidData,
  MessageData,
  ProfileData,
} from './types';

/**
 * Executes queued offline actions by dispatching to the appropriate service.
 * Also provides fetchServerData for conflict detection in ConflictManager.
 * Services are loaded via require() so jest.mock() intercepts them in tests.
 */
export class ActionExecutor {
  async executeAction(action: OfflineAction): Promise<void> {
    const { type, entity, data } = action;
    logger.debug('Executing offline action', {
      type,
      entity,
      actionId: action.id,
    });

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    switch (entity) {
      case 'job':
        await this.executeJobAction(type, data);
        break;
      case 'bid':
        await this.executeBidAction(type, data);
        break;
      case 'message':
        await this.executeMessageAction(type, data);
        break;
      case 'profile':
        await this.executeProfileAction(type, data);
        break;
      default:
        throw new Error(`Unknown entity type: ${entity}`);
    }
  }

  private async executeJobAction(
    type: OfflineAction['type'],
    data: unknown
  ): Promise<void> {
    const { JobService } = require('../JobService');
    const jobData = data as JobData;
    switch (type) {
      case 'CREATE':
        await JobService.createJob(data);
        break;
      case 'UPDATE':
        await JobService.updateJobStatus(
          jobData.jobId,
          jobData.status,
          jobData.contractorId
        );
        break;
      default:
        throw new Error(`Unsupported job action: ${type}`);
    }
  }

  private async executeBidAction(
    type: OfflineAction['type'],
    data: unknown
  ): Promise<void> {
    const { JobService } = require('../JobService');
    const bidData = data as BidData;
    switch (type) {
      case 'CREATE':
        await JobService.submitBid(data);
        break;
      case 'UPDATE':
        if (bidData.status === 'accepted') {
          // Audit step 11 (2026-04-29): JobService.acceptBid now
          // requires both bidId + jobId. The offline action that
          // queued this UPDATE should have populated both fields
          // (see useAcceptBid → ContractorAssignment), so a missing
          // jobId is a programmer bug, not a runtime condition.
          if (!bidData.bidId || !bidData.jobId) {
            throw new Error(
              `acceptBid replay missing required ids (bidId=${bidData.bidId}, jobId=${bidData.jobId})`
            );
          }
          await JobService.acceptBid(bidData.bidId, bidData.jobId);
        }
        break;
      default:
        throw new Error(`Unsupported bid action: ${type}`);
    }
  }

  private async executeMessageAction(
    type: OfflineAction['type'],
    data: unknown
  ): Promise<void> {
    const { MessagingService } = require('../MessagingService');
    const messageData = data as MessageData;
    switch (type) {
      case 'CREATE':
        await MessagingService.sendMessage(
          messageData.jobId,
          messageData.receiverId,
          messageData.message,
          messageData.senderId
        );
        break;
      default:
        throw new Error(`Unsupported message action: ${type}`);
    }
  }

  private async executeProfileAction(
    type: OfflineAction['type'],
    data: unknown
  ): Promise<void> {
    const { UserService } = require('../UserService');
    const profileData = data as ProfileData;
    switch (type) {
      case 'UPDATE':
        await UserService.updateUserProfile(
          profileData.userId,
          profileData.updates
        );
        break;
      default:
        throw new Error(`Unsupported profile action: ${type}`);
    }
  }

  /** Fetch current server data for conflict detection */
  async fetchServerData(entity: string, entityId: string): Promise<unknown> {
    try {
      switch (entity) {
        case 'job': {
          const { JobService } = require('../JobService');
          return await JobService.getJobById(entityId);
        }
        case 'bid': {
          // NOTE: this fetchServerData is currently unused — ConflictManager
          // has its own copy which is the live conflict-detection path. The
          // previous body here had the same bid bug (calling getBidsByJob with
          // a bidId), so it is intentionally a no-op rather than a wrong fetch.
          // A real by-id fetch needs the jobId (bids are nested under
          // /api/jobs/:jobId/bids/:bidId); see ConflictManager.fetchServerData
          // + JobService.getBidById for the wired implementation.
          return null;
        }
        case 'profile': {
          const { UserService } = require('../UserService');
          return await UserService.getUserProfile(entityId);
        }
        case 'message':
          return null; // Messages are append-only, no conflicts
        default:
          logger.warn('Unknown entity type for conflict detection:', entity);
          return null;
      }
    } catch (error) {
      logger.error('Failed to fetch server data:', error);
      return null;
    }
  }
}
