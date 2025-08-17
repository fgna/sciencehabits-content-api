#!/bin/bash

# Setup script for installing Git hooks for content validation

echo "🔧 Setting up Git hooks for content validation..."

# Create git hooks directory if it doesn't exist
mkdir -p .git/hooks

# Install pre-commit hook
if [ -f ".githooks/pre-commit" ]; then
    cp .githooks/pre-commit .git/hooks/pre-commit
    chmod +x .git/hooks/pre-commit
    echo "✅ Pre-commit hook installed successfully"
else
    echo "❌ Pre-commit hook source file not found!"
    exit 1
fi

# Test that npm scripts work
echo "🧪 Testing validation scripts..."

if npm run test:content --silent; then
    echo "✅ Content validation script works"
else
    echo "⚠️  Content validation script had issues (may be expected if content has issues)"
fi

echo ""
echo "🎉 Git hooks setup complete!"
echo ""
echo "ℹ️  From now on, every commit that changes content files will:"
echo "   1. Run comprehensive content structure validation"
echo "   2. Test smart recommendations compatibility"
echo "   3. Prevent commits that would break the system"
echo ""
echo "💡 To bypass hooks in emergency (NOT RECOMMENDED):"
echo "   git commit --no-verify"
echo ""
echo "🔄 To run validation manually:"
echo "   npm run test:content"
echo ""