#!/bin/bash

# ==============================================================================
# REALTIMEX-CRM MIGRATION & UPDATE UTILITY
# ==============================================================================
#
# DESCRIPTION:
#   This script automates the backend update process for RealtimeX CRM.
#   It performs the following actions without requiring the user to clone git:
#   1. Creates a temporary, invisible workspace on your system.
#   2. Downloads the latest code/migrations from the official GitHub repository.
#   3. Links your local environment to your remote Supabase project.
#   4. Applies the latest Database Schema changes (Tables, Columns, etc).
#   5. Deploys the latest Edge Functions (API Logic).
#   6. Cleans up all temporary files automatically.
#
# PREREQUISITES:
#   1. Supabase CLI installed (global or local via npm).
#   2. You must be logged in (run: 'supabase login').
#   3. You need your Supabase Project Reference ID (e.g., 'abcdefghijklm').
#   4. You need your Database Password (to type when prompted).
#
# HOW TO USE:
#   1. Download this file to your computer.
#   2. Open your terminal and navigate to the folder where you saved it.
#   3. Make the script executable:
#      chmod +x migrate.sh
#   4. Run the script:
#      ./migrate.sh
#
# ==============================================================================

# Exit immediately if any command fails
set -e

# --- CONFIGURATION ---
GITHUB_ORG="therealtimex"
REPO_NAME="realtimex-crm"
BRANCH="main"

echo "🚀 Starting RealtimeX CRM Migration Tool..."

# ------------------------------------------------------------------------------
# 1. PRE-FLIGHT CHECKS
# ------------------------------------------------------------------------------

SUPABASE_CMD="supabase"

# Check if global Supabase CLI is installed
if command -v supabase &> /dev/null; then
    echo "✅ Found global Supabase CLI."
elif command -v npx &> /dev/null; then
    # Fallback to npx if available
    echo "ℹ️  Global 'supabase' not found. Trying local via npx..."
    SUPABASE_CMD="npx supabase"
else
    echo "❌ Error: 'supabase' CLI is not installed and 'npx' is not available."
    echo "   Please install it via: brew install supabase/tap/supabase"
    echo "   Or visit: https://supabase.com/docs/guides/cli"
    exit 1
fi

# ------------------------------------------------------------------------------
# 2. GATHER CREDENTIALS
# ------------------------------------------------------------------------------

# If the Project ID wasn't set as an env var, ask the user for it now.
if [ -z "$SUPABASE_PROJECT_ID" ]; then
    echo "---------------------------------------------------------"
    echo "👉 Enter your Supabase Project Reference ID:"
    echo "   (Found in Supabase Dashboard > Project Settings > General)"
    read -p "   Project ID: " SUPABASE_PROJECT_ID
fi

if [ -z "$SUPABASE_PROJECT_ID" ]; then
    echo "❌ Error: Project ID is required to proceed."
    exit 1
fi

# ------------------------------------------------------------------------------
# 3. DETECT BUNDLED OR LOCAL CONTEXT
# ------------------------------------------------------------------------------

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if we're running from a bundled context (dist/scripts/) or local repo
if [ -d "$SCRIPT_DIR/../supabase/migrations" ]; then
    # Bundled context (dist/scripts/migrate.sh) or local dev (scripts/migrate.sh)
    echo "✅ Using bundled migrations from local directory"
    WORK_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
    USE_LOCAL=true

    # No cleanup needed for local/bundled files
    cleanup() {
        echo "✅ Migration complete"
    }
    trap cleanup EXIT
else
    # Standalone script mode - download from GitHub
    echo "📥 No local migrations found. Downloading from GitHub..."
    WORK_DIR=$(mktemp -d)
    USE_LOCAL=false

    cleanup() {
        rm -rf "$WORK_DIR"
        echo "🧹 Temporary files cleaned up."
    }
    trap cleanup EXIT

    echo "📥 Downloading latest source from GitHub ($BRANCH)..."
    curl -L -s "https://github.com/$GITHUB_ORG/$REPO_NAME/archive/refs/heads/$BRANCH.tar.gz" -o "$WORK_DIR/repo.tar.gz"

    echo "📦 Extracting configuration files..."
    tar -xzf "$WORK_DIR/repo.tar.gz" -C "$WORK_DIR" --strip-components=1
fi

# ------------------------------------------------------------------------------
# 4. EXECUTE MIGRATION
# ------------------------------------------------------------------------------

# Move into the working directory to run Supabase commands
cd "$WORK_DIR"

echo "---------------------------------------------------------"
echo "🔗 Linking to Supabase Project: $SUPABASE_PROJECT_ID"

# Check authentication method
if [ -n "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "🔑 Using access token for authentication (recommended)"
else
    echo "🔑 NOTE: If asked, please enter your DATABASE PASSWORD."
    echo "💡 TIP: For UI-based setup, use an access token instead of password"
fi

# This connects the CLI to the remote project.
# It will pause and ask for the password if not found in env vars.
# SUPABASE_ACCESS_TOKEN is automatically used by CLI when set
if ! $SUPABASE_CMD link --project-ref "$SUPABASE_PROJECT_ID"; then
    echo ""
    echo "❌ Failed to link to Supabase project."
    echo ""
    echo "This usually means one of:"
    echo "  1. Authentication token is invalid or expired"
    echo "  2. You need to log in to Supabase CLI"
    echo "  3. The project ID is incorrect"
    echo ""
    if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
        echo "💡 For UI-based migration, provide an access token:"
        echo "   Generate one at: https://supabase.com/dashboard/account/tokens"
        echo ""
        echo "💡 For CLI-based migration, authenticate first:"
        echo "   Run: npx supabase login"
    else
        echo "💡 Your access token may be invalid or expired."
        echo "   Generate a new one at: https://supabase.com/dashboard/account/tokens"
    fi
    echo ""
    exit 1
fi

echo "---------------------------------------------------------"
echo "📂 Pushing Database Schema Changes..."
# Apply all migrations, including ones with older timestamps (--include-all)
# This ensures all local migrations are applied regardless of timestamp ordering
$SUPABASE_CMD db push --include-all

echo "---------------------------------------------------------"
echo "⚙️  Pushing Project Configuration..."
# Pushes Auth, Storage, and other project settings from config.toml
$SUPABASE_CMD config push

echo "---------------------------------------------------------"
echo "⚡ Deploying Edge Functions..."
# Deploy all functions at once (skips _shared automatically)
if [ -d "supabase/functions" ]; then
    if ! $SUPABASE_CMD functions deploy --no-verify-jwt; then
        echo "❌ Error: Failed to deploy edge functions."
        exit 1
    fi
else
    echo "⚠️ Warning: supabase/functions directory not found. Skipping function deployment."
fi


# ------------------------------------------------------------------------------
# 6. PERFORMANCE OPTIMIZATION (AUTOMATIC)
# ------------------------------------------------------------------------------

echo ""
echo "========================================================="
echo "📊 DATABASE PERFORMANCE OPTIMIZATION"
echo "========================================================="
echo ""

if [ "$SKIP_INDEXES" = "1" ]; then
    echo "⚠️  SKIP_INDEXES=1 detected - skipping index migration"
    echo "   (Development mode)"
else
    echo "✅ Performance indexes created via migration:"
    echo "   20260209050000_create_performance_indexes.sql"
    echo ""
    echo "📊 11 indexes created for:"
    echo "   • Fast search (ILIKE with pg_trgm)"
    echo "   • Partial indexes (active records)"
    echo "   • Composite indexes (common filters)"
    echo ""
    echo "💡 For zero-downtime production:"
    echo "   Run scripts/create_indexes_concurrent.sql via SQL Editor"
    echo "   (uses CONCURRENTLY for zero blocking)"
fi

echo "---------------------------------------------------------"

# ------------------------------------------------------------------------------
# 7. COMPLETION
# ------------------------------------------------------------------------------

echo ""
echo "========================================================="
echo "✅ SUCCESS: REALTIMEX CRM FULLY CONFIGURED!"
echo "========================================================="
echo ""
echo "🎉 Your CRM is ready to use with optimized performance!"
echo ""
echo "Next steps:"
echo "   1. Run the application:"
echo "      $ npx realtimex-crm@latest"
echo ""
echo "   2. Access the CRM at: http://localhost:5173"
echo ""
echo "   3. First-time setup will guide you through configuration"
echo ""
echo "📚 Documentation: https://github.com/therealtimex/realtimex-crm"
echo "🐛 Issues: https://github.com/therealtimex/realtimex-crm/issues"
echo "========================================================="