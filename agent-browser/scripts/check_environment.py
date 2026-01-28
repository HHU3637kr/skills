#!/usr/bin/env python3
"""
Environment checker for agent-browser.
Verifies that all prerequisites are met before using agent-browser.
"""

import subprocess
import sys
import platform
import shutil

def check_command(command, name):
    """Check if a command is available."""
    if shutil.which(command):
        try:
            result = subprocess.run(
                [command, '--version'],
                capture_output=True,
                text=True,
                timeout=5
            )
            version = result.stdout.strip() or result.stderr.strip()
            print(f"✅ {name}: {version.split()[0] if version else 'installed'}")
            return True
        except Exception as e:
            print(f"⚠️  {name}: installed but version check failed")
            return True
    else:
        print(f"❌ {name}: not found")
        return False

def check_agent_browser():
    """Check if agent-browser is installed and working."""
    print("\n🔍 Checking agent-browser installation...")

    # Check if agent-browser command exists
    if shutil.which('agent-browser'):
        try:
            result = subprocess.run(
                ['agent-browser', '--version'],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                print(f"✅ agent-browser: {result.stdout.strip()}")
                return True
            else:
                print(f"⚠️  agent-browser: installed but not working properly")
                return False
        except Exception as e:
            print(f"⚠️  agent-browser: error checking version - {e}")
            return False
    else:
        print("❌ agent-browser: not installed")
        print("   Install with: npm install -g agent-browser")
        return False

def check_npx():
    """Check if npx is available as fallback."""
    print("\n🔍 Checking npx (fallback option)...")
    if check_command('npx', 'npx'):
        print("   You can use: npx agent-browser <command>")
        return True
    return False

def main():
    print("=" * 60)
    print("Agent Browser Environment Check")
    print("=" * 60)

    # Detect platform
    os_name = platform.system()
    print(f"\n📋 Platform: {os_name} {platform.release()}")

    # Check Node.js
    print("\n🔍 Checking prerequisites...")
    node_ok = check_command('node', 'Node.js')
    npm_ok = check_command('npm', 'npm')

    # Check agent-browser
    agent_browser_ok = check_agent_browser()

    # Check npx as fallback
    npx_ok = check_npx()

    # Platform-specific notes
    print("\n📝 Platform-specific notes:")
    if os_name == "Windows":
        print("   • On Windows, you may need to use: npx agent-browser")
        print("   • Or use Git Bash / WSL for better compatibility")
        print("   • PowerShell may have issues with global npm packages")
    elif os_name == "Linux":
        print("   • You may need to install system dependencies:")
        print("     agent-browser install --with-deps")
    elif os_name == "Darwin":
        print("   • macOS should work out of the box")

    # Summary
    print("\n" + "=" * 60)
    print("Summary:")
    print("=" * 60)

    if node_ok and npm_ok:
        print("✅ Prerequisites: OK")
    else:
        print("❌ Prerequisites: Missing Node.js or npm")
        print("   Install from: https://nodejs.org/")

    if agent_browser_ok:
        print("✅ agent-browser: Ready to use")
        print("\n🚀 Next steps:")
        print("   1. Run: agent-browser install  (if not done)")
        print("   2. Try: agent-browser open example.com")
    elif npx_ok:
        print("⚠️  agent-browser: Not installed globally")
        print("   But you can use: npx agent-browser <command>")
        print("\n🚀 To install globally:")
        print("   npm install -g agent-browser")
        print("   agent-browser install")
    else:
        print("❌ agent-browser: Not available")
        print("\n🚀 Installation steps:")
        print("   1. npm install -g agent-browser")
        print("   2. agent-browser install")
        print("   3. agent-browser open example.com")

    print("\n" + "=" * 60)

    # Return exit code
    if node_ok and npm_ok and (agent_browser_ok or npx_ok):
        return 0
    else:
        return 1

if __name__ == "__main__":
    sys.exit(main())
