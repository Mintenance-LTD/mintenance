/**
 * Utility function to generate URL-friendly slugs from article titles
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Find an article by category and slug
 */
export function findArticleBySlug(categoryId: string, slug: string) {
  const { helpCategories } = require('./categories');
  
  const category = helpCategories.find((cat: any) => cat.id === categoryId);
  if (!category) return null;
  
  const article = category.articles.find((art: any) => 
    generateSlug(art.title) === slug
  );
  
  if (!article) return null;
  
  return { article, category };
}

/**
 * Get all articles with their slugs for routing
 */
export function getAllArticlesWithSlugs() {
  const { helpCategories } = require('./categories');
  
  const articles: Array<{ categoryId: string; slug: string; article: any; category: any }> = [];
  
  helpCategories.forEach((category: any) => {
    category.articles.forEach((article: any) => {
      articles.push({
        categoryId: category.id,
        slug: generateSlug(article.title),
        article,
        category,
      });
    });
  });
  
  return articles;
}

