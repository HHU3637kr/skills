# Agent Browser Troubleshooting

Common issues and solutions when using agent-browser.

## Installation Issues

### Issue: `/bin/sh` not found on Windows

**Error:**
```
& : The term '/bin/sh.exe' is not recognized as the name of a cmdlet, function, script file, or operable program.
```

**Cause:** agent-browser's npm global script tries to use Unix shell on Windows.

**Solutions:**

1. **Use npx (Recommended)**
```bash
npx agent-browser <command>
```

2. **Use Git Bash**
```bash
# In Git Bash terminal
agent-browser <command>
```

3. **Use WSL (Windows Subsystem for Linux)**
```bash
# In WSL terminal
npm install -g agent-browser
agent-browser install
agent-browser <command>
```

### Issue: Chromium download fails

**Error:**
```
Failed to download Chromium
```

**Solutions:**

1. **Check network connection**
```bash
# Test connectivity
ping playwright.azureedge.net
```

2. **Use proxy if needed**
```bash
# Set proxy environment variables
set HTTPS_PROXY=http://proxy.example.com:8080
agent-browser install
```

3. **Manual Playwright installation**
```bash
npx playwright install chromium
```

### Issue: Linux dependencies missing

**Error:**
```
Error: Host system is missing dependencies
```

**Solution:**
```bash
# Install with dependencies
agent-browser install --with-deps

# Or install Playwright dependencies manually
npx playwright install-deps chromium
```

## Runtime Issues

### Issue: Command hangs or times out

**Symptoms:** Command doesn't complete, no output

**Solutions:**

1. **Increase timeout**
```bash
agent-browser --timeout 60000 wait @e5
```

2. **Check if element exists**
```bash
# Get snapshot first to verify element
agent-browser snapshot -i --json
```

3. **Use headless mode**
```bash
# Headed mode can be slower
agent-browser --headless open example.com
```

4. **Check for dynamic content**
```bash
# Wait for page load first
agent-browser wait --load
agent-browser snapshot -i --json
```

### Issue: Element not found

**Error:**
```
Error: Element @e5 not found
```

**Causes:**
- Page changed after snapshot
- Element is not interactive
- Element loaded dynamically

**Solutions:**

1. **Re-snapshot after page changes**
```bash
agent-browser click @e2
agent-browser wait --load
agent-browser snapshot -i --json  # Get fresh refs
```

2. **Use semantic locators as fallback**
```bash
# Instead of @e5
agent-browser find role button click --name "Submit"
```

3. **Wait for element to appear**
```bash
agent-browser wait @e5 --timeout 10000
```

4. **Check if element is interactive**
```bash
# Use snapshot without -i flag to see all elements
agent-browser snapshot --json
```

### Issue: Click doesn't work

**Symptoms:** Click command succeeds but nothing happens

**Solutions:**

1. **Wait for element to be ready**
```bash
agent-browser wait @e5
agent-browser click @e5
```

2. **Check if element is visible**
```bash
agent-browser is visible @e5
agent-browser is enabled @e5
```

3. **Try double-click**
```bash
agent-browser dblclick @e5
```

4. **Use semantic locator**
```bash
agent-browser find role button click --name "Submit"
```

5. **Check for overlays or modals**
```bash
# Take screenshot to see page state
agent-browser screenshot debug.png
```

### Issue: Form submission fails

**Symptoms:** Form doesn't submit or validation errors

**Solutions:**

1. **Fill all required fields**
```bash
# Get snapshot to identify all fields
agent-browser snapshot -i --json
```

2. **Use correct input method**
```bash
# Use 'fill' for simple text
agent-browser fill @e2 "text"

# Use 'type' for fields with validation
agent-browser type @e2 "text"
```

3. **Press Enter instead of clicking submit**
```bash
agent-browser press @e2 Enter
```

4. **Wait between field fills**
```bash
agent-browser fill @e1 "value1"
agent-browser sleep 500
agent-browser fill @e2 "value2"
```

### Issue: Authentication doesn't persist

**Symptoms:** Logged out after navigation

**Solutions:**

1. **Save and load state**
```bash
# After login
agent-browser save-state auth.json

# In new session
agent-browser load-state auth.json
```

2. **Use same session**
```bash
# All commands in same session
agent-browser --session myapp open https://app.com/login
agent-browser --session myapp fill @e1 "user"
agent-browser --session myapp fill @e2 "pass"
agent-browser --session myapp click @e3
agent-browser --session myapp goto https://app.com/data
```

3. **Check cookie settings**
```bash
# Some sites require specific cookie handling
# Use headed mode to debug
agent-browser --headed open https://app.com
```

## Snapshot Issues

### Issue: Snapshot too large

**Symptoms:** JSON output is huge, hard to parse

**Solutions:**

1. **Use interactive filter**
```bash
agent-browser snapshot -i --json
```

2. **Use compact mode**
```bash
agent-browser snapshot -i -c --json
```

3. **Limit depth**
```bash
agent-browser snapshot -i -d 3 --json
```

4. **Scope to specific area**
```bash
agent-browser snapshot -i -s "#main-content" --json
```

### Issue: Snapshot missing elements

**Symptoms:** Expected elements not in snapshot

**Solutions:**

1. **Remove -i flag to see all elements**
```bash
agent-browser snapshot --json
```

2. **Wait for dynamic content**
```bash
agent-browser wait --load
agent-browser wait --text "Content loaded"
agent-browser snapshot -i --json
```

3. **Check if in iframe**
```bash
# Snapshots don't include iframe content
# May need to navigate into iframe
```

## Session Issues

### Issue: Session conflicts

**Symptoms:** Commands affect wrong session

**Solution:**
```bash
# Always specify session explicitly
agent-browser --session task1 <command>

# List active sessions
agent-browser session list

# Close unused sessions
agent-browser session close task1
```

### Issue: Too many sessions

**Symptoms:** Performance degradation

**Solution:**
```bash
# Close sessions when done
agent-browser --session task1 close

# Or close all and start fresh
# (restart agent-browser process)
```

## Performance Issues

### Issue: Slow execution

**Solutions:**

1. **Use headless mode**
```bash
agent-browser --headless <command>
```

2. **Reduce snapshot size**
```bash
agent-browser snapshot -i -c --json
```

3. **Block unnecessary resources**
```bash
agent-browser route --block "*.ads.com/*"
agent-browser route --block "*/analytics/*"
```

4. **Use fill instead of type**
```bash
# Faster
agent-browser fill @e2 "text"

# Slower (simulates typing)
agent-browser type @e2 "text"
```

## Platform-Specific Issues

### Windows

**Issue: PowerShell execution policy**
```
cannot be loaded because running scripts is disabled
```

**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Issue: Path with spaces**
```bash
# Use quotes
agent-browser upload @e5 "C:\Users\My Documents\file.pdf"
```

### Linux

**Issue: Missing system dependencies**
```bash
# Install all dependencies
sudo npx playwright install-deps chromium
```

**Issue: Permission denied**
```bash
# Check file permissions
chmod +x $(which agent-browser)
```

### macOS

**Issue: Security warning**
```
"agent-browser" cannot be opened because the developer cannot be verified
```

**Solution:**
```bash
# Allow in System Preferences > Security & Privacy
# Or use:
xattr -d com.apple.quarantine $(which agent-browser)
```

## Debugging Strategies

### Enable verbose output

```bash
# Show console logs
agent-browser --console open example.com

# Enable tracing
agent-browser --trace trace.zip open example.com
```

### Visual debugging

```bash
# Run in headed mode
agent-browser --headed open example.com

# Highlight elements
agent-browser highlight @e5

# Take screenshots at each step
agent-browser screenshot step1.png
```

### Diagnostic information

```bash
# Get current state
agent-browser get url
agent-browser get title
agent-browser snapshot --json > debug.json
agent-browser screenshot debug.png

# Check element state
agent-browser is visible @e5
agent-browser is enabled @e5
agent-browser get text @e5
```

## Common Error Messages

### "Browser not installed"
```bash
agent-browser install
```

### "Session not found"
```bash
# Check active sessions
agent-browser session list

# Create new session
agent-browser --session newsession open example.com
```

### "Timeout exceeded"
```bash
# Increase timeout
agent-browser --timeout 60000 <command>

# Or wait explicitly
agent-browser wait --load
agent-browser wait @e5 --timeout 30000
```

### "Element is not visible"
```bash
# Wait for element
agent-browser wait @e5

# Scroll to element
agent-browser scroll --ref @e5

# Check if element exists
agent-browser snapshot --json | grep @e5
```

## Getting Help

### Check version
```bash
agent-browser --version
```

### View command help
```bash
agent-browser --help
agent-browser <command> --help
```

### Report issues
- GitHub: https://github.com/vercel-labs/agent-browser/issues
- Include: OS, Node version, error message, minimal reproduction

## Quick Diagnostic Checklist

When something doesn't work:

1. ✅ Is agent-browser installed? `agent-browser --version`
2. ✅ Is Chromium installed? `agent-browser install`
3. ✅ Is the page loaded? `agent-browser wait --load`
4. ✅ Does the element exist? `agent-browser snapshot -i --json`
5. ✅ Is the element visible? `agent-browser is visible @e5`
6. ✅ Is the element enabled? `agent-browser is enabled @e5`
7. ✅ Is the timeout sufficient? `--timeout 30000`
8. ✅ Are you using the right session? `--session name`
9. ✅ Have you taken a screenshot? `agent-browser screenshot debug.png`
10. ✅ Have you tried semantic locators? `find role button click`
