/**
 * VideoCallService — thin facade over the video/ subdirectory modules.
 * All implementation lives in video/*.ts; this file is the public API surface.
 */
export type { VideoCall, CallParticipant, CallSession, CallStatistics } from './video/types';

import {
  scheduleCall, startInstantCall, joinCall, endCall,
  cancelCall, getActiveCall, isUserInCall,
} from './video/CallManager';
import { startRecording, getCallStatistics, getCallHistory } from './video/CallRecordingService';

export class VideoCallService {
  static scheduleCall = scheduleCall;
  static startInstantCall = startInstantCall;
  static joinCall = joinCall;
  static endCall = endCall;
  static cancelCall = cancelCall;
  static getCallHistory = getCallHistory;
  static startRecording = startRecording;
  static getCallStatistics = getCallStatistics;
  static getActiveCall = getActiveCall;
  static isUserInCall = isUserInCall;
}

export default VideoCallService;
