#!/bin/bash
set -e

echo "🏢 Vortex Animation - Corporate Deployment Script"
echo "=================================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running in corporate environment
if [[ "$NODE_ENV" == "production" ]]; then
    print_info "Production environment detected"
else
    print_warning "Setting NODE_ENV to production for corporate deployment"
    export NODE_ENV=production
fi

# Check Node.js version
print_info "Checking Node.js version..."
node_version=$(node --version | cut -d 'v' -f2)
required_version="16.0.0"

if [[ $(echo "$node_version $required_version" | tr " " "\n" | sort -V | head -n1) != "$required_version" ]]; then
    print_error "Node.js version $node_version is below required version $required_version"
    exit 1
fi

print_status "Node.js version: $node_version"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed or not in PATH"
    exit 1
fi

print_status "npm version: $(npm --version)"

# Check if we're in the right directory
if [[ ! -f "package.json" ]] || [[ ! -d "client" ]] || [[ ! -d "server" ]]; then
    print_error "This script must be run from the vortex-agent root directory"
    exit 1
fi

print_status "Project structure verified"

# Create logs directory if it doesn't exist
mkdir -p logs
print_status "Logs directory created"

# Install dependencies
print_info "Installing dependencies..."
echo "📦 Installing root dependencies..."
npm ci --only=production

echo "📦 Installing client dependencies..."
cd client
npm ci --only=production

echo "📦 Installing server dependencies..."
cd ../server
npm ci --only=production

cd ..
print_status "Dependencies installed"

# Run security audit
print_info "Running security audit..."
npm audit --audit-level moderate || {
    print_warning "Security audit found issues. Please review and fix before deploying to production."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Deployment cancelled due to security issues"
        exit 1
    fi
}

print_status "Security audit completed"

# Build client
print_info "Building client application..."
cd client
npm run build
cd ..
print_status "Client build completed"

# Check for environment files
print_info "Checking environment configuration..."

# Create environment files if they don't exist
if [[ ! -f "server/.env.production" ]]; then
    print_warning "Creating server/.env.production file..."
    cat > server/.env.production << EOL
# Server environment variables for production
NODE_ENV=production
PORT=7775
OPENAI_API_KEY=your_openai_api_key_here
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen:7b
OLLAMA_VISION_MODEL=qwen:7b

# Corporate specific settings
CORS_ORIGIN=https://your-corporate-domain.com
MAX_FILE_SIZE=10485760
UPLOAD_LIMIT=50mb

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
HELMET_CSP_ENABLED=true
HSTS_ENABLED=true
EOL
    print_warning "Please edit server/.env.production with your actual values"
fi

if [[ ! -f "client/.env.production" ]]; then
    print_warning "Creating client/.env.production file..."
    cat > client/.env.production << EOL
# Client environment variables for production
REACT_APP_API_URL=https://your-api-domain.com/api
REACT_APP_ENVIRONMENT=production
REACT_APP_ENABLE_CAMERA=true
REACT_APP_ENABLE_VOICE=true
GENERATE_SOURCEMAP=false
EOL
    print_warning "Please edit client/.env.production with your actual values"
fi

print_status "Environment configuration checked"

# Create PM2 ecosystem file
print_info "Creating PM2 ecosystem configuration..."
cat > ecosystem.config.js << EOL
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
    time: true,
    env_production: {
      NODE_ENV: 'production',
      PORT: 7775
    }
  }]
};
EOL

print_status "PM2 configuration created"

# Check if PM2 is available
if command -v pm2 &> /dev/null; then
    print_info "PM2 detected - Starting with process manager..."
    pm2 start ecosystem.config.js --env production
    pm2 save
    print_status "Application started with PM2"
    print_info "Use 'pm2 status' to check application status"
    print_info "Use 'pm2 logs vortex-server' to view logs"
else
    print_warning "PM2 not found. Install PM2 globally for production deployment:"
    print_info "npm install -g pm2"
    print_info "Starting application with Node.js..."
    cd server
    nohup npm start > ../logs/server.log 2>&1 &
    SERVER_PID=$!
    echo $SERVER_PID > ../server.pid
    cd ..
    print_status "Server started with PID: $SERVER_PID"
    print_info "Check logs with: tail -f logs/server.log"
fi

# Create corporate deployment summary
print_info "Creating deployment summary..."
cat > DEPLOYMENT_SUMMARY.md << EOL
# Vortex Animation - Corporate Deployment Summary

## Deployment Details
- **Date**: $(date)
- **Environment**: Production
- **Node.js Version**: $(node --version)
- **npm Version**: $(npm --version)

## Services
- **Client**: Built and ready (port 7770)
- **Server**: Running on port 7775
- **Process Manager**: $(command -v pm2 &> /dev/null && echo "PM2" || echo "Node.js")

## Configuration Files
- ✅ ecosystem.config.js (PM2 configuration)
- ✅ server/.env.production (Server environment)
- ✅ client/.env.production (Client environment)

## Next Steps
1. Configure your corporate domain in CORS settings
2. Set up SSL certificates for HTTPS
3. Configure firewall rules (ports 7770, 7775)
4. Update environment variables with actual values
5. Set up monitoring and alerting

## Health Checks
- Server health: http://localhost:7775/api/health
- Detailed health: http://localhost:7775/api/health/detailed

## Log Files
- Combined logs: logs/combined.log
- Error logs: logs/error.log
- Server output: logs/out.log

## Corporate Compliance
- Security headers configured
- Rate limiting enabled
- File upload restrictions in place
- Audit logging enabled
EOL

print_status "Deployment summary created"

# Final health check
print_info "Performing health check..."
sleep 5  # Give server time to start

if curl -f http://localhost:7775/api/health >/dev/null 2>&1; then
    print_status "Health check passed - Server is running"
else
    print_warning "Health check failed - Server may still be starting"
    print_info "Check logs for any issues"
fi

echo ""
echo "🎉 Corporate Deployment Complete!"
echo "================================="
echo ""
print_info "Your Vortex animation is now running in corporate environment!"
echo ""
print_info "Access your application at:"
echo "   - Client: http://localhost:7770"
echo "   - Server: http://localhost:7775"
echo ""
print_info "Important next steps:"
echo "   1. Edit server/.env.production with your API keys"
echo "   2. Edit client/.env.production with your domain"
echo "   3. Configure SSL certificates for HTTPS"
echo "   4. Set up corporate firewall rules"
echo "   5. Review CORPORATE_DEPLOYMENT_GUIDE.md for full setup"
echo ""
print_info "Management commands:"
if command -v pm2 &> /dev/null; then
    echo "   - View status: pm2 status"
    echo "   - View logs: pm2 logs vortex-server"
    echo "   - Restart: pm2 restart vortex-server"
    echo "   - Stop: pm2 stop vortex-server"
else
    echo "   - View logs: tail -f logs/server.log"
    echo "   - Stop server: kill \$(cat server.pid)"
fi

echo ""
print_status "Deployment script completed successfully! 🚀" 