# Git Workflow SOP Reference

## Git Best Practices

### Commit Message Guidelines
- **Structure**: Separate subject from body with a blank line
- **Subject Line**: Limit to 50 characters, capitalize first letter, no period
- **Body**: Wrap at 72 characters, explain what/why not how
- **Types**: Use conventional types (feat, fix, docs, style, refactor, test, chore)

### Branching Strategy
- **Main Branch**: Production-ready code only
- **Feature Branches**: For new features, prefixed with `feature/`
- **Bugfix Branches**: For bug fixes, prefixed with `bugfix/`
- **Release Branches**: For release preparation, prefixed with `release/`
- **Hotfix Branches**: For urgent production fixes, prefixed with `hotfix/`

## Technical Details

### IndexedDB Implementation
The new WebSocket storage implementation uses IndexedDB for improved performance and capacity:

1. **Database Schema**:
   ```javascript
   interface WsChatDb extends DBSchema {
     kv: {
       key: string;
       value: unknown;
     };
   }
   ```

2. **Storage Keys**:
   - Messages: `materials:messages:<taskId>` or `report:messages:<taskId>`
   - Channels: `materials:channels:<taskId>` or `report:channels:<taskId>`

3. **Migration Process**:
   - Automatically migrates from localStorage to IndexedDB
   - Preserves existing data during transition
   - Cleans up old localStorage entries after migration

### WebSocket State Management
Enhanced WebSocket managers now track runtime states:

1. **Channel Runtime State**:
   ```typescript
   interface ChannelRuntimeState {
     isStreaming: boolean;
     lastIsLast: boolean;
     lastUpdatedAt?: string;
   }
   ```

2. **Active Streaming Tracking**:
   - Per-channel tracking of active agents
   - Visual indicators in UI for streaming channels
   - Automatic cleanup on connection close

## SOP Components

### 1. Status Checking
Always begin with checking repository status:
```bash
git status
```

This command shows:
- Modified files
- Staged files
- Untracked files
- Current branch information

### 2. Change Review
Review changes before staging:
```bash
git diff              # Unstaged changes
git diff --staged     # Staged changes
```

### 3. Staging Strategies
Different staging approaches for different scenarios:

**Stage all changes**:
```bash
git add .
```

**Stage specific files**:
```bash
git add src/components/Button.jsx
git add README.md
```

**Stage by pattern**:
```bash
git add *.jsx
git add docs/\*.md
```

**Interactive staging**:
```bash
git add -p        # Stage hunks interactively
```

### 4. Commit Creation
Create commits with proper messages:
```bash
git commit -m "Brief subject line

Detailed explanation of changes, wrapped at 72 characters.
Include reasoning and impact of changes."
```

### 5. Remote Synchronization
Push changes to remote repository:
```bash
git push origin main                    # Push to main branch
git push origin feature/new-feature     # Push to feature branch
git push                                # Push to tracked upstream branch
```

## Advanced Git Operations

### Cherry-Picking
Apply specific commits from other branches:
```bash
git cherry-pick <commit-hash>
```

### Rebasing
Reapply commits on top of another base:
```bash
git rebase main                         # Rebase onto main
git rebase -i HEAD~3                    # Interactive rebase
```

### Tagging
Create version tags:
```bash
git tag v1.0.0                          # Lightweight tag
git tag -a v1.0.0 -m "Version 1.0.0"    # Annotated tag
git push origin --tags                  # Push tags to remote
```

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Merge Conflicts
**Detection**:
```bash
git pull origin main
# Auto-merging <file>
# CONFLICT (content): Merge conflict in <file>
```

**Resolution**:
1. Edit conflicted files to resolve conflicts
2. Look for conflict markers: `<<<<<<<`, `=======`, `>>>>>>>`
3. Stage resolved files: `git add <resolved-files>`
4. Complete merge: `git commit`

#### 2. Accidental Commits
**Undo last commit but keep changes**:
```bash
git reset --soft HEAD~1
```

**Undo last commit and discard changes**:
```bash
git reset --hard HEAD~1
```

**Modify last commit**:
```bash
git commit --amend -m "Corrected commit message"
```

#### 3. Large Repository Size
**Check largest files**:
```bash
git ls-files | xargs ls -l | sort -k5 -n -r | head
```

**Clean large files from history** (use with caution):
```bash
git filter-branch --tree-filter 'rm -f <large-file>' HEAD
```

#### 4. Lost Commits
**Find dangling commits**:
```bash
git fsck --full
```

**Restore lost commit**:
```bash
git merge <commit-hash>
```

## Security Considerations

### Credential Management
Never commit sensitive information:
- API keys
- Passwords
- Private keys
- Database credentials

Use environment variables or secure vaults instead.

### .gitignore Best Practices
Maintain comprehensive .gitignore:
```
# Dependencies
node_modules/
venv/

# Environment files
.env
*.env

# Logs
*.log

# OS generated files
.DS_Store
Thumbs.db
```

## Performance Optimization

### Large Repository Management
For repositories with large histories:
```bash
git gc                    # Optimize repository
git fetch --depth=1       # Shallow fetch
```

### Efficient Log Viewing
```bash
git log --oneline         # Compact view
git log --graph           # Graphical view
git log --stat            # Include file stats
```

## Integration with CI/CD

### Pre-commit Hooks
Validate changes before committing:
```bash
#!/bin/bash
# Pre-commit hook example
npm test                  # Run tests
npm run lint              # Check code style
```

### Pre-push Hooks
Validate before pushing:
```bash
#!/bin/bash
# Pre-push hook example
git diff --quiet HEAD     # Check for uncommitted changes
npm run build             # Ensure build succeeds
```