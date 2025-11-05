# .claude/ Directory

This directory contains all project coordination and task management documentation for the less.go port.

## Directory Structure

```
.claude/
├── README.md                      # This file
├── strategy/                      # High-level planning and workflow
│   ├── MASTER_PLAN.md            # Overall strategy and current status
│   └── agent-workflow.md         # Step-by-step workflow for agents
├── tasks/                         # Specific task specifications
│   ├── runtime-failures/         # High-priority runtime errors (12 tests)
│   │   ├── import-reference.md
│   │   ├── namespace-resolution.md
│   │   ├── url-processing.md
│   │   └── [more tasks TBD]
│   └── output-differences/        # Tests that compile but wrong output (102 tests)
│       ├── extend-functionality.md
│       └── [more tasks TBD]
├── templates/                     # Templates for agents and PRs
│   └── AGENT_PROMPT.md           # Onboarding prompt for new agents
└── tracking/                      # Task assignment and progress tracking
    └── assignments.json           # Current task assignments

```

## Quick Start

### For New AI Agents

1. **Read** `.claude/strategy/MASTER_PLAN.md` - Understand the project status and strategy
2. **Read** `.claude/strategy/agent-workflow.md` - Learn the development workflow
3. **Check** `.claude/tracking/assignments.json` - Find available tasks
4. **Claim** a task by updating assignments.json
5. **Read** your task file in `.claude/tasks/*/your-task.md`
6. **Follow** the workflow to fix the issue
7. **Test** thoroughly before creating PR
8. **Update** assignments.json when complete

### For Humans Coordinating Agents

1. **Review** `.claude/tracking/assignments.json` to see what's in progress
2. **Spin up** agents using prompts from `.claude/templates/AGENT_PROMPT.md`
3. **Monitor** progress via assignments.json updates
4. **Review** PRs and merge quickly to unblock dependent tasks
5. **Update** task files based on learnings

## File Organization Philosophy

- **Everything organized** - No scattered documentation
- **Self-contained tasks** - Each task file has all context needed
- **Clear workflow** - Step-by-step guides for consistency
- **Easy tracking** - Single JSON file shows all task states
- **Minimal root clutter** - Keep root clean for standard files

## Relationship to Other Docs

### Root Directory Files

- **`CLAUDE.md`** - Project overview, points to this directory for detailed tasks
- **`RUNTIME_ISSUES.md`** - Detailed historical analysis (will be deleted once all runtime issues fixed)
- **`IMPORT_*_INVESTIGATION.md`** - Historical investigation notes (can be deleted once import issues fixed)

These root files provide historical context but `.claude/` is the source of truth for current work.

## Contributing New Tasks

When adding a new task file:

1. **Create** the task file in appropriate subdirectory
2. **Update** `.claude/tracking/assignments.json` with task metadata
3. **Follow** the pattern of existing task files:
   - Overview
   - Failing tests
   - Current vs expected behavior
   - Investigation starting points
   - Likely root causes
   - Implementation hints
   - Success criteria
   - Validation checklist

## Task File Template

See existing task files for examples, but generally include:

```markdown
# Task: [Name]

**Status**: Available
**Priority**: High/Medium/Low
**Estimated Time**: X-Y hours
**Complexity**: Low/Medium/High

## Overview
Brief description of what needs to be fixed

## Failing Tests
List of affected tests

## Current Behavior
What happens now (errors, wrong output, etc.)

## Expected Behavior
What should happen (with examples)

## Investigation Starting Points
Where to look in JS and Go code

## Likely Root Causes
Hypotheses about what's wrong

## Implementation Hints
Suggestions for how to fix

## Success Criteria
How to know the fix is complete

## Validation Checklist
Commands to run before creating PR
```

## Maintenance

### When a Task is Completed

1. **Update** `assignments.json` status to "completed"
2. **Keep** the task file (serves as documentation)
3. **Update** `MASTER_PLAN.md` if it affects overall strategy

### When All Tasks in a Category Complete

1. **Update** `MASTER_PLAN.md` to reflect completed phase
2. **Consider** creating a summary document for that category
3. **Celebrate** the progress!

### When All Runtime Issues Fixed

1. **Delete** `/RUNTIME_ISSUES.md` from root
2. **Update** `CLAUDE.md` to remove references to it
3. **Keep** `.claude/tasks/runtime-failures/` as historical documentation

## Questions?

If you have questions about:
- **Strategy**: See `.claude/strategy/MASTER_PLAN.md`
- **Workflow**: See `.claude/strategy/agent-workflow.md`
- **Specific task**: See `.claude/tasks/*/*.md`
- **Task status**: See `.claude/tracking/assignments.json`
- **Getting started**: See `.claude/templates/AGENT_PROMPT.md`

---

**Last Updated**: 2025-11-05
**Maintained By**: Project maintainers and contributing agents
