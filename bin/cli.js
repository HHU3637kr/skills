#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const readline = require('readline')

const SKILLS = [
  'agent-browser', 'exp-reflect', 'exp-search', 'exp-write',
  'find-skills', 'git-workflow-sop', 'intent-confirmation',
  'json-canvas', 'obsidian-bases', 'obsidian-markdown',
  'obsidian-plugin-dev', 'skill-creator', 'spec-debug',
  'spec-end', 'spec-execute', 'spec-explore', 'spec-init',
  'spec-review', 'spec-start', 'spec-test', 'spec-update', 'spec-write'
]

const cmd = process.argv[2]
const force = process.argv.includes('--force')

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

function doInit() {
  const pkgRoot = path.join(__dirname, '..')
  const targetBase = path.join(process.cwd(), '.claude', 'skills')
  const installed = []
  const skipped = []

  for (const skill of SKILLS) {
    const src = path.join(pkgRoot, skill)
    const dest = path.join(targetBase, skill)
    if (!fs.existsSync(src)) {
      skipped.push(`${skill} (not found in package)`)
      continue
    }
    copyDirSync(src, dest)
    installed.push(skill)
  }

  console.log(`\n✓ R&K Flow skills installed to .claude/skills/`)
  console.log(`  Installed: ${installed.length} skills`)
  if (skipped.length) console.log(`  Skipped:   ${skipped.join(', ')}`)
  console.log(`\nNext: add .claude/skills/ to your CLAUDE.md @import`)
}

if (cmd === 'init') {
  const targetBase = path.join(process.cwd(), '.claude', 'skills')
  if (!force && fs.existsSync(targetBase)) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question(`.claude/skills/ already exists. Overwrite? (y/N) `, (answer) => {
      rl.close()
      if (answer.toLowerCase() === 'y') {
        doInit()
      } else {
        console.log('Aborted. Use --force to skip this prompt.')
        process.exit(0)
      }
    })
  } else {
    doInit()
  }
} else {
  console.log(`
rk-flow - R&K Flow Skills installer

Usage:
  rk-flow init           Copy all skills to .claude/skills/
  rk-flow init --force   Overwrite without confirmation
`)
}
