#!/bin/bash
# Phase 2: Create Shared Services Package Script

echo "=== CREATING SHARED SERVICES PACKAGE ==="

# Create package structure
echo "1. Creating directory structure..."
mkdir -p packages/services/src/{auth,payment,notification,job,user,ai,storage,base}

# Create package.json
echo "2. Creating package.json..."
cat > packages/services/package.json << 'EOF'
{
  "name": "@mintenance/services",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest",
    "lint": "eslint src --ext .ts,.tsx"
  },
  "dependencies": {
    "@mintenance/types": "file:../types",
    "@supabase/supabase-js": "^2.50.0",
    "stripe": "^13.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0"
  }
}
EOF

# Create tsconfig.json
echo "3. Creating tsconfig.json..."
cat > packages/services/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
EOF

# Create main index file
echo "4. Creating main index file..."
cat > packages/services/src/index.ts << 'EOF'
// Main export file for @mintenance/services
export * from './auth';
export * from './payment';
export * from './notification';
export * from './job';
export * from './user';
export * from './ai';
export * from './storage';
export * from './base';
EOF

echo "5. Directory structure created:"
tree packages/services -d -L 2 2>/dev/null || find packages/services -type d | head -10

echo ""
echo "=== SERVICES PACKAGE STRUCTURE CREATED ==="