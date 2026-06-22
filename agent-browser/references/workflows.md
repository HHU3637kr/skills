# Agent Browser AI Workflow Patterns

Proven patterns for using agent-browser with AI agents in Claude Code.

## Core AI Workflow Pattern

The fundamental pattern for AI-driven browser automation:

```
1. Navigate → 2. Snapshot → 3. Analyze → 4. Act → 5. Verify → Repeat
```

### Step-by-Step

**1. Navigate to target page**
```bash
agent-browser open https://example.com
```

**2. Get structured snapshot**
```bash
agent-browser snapshot -i --json > page.json
```

**3. AI analyzes JSON to:**
- Identify interactive elements and their refs
- Understand page structure
- Determine available actions
- Plan next steps

**4. Execute actions using refs**
```bash
agent-browser click @e2
agent-browser fill @e5 "input data"
```

**5. Verify results**
```bash
agent-browser snapshot -i --json > updated.json
agent-browser screenshot verification.png
```

**6. Repeat until goal achieved**

## Pattern 1: Form Automation

**Use case:** Fill and submit web forms

```bash
# 1. Navigate to form
agent-browser open https://forms.example.com/contact

# 2. Get form structure
agent-browser snapshot -i --json > form.json

# AI analyzes form.json to identify:
# - @e1: Name field
# - @e2: Email field
# - @e3: Message textarea
# - @e4: Submit button

# 3. Fill form fields
agent-browser fill @e1 "John Doe"
agent-browser fill @e2 "john@example.com"
agent-browser fill @e3 "This is my message"

# 4. Submit
agent-browser click @e4

# 5. Wait for confirmation
agent-browser wait --text "Thank you"
agent-browser screenshot success.png
```

**Key points:**
- Use `snapshot -i --json` to identify form fields
- Fill fields in logical order
- Wait for submission confirmation
- Capture screenshot as proof

## Pattern 2: Multi-Step Navigation

**Use case:** Navigate through multiple pages to reach target

```bash
# 1. Start at homepage
agent-browser open https://example.com

# 2. Find and click navigation link
agent-browser snapshot -i --json > home.json
# AI identifies @e5 as "Products" link
agent-browser click @e5

# 3. Wait for page load
agent-browser wait --load

# 4. Navigate to specific product
agent-browser snapshot -i --json > products.json
# AI identifies @e12 as target product
agent-browser click @e12

# 5. Extract product data
agent-browser wait --load
agent-browser snapshot -i --json > product.json
agent-browser get text @e8 > product-name.txt
agent-browser get text @e9 > product-price.txt
agent-broreenshot product.png
```

**Key points:**
- Use `wait --load` between navigations
- Take snapshots at each step
- Extract data incrementally
- Save screenshots for verification

## Pattern 3: Authentication Flow

**Use case:** Login and maintain session

```bash
# 1. Navigate to login page
agent-browser open https://app.example.com/login

# 2. Get login form
agent-browser snapshot -i --json > login.json
# AI identifies @e1: username, @e2: password, @e3: submit

# 3. Fill credentials
agent-browser fill @e1 "username"
agent-browser fill @e2 "password"
agent-browser click @e3

# 4. Wait for redirect to dashboard
agent-browser wait --url /dashboard

# 5. Save authenticated state
agent-browser save-state auth.json

# 6. Continue with authenticated actions
agent-browser goto https://app.example.com/data
agent-browser snapshot -i --json > data.json
```

**Reusing authentication:**
```bash
# In new session, load saved state
agent-browser load-state auth.json
agent-browser goto https://app.example.com/data
# Already authenticated!
```

**Key points:**
- Wait for URL change after login
- Save state for reuse
- Load state in new sessions to skip login

## Pattern 4: Data Extraction

**Use case:** Scrape structured data from pages

```bash
# 1. Navigate to data page
agent-browser open https://data.example.com/table

# 2. Get page structure
agent-browser snapshot -i --json > structure.json

# AI analyzes to find:
# - Table rows: @e10, @e11, @e12...
# - Pagination: @e50 (Next button)

# 3. Extract data from current page
agent-browser get text @e10 > row1.txt
agent-browser get text @e11 > row2.txt
agent-browser get text @e12 > row3.txt

# 4. Navigate to next page
agent-browser click @e50  # Next button
agent-browser wait --load

# 5. Repeat extraction
agent-browser snapshot -i --json > page2.json
# Continue extraction...
```

**Key points:**
- Identify data patterns in snapshot
- Extract systematically
- Handle pagination
- Save data incrementally

## Pattern 5: Search and Filter

**Use case:** Search for specific content

```bash
# 1. Navigate to search page
agent-browser open https://example.com/search

# 2. Get search interface
agent-browser snapshot -i --json > search.json
# AI identifies @e2: search input, @e3: search button

# 3. Enter search query
agent-browser fill @e2 "target keyword"
agent-browser click @e3

# 4. Wait for results
agent-browser wait --text "results"
agent-browser snapshot -i --json > results.json

# 5. Apply filters if needed
# AI identifies @e15: filter dropdown
agent-browser select @e15 "Most Recent"
agent-browser wait --load

# 6. Extract results
agent-browser snapshot -i --json > filtered.json
agent-browser screenshot results.png
```

**Key points:**
- Wait for search results to load
- Apply filters incrementally
- Re-snapshot after each filter
- Capture final results

## Pattern 6: Parallel Sessions

**Use case:** Run multiple browser tasks simultaneously

```bash
# Session 1: Monitor site A
agent-browser --session monitor-a open https://site-a.com/status
agent-browser --session monitor-a snapshot -i --json > status-a.json

# Session 2: Monitor site B
agent-browser --session monitor-b open https://site-b.com/status
agent-browser --session monitor-b snapshot -i --json > status-b.json

# Session 3: Perform task C
agent-browser --session task-c open https://site-c.com/form
agent-browser --session task-c snapshot -i --json > form-c.json

# Each session maintains separate:
# - Cookies and authentication
# - Navigation history
# - Page state
```

**Key points:**
- Use `--session` flag for isolation
- Each session is independent
- Useful for parallel monitoring or testing
- List sessions with `agent-browser session list`

## Pattern 7: Dynamic Content Handling

**Use case:** Wait for JavaScript-rendered content

```bash
# 1. Navigate to dynamic page
agent-browser open https://spa.example.com

# 2. Wait for initial load
agent-browser wait --load

# 3. Wait for specific content to appear
agent-browser wait --text "Loading complete"

# 4. Or wait for specific element
agent-browser snapshot -i --json > initial.json
# AI identifies that @e5 should appear when loaded
agent-browser wait @e5 --timeout 10000

# 5. Get final snapshot
agent-browser snapshot -i --json > loaded.json
```

**Key points:**
- Use `wait --load` for page load
- Use `wait --text` for specific content
- Use `wait @ref` for specific elements
- Set appropriate timeouts

## Pattern 8: Error Handling

**Use case:** Gracefully handle failures

```bash
# 1. Try action with timeout
agent-browser click @e5
agent-browser wait --url /success --timeout 5000

# If timeout occurs, AI should:
# 2. Take diagnostic screenshot
agent-browser screenshot error-state.png

# 3. Get current page state
agent-browser snapshot -i --json > error.json
agent-browser get url > current-url.txt

# 4. Check for error messages
agent-browser get text @e10  # Potential error message element

# 5. Decide next action:
# - Retry with different approach
# - Use semantic locator as fallback
# - Report failure with evidence
```

**Key points:**
- Set reasonable timeouts
- Capture state on failure
- Provide diagnostic information
- Have fallback strategies

## Pattern 9: Semantic Locator Fallback

**Use case:** When refs aren't available or change

```bash
# Primary approach: Use refs from snapshot
agent-browser snapshot -i --json > page.json
# AI tries to use @e5 but it's not found

# Fallback: Use semantic locators
agent-browser find role button click --name "Submit"
# or
agent-browser find text "Submit" click
# or
agent-browser find label "Email" fill "user@example.com"
```

**Key points:**
- Refs are preferred (more reliable)
- Semantic locators as fallback
- Use role-based locators when possible
- Text-based locators as last resort

## Pattern 10: Verification and Evidence

**Use case:** Prove task completion

```bash
# After completing task, gather evidence:

# 1. Final screenshot
agent-browser screenshot final-state.png

# 2. Final page snapshot
agent-browser snapshot -i --json > final.json

# 3. Extract confirmation text
agent-browser get text @e20 > confirmation.txt

# 4. Get final URL
agent-browser get url > final-url.txt

# 5. Save session state if needed
agent-browser save-state completed.json
```

**Key points:**
- Always capture final state
- Screenshot provides visual proof
- Extract confirmation messages
- Save state for reproducibility

## Best Practices Summary

1. **Always use `-i --json` for snapshots** - Cleaner, AI-friendly format
2. **Wait appropriately** - Use `wait --load`, `wait --text`, or `wait @ref`
3. **Take screenshots** - Visual confirmation at key steps
4. **Use refs when available** - More reliable than selectors
5. **Have fallback strategies** - Semantic locators when refs fail
6. **Capture evidence** - Screenshots and snapshots for verification
7. **Use sessions for isolation** - Parallel tasks or different contexts
8. **Save authentication state** - Reuse login sessions
9. **Handle errors gracefully** - Diagnostic info and fallbacks
10. **Verify completion** - Confirm task success before finishing

## Common Pitfalls to Avoid

❌ **Don't skip waiting** - Pages need time to load
❌ **Don't assume refs are stable** - Re-snapshot after page changes
❌ **Don't ignore errors** - Capture diagnostic information
❌ **Don't use complex selectors** - Use refs or semantic locators
❌ **Don't forget timeouts** - Set appropriate limits
❌ **Don't skip verification** - Always confirm task completion

## AI Decision Framework

When using agent-browser, AI should:

1. **Analyze snapshot** → Understand page structure
2. **Identify goal** → What needs to be accomplished
3. **Plan actions** → Sequence of steps using refs
4. **Execute** → Run commands with appropriate waits
5. **Verify** → Check results match expectations
6. **Adapt** → Use fallbacks if primary approach fails
7. **Document** → Capture evidence of completion
