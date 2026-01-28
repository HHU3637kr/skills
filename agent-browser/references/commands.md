# Agent Browser Command Reference

Complete reference for all agent-browser CLI commands.

## Table of Contents

- [Navigation Commands](#navigation-commands)
- [Snapshot & Information](#snapshot--information)
- [Element Interaction](#element-interaction)
- [Find Commands (Semantic Locators)](#find-commands-semantic-locators)
- [Form Controls](#form-controls)
- [Waiting & Timing](#waiting--timing)
- [Session Management](#session-management)
- [Network Control](#network-control)
- [State Management](#state-management)
- [Debugging](#debugging)
- [Global Options](#global-options)

## Navigation Commands

### open / goto / navigate
```bash
agent-browser open <url>
agent-browser goto <url>
agent-browser navigate <url>
```
Navigate to a URL. All three commands are equivalent.

**Examples:**
```bash
agent-browser open https://example.com
agent-browser goto https://github.com/vercel-labs/agent-browser
```

### back
```bash
agent-browser back
```
Navigate back in browser history.

### forward
```bash
agent-browser forward
```
Navigate forward in browser history.

### reload
```bash
agent-browser reload
```
Reload the current page.

### close
```bash
agent-browser close
```
Close the current browser session.

## Snapshot & Information

### snapshot
```bash
agent-browser snapshot [options]
```
Get accessibility tree snapshot with element references.

**Options:**
- `-i, --interactive` - Show only interactive elements
- `-c, --compact` - Remove empty structural elements
- `-d, --depth <n>` - Limit tree depth
- `-s, --selector <sel>` - Scope to CSS selector
- `--json` - Output in JSON format

**Examples:**
```bash
agent-browser snapshot                    # Full tree
agent-browser snapshot -i                 # Interactive only
agent-browser snapshot -i --json          # JSON format (best for AI)
agent-browser snapshot -d 3               # Max depth 3
agent-browser snapshot -s "#main-content" # Scope to selector
```

### screenshot
```bash
agent-browser screenshot <filename> [options]
```
Take a screenshot of the page.

**Options:**
- `--full` - Full page screenshot (not just viewport)
- `--selector <sel>` - Screenshot specific element

**Examples:**
```bash
agent-browser screenshot page.png
agent-browser screenshot --full fullpage.png
agent-browser screenshot --selector "#header" header.png
```

### get
```bash
agent-browser get <property> [ref]
```
Get information from page or element.

**Properties:**
- `text` - Get text content
- `html` - Get HTML content
- `value` - Get input value
- `attr <name>` - Get attribute value
- `title` - Get page title
- `url` - Get current URL

**Examples:**
```bash
agent-browser get url
agent-browser get title
agent-browser get text @e5
agent-browser get html @e3
agent-browser get value @e2
agent-browser get attr @e1 href
```

## Element Interaction

### click
```bash
agent-browser click <ref> [options]
```
Click an element by reference.

**Options:**
- `--button <left|right|middle>` - Mouse button (default: left)
- `--count <n>` - Click count (default: 1)
- `--delay <ms>` - Delay between clicks

**Examples:**
```bash
agent-browser click @e2
agent-browser click @e3 --button right
agent-browser click @e4 --count 2  # Double click
```

### dblclick
```bash
agent-browser dblclick <ref>
```
Double-click an element.

### hover
```bash
agent-browser hover <ref>
```
Hover over an element.

### type
```bash
agent-browser type <ref> <text> [options]
```
Type text into an element (simulates real typing with delays).

**Options:**
- `--delay <ms>` - Delay between keystrokes (default: 50ms)

**Examples:**
```bash
agent-browser type @e3 "Hello World"
agent-browser type @e3 "Slow typing" --delay 100
```

### fill
```bash
agent-browser fill <ref> <text>
```
Fill an input field (faster than type, no keystroke delays).

**Examples:**
```bash
agent-browser fill @e2 "user@example.com"
agent-browser fill @e3 "password123"
```

### press
```bash
agent-browser press <key> [ref]
```
Press a keyboard key. If ref provided, focuses element first.

**Common keys:** Enter, Tab, Escape, Backspace, Delete, ArrowUp, ArrowDown, Space

**Examples:**
```bash
agent-browser press Enter
agent-browser press Tab
agent-browser press @e2 Enter  # Focus @e2 then press Enter
```

### drag
```bash
agent-browser drag <from-ref> <to-ref>
```
Drag element from one location to another.

**Example:**
```bash
agent-browser drag @e5 @e8
```

### scroll
```bash
agent-browser scroll [options]
```
Scroll the page or element.

**Options:**
- `--to <top|bottom>` - Scroll to position
- `--by <pixels>` - Scroll by amount
- `--ref <ref>` - Scroll specific element

**Examples:**
```bash
agent-browser scroll --to bottom
agent-browser scroll --by 500
agent-browser scroll --ref @e3 --to top
```

## Find Commands (Semantic Locators)

Use semantic locators when you don't have refs from snapshot.

### find role
```bash
agent-browser find role <role> <action> [options]
```
Find element by ARIA role.

**Options:**
- `--name <text>` - Accessible name
- `--level <n>` - Heading level (for role=heading)

**Examples:**
```bash
agent-browser find role button click --name "Submit"
agent-browser find role link click --name "Learn More"
agent-browser find role textbox fill "search query"
agent-browser find role heading get text --level 1
```

**Common roles:** button, link, textbox, checkbox, radio, combobox, listbox, menu, menuitem, tab, heading

### find text
```bash
agent-browser find text <text> <action>
```
Find element containing text.

**Examples:**
```bash
agent-browser find text "Sign In" click
agent-browser find text "Welcome" get html
```

### find label
```bash
agent-browser find label <text> <action>
```
Find input by associated label text.

**Examples:**
```bash
agent-browser find label "Email" fill "user@example.com"
agent-browser find label "Password" type "secret123"
```

### find placeholder
```bash
agent-browser find placeholder <text> <action>
```
Find input by placeholder text.

**Examples:**
```bash
agent-browser find placeholder "Search..." type "query"
agent-browser find placeholder "Enter email" fill "test@test.com"
```

### find alt
```bash
agent-browser find alt <text> <action>
```
Find image by alt text.

**Example:**
```bash
agent-browser find alt "Company Logo" click
```

### find testid
```bash
agent-browser find testid <id> <action>
```
Find element by test ID attribute.

**Example:**
```bash
agent-browser find testid "submit-button" click
```

## Form Controls

### select
```bash
agent-browser select <ref> <value|label>
```
Select option from dropdown.

**Examples:**
```bash
agent-browser select @e4 "Option 1"
agent-browser select @e4 value:option1
```

### check
```bash
agent-browser check <ref>
```
Check a checkbox or radio button.

### uncheck
```bash
agent-browser uncheck <ref>
```
Uncheck a checkbox.

### upload
```bash
agent-browser upload <ref> <filepath>
```
Upload file to file input.

**Example:**
```bash
agent-browser upload @e6 document.pdf
agent-browser upload @e6 "C:\Users\file.txt"
```

## Waiting & Timing

### wait
```bash
agent-browser wait [ref] [options]
```
Wait for condition to be met.

**Options:**
- `--text <text>` - Wait for text to appear
- `--url <pattern>` - Wait for URL to match
- `--load` - Wait for page load
- `--timeout <ms>` - Timeout in milliseconds (default: 30000)

**Examples:**
```bash
agent-browser wait @e5                    # Wait for element
agent-browser wait --text "Success"       # Wait for text
agent-browser wait --url /dashboard       # Wait for URL
agent-browser wait --load                 # Wait for page load
agent-browser wait @e3 --timeout 5000     # 5 second timeout
```

### sleep
```bash
agent-browser sleep <ms>
```
Sleep for specified milliseconds.

**Example:**
```bash
agent-browser sleep 1000  # Sleep 1 second
```

## Session Management

### --session flag
```bash
agent-browser --session <name> <command>
```
Run command in named session.

**Examples:**
```bash
agent-browser --session task1 open site-a.com
agent-browser --session task2 open site-b.com
agent-browser --session task1 snapshot
```

### session list
```bash
agent-browser session list
```
List all active sessions.

### session close
```bash
agent-browser session close <name>
```
Close specific session.

**Example:**
```bash
agent-browser session close task1
```

## Network Control

### route
```bash
agent-browser route [options]
```
Intercept and control network requests.

**Options:**
- `--block <pattern>` - Block requests matching pattern
- `--mock <pattern> <file>` - Mock response with file content

**Examples:**
```bash
agent-browser route --block "*.ads.com/*"
agent-browser route --block "*/analytics/*"
agent-browser route --mock "/api/data" response.json
```

## State Management

### save-state
```bash
agent-browser save-state <filename>
```
Save browser state (cookies, storage, auth) to file.

**Example:**
```bash
agent-browser save-state auth.json
```

### load-state
```bash
agent-browser load-state <filename>
```
Load browser state from file.

**Example:**
```bash
agent-browser load-state auth.json
```

## Debugging

### highlight
```bash
agent-browser highlight <ref>
```
Highlight element on page (visual debugging).

### console
```bash
agent-browser --console <command>
```
Enable console log output.

**Example:**
```bash
agent-browser --console open example.com
```

### trace
```bash
agent-browser --trace <filename> <command>
```
Record trace for debugging.

**Example:**
```bash
agent-browser --trace trace.zip open example.com
```

## Global Options

These options can be used with any command:

- `--session <name>` - Use named session
- `--headless` - Run in headless mode (default)
- `--headed` - Run with visible browser
- `--console` - Show console logs
- `--trace <file>` - Record trace
- `--timeout <ms>` - Default timeout for operations
- `--help` - Show help
- `--version` - Show version

**Examples:**
```bash
agent-browser --headed open example.com
agent-browser --timeout 60000 wait @e5
agent-browser --session test --console open site.com
```

## State Checking Commands

### is visible
```bash
agent-browser is visible <ref>
```
Check if element is visible. Returns true/false.

### is enabled
```bash
agent-browser is enabled <ref>
```
Check if element is enabled. Returns true/false.

### is checked
```bash
agent-browser is checked <ref>
```
Check if checkbox/radio is checked. Returns true/false.

**Examples:**
```bash
agent-browser is visible @e3
agent-browser is enabled @e5
agent-browser is checked @e2
```
