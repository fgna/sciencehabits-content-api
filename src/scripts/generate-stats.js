#!/usr/bin/env node

/**
 * Content Statistics Generator
 * 
 * Generates comprehensive statistics about content across all languages
 * and content types for monitoring and analytics purposes.
 */

const fs = require('fs');
const path = require('path');

class ContentStatsGenerator {
    constructor() {
        this.supportedLanguages = ['en', 'de', 'fr', 'es'];
        this.contentTypes = ['habits', 'research', 'locales'];
        this.stats = {
            timestamp: new Date().toISOString(),
            summary: {},
            byLanguage: {},
            byCategory: {},
            quality: {},
            completeness: {}
        };
    }

    async generateStats() {
        console.log('📊 Generating comprehensive content statistics...\n');
        
        try {
            await this.calculateSummaryStats();
            await this.calculateLanguageStats();
            await this.calculateCategoryStats();
            await this.calculateQualityStats();
            await this.calculateCompletenessStats();
            
            this.saveStats();
            this.displayStats();
            
        } catch (error) {
            console.error('❌ Failed to generate statistics:', error.message);
            process.exit(1);
        }
    }

    async calculateSummaryStats() {
        console.log('📈 Calculating summary statistics...');
        
        let totalHabits = 0;
        let totalResearch = 0;
        let totalLocaleKeys = 0;
        let totalFiles = 0;

        for (const language of this.supportedLanguages) {
            for (const contentType of this.contentTypes) {
                const filePath = `src/content/${contentType}/${language}.json`;
                
                if (fs.existsSync(filePath)) {
                    totalFiles++;
                    const content = this.loadContentSafely(filePath);
                    
                    if (contentType === 'habits' && Array.isArray(content)) {
                        totalHabits += content.length;
                    } else if (contentType === 'research' && Array.isArray(content)) {
                        totalResearch += content.length;
                    } else if (contentType === 'locales' && content) {
                        totalLocaleKeys += Object.keys(content).length;
                    }
                }
            }
        }

        this.stats.summary = {
            totalFiles,
            totalHabits,
            totalResearch,
            totalLocaleKeys,
            averageHabitsPerLanguage: Math.round(totalHabits / this.supportedLanguages.length),
            averageResearchPerLanguage: Math.round(totalResearch / this.supportedLanguages.length),
            averageLocaleKeysPerLanguage: Math.round(totalLocaleKeys / this.supportedLanguages.length)
        };
        
        console.log('✅ Summary statistics calculated');
    }

    async calculateLanguageStats() {
        console.log('🌍 Calculating language-specific statistics...');
        
        for (const language of this.supportedLanguages) {
            const langStats = {
                language,
                habits: 0,
                research: 0,
                localeKeys: 0,
                files: 0,
                completeness: 0,
                totalWordCount: 0,
                averageWordCount: 0
            };

            let totalWordCount = 0;
            let contentItems = 0;

            // Habits
            const habitsPath = `src/content/habits/${language}.json`;
            if (fs.existsSync(habitsPath)) {
                langStats.files++;
                const habits = this.loadContentSafely(habitsPath);
                if (Array.isArray(habits)) {
                    langStats.habits = habits.length;
                    habits.forEach(habit => {
                        const wordCount = this.countWords(habit.title + ' ' + habit.description);
                        totalWordCount += wordCount;
                        contentItems++;
                    });
                }
            }

            // Research
            const researchPath = `src/content/research/${language}.json`;
            if (fs.existsSync(researchPath)) {
                langStats.files++;
                const research = this.loadContentSafely(researchPath);
                if (Array.isArray(research)) {
                    langStats.research = research.length;
                    research.forEach(article => {
                        const wordCount = this.countWords(article.title + ' ' + article.summary);
                        totalWordCount += wordCount;
                        contentItems++;
                    });
                }
            }

            // Locales
            const localesPath = `src/content/locales/${language}.json`;
            if (fs.existsSync(localesPath)) {
                langStats.files++;
                const locales = this.loadContentSafely(localesPath);
                if (locales) {
                    langStats.localeKeys = Object.keys(locales).length;
                }
            }

            langStats.totalWordCount = totalWordCount;
            langStats.averageWordCount = contentItems > 0 ? Math.round(totalWordCount / contentItems) : 0;
            langStats.completeness = Math.round((langStats.files / this.contentTypes.length) * 100);

            this.stats.byLanguage[language] = langStats;
        }
        
        console.log('✅ Language statistics calculated');
    }

    async calculateCategoryStats() {
        console.log('📋 Calculating category statistics...');
        
        const categories = new Set();
        const categoryStats = {};

        // Collect all categories from habits
        for (const language of this.supportedLanguages) {
            const habitsPath = `src/content/habits/${language}.json`;
            if (fs.existsSync(habitsPath)) {
                const habits = this.loadContentSafely(habitsPath);
                if (Array.isArray(habits)) {
                    habits.forEach(habit => {
                        if (habit.category) {
                            categories.add(habit.category);
                            if (!categoryStats[habit.category]) {
                                categoryStats[habit.category] = {
                                    habits: 0,
                                    research: 0,
                                    languages: new Set()
                                };
                            }
                            categoryStats[habit.category].habits++;
                            categoryStats[habit.category].languages.add(language);
                        }
                    });
                }
            }
        }

        // Collect research by category
        for (const language of this.supportedLanguages) {
            const researchPath = `src/content/research/${language}.json`;
            if (fs.existsSync(researchPath)) {
                const research = this.loadContentSafely(researchPath);
                if (Array.isArray(research)) {
                    research.forEach(article => {
                        if (article.category) {
                            if (!categoryStats[article.category]) {
                                categoryStats[article.category] = {
                                    habits: 0,
                                    research: 0,
                                    languages: new Set()
                                };
                            }
                            categoryStats[article.category].research++;
                            categoryStats[article.category].languages.add(language);
                        }
                    });
                }
            }
        }

        // Convert Sets to arrays and add totals
        Object.keys(categoryStats).forEach(category => {
            categoryStats[category].languageCount = categoryStats[category].languages.size;
            categoryStats[category].languages = Array.from(categoryStats[category].languages);
            categoryStats[category].total = categoryStats[category].habits + categoryStats[category].research;
        });

        this.stats.byCategory = categoryStats;
        
        console.log('✅ Category statistics calculated');
    }

    async calculateQualityStats() {
        console.log('⭐ Calculating quality statistics...');
        
        let totalContent = 0;
        let researchBackedHabits = 0;
        let highQualityResearch = 0;
        let lowWordCountItems = 0;
        let placeholderContent = 0;

        for (const language of this.supportedLanguages) {
            // Check habits quality
            const habitsPath = `src/content/habits/${language}.json`;
            if (fs.existsSync(habitsPath)) {
                const habits = this.loadContentSafely(habitsPath);
                if (Array.isArray(habits)) {
                    habits.forEach(habit => {
                        totalContent++;
                        
                        if (habit.researchBacked) {
                            researchBackedHabits++;
                        }
                        
                        const wordCount = this.countWords(habit.title + ' ' + habit.description);
                        if (wordCount < 20) {
                            lowWordCountItems++;
                        }
                        
                        if (habit.description.includes('TODO') || habit.description.includes('placeholder')) {
                            placeholderContent++;
                        }
                    });
                }
            }

            // Check research quality
            const researchPath = `src/content/research/${language}.json`;
            if (fs.existsSync(researchPath)) {
                const research = this.loadContentSafely(researchPath);
                if (Array.isArray(research)) {
                    research.forEach(article => {
                        totalContent++;
                        
                        if (article.qualityScore >= 80) {
                            highQualityResearch++;
                        }
                        
                        const wordCount = this.countWords(article.title + ' ' + article.summary);
                        if (wordCount < 30) {
                            lowWordCountItems++;
                        }
                        
                        if (article.summary.includes('TODO') || article.summary.includes('placeholder')) {
                            placeholderContent++;
                        }
                    });
                }
            }
        }

        this.stats.quality = {
            totalContent,
            researchBackedHabits,
            researchBackedPercentage: totalContent > 0 ? Math.round((researchBackedHabits / totalContent) * 100) : 0,
            highQualityResearch,
            highQualityPercentage: totalContent > 0 ? Math.round((highQualityResearch / totalContent) * 100) : 0,
            lowWordCountItems,
            lowWordCountPercentage: totalContent > 0 ? Math.round((lowWordCountItems / totalContent) * 100) : 0,
            placeholderContent,
            placeholderPercentage: totalContent > 0 ? Math.round((placeholderContent / totalContent) * 100) : 0,
            overallQualityScore: Math.max(0, 100 - (lowWordCountItems * 2) - (placeholderContent * 5))
        };
        
        console.log('✅ Quality statistics calculated');
    }

    async calculateCompletenessStats() {
        console.log('📊 Calculating translation completeness...');
        
        const englishHabits = this.loadContentSafely('src/content/habits/en.json');
        const englishResearch = this.loadContentSafely('src/content/research/en.json');
        const englishLocales = this.loadContentSafely('src/content/locales/en.json');

        const baselineCounts = {
            habits: Array.isArray(englishHabits) ? englishHabits.length : 0,
            research: Array.isArray(englishResearch) ? englishResearch.length : 0,
            locales: englishLocales ? Object.keys(englishLocales).length : 0
        };

        for (const language of this.supportedLanguages) {
            const completeness = {
                language,
                habits: { count: 0, percentage: 0 },
                research: { count: 0, percentage: 0 },
                locales: { count: 0, percentage: 0 },
                overall: 0
            };

            // Habits completeness
            const habits = this.loadContentSafely(`src/content/habits/${language}.json`);
            if (Array.isArray(habits)) {
                completeness.habits.count = habits.length;
                completeness.habits.percentage = baselineCounts.habits > 0 ? 
                    Math.round((habits.length / baselineCounts.habits) * 100) : 0;
            }

            // Research completeness
            const research = this.loadContentSafely(`src/content/research/${language}.json`);
            if (Array.isArray(research)) {
                completeness.research.count = research.length;
                completeness.research.percentage = baselineCounts.research > 0 ? 
                    Math.round((research.length / baselineCounts.research) * 100) : 0;
            }

            // Locales completeness
            const locales = this.loadContentSafely(`src/content/locales/${language}.json`);
            if (locales) {
                completeness.locales.count = Object.keys(locales).length;
                completeness.locales.percentage = baselineCounts.locales > 0 ? 
                    Math.round((Object.keys(locales).length / baselineCounts.locales) * 100) : 0;
            }

            // Overall completeness
            completeness.overall = Math.round(
                (completeness.habits.percentage + completeness.research.percentage + completeness.locales.percentage) / 3
            );

            this.stats.completeness[language] = completeness;
        }
        
        console.log('✅ Completeness statistics calculated');
    }

    loadContentSafely(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                return JSON.parse(fs.readFileSync(filePath, 'utf8'));
            }
        } catch (error) {
            console.warn(`Warning: Failed to load ${filePath}: ${error.message}`);
        }
        return null;
    }

    countWords(text) {
        return text ? text.split(/\s+/).filter(word => word.length > 0).length : 0;
    }

    saveStats() {
        const statsFile = 'content-statistics.json';
        fs.writeFileSync(statsFile, JSON.stringify(this.stats, null, 2));
        console.log(`\n📄 Statistics saved to: ${statsFile}`);
    }

    displayStats() {
        console.log('\n' + '='.repeat(80));
        console.log('📊 CONTENT STATISTICS REPORT');
        console.log('='.repeat(80));

        // Summary
        console.log('\n📈 Summary:');
        console.log(`   Total Files: ${this.stats.summary.totalFiles}`);
        console.log(`   Total Habits: ${this.stats.summary.totalHabits}`);
        console.log(`   Total Research: ${this.stats.summary.totalResearch}`);
        console.log(`   Total Locale Keys: ${this.stats.summary.totalLocaleKeys}`);

        // Language Breakdown
        console.log('\n🌍 By Language:');
        Object.values(this.stats.byLanguage).forEach(lang => {
            console.log(`   ${lang.language.toUpperCase()}: ${lang.habits} habits, ${lang.research} research, ${lang.localeKeys} locale keys (${lang.completeness}% complete)`);
        });

        // Category Breakdown
        console.log('\n📋 By Category:');
        Object.entries(this.stats.byCategory).forEach(([category, stats]) => {
            console.log(`   ${category}: ${stats.habits} habits, ${stats.research} research (${stats.languageCount} languages)`);
        });

        // Quality Metrics
        console.log('\n⭐ Quality Metrics:');
        console.log(`   Research-backed habits: ${this.stats.quality.researchBackedPercentage}%`);
        console.log(`   High-quality research: ${this.stats.quality.highQualityPercentage}%`);
        console.log(`   Overall quality score: ${this.stats.quality.overallQualityScore}/100`);

        // Translation Completeness
        console.log('\n📊 Translation Completeness:');
        Object.values(this.stats.completeness).forEach(lang => {
            console.log(`   ${lang.language.toUpperCase()}: ${lang.overall}% complete`);
        });

        console.log('\n' + '='.repeat(80));
        console.log('✅ Statistics generation completed successfully!');
        console.log('='.repeat(80));
    }
}

// CLI execution
if (require.main === module) {
    const generator = new ContentStatsGenerator();
    generator.generateStats().catch(error => {
        console.error('💥 Statistics generation failed:', error);
        process.exit(1);
    });
}

module.exports = ContentStatsGenerator;