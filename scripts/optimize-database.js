#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

/**
 * Database Optimization Script
 * Analyzes codebase for database queries and generates optimization recommendations
 */

class DatabaseOptimizer {
  constructor() {
    this.queries = [];
    this.indexes = new Map();
    this.n1Patterns = [];
    this.optimizationOpportunities = [];
  }

  async analyze() {
    console.log('🔍 Starting database optimization analysis...\n');

    await this.findDatabaseQueries();
    this.analyzeQueryPatterns();
    this.detectN1Queries();
    this.generateIndexRecommendations();
    this.generateMigrationFile();
    this.printReport();
  }

  async findDatabaseQueries() {
    console.log('📂 Scanning for database queries...');

    const files = await glob('**/*.{ts,tsx,js,jsx}', {
      ignore: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '.next/**',
        'coverage/**',
        '**/*.test.*',
        '**/*.spec.*'
      ]
    });

    let queryCount = 0;

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');

      // Find Supabase queries
      const supabasePatterns = [
        // from().select() patterns
        /\.from\(['"`](\w+)['"`]\)\s*\.select\([^)]*\)([^;]*)/g,

        // from().insert() patterns
        /\.from\(['"`](\w+)['"`]\)\s*\.insert\(/g,

        // from().update() patterns
        /\.from\(['"`](\w+)['"`]\)\s*\.update\(/g,

        // from().delete() patterns
        /\.from\(['"`](\w+)['"`]\)\s*\.delete\(/g,
      ];

      for (const pattern of supabasePatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const table = match[1];
          const queryChain = match[0];

          // Extract conditions
          const conditions = this.extractConditions(queryChain);

          this.queries.push({
            file,
            table,
            type: this.getQueryType(queryChain),
            conditions,
            fullQuery: queryChain,
            lineNumber: this.getLineNumber(content, match.index)
          });

          queryCount++;
        }
      }
    }

    console.log(`✅ Found ${queryCount} database queries in ${files.length} files\n`);
  }

  extractConditions(queryChain) {
    const conditions = [];

    // Extract .eq() conditions
    const eqPattern = /\.eq\(['"`](\w+)['"`]/g;
    let match;
    while ((match = eqPattern.exec(queryChain)) !== null) {
      conditions.push({ type: 'eq', field: match[1] });
    }

    // Extract .in() conditions
    const inPattern = /\.in\(['"`](\w+)['"`]/g;
    while ((match = inPattern.exec(queryChain)) !== null) {
      conditions.push({ type: 'in', field: match[1] });
    }

    // Extract .like() and .ilike() conditions
    const likePattern = /\.(i?like)\(['"`](\w+)['"`]/g;
    while ((match = likePattern.exec(queryChain)) !== null) {
      conditions.push({ type: match[1], field: match[2] });
    }

    // Extract .or() conditions
    const orPattern = /\.or\(['"`]([^'"]+)['"`]/g;
    while ((match = orPattern.exec(queryChain)) !== null) {
      const orConditions = match[1].split(',').map(c => {
        const parts = c.trim().split('.');
        return { type: 'or', field: parts[0] };
      });
      conditions.push(...orConditions);
    }

    // Extract order by
    const orderPattern = /\.order\(['"`](\w+)['"`]/g;
    while ((match = orderPattern.exec(queryChain)) !== null) {
      conditions.push({ type: 'order', field: match[1] });
    }

    // Extract range conditions
    const rangePattern = /\.(gt|gte|lt|lte)\(['"`](\w+)['"`]/g;
    while ((match = rangePattern.exec(queryChain)) !== null) {
      conditions.push({ type: match[1], field: match[2] });
    }

    return conditions;
  }

  getQueryType(queryChain) {
    if (queryChain.includes('.select(')) return 'SELECT';
    if (queryChain.includes('.insert(')) return 'INSERT';
    if (queryChain.includes('.update(')) return 'UPDATE';
    if (queryChain.includes('.delete(')) return 'DELETE';
    return 'UNKNOWN';
  }

  getLineNumber(content, index) {
    const lines = content.substring(0, index).split('\n');
    return lines.length;
  }

  analyzeQueryPatterns() {
    console.log('🔎 Analyzing query patterns...');

    // Group queries by table and conditions
    const tablePatterns = new Map();

    for (const query of this.queries) {
      const key = query.table;

      if (!tablePatterns.has(key)) {
        tablePatterns.set(key, {
          table: query.table,
          queries: [],
          conditions: new Map()
        });
      }

      const pattern = tablePatterns.get(key);
      pattern.queries.push(query);

      // Count condition usage
      for (const condition of query.conditions) {
        const condKey = `${condition.type}:${condition.field}`;
        pattern.conditions.set(condKey, (pattern.conditions.get(condKey) || 0) + 1);
      }
    }

    // Identify most queried tables and fields
    this.tablePatterns = tablePatterns;

    console.log(`✅ Analyzed ${tablePatterns.size} tables\n`);
  }

  detectN1Queries() {
    console.log('🔍 Detecting N+1 query patterns...');

    // Group queries by file and look for patterns
    const fileQueries = new Map();

    for (const query of this.queries) {
      if (!fileQueries.has(query.file)) {
        fileQueries.set(query.file, []);
      }
      fileQueries.get(query.file).push(query);
    }

    // Detect N+1 patterns
    for (const [file, queries] of fileQueries.entries()) {
      // Look for multiple similar queries in close proximity
      const patterns = new Map();

      for (let i = 0; i < queries.length - 1; i++) {
        const q1 = queries[i];
        const q2 = queries[i + 1];

        // Check if queries are similar (same table, similar conditions)
        if (q1.table === q2.table &&
            Math.abs(q1.lineNumber - q2.lineNumber) < 50) {

          const patternKey = `${q1.table}:${q1.type}`;

          if (!patterns.has(patternKey)) {
            patterns.set(patternKey, []);
          }
          patterns.get(patternKey).push({ q1, q2 });
        }
      }

      // If we found repeated patterns, it might be N+1
      for (const [pattern, occurrences] of patterns.entries()) {
        if (occurrences.length >= 2) {
          this.n1Patterns.push({
            file,
            pattern,
            count: occurrences.length,
            firstLine: occurrences[0].q1.lineNumber
          });
        }
      }
    }

    console.log(`⚠️  Found ${this.n1Patterns.length} potential N+1 query patterns\n`);
  }

  generateIndexRecommendations() {
    console.log('💡 Generating index recommendations...');

    const indexRecommendations = new Map();

    // Analyze each table's query patterns
    for (const [table, pattern] of this.tablePatterns.entries()) {
      const recommendations = [];

      // Sort conditions by frequency
      const sortedConditions = Array.from(pattern.conditions.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([key, count]) => ({ key, count }));

      // Recommend indexes for frequently used conditions
      for (const { key, count } of sortedConditions) {
        const [type, field] = key.split(':');

        // High-priority index recommendations
        if (count > 5) {
          if (type === 'eq' || type === 'in') {
            recommendations.push({
              type: 'btree',
              fields: [field],
              reason: `Frequently used in WHERE clauses (${count} times)`,
              priority: count > 20 ? 'HIGH' : 'MEDIUM'
            });
          } else if (type === 'like' || type === 'ilike') {
            recommendations.push({
              type: 'gin',
              fields: [field],
              reason: `Text search on ${field} (${count} times)`,
              priority: 'HIGH'
            });
          } else if (type === 'order') {
            recommendations.push({
              type: 'btree',
              fields: [field],
              reason: `Frequently used in ORDER BY (${count} times)`,
              priority: 'MEDIUM'
            });
          }
        }
      }

      // Look for composite index opportunities
      const commonCombos = this.findCommonFieldCombinations(pattern.queries);
      for (const combo of commonCombos) {
        if (combo.count > 3) {
          recommendations.push({
            type: 'btree',
            fields: combo.fields,
            reason: `Fields frequently queried together (${combo.count} times)`,
            priority: combo.count > 10 ? 'HIGH' : 'MEDIUM'
          });
        }
      }

      if (recommendations.length > 0) {
        indexRecommendations.set(table, recommendations);
      }
    }

    this.indexRecommendations = indexRecommendations;

    let totalRecommendations = 0;
    for (const recs of indexRecommendations.values()) {
      totalRecommendations += recs.length;
    }

    console.log(`✅ Generated ${totalRecommendations} index recommendations\n`);
  }

  findCommonFieldCombinations(queries) {
    const combos = new Map();

    for (const query of queries) {
      if (query.conditions.length > 1) {
        const fields = query.conditions
          .filter(c => c.type === 'eq' || c.type === 'in')
          .map(c => c.field)
          .sort();

        if (fields.length > 1) {
          const key = fields.join(',');
          combos.set(key, (combos.get(key) || 0) + 1);
        }
      }
    }

    return Array.from(combos.entries())
      .map(([fields, count]) => ({
        fields: fields.split(','),
        count
      }))
      .sort((a, b) => b.count - a.count);
  }

  generateMigrationFile() {
    console.log('📝 Generating migration file...');

    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const migrationPath = path.join('supabase', 'migrations', `${timestamp}_performance_indexes.sql`);

    let sql = `-- Performance optimization indexes
-- Generated by database optimization script
-- Date: ${new Date().toISOString()}

`;

    // Add index creation statements
    for (const [table, recommendations] of this.indexRecommendations.entries()) {
      sql += `-- Indexes for table: ${table}\n`;

      for (const rec of recommendations) {
        const indexName = `idx_${table}_${rec.fields.join('_')}`;

        if (rec.type === 'btree') {
          sql += `CREATE INDEX IF NOT EXISTS ${indexName}\n`;
          sql += `  ON ${table} (${rec.fields.join(', ')});\n`;
        } else if (rec.type === 'gin') {
          sql += `CREATE INDEX IF NOT EXISTS ${indexName}_gin\n`;
          sql += `  ON ${table} USING gin(to_tsvector('english', ${rec.fields.join(" || ' ' || ")}));\n`;
        }

        sql += `-- Reason: ${rec.reason}\n\n`;
      }
    }

    // Add frequently queried composite indexes
    sql += `
-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_jobs_status_contractor
  ON jobs (status, contractor_id)
  WHERE contractor_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_homeowner_status
  ON jobs (homeowner_id, status);

CREATE INDEX IF NOT EXISTS idx_reviews_job_rating
  ON reviews (job_id, rating);

CREATE INDEX IF NOT EXISTS idx_contractor_skills_contractor
  ON contractor_skills (contractor_id, skill_name);

-- Partial indexes for common filters
CREATE INDEX IF NOT EXISTS idx_users_contractors
  ON users (role, admin_verified, created_at DESC)
  WHERE role = 'contractor';

CREATE INDEX IF NOT EXISTS idx_jobs_active
  ON jobs (status, created_at DESC)
  WHERE status IN ('posted', 'in_progress');

-- Performance analysis views
CREATE OR REPLACE VIEW v_contractor_stats AS
SELECT
  u.id,
  u.first_name,
  u.last_name,
  COUNT(DISTINCT j.id) FILTER (WHERE j.status = 'completed') as completed_jobs,
  AVG(r.rating) as avg_rating,
  COUNT(DISTINCT r.id) as total_reviews
FROM users u
LEFT JOIN jobs j ON j.contractor_id = u.id
LEFT JOIN reviews r ON r.job_id = j.id
WHERE u.role = 'contractor'
GROUP BY u.id, u.first_name, u.last_name;

-- Add table statistics update
ANALYZE users;
ANALYZE jobs;
ANALYZE reviews;
ANALYZE contractor_skills;
`;

    // Create migrations directory if it doesn't exist
    const migrationsDir = path.join('supabase', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }

    fs.writeFileSync(migrationPath, sql);
    this.migrationFile = migrationPath;

    console.log(`✅ Generated migration file: ${migrationPath}\n`);
  }

  printReport() {
    console.log('=' .repeat(60));
    console.log('📊 DATABASE OPTIMIZATION REPORT');
    console.log('=' .repeat(60) + '\n');

    // Query Statistics
    console.log('📈 Query Statistics:');
    console.log(`  Total queries analyzed: ${this.queries.length}`);
    console.log(`  Tables accessed: ${this.tablePatterns.size}`);
    console.log(`  N+1 patterns detected: ${this.n1Patterns.length}\n`);

    // Most queried tables
    console.log('🔥 Most Queried Tables:');
    const sortedTables = Array.from(this.tablePatterns.entries())
      .sort((a, b) => b[1].queries.length - a[1].queries.length)
      .slice(0, 5);

    for (const [table, pattern] of sortedTables) {
      console.log(`  ${table}: ${pattern.queries.length} queries`);
    }
    console.log();

    // N+1 Query Warnings
    if (this.n1Patterns.length > 0) {
      console.log('⚠️  N+1 Query Patterns Detected:');
      for (const pattern of this.n1Patterns.slice(0, 5)) {
        console.log(`  ${pattern.file}:${pattern.firstLine}`);
        console.log(`    Pattern: ${pattern.pattern} (${pattern.count} occurrences)`);
      }
      console.log();
    }

    // Index Recommendations
    console.log('💡 Index Recommendations:');
    let highPriorityCount = 0;
    let mediumPriorityCount = 0;

    for (const [table, recs] of this.indexRecommendations.entries()) {
      const highPriority = recs.filter(r => r.priority === 'HIGH');
      const mediumPriority = recs.filter(r => r.priority === 'MEDIUM');

      highPriorityCount += highPriority.length;
      mediumPriorityCount += mediumPriority.length;

      if (highPriority.length > 0) {
        console.log(`\n  ${table}:`);
        for (const rec of highPriority) {
          console.log(`    🔴 HIGH: Index on (${rec.fields.join(', ')})`);
          console.log(`       ${rec.reason}`);
        }
      }
    }

    console.log(`\n  Summary:`);
    console.log(`    High Priority: ${highPriorityCount} indexes`);
    console.log(`    Medium Priority: ${mediumPriorityCount} indexes`);

    // Optimization Opportunities
    console.log('\n🚀 Optimization Opportunities:');
    console.log('  1. Fix N+1 queries using joins or batch loading');
    console.log('  2. Implement query result caching (DatabaseQueryCache)');
    console.log('  3. Add recommended indexes to improve query performance');
    console.log('  4. Use connection pooling for better resource utilization');
    console.log('  5. Monitor slow queries with QueryPerformanceMonitor');

    // Next Steps
    console.log('\n📋 Next Steps:');
    console.log(`  1. Review the generated migration: ${this.migrationFile}`);
    console.log('  2. Run: npx supabase migration up');
    console.log('  3. Update queries to use airbnb-optimized-v2.ts');
    console.log('  4. Enable QueryPerformanceMonitor in production');
    console.log('  5. Monitor cache hit rates and adjust TTLs');

    console.log('\n' + '=' .repeat(60));
    console.log('✨ Optimization analysis complete!');
    console.log('=' .repeat(60));
  }
}

// Run the optimizer
async function main() {
  const optimizer = new DatabaseOptimizer();
  await optimizer.analyze();
}

main().catch(console.error);