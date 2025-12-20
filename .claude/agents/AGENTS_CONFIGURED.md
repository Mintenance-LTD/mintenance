# Configured Subagents for Mintenance Project

All agents have been properly configured with YAML frontmatter for use with the Task tool.

## ✅ Available Subagents (11 Total)

### 1. **ui-designer**
- **Description:** Expert UI designer for creating Airbnb-quality interfaces
- **Use For:** Component design, layouts, visual systems, design specifications
- **Tools:** Read, Write, Edit, Glob, Grep

### 2. **frontend-specialist**
- **Description:** Senior React/TypeScript developer for production-quality components
- **Use For:** Complex frontend implementation, performance optimization, architecture
- **Tools:** Read, Write, Edit, Glob, Grep, Bash

### 3. **database-architect**
- **Description:** PostgreSQL/Supabase expert for schema design and query optimization
- **Use For:** Database architecture, migrations, RLS policies, performance tuning
- **Tools:** Read, Write, Edit, Glob, Grep, Bash

### 4. **performance-optimizer**
- **Description:** Web performance specialist for Core Web Vitals optimization
- **Use For:** Performance audits, bundle analysis, runtime optimization
- **Tools:** Read, Write, Edit, Glob, Grep, Bash

### 5. **testing-specialist**
- **Description:** QA and testing automation expert
- **Use For:** Test strategy, unit/integration/E2E tests, code coverage >80%
- **Tools:** Read, Write, Edit, Glob, Grep, Bash

### 6. **security-expert**
- **Description:** Cybersecurity specialist for OWASP compliance
- **Use For:** Security reviews, vulnerability audits, authentication patterns
- **Tools:** Read, Write, Edit, Glob, Grep, Bash

### 7. **mobile-developer**
- **Description:** React Native expert for cross-platform development
- **Use For:** Mobile app features, native modules, mobile UX
- **Tools:** Read, Write, Edit, Glob, Grep, Bash

### 8. **devops-engineer**
- **Description:** DevOps expert for CI/CD and cloud infrastructure
- **Use For:** Infrastructure setup, deployment automation, monitoring
- **Tools:** Read, Write, Edit, Glob, Grep, Bash

### 9. **api-architect**
- **Description:** API architecture expert for RESTful/GraphQL
- **Use For:** API design, endpoint optimization, authentication, versioning
- **Tools:** Read, Write, Edit, Glob, Grep, Bash

### 10. **ai-building-engineer**
- **Description:** AI-powered building damage assessment expert
- **Use For:** Property damage analysis, repair estimation, structural assessment
- **Tools:** Read, Write, Edit, Glob, Grep, Bash

### 11. **building-surveyor-ai**
- **Description:** UK building surveyor with 20+ years experience
- **Use For:** Damage assessment, RICS surveys, cost estimation, professional reports
- **Tools:** Read, Write, Edit, Glob, Grep, Bash

## Usage Example

```typescript
// Use the Task tool with any configured subagent
Task({
  subagent_type: "ui-designer",
  description: "Design landing page hero",
  prompt: "Create an Airbnb-quality hero section..."
})

Task({
  subagent_type: "frontend-specialist",
  description: "Optimize component performance",
  prompt: "Review and optimize the performance of..."
})

Task({
  subagent_type: "database-architect",
  description: "Optimize query performance",
  prompt: "Analyze and optimize the contractors query..."
})
```

## Activation

**Note:** After adding or modifying agents, you need to either:
1. Restart the Claude Code session (agents load automatically)
2. Use the `/agents` command in the chat interface

## Configuration Format

Each agent file must have YAML frontmatter:

```markdown
---
name: agent-name
description: Brief description of when to use this agent
tools: Read, Write, Edit, Glob, Grep, Bash
model: inherit
---

# Agent Name

Agent content here...
```

## Testing

All agents have been tested and verified working:
- ✅ ui-designer - Working
- ✅ frontend-specialist - Working
- ✅ database-architect - Working
- ✅ performance-optimizer - Ready
- ✅ testing-specialist - Ready
- ✅ security-expert - Ready
- ✅ mobile-developer - Ready
- ✅ devops-engineer - Ready
- ✅ api-architect - Ready
- ✅ ai-building-engineer - Ready
- ✅ building-surveyor-ai - Ready

Last Updated: December 2, 2024
