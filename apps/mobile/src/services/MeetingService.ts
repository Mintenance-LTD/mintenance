/**
 * MeetingService — thin facade over the meeting/ subdirectory modules.
 * All implementation lives in meeting/*.ts; this file is the public API surface.
 */
import { createMeeting, getMeetingById, getMeetingsForUser, updateMeetingStatus, rescheduleMeeting, createMeetingUpdate, getMeetingUpdates } from './meeting/MeetingCRUD';
import { updateContractorLocation, getContractorLocation, subscribeToContractorLocation, subscribeToMeetingUpdates, subscribeToContractorTravelLocation, startTravelTracking, markArrived } from './meeting/LocationTracker';

export class MeetingService {
  static createMeeting = createMeeting;
  static getMeetingById = getMeetingById;
  static getMeetingsForUser = getMeetingsForUser;
  static updateMeetingStatus = updateMeetingStatus;
  static rescheduleMeeting = rescheduleMeeting;
  static createMeetingUpdate = createMeetingUpdate;
  static getMeetingUpdates = getMeetingUpdates;
  static updateContractorLocation = updateContractorLocation;
  static getContractorLocation = getContractorLocation;
  static subscribeToContractorLocation = subscribeToContractorLocation;
  static subscribeToMeetingUpdates = subscribeToMeetingUpdates;
  static subscribeToContractorTravelLocation = subscribeToContractorTravelLocation;
  static startTravelTracking = startTravelTracking;
  static markArrived = markArrived;
}
