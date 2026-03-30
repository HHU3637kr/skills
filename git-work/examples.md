# Git Workflow SOP Examples

## Example 1: Refactoring Project Structure

### Scenario
You've completed a major refactoring of the project structure, moving files and updating configurations.

### Process
```bash
# Check current status
git status

# Review changes in detail
git diff

# Stage all changes
git add .

# Create descriptive commit message
git commit -m "重构WebSocket聊天存储，使用IndexedDB替换localStorage以防止浏览器崩溃

主要变更：
1. 新增IndexedDB存储实现，解决localStorage容量限制导致的浏览器崩溃问题
2. 实现从localStorage到IndexedDB的平滑迁移
3. 增强WebSocket频道状态管理，添加运行时状态追踪
4. 优化前端UI，添加频道输出状态指示器
5. 重构WebSocket管理器，改善消息持久化机制
6. 更新Claude Code配置，切换到新的API端点和模型

解决了长期存在的localStorage限制问题，提升了系统的稳定性和用户体验。"

# Push to remote
git push origin main
```

## Example 2: Adding New Features

### Scenario
You've implemented a new feature and want to document the process.

### Process
```bash
# Check current status
git status

# Review changes
git diff

# Stage changes
git add .

# Create commit with feature description
git commit -m "Add real-time channel status indicators

- Implement WebSocket channel runtime state tracking
- Add visual indicators for streaming channels
- Persist active channel selection in localStorage
- Improve WebSocket connection management
- Add IndexedDB storage for chat messages"

# Push to remote repository
git push origin feature/channel-status
```

## Example 3: Bug Fixes

### Scenario
You've fixed a critical bug and need to follow the SOP.

### Process
```bash
# Check status
git status

# Review changes
git diff

# Stage fixes
git add .

# Create commit message focusing on the bug fix
git commit -m "Fix WebSocket connection cleanup on session reset

- Clear streaming agent keys when resetting WebSocket manager
- Reset channel states properly on session termination
- Notify channel runtime state subscribers on cleanup
- Prevent memory leaks from uncleared WebSocket connections"

# Push changes
git push origin bugfix/websocket-cleanup
```

## Example 4: Documentation Updates

### Scenario
You're updating project documentation and creating SOP skills.

### Process
```bash
# Check status
git status

# Review documentation changes
git diff

# Stage documentation files
git add .

# Create commit focusing on documentation
git commit -m "Add Git workflow SOP skill and examples

- Create standardized procedure for Git operations
- Include best practices for commit messages
- Add troubleshooting guidelines
- Provide real-world examples for different scenarios
- Document related Git commands for quick reference"

# Push to remote
git push origin docs/git-sop
```

## Best Practice Patterns

### 1. Atomic Commits
Make small, focused commits that address a single concern:
```bash
git add src/components/Button.jsx
git commit -m "Add primary button component with hover effects"

git add src/styles/buttons.css
git commit -m "Add CSS styles for button variants"
```

### 2. Descriptive Branch Names
Use descriptive branch names that indicate the purpose:
```bash
git checkout -b feature/user-authentication
git checkout -b bugfix/login-error-handling
git checkout -b docs/api-documentation
git checkout -b refactor/database-connection-pool
```

### 3. Conventional Commit Messages
Follow conventional commit formatting:
```bash
# Feature
git commit -m "feat: add user authentication module"

# Bug fix
git commit -m "fix: resolve login timeout issue"

# Documentation
git commit -m "docs: update API reference documentation"

# Refactor
git commit -m "refactor: optimize database queries"

# Test
git commit -m "test: add unit tests for payment processing"
```