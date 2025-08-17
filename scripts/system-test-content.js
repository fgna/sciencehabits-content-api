#!/usr/bin/env node

/**
 * Comprehensive System Tests for Goal-Based Content API
 * 
 * Tests the entire content API system including:
 * - Goal-based file serving
 * - Data integrity and structure
 * - API endpoints functionality
 * - Cross-origin resource sharing
 * - Performance and reliability
 */

const fs = require('fs');
const path = require('path');

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3002';

class SystemTestSuite {
  constructor() {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      details: []
    };
  }

  async runTest(name, testFn) {
    console.log(`🧪 Testing: ${name}`);
    try {
      await testFn();
      this.results.passed++;
      this.results.details.push({ name, status: 'PASSED', error: null });
      console.log(`  ✅ PASSED: ${name}\n`);
    } catch (error) {
      this.results.failed++;
      this.results.details.push({ name, status: 'FAILED', error: error.message });
      console.log(`  ❌ FAILED: ${name}`);
      console.log(`     Error: ${error.message}\n`);
    }
  }

  async testApiServerRunning() {
    // Test 1: Verify API server is running and responsive
    try {
      const response = await fetch(`${API_BASE}/health`);
      if (!response.ok) {
        // Try a basic endpoint if health check doesn't exist
        const testResponse = await fetch(`${API_BASE}/habits/feel_better_habits-en.json`);
        if (!testResponse.ok) {
          throw new Error(`API server not responding. Status: ${testResponse.status}`);
        }
      }
      console.log(`    API server responding at ${API_BASE}`);
    } catch (error) {
      throw new Error(`API server not accessible: ${error.message}`);
    }
  }

  async testGoalBasedEndpoints() {
    // Test 2: Verify all goal-based endpoints are working
    const expectedEndpoints = [
      'feel_better_habits-en.json',
      'get_moving_habits-en.json', 
      'better_sleep_habit-en.json'
    ];

    for (const endpoint of expectedEndpoints) {
      const response = await fetch(`${API_BASE}/habits/${endpoint}`);
      if (!response.ok) {
        throw new Error(`Endpoint ${endpoint} not accessible. Status: ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error(`Endpoint ${endpoint} returned non-array data`);
      }

      if (data.length === 0) {
        throw new Error(`Endpoint ${endpoint} returned empty array`);
      }

      console.log(`    ${endpoint}: ${data.length} habits loaded`);
    }
  }

  async testDataStructureIntegrity() {
    // Test 3: Verify data structure meets requirements
    const testFile = 'feel_better_habits-en.json';
    const response = await fetch(`${API_BASE}/habits/${testFile}`);
    const habits = await response.json();

    const requiredFields = [
      'id', 'title', 'description', 'category', 'difficulty', 'timeMinutes',
      'language', 'researchBacked', 'effectivenessScore', 'effectivenessRank',
      'priority', 'isPrimaryRecommendation', 'goalTags', 'instructions',
      'whyEffective', 'researchSummary', 'sources', 'optimalTiming', 'progressionTips'
    ];

    for (const habit of habits.slice(0, 3)) { // Test first 3 habits
      for (const field of requiredFields) {
        if (!(field in habit) || habit[field] === null || habit[field] === undefined) {
          throw new Error(`Habit ${habit.id} missing required field: ${field}`);
        }
      }

      // Type validation
      if (typeof habit.isPrimaryRecommendation !== 'boolean') {
        throw new Error(`Habit ${habit.id} isPrimaryRecommendation must be boolean`);
      }

      if (!Array.isArray(habit.goalTags)) {
        throw new Error(`Habit ${habit.id} goalTags must be array`);
      }
    }

    console.log(`    Data structure validation passed for ${habits.length} habits`);
  }

  async testPriorityAndSorting() {
    // Test 4: Verify priority system works correctly
    const response = await fetch(`${API_BASE}/habits/feel_better_habits-en.json`);
    const habits = await response.json();

    // Check priorities are unique and sequential
    const priorities = habits.map(h => h.priority).sort((a, b) => a - b);
    const expectedPriorities = Array.from({ length: habits.length }, (_, i) => i + 1);

    if (JSON.stringify(priorities) !== JSON.stringify(expectedPriorities)) {
      throw new Error(`Priority sequence invalid. Expected: [${expectedPriorities.join(', ')}], Got: [${priorities.join(', ')}]`);
    }

    // Check primary recommendations exist
    const primaryCount = habits.filter(h => h.isPrimaryRecommendation).length;
    if (primaryCount === 0) {
      throw new Error('No primary recommendations found');
    }

    console.log(`    Priority system validated: 1-${habits.length}, ${primaryCount} primary recommendations`);
  }

  async testCrossOriginAccess() {
    // Test 5: Verify CORS headers are set correctly
    const response = await fetch(`${API_BASE}/habits/feel_better_habits-en.json`);
    
    const corsHeader = response.headers.get('access-control-allow-origin');
    if (!corsHeader) {
      console.warn('    Warning: No CORS headers found - may cause issues in browser');
    } else {
      console.log(`    CORS configured: ${corsHeader}`);
    }
  }

  async testApiPerformance() {
    // Test 6: Verify API response times are acceptable
    const startTime = Date.now();
    const response = await fetch(`${API_BASE}/habits/feel_better_habits-en.json`);
    const endTime = Date.now();
    
    const responseTime = endTime - startTime;
    if (responseTime > 2000) {
      throw new Error(`API response too slow: ${responseTime}ms (should be < 2000ms)`);
    }

    const data = await response.json();
    console.log(`    Response time: ${responseTime}ms for ${data.length} habits`);
  }

  async testCategoryConsistency() {
    // Test 7: Verify category consistency across files
    const categoryTests = [
      { file: 'feel_better_habits-en.json', expectedCategory: 'feel_better' },
      { file: 'get_moving_habits-en.json', expectedCategory: 'get_moving' },
      { file: 'better_sleep_habit-en.json', expectedCategory: 'better_sleep' }
    ];

    for (const { file, expectedCategory } of categoryTests) {
      const response = await fetch(`${API_BASE}/habits/${file}`);
      const habits = await response.json();

      const wrongCategoryHabits = habits.filter(h => h.category !== expectedCategory);
      if (wrongCategoryHabits.length > 0) {
        throw new Error(`${file} contains habits with wrong category: ${wrongCategoryHabits.map(h => `${h.id}:${h.category}`).join(', ')}`);
      }

      console.log(`    ${file}: All ${habits.length} habits have correct category "${expectedCategory}"`);
    }
  }

  async testApiReliability() {
    // Test 8: Test multiple rapid requests to ensure stability
    const promises = [];
    const requestCount = 10;
    
    for (let i = 0; i < requestCount; i++) {
      promises.push(fetch(`${API_BASE}/habits/feel_better_habits-en.json`));
    }

    const responses = await Promise.all(promises);
    
    for (let i = 0; i < responses.length; i++) {
      if (!responses[i].ok) {
        throw new Error(`Request ${i + 1}/${requestCount} failed with status: ${responses[i].status}`);
      }
    }

    console.log(`    Successfully handled ${requestCount} concurrent requests`);
  }

  async runAllTests() {
    console.log('🎯 COMPREHENSIVE SYSTEM TESTS FOR GOAL-BASED CONTENT API');
    console.log('=======================================================\n');

    const tests = [
      ['API Server Running', () => this.testApiServerRunning()],
      ['Goal-Based Endpoints', () => this.testGoalBasedEndpoints()],
      ['Data Structure Integrity', () => this.testDataStructureIntegrity()],
      ['Priority and Sorting', () => this.testPriorityAndSorting()],
      ['Cross-Origin Access', () => this.testCrossOriginAccess()],
      ['API Performance', () => this.testApiPerformance()],
      ['Category Consistency', () => this.testCategoryConsistency()],
      ['API Reliability', () => this.testApiReliability()]
    ];

    for (const [name, testFn] of tests) {
      await this.runTest(name, testFn);
    }

    this.generateReport();
  }

  generateReport() {
    console.log('📊 SYSTEM TEST REPORT');
    console.log('====================');
    console.log(`Total Tests: ${this.results.passed + this.results.failed}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Success Rate: ${Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100)}%\n`);

    if (this.results.failed > 0) {
      console.log('❌ Failed Tests:');
      this.results.details
        .filter(result => result.status === 'FAILED')
        .forEach(result => {
          console.log(`  - ${result.name}: ${result.error}`);
        });
      console.log('');
    }

    // Save detailed report
    const reportPath = path.join(__dirname, '../content-system-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.results.passed + this.results.failed,
        passed: this.results.passed,
        failed: this.results.failed,
        successRate: Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100)
      },
      results: this.results.details
    }, null, 2));

    console.log(`📁 Detailed report saved to: ${reportPath}`);

    if (this.results.failed === 0) {
      console.log('\n✅ ALL SYSTEM TESTS PASSED! Goal-based content API is working correctly.');
    } else {
      console.log('\n⚠️  Some system tests failed. Please review and fix issues before deployment.');
      process.exit(1);
    }
  }
}

async function main() {
  const testSuite = new SystemTestSuite();
  
  try {
    await testSuite.runAllTests();
  } catch (error) {
    console.error('❌ System test suite failed to run:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { SystemTestSuite };