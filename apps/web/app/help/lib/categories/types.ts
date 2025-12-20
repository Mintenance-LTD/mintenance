/**
 * Help Center Types
 * 
 * Shared type definitions for help articles and categories.
 */

export interface Article {
  title: string;
  content: string;
  fullContent?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  articles: Article[];
}

