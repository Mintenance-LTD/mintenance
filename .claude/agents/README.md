# Custom Agents for Mintenance Platform

This directory contains specialized AI agents configured to assist with different aspects of the Mintenance platform development.

## Available Agents

### 🎨 Frontend Specialist (`frontend-specialist.md`)
Expert in React, TypeScript, and modern web development practices.
- **Use for**: Component architecture, design systems, UI/UX implementation
- **Strengths**: Accessibility, performance optimization, responsive design
- **Invoke with**: Questions about React patterns, component design, frontend best practices

### ⚡ Performance Optimizer (`performance-optimizer.md`)
Specialist in web performance, Core Web Vitals, and optimization strategies.
- **Use for**: Bundle optimization, loading performance, runtime efficiency
- **Strengths**: Lighthouse scores, caching strategies, code splitting
- **Invoke with**: Performance issues, slow loading times, bundle size problems

### 🗄️ Database Architect (`database-architect.md`)
PostgreSQL and Supabase expert with focus on scalable database design.
- **Use for**: Schema design, query optimization, RLS policies
- **Strengths**: Indexing strategies, real-time subscriptions, migrations
- **Invoke with**: Database performance, schema changes, complex queries

## How to Use Agents

### 1. Direct Invocation
Reference the agent in your prompt:
```
@frontend-specialist How can I optimize this React component for performance?
```

### 2. Context Loading
Load an agent for your session:
```
Load the performance-optimizer agent and help me analyze my bundle size
```

### 3. Multiple Agents
Combine expertise from multiple agents:
```
Using both @database-architect and @performance-optimizer, how can I optimize this data fetching pattern?
```

## Creating New Agents

To create a new specialized agent:

1. **Create a new markdown file** in `.claude/agents/`:
```bash
touch .claude/agents/your-agent-name.md
```

2. **Define the agent structure**:
```markdown
# Agent Name

You are a [role description].

## Core Responsibilities
- List main responsibilities
- Define scope of expertise

## Technical Expertise
- Technologies
- Tools
- Frameworks

## Best Practices
- Guidelines
- Standards
- Patterns

## Response Format
How the agent should structure responses

## Project-Specific Context
Relevant project details
```

3. **Customize for your needs**:
- Add code examples
- Include decision frameworks
- Define anti-patterns to avoid
- Add reference documentation

## Agent Templates

### Security Specialist Template
```markdown
# Security Specialist Agent

You are a cybersecurity expert focused on application security.

## Core Responsibilities
- Implement authentication/authorization
- Prevent common vulnerabilities (OWASP Top 10)
- Secure data handling and encryption
- Audit security policies

## Security Checklist
- [ ] Input validation
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF tokens
- [ ] Rate limiting
- [ ] Secure headers
```

### API Designer Template
```markdown
# API Designer Agent

You are a REST/GraphQL API design specialist.

## Core Responsibilities
- Design RESTful endpoints
- Implement GraphQL schemas
- Define API contracts
- Version management

## API Standards
- Resource naming conventions
- HTTP method semantics
- Status code usage
- Error response format
```

### Testing Specialist Template
```markdown
# Testing Specialist Agent

You are a QA engineer specializing in automated testing.

## Core Responsibilities
- Unit test coverage
- Integration testing
- E2E test scenarios
- Performance testing

## Testing Strategy
- Test pyramid approach
- Coverage targets
- CI/CD integration
- Test data management
```

## Best Practices for Agent Creation

1. **Be Specific**: Define clear boundaries of expertise
2. **Include Examples**: Provide code snippets and patterns
3. **Set Standards**: Define coding conventions and quality metrics
4. **Project Context**: Include project-specific requirements
5. **Update Regularly**: Keep agents current with project evolution

## Agent Maintenance

### Review Schedule
- Weekly: Update with new patterns discovered
- Monthly: Review and refine agent responses
- Quarterly: Major updates and new agent creation

### Feedback Loop
1. Track agent effectiveness
2. Collect developer feedback
3. Refine agent instructions
4. Share improvements across team

## Integration with Development Workflow

### Pre-commit Hooks
Use agents to review code before commits:
```bash
# .git/hooks/pre-commit
echo "Checking with frontend-specialist agent..."
# Agent validation logic
```

### PR Reviews
Reference agents in pull request templates:
```markdown
## Checklist
- [ ] Reviewed by @frontend-specialist for UI best practices
- [ ] Validated by @performance-optimizer for bundle impact
- [ ] Checked by @database-architect for query efficiency
```

### Documentation Generation
Use agents to maintain documentation:
```bash
# Generate component docs
echo "Generate documentation for this component" | agent-cli frontend-specialist
```

## Troubleshooting

### Agent Not Responding
- Ensure file exists in `.claude/agents/`
- Check markdown syntax is valid
- Verify agent name matches filename

### Conflicting Advice
- Agents may have different perspectives
- Prioritize based on current task focus
- Combine insights for comprehensive solution

### Performance Issues
- Keep agent files concise (<1000 lines)
- Split large agents into specialized sub-agents
- Cache frequently used agent contexts

## Future Agents Roadmap

- [ ] DevOps Engineer - CI/CD, deployment, monitoring
- [ ] Mobile Developer - React Native specialist
- [ ] Data Analyst - Analytics, reporting, insights
- [ ] UX Researcher - User testing, accessibility
- [ ] Project Manager - Agile processes, planning

---

For questions or suggestions about agents, please open an issue in the project repository.