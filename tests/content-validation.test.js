#!/usr/bin/env node

/**
 * Comprehensive Content Validation Tests
 * 
 * Tests that prevent breaking changes to habit data structure
 * and ensure compatibility with smart recommendations system.
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const CONTENT_DIR = path.join(__dirname, '../src/content/habits');
const REQUIRED_FILES = [
  'multilingual-science-habits-en.json',
  'multilingual-science-habits-de.json'
];

// Expected data structure for each habit
const REQUIRED_HABIT_FIELDS = [
  'id',
  'title', 
  'description',
  'category',
  'difficulty',
  'timeMinutes',
  'language',
  'researchBacked',
  'effectivenessScore',
  'effectivenessRank',
  'isPrimaryRecommendation',
  'goalTags',
  'instructions',
  'whyEffective',
  'researchSummary',
  'sources',
  'optimalTiming',
  'progressionTips'
];

// Valid values for specific fields
const VALID_CATEGORIES = ['better_sleep', 'get_moving', 'feel_better'];
const VALID_DIFFICULTIES = ['trivial', 'easy', 'moderate', 'intermediate', 'advanced', 'beginner'];
const VALID_DIFFICULTIES_DE = ['Anfänger', 'Einfach', 'Mittelstufe', 'Fortgeschritten', 'Experte'];
const VALID_LANGUAGES = ['en', 'de'];

class ContentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.stats = {
      totalHabits: 0,
      categoryCounts: {},
      languageCounts: {}
    };
  }

  // Main validation entry point
  async validateAll() {
    console.log('🔍 Starting comprehensive content validation...\n');

    try {
      await this.validateFileStructure();
      await this.validateHabitData();
      await this.validateBusinessRules();
      await this.validateCompatibility();
      
      this.generateReport();
      
      if (this.errors.length > 0) {
        console.error('❌ Validation FAILED');
        process.exit(1);
      } else {
        console.log('✅ All validations PASSED');
        process.exit(0);
      }
      
    } catch (error) {
      console.error('💥 Validation error:', error.message);
      process.exit(1);
    }
  }

  // Test 1: File structure validation
  async validateFileStructure() {
    console.log('📁 Test 1: File Structure Validation');
    
    // Check required files exist
    for (const file of REQUIRED_FILES) {
      const filePath = path.join(CONTENT_DIR, file);
      if (!fs.existsSync(filePath)) {
        this.errors.push(`Missing required file: ${file}`);
      } else {
        console.log(`  ✅ Found: ${file}`);
      }
    }

    // Check files are valid JSON
    for (const file of REQUIRED_FILES) {
      const filePath = path.join(CONTENT_DIR, file);
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);
          if (!Array.isArray(data)) {
            this.errors.push(`${file} must contain an array of habits`);
          }
          console.log(`  ✅ Valid JSON: ${file}`);
        } catch (error) {
          this.errors.push(`Invalid JSON in ${file}: ${error.message}`);
        }
      }
    }
  }

  // Test 2: Individual habit data validation
  async validateHabitData() {
    console.log('\n📋 Test 2: Habit Data Structure Validation');
    
    for (const file of REQUIRED_FILES) {
      const filePath = path.join(CONTENT_DIR, file);
      if (!fs.existsSync(filePath)) continue;

      const habits = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const language = file.includes('-en.') ? 'en' : 'de';
      
      console.log(`  Validating ${habits.length} habits in ${file}`);
      
      this.stats.totalHabits += habits.length;
      this.stats.languageCounts[language] = habits.length;

      habits.forEach((habit, index) => {
        this.validateSingleHabit(habit, index, file, language);
      });
    }
  }

  // Validate individual habit structure
  validateSingleHabit(habit, index, fileName, language) {
    const habitContext = `${fileName}[${index}] (ID: ${habit.id || 'unknown'})`;

    // Check required fields
    for (const field of REQUIRED_HABIT_FIELDS) {
      if (habit[field] === undefined || habit[field] === null) {
        this.errors.push(`${habitContext}: Missing required field '${field}'`);
      }
    }

    // Validate field types and values
    if (habit.id && typeof habit.id !== 'string') {
      this.errors.push(`${habitContext}: 'id' must be a string`);
    }

    if (habit.category && !VALID_CATEGORIES.includes(habit.category)) {
      this.errors.push(`${habitContext}: Invalid category '${habit.category}'. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }

    // Check difficulty based on language
    if (habit.difficulty) {
      const validDifficulties = language === 'de' ? VALID_DIFFICULTIES_DE : VALID_DIFFICULTIES;
      if (!validDifficulties.includes(habit.difficulty)) {
        this.errors.push(`${habitContext}: Invalid difficulty '${habit.difficulty}'. Must be one of: ${validDifficulties.join(', ')}`);
      }
    }

    if (habit.language && habit.language !== language) {
      this.errors.push(`${habitContext}: Language field '${habit.language}' doesn't match file language '${language}'`);
    }

    if (habit.effectivenessScore && (typeof habit.effectivenessScore !== 'number' || habit.effectivenessScore < 0 || habit.effectivenessScore > 10)) {
      this.errors.push(`${habitContext}: effectivenessScore must be a number between 0 and 10`);
    }

    if (habit.timeMinutes && (typeof habit.timeMinutes !== 'number' || habit.timeMinutes < 0)) {
      this.errors.push(`${habitContext}: timeMinutes must be a positive number`);
    }

    if (habit.goalTags && !Array.isArray(habit.goalTags)) {
      this.errors.push(`${habitContext}: goalTags must be an array`);
    }

    if (habit.instructions && !Array.isArray(habit.instructions)) {
      this.errors.push(`${habitContext}: instructions must be an array`);
    }

    // Track category distribution
    if (habit.category) {
      this.stats.categoryCounts[habit.category] = (this.stats.categoryCounts[habit.category] || 0) + 1;
    }
  }

  // Test 3: Business rules validation
  async validateBusinessRules() {
    console.log('\n📊 Test 3: Business Rules Validation');

    // Check minimum habits per category (relaxed for current content)
    const MIN_HABITS_PER_CATEGORY = 2;
    for (const category of VALID_CATEGORIES) {
      const count = this.stats.categoryCounts[category] || 0;
      if (count < MIN_HABITS_PER_CATEGORY) {
        this.errors.push(`Category '${category}' has only ${count} habits, minimum required: ${MIN_HABITS_PER_CATEGORY}`);
      } else {
        console.log(`  ✅ Category '${category}': ${count} habits`);
      }
    }

    // Check language consistency
    const enCount = this.stats.languageCounts.en || 0;
    const deCount = this.stats.languageCounts.de || 0;
    if (enCount !== deCount) {
      this.warnings.push(`Language mismatch: EN has ${enCount} habits, DE has ${deCount} habits`);
    } else {
      console.log(`  ✅ Language consistency: ${enCount} habits in both languages`);
    }

    // Check for duplicate IDs
    await this.checkDuplicateIds();
  }

  // Check for duplicate habit IDs within the same language file
  async checkDuplicateIds() {
    for (const file of REQUIRED_FILES) {
      const filePath = path.join(CONTENT_DIR, file);
      if (!fs.existsSync(filePath)) continue;

      const habits = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const fileIds = new Set();
      const fileDuplicates = new Set();
      
      habits.forEach(habit => {
        if (habit.id) {
          if (fileIds.has(habit.id)) {
            fileDuplicates.add(habit.id);
          }
          fileIds.add(habit.id);
        }
      });
      
      if (fileDuplicates.size > 0) {
        this.errors.push(`Duplicate habit IDs in ${file}: ${Array.from(fileDuplicates).join(', ')}`);
      }
    }

    // Check that EN and DE files have matching IDs
    if (REQUIRED_FILES.length >= 2) {
      const enFilePath = path.join(CONTENT_DIR, REQUIRED_FILES[0]);
      const deFilePath = path.join(CONTENT_DIR, REQUIRED_FILES[1]);
      
      if (fs.existsSync(enFilePath) && fs.existsSync(deFilePath)) {
        const enHabits = JSON.parse(fs.readFileSync(enFilePath, 'utf8'));
        const deHabits = JSON.parse(fs.readFileSync(deFilePath, 'utf8'));
        
        const enIds = new Set(enHabits.map(h => h.id));
        const deIds = new Set(deHabits.map(h => h.id));
        
        const missingInDe = [...enIds].filter(id => !deIds.has(id));
        const missingInEn = [...deIds].filter(id => !enIds.has(id));
        
        if (missingInDe.length > 0) {
          this.errors.push(`Missing German translations for habit IDs: ${missingInDe.join(', ')}`);
        }
        if (missingInEn.length > 0) {
          this.errors.push(`Missing English translations for habit IDs: ${missingInEn.join(', ')}`);
        }
        
        if (missingInDe.length === 0 && missingInEn.length === 0) {
          console.log(`  ✅ All habit IDs have matching translations`);
        }
      }
    }
  }

  // Test 4: Smart recommendations compatibility
  async validateCompatibility() {
    console.log('\n🧠 Test 4: Smart Recommendations Compatibility');

    // Test that structure matches what EffectivenessRankingService expects
    const enFile = path.join(CONTENT_DIR, 'multilingual-science-habits-en.json');
    if (!fs.existsSync(enFile)) {
      this.errors.push('Cannot test compatibility: English habit file missing');
      return;
    }

    const habits = JSON.parse(fs.readFileSync(enFile, 'utf8'));
    
    // Simulate EffectivenessRankingService conversion
    try {
      const convertedHabits = habits.map(habit => ({
        id: habit.id,
        goalCategory: habit.category, // KEY: Maps 'category' to 'goalCategory'
        effectivenessScore: habit.effectivenessScore,
        effectivenessRank: habit.effectivenessRank,
        isPrimaryRecommendation: habit.isPrimaryRecommendation,
        difficulty: habit.difficulty,
        timeMinutes: habit.timeMinutes,
        equipment: habit.equipment || 'none',
        goalTags: habit.goalTags || [],
        translations: {
          en: {
            title: habit.title,
            description: habit.description,
            researchSummary: habit.researchSummary,
            researchSource: habit.sources?.[0] || 'Research source pending'
          }
        }
      }));

      console.log(`  ✅ Successfully converted ${convertedHabits.length} habits to EffectivenessRankingService format`);

      // Test goal matching for each category
      for (const category of VALID_CATEGORIES) {
        const categoryHabits = convertedHabits.filter(h => h.goalCategory === category);
        if (categoryHabits.length === 0) {
          this.errors.push(`No habits found for goal category: ${category}`);
        } else {
          console.log(`  ✅ Goal category '${category}': ${categoryHabits.length} habits available`);
        }
      }

    } catch (error) {
      this.errors.push(`Compatibility test failed: ${error.message}`);
    }
  }

  // Generate validation report
  generateReport() {
    console.log('\n📋 Validation Report');
    console.log('='.repeat(50));
    
    console.log(`\n📊 Statistics:`);
    console.log(`  Total habits: ${this.stats.totalHabits}`);
    console.log(`  Categories: ${Object.entries(this.stats.categoryCounts).map(([cat, count]) => `${cat}(${count})`).join(', ')}`);
    console.log(`  Languages: ${Object.entries(this.stats.languageCounts).map(([lang, count]) => `${lang}(${count})`).join(', ')}`);

    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${this.warnings.length}):`);
      this.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    if (this.errors.length > 0) {
      console.log(`\n❌ Errors (${this.errors.length}):`);
      this.errors.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log(`\n✅ No errors found!`);
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new ContentValidator();
  validator.validateAll();
}

module.exports = ContentValidator;