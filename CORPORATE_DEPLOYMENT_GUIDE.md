# Vortex Animation Corporate Deployment Guide

## Overview

This guide ensures your Vortex animation React application runs smoothly in corporate environments with strict security policies, network restrictions, and compliance requirements.

## Current Setup Analysis

- **Frontend**: React 18 app running on port 7770
- **Backend**: Node.js Express server running on port 7775
- **Key Dependencies**: Framer Motion, Tailwind CSS, Camera functionality, File upload capabilities
- **AI Services**: OpenAI API, Ollama vision models

## Corporate Environment Checklist

### 1. Network & Security Configuration

#### A. Port Configuration

```bash
# Default ports used by the application
CLIENT_PORT=7770
SERVER_PORT=7775

# Corporate alternatives (if default ports are blocked)
CLIENT_PORT=8080
SERVER_PORT=8081
```

#### B. Firewall Rules Required

```bash
# Inbound rules needed
- Allow port 7770 (or your chosen client port)
- Allow port 7775 (or your chosen server port)
- Allow port 443 for HTTPS (production)
- Allow port 80 for HTTP redirect (production)

# Outbound rules needed
- Allow HTTPS (443) for OpenAI API calls
- Allow HTTP/HTTPS for npm package downloads
- Allow port 11434 for Ollama (if using local AI)
```

#### C. CORS Configuration

The application is configured for local networks but may need corporate-specific origins:

```javascript
// Update server/server.js CORS configuration
const allowedOrigins = [
  "http://localhost:7770",
  "http://127.0.0.1:7770",
  "https://your-corporate-domain.com",
  "https://vortex.your-company.com",
  /^https:\/\/.*\.your-company\.com$/,
  // Add your corporate network ranges
  /^http:\/\/10\.\d+\.\d+\.\d+:7770$/,
  /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:7770$/,
  /^http:\/\/192\.168\.\d+\.\d+:7770$/,
];
```

### 2. Environment Configuration

#### A. Create Production Environment Files

Create `.env.production` in the client directory:

```bash
# Client environment variables
REACT_APP_API_URL=https://your-api-domain.com/api
REACT_APP_ENVIRONMENT=production
REACT_APP_ENABLE_CAMERA=true
REACT_APP_ENABLE_VOICE=true
GENERATE_SOURCEMAP=false
```

Create `.env.production` in the server directory:

```bash
# Server environment variables
NODE_ENV=production
PORT=7775
OPENAI_API_KEY=your_openai_api_key_here
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen:7b
OLLAMA_VISION_MODEL=qwen:7b

# Corporate specific
CORS_ORIGIN=https://your-corporate-domain.com
MAX_FILE_SIZE=10485760
UPLOAD_LIMIT=50mb
```

#### B. Corporate Proxy Configuration

If your corporate network uses a proxy:

```bash
# Add to server .env file
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=https://proxy.company.com:8080
NO_PROXY=localhost,127.0.0.1,.company.com
```

### 3. Security Hardening

#### A. Update Helmet Configuration

```javascript
// In server/server.js, enhance helmet configuration
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "https://api.openai.com"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginEmbedderPolicy: { policy: "require-corp" },
  })
);
```

#### B. Rate Limiting for Corporate Use

```javascript
// Enhanced rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
```

### 4. Dependencies & Package Management

#### A. Corporate NPM Registry

If your company uses a private NPM registry:

```bash
# Configure npm registry
npm config set registry https://your-corporate-registry.com/
npm config set //your-corporate-registry.com/:_authToken YOUR_TOKEN
```

#### B. Package Security Audit

```bash
# Run security audit before deployment
npm audit
npm audit fix

# Check for vulnerabilities
npm ls --depth=0
```

### 5. Build & Deployment Process

#### A. Production Build Script

Create `deploy.sh`:

```bash
#!/bin/bash
set -e

echo "🏢 Corporate Deployment - Vortex Animation"
echo "=========================================="

# Check Node.js version
node --version
npm --version

# Install dependencies
echo "📦 Installing dependencies..."
cd client && npm ci --only=production
cd ../server && npm ci --only=production

# Build client
echo "🔨 Building client..."
cd ../client && npm run build

# Security checks
echo "🔍 Running security audit..."
npm audit --audit-level moderate

# Start server
echo "🚀 Starting server..."
cd ../server && npm start

echo "✅ Deployment completed successfully!"
```

#### B. PM2 Process Manager (Recommended for Production)

```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem.config.js
module.exports = {
  apps: [{
    name: 'vortex-server',
    script: 'server/server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 7775
    },
    instances: 2,
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    log_file: 'logs/combined.log',
    out_file: 'logs/out.log',
    error_file: 'logs/error.log',
    time: true
  }]
};
```

### 6. SSL/TLS Configuration

#### A. HTTPS Setup for Production

```javascript
// server/server.js - Add HTTPS support
const https = require("https");
const fs = require("fs");

if (process.env.NODE_ENV === "production") {
  const privateKey = fs.readFileSync("/path/to/private-key.pem", "utf8");
  const certificate = fs.readFileSync("/path/to/certificate.pem", "utf8");
  const ca = fs.readFileSync("/path/to/ca.pem", "utf8");

  const credentials = {
    key: privateKey,
    cert: certificate,
    ca: ca,
  };

  const httpsServer = https.createServer(credentials, app);
  httpsServer.listen(443, () => {
    console.log("HTTPS Server running on port 443");
  });
}
```

#### B. Redirect HTTP to HTTPS

```javascript
// Add HTTP to HTTPS redirect
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (req.header("x-forwarded-proto") !== "https") {
      res.redirect(`https://${req.header("host")}${req.url}`);
    } else {
      next();
    }
  });
}
```

### 7. Corporate Compliance

#### A. Data Privacy & GDPR

```javascript
// Add data retention policies
const dataRetentionDays = 30;
const cleanupOldUploads = () => {
  // Implementation for cleaning old uploads
};

// Add privacy headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});
```

#### B. Audit Logging

```javascript
// Add comprehensive logging
const winston = require("winston");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json()),
  transports: [new winston.transports.File({ filename: "logs/error.log", level: "error" }), new winston.transports.File({ filename: "logs/combined.log" })],
});
```

### 8. Health Monitoring

#### A. Health Check Endpoints

```javascript
// Add comprehensive health check
app.get("/api/health/detailed", async (req, res) => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version,
    services: {
      openai: await checkOpenAIHealth(),
      ollama: await checkOllamaHealth(),
      database: "healthy", // if using database
    },
  };
  res.json(health);
});
```

#### B. Performance Monitoring

```javascript
// Add performance monitoring
const responseTime = require("response-time");
app.use(
  responseTime((req, res, time) => {
    console.log(`${req.method} ${req.url} - ${time}ms`);
  })
);
```

### 9. Deployment Commands

#### A. Quick Start for Corporate Environment

```bash
# 1. Clone and setup
git clone [repository]
cd vortex-agent

# 2. Install dependencies
npm install
cd client && npm install
cd ../server && npm install

# 3. Configure environment
cp .env.example .env.production
# Edit .env.production with your corporate settings

# 4. Build and start
npm run build
npm start
```

#### B. Docker Deployment (Corporate Container Registry)

```dockerfile
# Dockerfile for corporate deployment
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies
RUN npm ci --only=production
RUN cd client && npm ci --only=production
RUN cd server && npm ci --only=production

# Copy source code
COPY . .

# Build client
RUN cd client && npm run build

# Expose ports
EXPOSE 7770 7775

# Start server
CMD ["npm", "start"]
```

### 10. Troubleshooting Corporate Issues

#### A. Common Corporate Network Issues

```bash
# Test network connectivity
curl -I https://api.openai.com/v1/models
curl -I http://localhost:11434/api/tags

# Check port availability
netstat -tulpn | grep :7770
netstat -tulpn | grep :7775

# Test CORS
curl -H "Origin: https://your-corporate-domain.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://localhost:7775/api/health
```

#### B. Corporate Firewall Debugging

```javascript
// Add debug logging for network issues
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log("Headers:", req.headers);
  console.log("Origin:", req.get("origin"));
  next();
});
```

### 11. Final Deployment Checklist

- [ ] Environment variables configured
- [ ] Firewall rules in place
- [ ] SSL certificates installed
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Logging configured
- [ ] Health checks working
- [ ] CORS properly configured
- [ ] File upload limits set
- [ ] Proxy configuration (if needed)
- [ ] Corporate registry configured
- [ ] Security audit passed
- [ ] Performance monitoring enabled
- [ ] Backup strategy in place
- [ ] Documentation updated

### 12. Corporate Support Contacts

When deploying in a corporate environment, ensure you have:

- **IT Security Team**: For firewall and security configurations
- **Network Team**: For CORS and proxy configurations
- **Compliance Team**: For data privacy and retention policies
- **DevOps Team**: For deployment and monitoring setup

---

## Quick Corporate Deployment

For immediate corporate deployment, run:

```bash
# Set corporate environment
export NODE_ENV=production
export REACT_APP_API_URL=https://your-api-domain.com/api

# Install and build
npm install
cd client && npm run build
cd ../server && npm start
```

Your Vortex animation should now be running in corporate environment! 🏢✨
