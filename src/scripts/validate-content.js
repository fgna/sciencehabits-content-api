#!/usr/bin/env node

/**
 * Content Validation Script
 * 
 * Validates all content files for schema compliance, data integrity,
 * and quality standards across all supported languages.
 */

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

class ContentValidator {
    constructor() {
        this.ajv = new Ajv({ allErrors: true, verbose: true });
        addFormats(this.ajv);
        
        this.supportedLanguages = ['en', 'de', 'fr', 'es'];
        this.contentTypes = ['habits', 'research', 'locales'];
        
        this.errors = [];
        this.warnings = [];
        this.stats = {
            filesValidated: 0,
            totalErrors: 0,
            totalWarnings: 0,
            validationTime: 0
        };
        
        this.loadSchemas();
    }

    loadSchemas() {
        try {
            // Habit schema
            this.schemas = {
                habit: {
                    type: 'object',
                    required: ['id', 'title', 'description', 'category', 'difficulty', 'timeMinutes', 'language'],
                    properties: {
                        id: { type: 'string', pattern: '^[a-z0-9-]+$' },
                        title: { type: 'string', minLength: 5, maxLength: 100 },
                        description: { type: 'string', minLength: 20, maxLength: 500 },
                        category: { 
                            type: 'string', 
                            enum: ['sleep', 'productivity', 'health', 'mindfulness', 'nutrition', 'exercise'] 
                        },
                        difficulty: { 
                            type: 'string', 
                            enum: ['beginner', 'intermediate', 'advanced'] 
                        },
                        timeMinutes: { type: 'integer', minimum: 1, maximum: 180 },
                        language: { 
                            type: 'string', 
                            enum: this.supportedLanguages 
                        },
                        researchBacked: { type: 'boolean' },
                        sources: { 
                            type: 'array', 
                            items: { type: 'string' },
                            minItems: 0,
                            maxItems: 10
                        }
                    },
                    additionalProperties: false
                },
                
                research: {
                    type: 'object',
                    required: ['id', 'title', 'summary', 'authors', 'year', 'journal', 'category', 'evidenceLevel', 'qualityScore', 'language'],
                    properties: {
                        id: { type: 'string', pattern: '^[a-z0-9-]+$' },
                        title: { type: 'string', minLength: 10, maxLength: 200 },
                        summary: { type: 'string', minLength: 50, maxLength: 1000 },
                        authors: { type: 'string', minLength: 5, maxLength: 200 },
                        year: { type: 'integer', minimum: 1990, maximum: new Date().getFullYear() + 1 },
                        journal: { type: 'string', minLength: 5, maxLength: 100 },
                        doi: { type: 'string', pattern: '^10\\.' },
                        category: { 
                            type: 'string', 
                            enum: ['sleep', 'productivity', 'health', 'mindfulness', 'nutrition', 'exercise'] 
                        },
                        evidenceLevel: { 
                            type: 'string', 
                            enum: ['systematic_review', 'rct', 'observational', 'case_study'] 
                        },
                        qualityScore: { type: 'integer', minimum: 0, maximum: 100 },
                        language: { 
                            type: 'string', 
                            enum: this.supportedLanguages 
                        }
                    },
                    additionalProperties: false
                },
                
                locales: {
                    type: 'object',
                    patternProperties: {
                        '^[a-zA-Z0-9._-]+$': { type: 'string', minLength: 1, maxLength: 200 }
                    },
                    additionalProperties: false
                }
            };

            // Compile schemas
            this.compiledSchemas = {};
            Object.keys(this.schemas).forEach(schemaName => {
                this.compiledSchemas[schemaName] = this.ajv.compile(this.schemas[schemaName]);
            });

            console.log('✅ Content validation schemas loaded');
            
        } catch (error) {
            console.error('❌ Failed to load validation schemas:', error.message);
            process.exit(1);
        }
    }

    async validateAll() {
        console.log('🔍 Starting comprehensive content validation...\n');
        
        const startTime = Date.now();
        
        try {
            // Validate content structure
            await this.validateContentStructure();
            
            // Validate each content type
            for (const contentType of this.contentTypes) {
                await this.validateContentType(contentType);
            }
            
            // Cross-reference validation
            await this.validateCrossReferences();
            
            // Translation completeness
            await this.validateTranslationCompleteness();
            
            // Content quality checks
            await this.validateContentQuality();
            
            this.stats.validationTime = Date.now() - startTime;
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Validation failed:', error.message);
            process.exit(1);
        }
    }

    async validateContentStructure() {
        console.log('📁 Validating content directory structure...');
        
        const requiredDirs = [
            'src/content/habits',
            'src/content/research', 
            'src/content/locales',
            'src/content/metadata'
        ];
        
        for (const dir of requiredDirs) {
            if (!fs.existsSync(dir)) {
                this.addError(`Missing required directory: ${dir}`);
            }
        }
        
        // Check for required language files
        for (const contentType of this.contentTypes) {
            for (const language of this.supportedLanguages) {
                const filePath = `src/content/${contentType}/${language}.json`;
                if (!fs.existsSync(filePath)) {
                    this.addWarning(`Missing content file: ${filePath}`);
                }
            }
        }
        
        console.log('✅ Content structure validation complete');
    }

    async validateContentType(contentType) {
        console.log(`📋 Validating ${contentType} content...`);
        
        for (const language of this.supportedLanguages) {
            const filePath = `src/content/${contentType}/${language}.json`;
            
            if (!fs.existsSync(filePath)) {
                this.addWarning(`Missing ${contentType} file for ${language}: ${filePath}`);
                continue;
            }
            
            try {
                const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                this.validateContentFile(content, contentType, language, filePath);
                this.stats.filesValidated++;
                
            } catch (error) {
                this.addError(`Invalid JSON in ${filePath}: ${error.message}`);
            }
        }
        
        console.log(`✅ ${contentType} validation complete`);
    }

    validateContentFile(content, contentType, language, filePath) {
        if (contentType === 'locales') {
            // Validate locales structure
            const validate = this.compiledSchemas['locales'];
            if (!validate(content)) {
                validate.errors.forEach(error => {
                    this.addError(`${filePath}: ${error.instancePath} ${error.message}`);
                });
            }
        } else {
            // Validate array content (habits/research)
            if (!Array.isArray(content)) {
                this.addError(`${filePath}: Content must be an array`);
                return;
            }
            
            content.forEach((item, index) => {
                this.validateContentItem(item, contentType, language, filePath, index);
            });
        }
    }

    validateContentItem(item, contentType, language, filePath, index) {
        // Schema validation
        const validate = this.compiledSchemas[contentType];
        if (!validate(item)) {
            validate.errors.forEach(error => {
                this.addError(`${filePath}[${index}]: ${error.instancePath} ${error.message}`);
            });
        }

        // Additional business logic validation
        if (contentType === 'habit') {
            this.validateHabitSpecific(item, filePath, index);
        } else if (contentType === 'research') {
            this.validateResearchSpecific(item, filePath, index);
        }

        // Language consistency check
        if (item.language && item.language !== language) {
            this.addWarning(`${filePath}[${index}]: Language mismatch (expected ${language}, got ${item.language})`);
        }
    }

    validateHabitSpecific(habit, filePath, index) {
        // Check for research backing consistency
        if (habit.researchBacked && (!habit.sources || habit.sources.length === 0)) {
            this.addWarning(`${filePath}[${index}]: Habit marked as research-backed but has no sources`);
        }

        // Time validation
        if (habit.timeMinutes > 60 && habit.difficulty === 'beginner') {
            this.addWarning(`${filePath}[${index}]: Long duration (${habit.timeMinutes}min) for beginner habit`);
        }

        // Title quality check
        if (habit.title.length < 10) {
            this.addWarning(`${filePath}[${index}]: Title may be too short: "${habit.title}"`);
        }
    }

    validateResearchSpecific(research, filePath, index) {
        // DOI format check
        if (research.doi && !research.doi.match(/^10\.\d{4,}\/[-._;()\/:a-zA-Z0-9]+$/)) {
            this.addWarning(`${filePath}[${index}]: DOI format may be invalid: ${research.doi}`);
        }

        // Quality score vs evidence level consistency
        const evidenceQualityMap = {
            'systematic_review': 80,
            'rct': 70,
            'observational': 60,
            'case_study': 40
        };

        const expectedMinQuality = evidenceQualityMap[research.evidenceLevel];
        if (research.qualityScore < expectedMinQuality) {
            this.addWarning(`${filePath}[${index}]: Quality score (${research.qualityScore}) seems low for ${research.evidenceLevel}`);
        }

        // Recent research check
        const currentYear = new Date().getFullYear();
        if (research.year < currentYear - 10) {
            this.addWarning(`${filePath}[${index}]: Research is over 10 years old (${research.year})`);
        }
    }

    async validateCrossReferences() {
        console.log('🔗 Validating cross-references...');
        
        // Load all research IDs
        const allResearchIds = new Set();
        for (const language of this.supportedLanguages) {
            const filePath = `src/content/research/${language}.json`;
            if (fs.existsSync(filePath)) {
                const research = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                research.forEach(item => allResearchIds.add(item.id));
            }
        }

        // Check habit sources reference valid research
        for (const language of this.supportedLanguages) {
            const filePath = `src/content/habits/${language}.json`;
            if (fs.existsSync(filePath)) {
                const habits = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                habits.forEach((habit, index) => {
                    if (habit.sources) {
                        habit.sources.forEach(sourceId => {
                            if (!allResearchIds.has(sourceId)) {
                                this.addWarning(`${filePath}[${index}]: References unknown research: ${sourceId}`);
                            }
                        });
                    }
                });
            }
        }
        
        console.log('✅ Cross-reference validation complete');
    }

    async validateTranslationCompleteness() {
        console.log('🌍 Validating translation completeness...');
        
        // Check habits translation completeness
        const englishHabits = await this.loadContentSafely('habits', 'en');
        const englishHabitIds = new Set(englishHabits.map(h => h.id));
        
        for (const language of this.supportedLanguages.filter(l => l !== 'en')) {
            const langHabits = await this.loadContentSafely('habits', language);
            const langHabitIds = new Set(langHabits.map(h => h.id));
            
            const missing = [...englishHabitIds].filter(id => !langHabitIds.has(id));
            if (missing.length > 0) {
                this.addWarning(`Missing ${language} translations for habits: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}`);
            }
        }

        // Check research translation completeness
        const englishResearch = await this.loadContentSafely('research', 'en');
        const englishResearchIds = new Set(englishResearch.map(r => r.id));
        
        for (const language of this.supportedLanguages.filter(l => l !== 'en')) {
            const langResearch = await this.loadContentSafely('research', language);
            const langResearchIds = new Set(langResearch.map(r => r.id));
            
            const missing = [...englishResearchIds].filter(id => !langResearchIds.has(id));
            if (missing.length > 0) {
                this.addWarning(`Missing ${language} translations for research: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '...' : ''}`);
            }
        }

        // Check locale key completeness
        const englishLocales = await this.loadContentSafely('locales', 'en');
        const englishKeys = new Set(Object.keys(englishLocales));
        
        for (const language of this.supportedLanguages.filter(l => l !== 'en')) {
            const langLocales = await this.loadContentSafely('locales', language);
            const langKeys = new Set(Object.keys(langLocales));
            
            const missing = [...englishKeys].filter(key => !langKeys.has(key));
            if (missing.length > 0) {
                this.addWarning(`Missing ${language} locale keys: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}`);
            }
        }
        
        console.log('✅ Translation completeness validation complete');
    }

    async validateContentQuality() {
        console.log('📊 Validating content quality...');
        
        let totalWordCount = 0;
        let contentItems = 0;
        
        for (const language of this.supportedLanguages) {
            // Habits quality check
            const habits = await this.loadContentSafely('habits', language);
            habits.forEach((habit, index) => {
                const wordCount = (habit.title + ' ' + habit.description).split(/\s+/).length;
                totalWordCount += wordCount;
                contentItems++;
                
                if (wordCount < 20) {
                    this.addWarning(`Habit ${habit.id} has low word count (${wordCount} words)`);
                }
                
                // Check for placeholder text
                if (habit.description.includes('TODO') || habit.description.includes('placeholder')) {
                    this.addError(`Habit ${habit.id} contains placeholder text`);
                }
            });
            
            // Research quality check
            const research = await this.loadContentSafely('research', language);
            research.forEach((article, index) => {
                const wordCount = (article.title + ' ' + article.summary).split(/\s+/).length;
                totalWordCount += wordCount;
                contentItems++;
                
                if (wordCount < 30) {
                    this.addWarning(`Research ${article.id} has low word count (${wordCount} words)`);
                }
                
                if (article.summary.includes('TODO') || article.summary.includes('placeholder')) {
                    this.addError(`Research ${article.id} contains placeholder text`);
                }
            });
        }
        
        const averageWordCount = Math.round(totalWordCount / contentItems);
        console.log(`📝 Average content word count: ${averageWordCount} words`);
        
        if (averageWordCount < 50) {
            this.addWarning('Overall content word count is below recommended minimum');
        }
        
        console.log('✅ Content quality validation complete');
    }

    async loadContentSafely(contentType, language) {
        const filePath = `src/content/${contentType}/${language}.json`;
        try {
            if (fs.existsSync(filePath)) {
                return JSON.parse(fs.readFileSync(filePath, 'utf8'));
            }
        } catch (error) {
            this.addError(`Failed to load ${filePath}: ${error.message}`);
        }
        return contentType === 'locales' ? {} : [];
    }

    addError(message) {
        this.errors.push(message);
        this.stats.totalErrors++;
    }

    addWarning(message) {
        this.warnings.push(message);
        this.stats.totalWarnings++;
    }

    generateReport() {
        console.log('\n' + '='.repeat(80));
        console.log('📊 CONTENT VALIDATION REPORT');
        console.log('='.repeat(80));
        
        // Summary statistics
        console.log('\n📈 Summary Statistics:');
        console.log(`   Files validated: ${this.stats.filesValidated}`);
        console.log(`   Total errors: ${this.stats.totalErrors}`);
        console.log(`   Total warnings: ${this.stats.totalWarnings}`);
        console.log(`   Validation time: ${this.stats.validationTime}ms`);
        
        // Errors
        if (this.errors.length > 0) {
            console.log('\n❌ ERRORS:');
            this.errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
        }
        
        // Warnings
        if (this.warnings.length > 0) {
            console.log('\n⚠️ WARNINGS:');
            this.warnings.slice(0, 20).forEach((warning, index) => {
                console.log(`   ${index + 1}. ${warning}`);
            });
            
            if (this.warnings.length > 20) {
                console.log(`   ... and ${this.warnings.length - 20} more warnings`);
            }
        }
        
        // Overall result
        console.log('\n' + '='.repeat(80));
        if (this.errors.length === 0) {
            console.log('✅ VALIDATION PASSED');
            console.log('   All content files are valid and ready for deployment');
        } else {
            console.log('❌ VALIDATION FAILED');
            console.log(`   Found ${this.errors.length} errors that must be fixed before deployment`);
        }
        console.log('='.repeat(80));
        
        // Generate JSON report
        const report = {
            timestamp: new Date().toISOString(),
            statistics: this.stats,
            errors: this.errors,
            warnings: this.warnings,
            passed: this.errors.length === 0
        };
        
        fs.writeFileSync('validation-report.json', JSON.stringify(report, null, 2));
        console.log('\n📄 Detailed report saved to: validation-report.json');
        
        // Exit with appropriate code
        process.exit(this.errors.length > 0 ? 1 : 0);
    }
}

// CLI execution
if (require.main === module) {
    const validator = new ContentValidator();
    validator.validateAll().catch(error => {
        console.error('💥 Validation crashed:', error);
        process.exit(1);
    });
}

module.exports = ContentValidator;