/**
 * ContractorService — thin facade over the contractor/ subdirectory modules.
 * All implementation lives in contractor/*.ts; this file is the public API surface.
 */
import {
  getContractorProfile,
  updateContractorProfile,
  uploadContractorImage,
} from './contractor/ContractorProfileService';
import {
  addContractorSkill,
  updateContractorLocation,
  updateContractorAvailability,
  searchContractors,
} from './contractor/ContractorSkillService';

export class ContractorService {
  static getContractorProfile = getContractorProfile;
  static updateContractorProfile = updateContractorProfile;
  static uploadContractorImage = uploadContractorImage;
  static addContractorSkill = addContractorSkill;
  static updateContractorLocation = updateContractorLocation;
  static updateContractorAvailability = updateContractorAvailability;
  static searchContractors = searchContractors;
}
