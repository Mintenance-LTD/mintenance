#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const config = {
  directories: ['apps/web', 'apps/mobile', 'packages'],
  fileExtensions: ['ts', 'tsx'],
  excludeDirs: ['node_modules', '.next', 'dist', 'build', 'coverage', '__tests__', '__mocks__'],
  skipPatterns: [
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx',
    '**/*.d.ts',
    '**/types/**',
    '**/migrations/**',
  ],
};

// Track statistics
let stats = {
  filesAnalyzed: 0,
  testsCreated: 0,
  testsExisting: 0,
  errors: [],
};

// Template for different types of tests
const testTemplates = {
  hook: (hookName, filePath) => `import { renderHook, act } from '@testing-library/react';
import { ${hookName} } from '../${path.basename(filePath, path.extname(filePath))}';

describe('${hookName}', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => ${hookName}());
    expect(result.current).toBeDefined();
  });

  it('should handle updates correctly', () => {
    const { result } = renderHook(() => ${hookName}());
    // Add specific test logic based on hook functionality
  });

  it('should clean up on unmount', () => {
    const { result, unmount } = renderHook(() => ${hookName}());
    unmount();
    // Verify cleanup
  });
});`,

  component: (componentName, filePath) => `import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ${componentName} } from '../${path.basename(filePath, path.extname(filePath))}';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  useParams: () => ({ id: 'test-id' }),
}));

describe('${componentName}', () => {
  const defaultProps = {
    // Add default props here
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<${componentName} {...defaultProps} />);
    expect(screen.getByRole('main', { hidden: true }) || screen.container).toBeTruthy();
  });

  it('should handle user interactions', async () => {
    render(<${componentName} {...defaultProps} />);
    // Add interaction tests
  });

  it('should display correct data', () => {
    render(<${componentName} {...defaultProps} />);
    // Add data display tests
  });

  it('should handle edge cases', () => {
    render(<${componentName} {...defaultProps} />);
    // Test edge cases
  });
});`,

  service: (serviceName, filePath) => `import { ${serviceName} } from '../${path.basename(filePath, path.extname(filePath))}';

describe('${serviceName}', () => {
  let service: ${serviceName};

  beforeEach(() => {
    service = new ${serviceName}();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
    });
  });

  describe('methods', () => {
    it('should handle successful operations', async () => {
      // Test successful cases
    });

    it('should handle errors gracefully', async () => {
      // Test error cases
    });

    it('should validate inputs', () => {
      // Test input validation
    });
  });
});`,

  api: (routeName, filePath) => `import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '../route';

// Mock dependencies
jest.mock('@mintenance/shared', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: {}, error: null }),
  })),
}));

describe('${routeName} API Route', () => {
  const createRequest = (options = {}) => {
    return new NextRequest('http://localhost:3000/api/test', options);
  };

  ${routeName.includes('GET') ? `
  describe('GET', () => {
    it('should return data successfully', async () => {
      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toBeDefined();
    });

    it('should handle errors', async () => {
      const request = createRequest();
      // Mock error scenario
      const response = await GET(request);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });` : ''}

  ${routeName.includes('POST') ? `
  describe('POST', () => {
    it('should create resource successfully', async () => {
      const request = createRequest({
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it('should validate input data', async () => {
      const request = createRequest({
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });` : ''}
});`,

  utility: (functionName, filePath) => `import { ${functionName} } from '../${path.basename(filePath, path.extname(filePath))}';

describe('${functionName}', () => {
  it('should handle normal cases', () => {
    // Test normal functionality
    expect(${functionName}('input')).toBeDefined();
  });

  it('should handle edge cases', () => {
    // Test edge cases
    expect(() => ${functionName}(null)).not.toThrow();
  });

  it('should handle error cases', () => {
    // Test error scenarios
  });
});`,
};

// Analyze file to determine what kind of test to generate
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath, path.extname(filePath));

  // Determine file type
  if (fileName.startsWith('use') || content.includes('useState') && content.includes('useEffect')) {
    return { type: 'hook', name: fileName };
  }

  if (filePath.includes('/api/') && filePath.endsWith('/route.ts')) {
    const methods = [];
    if (content.includes('export async function GET')) methods.push('GET');
    if (content.includes('export async function POST')) methods.push('POST');
    if (content.includes('export async function PUT')) methods.push('PUT');
    if (content.includes('export async function DELETE')) methods.push('DELETE');
    return { type: 'api', name: methods.join(', ') };
  }

  if (content.includes('Service') || content.includes('class ')) {
    const match = content.match(/export\s+class\s+(\w+)/);
    return { type: 'service', name: match ? match[1] : fileName };
  }

  if (filePath.endsWith('.tsx') && (content.includes('export function') || content.includes('export default function'))) {
    const match = content.match(/export\s+(?:default\s+)?function\s+(\w+)/);
    return { type: 'component', name: match ? match[1] : fileName };
  }

  if (content.includes('export function') || content.includes('export const')) {
    const match = content.match(/export\s+(?:const|function)\s+(\w+)/);
    return { type: 'utility', name: match ? match[1] : fileName };
  }

  return { type: 'unknown', name: fileName };
}

// Generate test file for a source file
function generateTestFile(filePath) {
  try {
    // Check if test already exists
    const dir = path.dirname(filePath);
    const fileName = path.basename(filePath, path.extname(filePath));
    const testDir = path.join(dir, '__tests__');
    const testFile = path.join(testDir, `${fileName}.test${path.extname(filePath)}`);

    if (fs.existsSync(testFile)) {
      stats.testsExisting++;
      console.log(`✓ Test exists: ${path.basename(testFile)}`);
      return;
    }

    // Analyze file
    const analysis = analyzeFile(filePath);
    if (analysis.type === 'unknown') {
      console.log(`⚠️  Unknown type: ${path.basename(filePath)}`);
      return;
    }

    // Generate test content
    const template = testTemplates[analysis.type];
    if (!template) {
      console.log(`⚠️  No template for type ${analysis.type}: ${path.basename(filePath)}`);
      return;
    }

    const testContent = template(analysis.name, filePath);

    // Create test directory if needed
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Write test file
    fs.writeFileSync(testFile, testContent, 'utf8');
    stats.testsCreated++;
    console.log(`✅ Created test: ${path.basename(testFile)}`);

  } catch (error) {
    stats.errors.push({ file: filePath, error: error.message });
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

// Check if file should be tested
function shouldGenerateTest(filePath) {
  // Skip test files
  if (config.skipPatterns.some(pattern => {
    const normalizedPattern = pattern.replace(/\*\*/g, '').replace(/\*/g, '');
    return filePath.includes(normalizedPattern);
  })) {
    return false;
  }

  // Skip config files
  if (filePath.endsWith('.config.ts') || filePath.endsWith('.config.js')) {
    return false;
  }

  // Skip type definition files
  if (filePath.endsWith('.d.ts')) {
    return false;
  }

  return true;
}

// Main function
function main() {
  console.log('🧪 Starting test generation...\n');

  // Build glob patterns
  const patterns = config.directories.map(dir =>
    `${dir}/**/*.{${config.fileExtensions.join(',')}}`
  );

  // Find all files
  let allFiles = [];
  patterns.forEach(pattern => {
    const files = glob.sync(pattern, {
      ignore: config.excludeDirs.map(dir => `**/${dir}/**`),
    });
    allFiles = allFiles.concat(files);
  });

  console.log(`📁 Found ${allFiles.length} source files\n`);

  // Filter files that need tests
  const filesToTest = allFiles.filter(file => shouldGenerateTest(file));
  console.log(`🎯 ${filesToTest.length} files need tests\n`);

  // Generate tests
  filesToTest.forEach(file => {
    stats.filesAnalyzed++;
    generateTestFile(path.resolve(file));
  });

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST GENERATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Files analyzed: ${stats.filesAnalyzed}`);
  console.log(`Tests created: ${stats.testsCreated}`);
  console.log(`Tests already existing: ${stats.testsExisting}`);
  console.log(`Coverage: ${Math.round((stats.testsExisting + stats.testsCreated) / stats.filesAnalyzed * 100)}%`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️  Errors: ${stats.errors.length}`);
    stats.errors.slice(0, 5).forEach(err => {
      console.log(`  - ${path.basename(err.file)}: ${err.error}`);
    });
  }

  // Suggest next steps
  console.log('\n📝 Next Steps:');
  console.log('1. Review and customize generated tests');
  console.log('2. Add specific test cases for business logic');
  console.log('3. Run: npm test to verify all tests pass');
  console.log('4. Run: npm run test:coverage to check coverage');

  console.log('\n✨ Test generation complete!');
}

// Run the script
main();