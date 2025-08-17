# ScienceHabits Content API

**Private Repository** - Contains protected habit and research content for ScienceHabits application.

## 🔒 Repository Overview

This private repository hosts the ScienceHabits Content API, providing secure access to:
- **Protected Habit Content**: Premium habit frameworks and detailed instructions
- **Research Articles**: Peer-reviewed research with detailed analysis
- **Multi-Language Support**: Content in English, German, French, and Spanish
- **GitHub Pages API**: Zero-cost content delivery with authentication

## 🏗️ Architecture

```
GitHub Pages API ←→ Private Content Repository ←→ Admin Dashboard
                 ↓
            Main ScienceHabits App
```

### Key Features
- ✅ **Zero Monthly Costs**: Free GitHub Pages hosting
- ✅ **Content Protection**: Private repository with API key authentication
- ✅ **Multi-Language**: 4 language support with translation validation
- ✅ **CI/CD Pipeline**: Automated content validation and deployment
- ✅ **Fallback Systems**: Multiple content delivery strategies

## 📁 Repository Structure

```
├── src/
│   ├── api/                    # GitHub Pages API implementation
│   │   ├── index.html         # Main API endpoint with authentication
│   │   ├── health-check.html  # System health monitoring
│   │   └── version.html       # Version information
│   ├── content/               # Protected content (PRIVATE)
│   │   ├── habits/           # Habit content by language
│   │   ├── research/         # Research articles by language
│   │   ├── locales/          # UI translations
│   │   └── metadata/         # Content schemas and versioning
│   └── scripts/              # Content processing and validation
├── tests/                    # Content validation tests
├── .github/workflows/        # CI/CD automation
└── docs/                    # API documentation
```

## 🚀 Quick Start

### 1. Repository Setup
```bash
# Clone this repository (private access required)
git clone https://github.com/your-username/sciencehabits-content-api.git
cd sciencehabits-content-api

# Install dependencies
npm install

# Validate content
npm run validate

# Test API locally
npm run dev
```

### 2. Content Management
```bash
# Add new habit content
npm run add:habit --language=en

# Validate all content
npm run validate:all

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production
```

### 3. API Usage
```bash
# Health check (no auth required)
curl "https://your-username.github.io/sciencehabits-content-api/?endpoint=health"

# Get habits (requires API key)
curl "https://your-username.github.io/sciencehabits-content-api/?endpoint=habits&lang=en&key=YOUR_API_KEY"

# Get research articles
curl "https://your-username.github.io/sciencehabits-content-api/?endpoint=research&lang=en&key=YOUR_API_KEY"
```

## 🔑 Authentication

### API Keys
- **Build Key**: Used by main app during build process
- **Admin Key**: Used by admin dashboard (read/write access)
- **Staging Key**: Used for testing and validation

### Environment Variables
```bash
# Required for local development
GITHUB_PAGES_API_URL=https://your-username.github.io/sciencehabits-content-api
BUILD_API_KEY=your-build-key
ADMIN_API_KEY=your-admin-key
STAGING_API_KEY=your-staging-key
```

## 📊 Content Statistics

| Content Type | Languages | Total Items | Last Updated |
|--------------|-----------|-------------|--------------|
| **Habits** | 4 | 150+ | 2024-08-16 |
| **Research** | 4 | 200+ | 2024-08-16 |
| **UI Translations** | 4 | 500+ keys | 2024-08-16 |

## 🔄 Content Lifecycle

1. **Creation**: Content created via admin dashboard or direct editing
2. **Validation**: Automated schema validation and quality checks
3. **Translation**: Multi-language content generation and review
4. **Testing**: Staging deployment with integration tests
5. **Deployment**: Production deployment with health verification
6. **Monitoring**: Continuous monitoring and analytics

## 🛡️ Security

- **Private Repository**: Content not accessible without authentication
- **API Key Authentication**: All endpoints require valid API keys
- **Rate Limiting**: Protection against abuse and excessive requests
- **Content Validation**: Automated checks for data integrity
- **Access Logging**: Monitor all API access for security

## 📈 Performance

- **Response Time**: <200ms average API response
- **Uptime**: 99.9% availability (GitHub Pages SLA)
- **Caching**: Browser and CDN caching for optimal performance
- **Compression**: Gzip/Brotli compression for faster delivery

## 🔗 Integration

### Main ScienceHabits App
```typescript
// Content fetching during build
const content = await fetchContentAPI({
  endpoint: 'all',
  language: 'en',
  apiKey: process.env.BUILD_API_KEY
});
```

### Admin Dashboard
```typescript
// Real-time content management
const habits = await contentAPI.fetchHabits('en');
const research = await contentAPI.fetchResearch('en');
```

## 📝 Contributing

### Content Guidelines
1. **Quality**: All content must be research-backed and scientifically accurate
2. **Translation**: Maintain cultural context and linguistic accuracy
3. **Validation**: Run full validation suite before committing
4. **Documentation**: Update relevant documentation with changes

### Development Workflow
1. Create feature branch from `main`
2. Make content or API changes
3. Run validation and tests
4. Submit pull request with description
5. Deploy to staging for testing
6. Merge to main and deploy to production

## 📞 Support

- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Documentation**: See `/docs` directory for detailed guides
- **Contact**: admin@sciencehabits.app

---

**⚠️ IMPORTANT**: This is a private repository containing proprietary content. Do not share access credentials or repository contents publicly.

**🔐 Security Notice**: All API keys and sensitive information should be stored in environment variables or GitHub Secrets, never committed to the repository.