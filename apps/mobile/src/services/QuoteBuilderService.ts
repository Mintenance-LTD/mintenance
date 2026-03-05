/**
 * QuoteBuilderService — thin facade over the quotes/ subdirectory modules.
 * All implementation lives in quotes/*.ts; this file is the public API surface.
 */
export type {
  QuoteTemplate, QuoteLineItemTemplate, ContractorQuote, QuoteLineItem,
  QuoteRevision, QuoteInteraction, QuoteAnalytics,
  CreateQuoteTemplateData, CreateQuoteData, UpdateQuoteData,
  QuoteFilters, QuoteSummaryStats,
} from './quotes/types';

import {
  createQuoteTemplate, getQuoteTemplates, getQuoteTemplate,
  getQuoteTemplateLineItems, updateQuoteTemplate, deleteQuoteTemplate,
} from './quotes/TemplateCRUD';
import {
  createQuote, getQuotes, getQuote, getQuoteLineItems,
  updateQuote, sendQuote, duplicateQuote, deleteQuote, generateQuotePDF,
} from './quotes/QuoteCRUD';
import { trackQuoteInteraction, getQuoteAnalytics, getQuoteSummaryStats } from './quotes/QuoteAnalytics';
import { getQuoteRevisions, createQuoteRevision } from './quotes/QuoteRevisions';

export class QuoteBuilderService {
  // Template methods
  static createQuoteTemplate = createQuoteTemplate;
  static getQuoteTemplates = getQuoteTemplates;
  static getQuoteTemplate = getQuoteTemplate;
  static getQuoteTemplateLineItems = getQuoteTemplateLineItems;
  static updateQuoteTemplate = updateQuoteTemplate;
  static deleteQuoteTemplate = deleteQuoteTemplate;

  // Quote CRUD
  static createQuote = createQuote;
  static getQuotes = getQuotes;
  static getQuote = getQuote;
  static getQuoteLineItems = getQuoteLineItems;
  static updateQuote = updateQuote;
  static sendQuote = sendQuote;
  static duplicateQuote = duplicateQuote;
  static deleteQuote = deleteQuote;
  static generateQuotePDF = generateQuotePDF;

  // Analytics
  static trackQuoteInteraction = trackQuoteInteraction;
  static getQuoteAnalytics = getQuoteAnalytics;
  static getQuoteSummaryStats = getQuoteSummaryStats;

  // Revisions
  static getQuoteRevisions = getQuoteRevisions;
  static createQuoteRevision = createQuoteRevision;
}

export default QuoteBuilderService;
