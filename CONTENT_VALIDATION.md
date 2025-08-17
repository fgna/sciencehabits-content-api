# Content Validation CI/CD System

## Overview

This system prevents breaking changes to the habit content that could disrupt the smart recommendations engine. It was created after a content update broke the onboarding flow by changing data structures.

## What This System Protects Against

- **Data Structure Changes**: Ensures all habits have required fields like `category`, `goalTags`, etc.
- **Smart Recommendations Compatibility**: Validates that content works with `EffectivenessRankingService`
- **Business Rule Violations**: Checks minimum habits per category, language consistency
- **Translation Mismatches**: Ensures EN/DE files have matching habit IDs
- **Invalid Field Values**: Validates categories, difficulties, and other enum fields

## Components

### 1. Content Validation Tests (`tests/content-validation.test.js`)

Comprehensive validation that checks:
- **File Structure**: Required files exist and contain valid JSON arrays
- **Habit Data Structure**: All required fields present with correct types
- **Business Rules**: Minimum habits per category, language consistency
- **Smart Recommendations Compatibility**: Tests EffectivenessRankingService format conversion

### 2. GitHub Actions CI/CD (`.github/workflows/content-validation.yml`)

Automated testing that runs on:
- **Push to main/develop**: Validates content changes before deployment
- **Pull Requests**: Ensures proposed changes don't break the system
- **Content File Changes**: Only triggers when habit JSON files are modified

### 3. Pre-Commit Hooks (`.githooks/pre-commit`)

Local validation that:
- **Runs before commits**: Prevents broken content from entering git history
- **Tests smart recommendations**: Simulates conversion to recommendations format
- **Fast feedback**: Catches issues before CI/CD pipeline

## Usage

### Running Validation Manually

```bash
# Run all content validation tests
npm run test:content

# Run full test suite including API tests
npm test

# Generate content statistics
npm run generate:stats
```

### Installing Git Hooks

```bash
# One-time setup to install pre-commit hooks
./setup-git-hooks.sh
```

### Validation Results

#### ✅ Successful Validation
```
🔍 Starting comprehensive content validation...
📁 Test 1: File Structure Validation ✅
📋 Test 2: Habit Data Structure Validation ✅  
📊 Test 3: Business Rules Validation ✅
🧠 Test 4: Smart Recommendations Compatibility ✅
✅ All validations PASSED
```

#### ❌ Failed Validation
```
❌ Errors (3):
  - Missing required field 'category' in habit sleep_001
  - Invalid difficulty 'super-easy'. Must be one of: beginner, easy, moderate...
  - No habits found for goal category: get_moving
```

## Validation Rules

### Required Habit Fields
- `id`: Unique identifier
- `title`, `description`: User-facing text
- `category`: Must be `better_sleep`, `get_moving`, or `feel_better`
- `difficulty`: Valid difficulty level (language-specific)
- `timeMinutes`: Positive number
- `language`: Must match file language (`en` or `de`)
- `researchBacked`: Boolean
- `effectivenessScore`: Number 0-10
- `goalTags`: Array of goal tags

### Business Rules
- **Minimum 2 habits per category** (currently relaxed from 5)
- **Language consistency**: EN and DE files must have same number of habits
- **Matching translations**: All habit IDs must exist in both language files
- **No duplicate IDs**: Within the same language file

### Smart Recommendations Compatibility
The system tests that habits can be converted to the format expected by `EffectivenessRankingService`:

```javascript
{
  id: habit.id,
  goalCategory: habit.category, // KEY: Maps 'category' to 'goalCategory'
  effectivenessScore: habit.effectivenessScore,
  goalTags: habit.goalTags,
  // ... other fields
}
```

## Emergency Procedures

### Bypassing Validation (NOT RECOMMENDED)
```bash
# Skip pre-commit hooks in emergency
git commit --no-verify -m "Emergency fix"

# Skip GitHub Actions validation (admin only)
# Add [skip ci] to commit message
git commit -m "Emergency fix [skip ci]"
```

### Fixing Common Issues

#### Invalid Difficulty Values
**English**: `beginner`, `easy`, `moderate`, `intermediate`, `advanced`
**German**: `Anfänger`, `Einfach`, `Mittelstufe`, `Fortgeschritten`, `Experte`

#### Missing Required Fields
Add all required fields from the `REQUIRED_HABIT_FIELDS` array in the validation test.

#### Category Mismatches
Ensure `category` field uses exactly: `better_sleep`, `get_moving`, or `feel_better`

## Integration with Smart Recommendations

The validation system specifically tests compatibility with the smart recommendations engine:

1. **Data Format**: Ensures habits can be converted to `MultilingualHabit` format
2. **Goal Mapping**: Validates that `category` maps correctly to `goalCategory`
3. **Coverage**: Checks that all goal categories have available habits
4. **Field Compatibility**: Ensures required fields for recommendations exist

## Monitoring and Alerts

### GitHub Actions Status
- **Green checkmark**: All validations passed, safe to deploy
- **Red X**: Validation failed, content changes blocked
- **Yellow warning**: Tests passed with warnings

### Local Development
- **Pre-commit success**: Content changes validated locally
- **Pre-commit failure**: Fix issues before committing
- **Manual validation**: Use `npm run test:content` anytime

## Maintenance

### Updating Validation Rules
1. Modify `tests/content-validation.test.js`
2. Test changes with `npm run test:content`
3. Update this documentation if rules change
4. Ensure GitHub Actions workflow still works

### Adding New Validation Tests
1. Add test methods to `ContentValidator` class
2. Call new tests from `validateAll()` method
3. Update error reporting in `generateReport()`
4. Test with both valid and invalid content

## Historical Context

This system was implemented after a content expansion that broke the onboarding flow:
- **Issue**: Changed habit structure from flat to nested format
- **Impact**: Smart recommendations couldn't find any habits for "get_moving" goal
- **Root Cause**: Field name changed from `category` to `goalCategory`
- **Solution**: This comprehensive validation system

The system ensures that future content changes maintain compatibility with the existing smart recommendations architecture while allowing safe content expansion.