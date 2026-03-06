/**
 * AdvancedSearchService — thin facade over the search/ subdirectory modules.
 * All implementation lives in search/*.ts; this file is the public API surface.
 */
import { searchContractors } from './search/ContractorSearcher';
import { searchJobs } from './search/JobSearcher';
import { getSearchSuggestions, getFilterPresets } from './search/SuggestionEngine';
import { saveSearchPersonalization, getSearchPersonalization } from './search/PersonalizationEngine';

export class AdvancedSearchService {
  static searchContractors = searchContractors;
  static searchJobs = searchJobs;
  static getSearchSuggestions = getSearchSuggestions;
  static getFilterPresets = getFilterPresets;
  static saveSearchPersonalization = saveSearchPersonalization;
  static getSearchPersonalization = getSearchPersonalization;
}

export default AdvancedSearchService;
