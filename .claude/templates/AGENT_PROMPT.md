# Agent Onboarding Prompt

Use this prompt when spinning up a new Claude Code agent to work on less.go test fixes.

---

## Prompt Template

```
I'm working on a Go port of less.js (the CSS preprocessor). The project is attempting to create a faithful 1:1 port of all less.js functionality to Go.

**Current Status**:
- 185 active integration tests (7 quarantined for plugins/JS execution)
- 71 tests passing (38.4% success rate)
- 12 tests failing at runtime (crashes/errors during evaluation)
- 102 tests passing compilation but producing incorrect CSS output
- Parser is 100% working - all issues are in runtime evaluation

**Your Mission**:
Fix one or more failing tests by identifying root causes and implementing fixes that match the JavaScript behavior exactly.

**Important Rules**:
1. ✅ MODIFY Go code in `packages/less/src/less/less_go/`
2. ❌ NEVER modify original JavaScript code in `packages/less/src/less/`
3. ❌ NEVER modify test data files in `packages/test-data/`
4. ✅ Always compare your fix with the JavaScript implementation
5. ✅ Run all unit tests before creating a PR (zero regressions tolerance)
6. ✅ Follow the workflow in `.claude/strategy/agent-workflow.md`

**Getting Started**:
1. Read `.claude/strategy/MASTER_PLAN.md` for overall context
2. Check `.claude/tracking/assignments.json` for available tasks
3. Claim an available task by updating the JSON file
4. Read the task specification in `.claude/tasks/`
5. Follow the step-by-step workflow in `.claude/strategy/agent-workflow.md`

**Development Branch**:
- Work on branch: `claude/fix-{task-name}-{your-session-id}`
- Push to this branch when ready
- Create PR when task is complete

**Testing Commands**:
```bash
# Run specific test
pnpm -w test:go:filter -- "test-name"

# Run all unit tests (must pass before PR)
pnpm -w test:go:unit

# See overall status
pnpm -w test:go:summary

# Debug mode
LESS_GO_TRACE=1 pnpm -w test:go:filter -- "test-name"
```

**Available Tasks**:

[HUMAN: INSERT SPECIFIC TASK HERE, e.g., "Fix the import-reference tests" or "Fix namespace resolution issues"]

Please:
1. Confirm you understand the task
2. Review the relevant task file in `.claude/tasks/`
3. Create your feature branch
4. Investigate the root cause
5. Implement and test your fix
6. Create a PR following the template

Let me know when you're ready to start or if you have questions!
```

---

## Specific Task Prompts

When you know which specific task you want an agent to work on, use these specialized prompts:

### For Runtime Failure Tasks

```
I need you to fix the failing test: [TEST_NAME]

This test is currently failing at runtime with error: [ERROR_MESSAGE]

**Task Details**:
- See `.claude/tasks/runtime-failures/[TASK_FILE].md` for full context
- This is a PRIORITY task (blocking other work)
- Expected time: [TIME_ESTIMATE]

**Key Investigation Points**:
[LIST KEY AREAS TO INVESTIGATE]

**Related JavaScript Files**:
[LIST RELEVANT JS FILES TO COMPARE AGAINST]

Please follow the standard workflow and create a PR when ready.
```

### For Output Difference Tasks

```
I need you to fix tests in the [CATEGORY] category.

These tests compile successfully but produce incorrect CSS output.

**Affected Tests**:
[LIST OF TESTS]

**Common Issue**:
[DESCRIPTION OF COMMON PATTERN]

**Task Details**:
- See `.claude/tasks/output-differences/[CATEGORY].md` for full context
- These tests are related and can be fixed together
- Expected time: [TIME_ESTIMATE]

**Investigation Strategy**:
1. Run tests with LESS_GO_DIFF=1 to see output differences
2. Find common pattern in the differences
3. Locate relevant Go code
4. Compare with JavaScript implementation
5. Implement fix
6. Validate all affected tests improve

Please follow the standard workflow and create a PR when ready.
```

### For First-Time Agent

```
This is your first task on the less.go project. Welcome!

**Recommended Starting Point**: Fix a simple runtime failure to get familiar with the codebase.

**Suggested First Task**: [SIMPLE_TASK_NAME]

This task is:
- ✅ Well-defined with clear success criteria
- ✅ Isolated (won't conflict with other work)
- ✅ Estimated at 1-2 hours
- ✅ Good introduction to the codebase

**Learning Objectives**:
1. Understand the Go port structure
2. Learn how to compare with JavaScript implementation
3. Master the test/fix/validate workflow
4. Get comfortable with the debugging tools

**Step-by-Step**:
1. Read `.claude/strategy/MASTER_PLAN.md` (5 min)
2. Read `.claude/strategy/agent-workflow.md` (10 min)
3. Read your task file: `.claude/tasks/.../[TASK].md` (5 min)
4. Claim the task in `assignments.json`
5. Follow the workflow to implement your fix
6. Create your first PR!

Take your time to understand the process. Quality over speed!
```

---

## Agent Session ID Format

When claiming tasks, use a consistent session ID format:

```
{YYYYMMDD}-{HH}{MM}-{random-4-chars}

Example: 20251105-1430-a7f3
```

This helps track which agent did which work and prevents conflicts.

---

## Notes for Human Coordinators

When spinning up agents:

1. **Choose appropriate tasks** based on:
   - Agent's experience level
   - Current blocking dependencies
   - Potential for merge conflicts
   - Task complexity

2. **Distribute work strategically**:
   - Assign tasks that touch different files to different agents
   - Group related fixes together for one agent
   - Prioritize runtime failures before output differences

3. **Monitor progress**:
   - Check `assignments.json` periodically
   - Watch for agents marking tasks as `blocked`
   - Help resolve merge conflicts if multiple agents collide

4. **Review PRs quickly**:
   - Fast PR review cycle keeps agents productive
   - Merged PRs unblock dependent tasks
   - Quick feedback improves agent performance

5. **Adjust strategy**:
   - If agents struggle with certain tasks, provide more guidance
   - If tasks are too easy, assign more complex work
   - Update task files based on learnings
