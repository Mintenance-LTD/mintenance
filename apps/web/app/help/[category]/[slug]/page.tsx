import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Help Article | Mintenance',
  description:
    'Find answers and guidance on using the Mintenance property maintenance platform.',
};
import { PublicLayout } from '@/app/components/layouts/PublicLayout';
import { theme } from '@/lib/theme';
import {
  helpCategories,
  type Article,
  type Category,
} from '../../lib/categories/index';
import {
  findArticleBySlug,
  generateSlug,
  getAllArticlesWithSlugs,
} from '../../lib/utils';
import { Button } from '@/components/ui/Button';
import { MarkdownContent } from '../../components/MarkdownContent';
import { ArticleNavigation } from './components/ArticleNavigation';

interface HelpArticlePageProps {
  params: Promise<{ category: string; slug: string }>;
}

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  const articles = getAllArticlesWithSlugs();
  return articles.map(({ categoryId, slug }) => ({
    category: categoryId,
    slug: slug,
  }));
}

export default async function HelpArticlePage(props: HelpArticlePageProps) {
  const params = await props.params;
  const { article, category } =
    findArticleBySlug(params.category, params.slug) || {};

  if (!article || !category) {
    notFound();
  }

  // Find previous and next articles in the same category
  const categoryArticles = category.articles;
  const currentIndex = categoryArticles.findIndex(
    (a: Article) => generateSlug(a.title) === params.slug
  );

  const prevArticle =
    currentIndex > 0 ? categoryArticles[currentIndex - 1] : null;
  const nextArticle =
    currentIndex < categoryArticles.length - 1
      ? categoryArticles[currentIndex + 1]
      : null;

  return (
    <PublicLayout>
      <div
        data-theme='mint-editorial'
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: theme.spacing[8],
          fontFamily: 'var(--me-font-body)',
        }}
      >
        {/* Back Button */}
        <Link
          href='/help'
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: theme.spacing[2],
            marginBottom: theme.spacing[6],
            color: 'var(--me-ink-3)',
            textDecoration: 'none',
            fontSize: theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.medium,
          }}
        >
          <ArrowLeft className='h-4 w-4' style={{ color: 'var(--me-ink-3)' }} />
          Back to Help Centre
        </Link>

        {/* Category Badge */}
        <div style={{ marginBottom: theme.spacing[4] }}>
          <Link
            href={`/help#category-${category.id}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: theme.spacing[2],
              padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
              borderRadius: theme.borderRadius.full,
              backgroundColor: `${category.color}20`,
              color: category.color,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
              textDecoration: 'none',
            }}
          >
            <span>{category.icon}</span>
            <span>{category.name}</span>
          </Link>
        </div>

        {/* Article Content */}
        <article
          style={{
            backgroundColor: 'var(--me-surface)',
            borderRadius: 'var(--me-radius-card)',
            padding: theme.spacing[8],
            border: '1px solid var(--me-line)',
            boxShadow: 'var(--me-shadow-card)',
          }}
        >
          <h1
            style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontFamily: 'var(--me-font-display)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              color: 'var(--me-ink)',
              marginBottom: theme.spacing[4],
              lineHeight: 1.2,
            }}
          >
            {article.title}
          </h1>

          <div
            style={{
              fontSize: theme.typography.fontSize.base,
              color: 'var(--me-ink-2)',
              lineHeight: 1.7,
            }}
          >
            {article.fullContent ? (
              <MarkdownContent content={article.fullContent} />
            ) : (
              <p
                style={{
                  fontSize: theme.typography.fontSize.base,
                  color: 'var(--me-ink-2)',
                  lineHeight: 1.7,
                }}
              >
                {article.content}
              </p>
            )}
          </div>
        </article>

        {/* Navigation */}
        <ArticleNavigation
          prevArticle={
            prevArticle
              ? {
                  title: prevArticle.title,
                  slug: generateSlug(prevArticle.title),
                }
              : null
          }
          nextArticle={
            nextArticle
              ? {
                  title: nextArticle.title,
                  slug: generateSlug(nextArticle.title),
                }
              : null
          }
          category={params.category}
        />

        {/* Help CTA */}
        <div
          style={{
            marginTop: theme.spacing[8],
            padding: theme.spacing[6],
            backgroundColor: 'var(--me-bg-2)',
            borderRadius: 'var(--me-radius-card)',
            textAlign: 'center',
          }}
        >
          <h3
            style={{
              fontSize: theme.typography.fontSize.xl,
              fontFamily: 'var(--me-font-display)',
              fontWeight: 500,
              letterSpacing: '-0.01em',
              color: 'var(--me-ink)',
              marginBottom: theme.spacing[2],
            }}
          >
            Still need help?
          </h3>
          <p
            style={{
              fontSize: theme.typography.fontSize.base,
              color: 'var(--me-ink-2)',
              marginBottom: theme.spacing[4],
            }}
          >
            Can't find what you're looking for? Our support team is here to
            help.
          </p>
          <Link href='/contact' style={{ textDecoration: 'none' }}>
            <Button variant='primary'>Contact Support</Button>
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
