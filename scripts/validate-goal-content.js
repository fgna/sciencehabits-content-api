#!/usr/bin/env node

/**
 * Goal-Based Content Validation Script for sciencehabits-content-api
 * 
 * Validates that goal-specific JSON files are properly formatted,
 * contain required fields, and maintain data integrity for the
 * new goal-based recommendations system.
 */

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '../src/content/habits');
const VALIDATION_RULES = {
  requiredFields: [
    'id', 'title', 'description', 'category', 'difficulty', 'timeMinutes',
    'language', 'researchBacked', 'effectivenessScore', 'effectivenessRank',
    'priority', 'isPrimaryRecommendation', 'goalTags', 'instructions',
    'whyEffective', 'researchSummary', 'sources', 'optimalTiming', 'progressionTips'
  ],
  validDifficulties: ['beginner', 'intermediate', 'advanced', 'easy', 'moderate', 'challenging'],
  validCategories: ['feel_better', 'get_moving', 'better_sleep'],
  maxTimeMinutes: 60,
  minEffectivenessScore: 0,
  maxEffectivenessScore: 10,
  supportedLanguages: ['en', 'de', 'fr', 'es']
};

class ValidationError extends Error {
  constructor(message, category = 'validation') {
    super(message);
    this.category = category;
  }
}

async function discoverGoalFiles() {
  console.log('🔍 Discovering goal-specific content files...');
  
  if (!fs.existsSync(CONTENT_DIR)) {
    throw new ValidationError(`Content directory not found: ${CONTENT_DIR}`, 'structure');
  }
  
  const goalPatterns = [
    { goal: 'feel_better', patterns: ['feel_better_habits-{lang}.json'] },
    { goal: 'get_moving', patterns: ['get_moving_habits-{lang}.json'] },
    { goal: 'better_sleep', patterns: ['better_sleep_habit-{lang}.json', 'better_sleep_habits-{lang}.json'] }
  ];
  
  const discoveredFiles = [];
  
  for (const { goal, patterns } of goalPatterns) {
    for (const pattern of patterns) {
      for (const lang of VALIDATION_RULES.supportedLanguages) {
        const filename = pattern.replace('{lang}', lang);
        const filepath = path.join(CONTENT_DIR, filename);
        
        if (fs.existsSync(filepath)) {
          discoveredFiles.push({ 
            goal, 
            language: lang, 
            filename, 
            filepath,
            pattern 
          });
          console.log(`  ✅ Found: ${filename}`);
        }
      }
    }
  }
  
  if (discoveredFiles.length === 0) {
    throw new ValidationError('No goal-specific files discovered', 'discovery');
  }
  
  console.log(`📁 Discovered ${discoveredFiles.length} goal-specific files\n`);
  return discoveredFiles;
}

async function validateHabitStructure(habit, filename) {
  const errors = [];
  
  // Check required fields
  for (const field of VALIDATION_RULES.requiredFields) {
    if (!(field in habit) || habit[field] === null || habit[field] === undefined) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Validate specific field values
  if (habit.difficulty && !VALIDATION_RULES.validDifficulties.includes(habit.difficulty)) {
    errors.push(`Invalid difficulty: ${habit.difficulty}`);
  }
  
  if (habit.category && !VALIDATION_RULES.validCategories.includes(habit.category)) {
    errors.push(`Invalid category: ${habit.category}`);
  }
  
  if (habit.timeMinutes && (habit.timeMinutes < 1 || habit.timeMinutes > VALIDATION_RULES.maxTimeMinutes)) {
    errors.push(`Invalid timeMinutes: ${habit.timeMinutes} (should be 1-${VALIDATION_RULES.maxTimeMinutes})`);
  }
  
  if (habit.effectivenessScore && (habit.effectivenessScore < VALIDATION_RULES.minEffectivenessScore || habit.effectivenessScore > VALIDATION_RULES.maxEffectivenessScore)) {
    errors.push(`Invalid effectivenessScore: ${habit.effectivenessScore} (should be ${VALIDATION_RULES.minEffectivenessScore}-${VALIDATION_RULES.maxEffectivenessScore})`);
  }
  
  if (habit.priority && (habit.priority < 1 || habit.priority > 100)) {
    errors.push(`Invalid priority: ${habit.priority} (should be 1-100)`);
  }
  
  if (typeof habit.isPrimaryRecommendation !== 'boolean') {
    errors.push(`isPrimaryRecommendation must be boolean, got: ${typeof habit.isPrimaryRecommendation}`);
  }
  
  if (!Array.isArray(habit.goalTags) || habit.goalTags.length === 0) {
    errors.push('goalTags must be a non-empty array');
  }
  
  if (!Array.isArray(habit.instructions) || habit.instructions.length === 0) {
    errors.push('instructions must be a non-empty array');
  }
  
  if (!Array.isArray(habit.sources) || habit.sources.length === 0) {
    errors.push('sources must be a non-empty array');
  }
  
  if (!Array.isArray(habit.progressionTips) || habit.progressionTips.length === 0) {
    errors.push('progressionTips must be a non-empty array');
  }
  
  if (errors.length > 0) {
    throw new ValidationError(`Habit ${habit.id} in ${filename}:\n  ${errors.join('\n  ')}`);
  }
}

async function validateGoalFile(fileInfo) {
  console.log(`📋 Validating ${fileInfo.filename}...`);
  
  try {
    const content = fs.readFileSync(fileInfo.filepath, 'utf8');
    const habits = JSON.parse(content);
    
    if (!Array.isArray(habits)) {
      throw new ValidationError(`${fileInfo.filename} must contain an array of habits`);
    }
    
    if (habits.length === 0) {
      throw new ValidationError(`${fileInfo.filename} cannot be empty`);
    }
    
    // Validate each habit
    for (const habit of habits) {
      await validateHabitStructure(habit, fileInfo.filename);
    }
    
    // Validate business rules
    const priorities = habits.map(h => h.priority).sort((a, b) => a - b);
    const uniquePriorities = [...new Set(priorities)];
    if (priorities.length !== uniquePriorities.length) {
      throw new ValidationError(`${fileInfo.filename} has duplicate priorities: ${priorities.join(', ')}`);
    }
    
    const primaryCount = habits.filter(h => h.isPrimaryRecommendation).length;
    if (primaryCount === 0) {
      console.warn(`  ⚠️  ${fileInfo.filename} has no primary recommendations`);
    }
    
    // Validate category consistency
    const expectedCategory = fileInfo.goal;
    const invalidCategories = habits.filter(h => h.category !== expectedCategory);
    if (invalidCategories.length > 0) {
      throw new ValidationError(`${fileInfo.filename} contains habits with wrong category. Expected: ${expectedCategory}, Found: ${invalidCategories.map(h => `${h.id}:${h.category}`).join(', ')}`);
    }
    
    // Validate language consistency
    const invalidLanguages = habits.filter(h => h.language !== fileInfo.language);
    if (invalidLanguages.length > 0) {
      throw new ValidationError(`${fileInfo.filename} contains habits with wrong language. Expected: ${fileInfo.language}, Found: ${invalidLanguages.map(h => `${h.id}:${h.language}`).join(', ')}`);
    }
    
    console.log(`  ✅ ${habits.length} habits validated`);
    console.log(`  📊 Priorities: ${priorities[0]}-${priorities[priorities.length - 1]}`);
    console.log(`  🎯 Primary recommendations: ${primaryCount}`);
    
    return {
      file: fileInfo.filename,
      goal: fileInfo.goal,
      language: fileInfo.language,
      habitCount: habits.length,
      primaryCount,
      priorityRange: [priorities[0], priorities[priorities.length - 1]],
      habits: habits.map(h => ({
        id: h.id,
        title: h.title,
        priority: h.priority,
        isPrimary: h.isPrimaryRecommendation,
        effectiveness: h.effectivenessScore
      }))
    };
    
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    if (error instanceof SyntaxError) {
      throw new ValidationError(`Invalid JSON in ${fileInfo.filename}: ${error.message}`);
    }
    throw new ValidationError(`Failed to validate ${fileInfo.filename}: ${error.message}`);
  }
}

async function validateCrossFileConsistency(validatedFiles) {
  console.log('\n🔄 Validating cross-file consistency...');
  
  // Check for duplicate habit IDs across files
  const allHabitIds = new Set();
  const duplicates = [];
  
  for (const file of validatedFiles) {
    for (const habit of file.habits) {
      if (allHabitIds.has(habit.id)) {
        duplicates.push(habit.id);
      } else {
        allHabitIds.add(habit.id);
      }
    }
  }
  
  if (duplicates.length > 0) {
    throw new ValidationError(`Duplicate habit IDs found across files: ${duplicates.join(', ')}`);
  }
  
  // Check goal coverage
  const goalCoverage = {};
  for (const file of validatedFiles) {
    if (!goalCoverage[file.goal]) {
      goalCoverage[file.goal] = [];
    }
    goalCoverage[file.goal].push(file.language);
  }
  
  console.log('  📊 Goal coverage:');
  for (const [goal, languages] of Object.entries(goalCoverage)) {
    console.log(`    ${goal}: ${languages.join(', ')}`);
  }
  
  // Ensure we have at least English for each goal
  for (const goal of VALIDATION_RULES.validCategories) {
    if (!goalCoverage[goal] || !goalCoverage[goal].includes('en')) {
      console.warn(`  ⚠️  Missing English content for goal: ${goal}`);
    }
  }
  
  console.log('  ✅ Cross-file consistency validated\n');
}

async function validateApiCompatibility(validatedFiles) {
  console.log('🔗 Validating API compatibility...');
  
  // Test that files can be served by the API server
  for (const file of validatedFiles) {
    const testUrl = `http://localhost:3002/habits/${file.file}`;
    
    try {
      const response = await fetch(testUrl);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          console.log(`  ✅ API serving ${file.file}: ${data.length} habits`);
        } else {
          console.warn(`  ⚠️  API returned empty data for ${file.file}`);
        }
      } else {
        console.warn(`  ⚠️  API not responding for ${file.file} (${response.status})`);
      }
    } catch (error) {
      console.warn(`  ⚠️  Could not test API for ${file.file}: ${error.message}`);
    }
  }
  
  console.log('  ✅ API compatibility check completed\n');
}

async function generateValidationReport(validatedFiles) {
  console.log('📊 VALIDATION REPORT');
  console.log('==================');
  
  const totalHabits = validatedFiles.reduce((sum, file) => sum + file.habitCount, 0);
  const totalPrimary = validatedFiles.reduce((sum, file) => sum + file.primaryCount, 0);
  
  console.log(`Total files validated: ${validatedFiles.length}`);
  console.log(`Total habits: ${totalHabits}`);
  console.log(`Total primary recommendations: ${totalPrimary}`);
  
  console.log('\nFiles by goal:');
  const byGoal = {};
  for (const file of validatedFiles) {
    if (!byGoal[file.goal]) byGoal[file.goal] = [];
    byGoal[file.goal].push(file);
  }
  
  for (const [goal, files] of Object.entries(byGoal)) {
    console.log(`  ${goal}: ${files.length} files, ${files.reduce((sum, f) => sum + f.habitCount, 0)} habits`);
    for (const file of files) {
      console.log(`    ${file.file}: ${file.habitCount} habits (${file.primaryCount} primary)`);
    }
  }
  
  // Save detailed report
  const reportPath = path.join(__dirname, '../content-validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: validatedFiles.length,
      totalHabits,
      totalPrimary,
      goalCoverage: byGoal
    },
    files: validatedFiles
  }, null, 2));
  
  console.log(`\n📁 Detailed report saved to: ${reportPath}`);
}

async function main() {
  console.log('🎯 Goal-Based Content Validation for sciencehabits-content-api');
  console.log('============================================================\n');
  
  let exitCode = 0;
  
  try {
    // Discover files
    const discoveredFiles = await discoverGoalFiles();
    
    // Validate each file
    const validatedFiles = [];
    for (const fileInfo of discoveredFiles) {
      try {
        const result = await validateGoalFile(fileInfo);
        validatedFiles.push(result);
      } catch (error) {
        console.error(`❌ ${error.message}\n`);
        exitCode = 1;
      }
    }
    
    if (validatedFiles.length === 0) {
      console.error('❌ No files passed validation');
      process.exit(1);
    }
    
    // Cross-file validation
    await validateCrossFileConsistency(validatedFiles);
    
    // API compatibility check
    await validateApiCompatibility(validatedFiles);
    
    // Generate report
    await generateValidationReport(validatedFiles);
    
    if (exitCode === 0) {
      console.log('\n✅ All content validations passed!');
      console.log('   - Goal-specific file structure validated');
      console.log('   - Habit data integrity verified');
      console.log('   - Cross-file consistency confirmed');
      console.log('   - API compatibility tested');
    } else {
      console.log('\n⚠️  Some validations failed:');
      console.log('   Please fix errors before deployment');
    }
    
  } catch (error) {
    console.error(`\n❌ Validation failed: ${error.message}`);
    if (error.category === 'discovery') {
      console.error('Make sure goal-specific JSON files exist in src/content/habits/');
    } else if (error.category === 'structure') {
      console.error('Check the content directory structure');
    }
    process.exit(1);
  }
  
  process.exit(exitCode);
}

if (require.main === module) {
  main();
}

module.exports = { main, validateGoalFile, validateHabitStructure };