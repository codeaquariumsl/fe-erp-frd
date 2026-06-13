# Code Aqua ERP Solutions ERP

A modern ERP system for Code Aqua ERP Solutions, built with Next.js, React, TypeScript, and Tailwind CSS. This application manages master data, transactions, analytics, and reporting for trading operations, with a focus on usability, robust filtering, and clear feedback.

## Features

- **Master Data Management**: Items, Item Prices, Customers, Suppliers, Categories, Locations, Vehicles, Stores, Drivers
- **Transaction Management**: Sales Orders, Purchase Orders, Delivery Orders, GRNs
- **Cold Storage Management**: Cold Rooms, Pallet Racks, Pallets
- **Filtering & Analytics**: Customer-wise filters, search, summary cards, compact dashboards
- **Validation & Feedback**: Form validation, error handling, toast notifications, badges
- **Modern UI**: Responsive design, ShadCN UI components, Tailwind CSS
- **API Integration**: Centralized API helpers, backend response transformation

## Tech Stack

- **Frontend**: Next.js 15.2.4, React, TypeScript
- **UI**: Tailwind CSS, ShadCN UI, Lucide Icons
- **State Management**: React hooks
- **Backend API**: RESTful endpoints via `/api/proxy/*`
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Backend API server running

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sunil-traders-erp
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment variables**
   Copy `.env.local.example` to `.env.local` and update the API URL:
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local`:
   ```bash
   # For development (local backend)
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   
   # For development (remote backend)
   NEXT_PUBLIC_API_URL=http://3.110.112.244:9001/api
   ```

4. **Run the development server**
   ```bash
   pnpm dev
   ```

5. **Open in browser**
   Visit [http://localhost:3000](http://localhost:3000)

## Building for Production

### 1. Build the Application

```bash
# Install dependencies
pnpm install

# Build for production
pnpm build

# Test the production build locally
pnpm start
```

### 2. Build Output

**With `output: 'export'` in next.config.mjs** (Static Export):
- `out/` - Static HTML, CSS, JS files for traditional web servers
- No server-side rendering (client-side only)

**Without `output: 'export'`** (Standard Build):
- `.next/` - Optimized production files for SSR
- Server-side rendering capabilities (for Vercel, Node.js servers)

## Deployment Options

### Option 1: Vercel (Recommended)

1. **Deploy to Vercel**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel
   ```

2. **Configure Environment Variables in Vercel**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add: `NEXT_PUBLIC_API_URL=https://your-api-domain.com/api`

### Option 2: Traditional Web Server (Apache/Nginx)

⚠️ **Important**: Static export is **NOT recommended** for this ERP system because it uses API routes (`/api/proxy/*`) which are not supported in static exports.

**For Static Export (Limited Functionality)**:

1. **Configure for static export**
   Edit `next.config.mjs` to enable static export:
   ```javascript
   const nextConfig = {
     // ... other config
     output: 'export',
     trailingSlash: true,
     distDir: 'out',
   }
   ```

2. **Update API configuration**
   Change `.env.local` to point directly to your backend:
   ```bash
   # Direct API URL (bypasses Next.js proxy)
   NEXT_PUBLIC_API_URL=http://codeaqua.com:9002/api
   ```

3. **Build static files**
   ```bash
   pnpm build
   ```

**Recommended Alternative: Use Node.js hosting** instead of static hosting to maintain full functionality.

3. **Nginx Configuration Example**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           root /var/www/code-aqua-erp;
           try_files $uri $uri/ /index.html;
       }
   }
   ```

### Option 3: Node.js Server (Recommended for Full Functionality)

1. **Build the application**
   ```bash
   pnpm build
   ```

2. **Deploy to your server**
   ```bash
   # Copy files to server
   scp -r .next package.json your-server:/var/www/code-aqua-erp/
   
   # On your server
   cd /var/www/code-aqua-erp
   npm install --production
   ```

3. **Run with PM2 (recommended)**
   ```bash
   # Install PM2
   npm install -g pm2
   
   # Start the application
   pm2 start npm --name "code-aqua-erp" -- start
   pm2 save
   pm2 startup
   ```

4. **Configure reverse proxy (Nginx)**
   ```nginx
   server {
       listen 80;
       server_name erp.suniltraders.lk;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

### Option 4: Docker Deployment

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine AS deps
   WORKDIR /app
   COPY package.json pnpm-lock.yaml ./
   RUN npm install -g pnpm && pnpm install --frozen-lockfile

   FROM node:18-alpine AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   ENV NEXT_PUBLIC_API_URL=https://your-api-domain.com/api
   RUN npm install -g pnpm && pnpm build

   FROM node:18-alpine AS runner
   WORKDIR /app
   ENV NODE_ENV production
   COPY --from=builder /app/public ./public
   COPY --from=builder /app/.next/standalone ./
   COPY --from=builder /app/.next/static ./.next/static
   
   EXPOSE 3000
   CMD ["node", "server.js"]
   ```

2. **Build and run Docker container**
   ```bash
   docker build -t code-aqua-erp .
      docker run -p 3000:3000 code-aqua-erp
   ```

## AWS Linux 2 Deployment

### Prerequisites

- AWS EC2 instance running Amazon Linux 2
- Security groups configured (ports 22, 80, 443, 3000)
- Elastic IP (optional but recommended)
- Domain name pointing to your EC2 instance (optional)

### Step 1: Prepare EC2 Instance

1. **Launch EC2 Instance**
   ```bash
   # Choose Amazon Linux 2 AMI
   # Instance type: t3.small or larger (minimum 1GB RAM)
   # Configure security groups to allow:
   # - SSH (port 22) from your IP
   # - HTTP (port 80) from anywhere
   # - HTTPS (port 443) from anywhere
   # - Custom TCP (port 3000) from anywhere (temporary)
   ```

2. **Connect to your instance**
   ```bash
   ssh -i your-key.pem ec2-user@your-ec2-ip
   ```

### Step 2: Install Required Software

```bash
# Update system packages
sudo yum update -y

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install Git
sudo yum install -y git

# Install PM2 globally
sudo npm install -g pm2

# Install pnpm
sudo npm install -g pnpm

# Install Nginx
sudo amazon-linux-extras install nginx1 -y
```

### Step 3: Deploy the Application

1. **Clone and setup the project**
   ```bash
   # Clone your repository
   cd /home/ec2-user
   git clone <your-repository-url> code-aqua-erp
   cd code-aqua-erp

   # Install dependencies
   pnpm install

   # Configure environment variables
   cp .env.local.example .env.local
   nano .env.local
   ```

2. **Configure environment variables**
   ```bash
   # Edit .env.local
   NEXT_PUBLIC_API_URL=http://codeaqua.com:9002/api
   # or your production API URL
   ```

3. **Build the application**
   ```bash
   pnpm build
   ```

4. **Test the application**
   ```bash
   # Test locally first
   pnpm start
   # Visit http://your-ec2-ip:3000 to verify it works
   # Press Ctrl+C to stop
   ```

### Step 4: Configure PM2 for Production

1. **Create PM2 configuration**
   ```bash
   # Create ecosystem file
   nano ecosystem.config.js
   ```

   Add the following content:
   ```javascript
   module.exports = {
     apps: [{
       name: 'code-aqua-erp',
       script: 'npm',
       args: 'start',
       cwd: '/home/ec2-user/code-aqua-erp',
       instances: 1,
       autorestart: true,
       watch: false,
       max_memory_restart: '1G',
       env: {
         NODE_ENV: 'production',
         PORT: 3000
       }
     }]
   }
   ```

2. **Start with PM2**
   ```bash
   # Start the application
   pm2 start ecosystem.config.js

   # Save PM2 configuration
   pm2 save

   # Generate startup script
   pm2 startup
   # Follow the instructions to run the generated command with sudo

   # Check status
   pm2 status
   pm2 logs sunil-traders-erp
   ```

### Step 5: Configure Nginx Reverse Proxy

1. **Create Nginx configuration**
   ```bash
   sudo nano /etc/nginx/conf.d/code-aqua-erp.conf
   ```

   Add the following configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;  # Replace with your domain or EC2 public IP
       
       # Redirect all HTTP traffic to HTTPS (optional)
       # return 301 https://$server_name$request_uri;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
           proxy_read_timeout 86400;
       }
       
       # Optional: Serve static files directly through Nginx
       location /_next/static/ {
           alias /home/ec2-user/code-aqua-erp/.next/static/;
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

2. **Enable and start Nginx**
   ```bash
   # Test configuration
   sudo nginx -t
   
   # Start and enable Nginx
   sudo systemctl start nginx
   sudo systemctl enable nginx
   
   # Check status
   sudo systemctl status nginx
   ```

### Step 6: Configure SSL (HTTPS) with Let's Encrypt

1. **Install Certbot**
   ```bash
   sudo yum install -y certbot python3-certbot-nginx
   ```

2. **Obtain SSL certificate**
   ```bash
   # Replace with your domain
   sudo certbot --nginx -d your-domain.com
   
   # Test automatic renewal
   sudo certbot renew --dry-run
   ```

3. **Updated Nginx configuration (after SSL)**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       return 301 https://$server_name$request_uri;
   }
   
   server {
       listen 443 ssl;
       server_name your-domain.com;
       
       ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
           proxy_read_timeout 86400;
       }
   }
   ```

### Step 7: Configure Firewall and Security

```bash
# Configure iptables (if needed)
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Block direct access to port 3000 from outside
sudo iptables -A INPUT -p tcp --dport 3000 -s localhost -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 3000 -j DROP

# Save iptables rules
sudo service iptables save
```

### Step 8: Monitoring and Maintenance

1. **Setup log rotation**
   ```bash
   # PM2 logs are automatically rotated
   pm2 install pm2-logrotate
   ```

2. **Monitor the application**
   ```bash
   # Check PM2 status
   pm2 status
   pm2 monit
   
   # Check Nginx logs
   sudo tail -f /var/log/nginx/access.log
   sudo tail -f /var/log/nginx/error.log
   
   # Check system resources
   htop
   df -h
   ```

3. **Backup and updates**
   ```bash
   # Create backup script
   nano ~/backup.sh
   ```
   
   ```bash
   #!/bin/bash
   DATE=$(date +%Y%m%d_%H%M%S)
   
   # Stop application
   pm2 stop code-aqua-erp
   
   # Backup current version
   cp -r /home/ec2-user/code-aqua-erp /home/ec2-user/backup_$DATE
   
   # Pull latest changes
   cd /home/ec2-user/code-aqua-erp
   git pull origin main
   
   # Install dependencies and rebuild
   pnpm install
   pnpm build
   
   # Restart application
   pm2 restart code-aqua-erp
   
   echo "Deployment completed at $DATE"
   ```

### Step 9: Troubleshooting Common Issues

1. **Application won't start**
   ```bash
   # Check PM2 logs
   pm2 logs sunil-traders-erp
   
   # Check if port is in use
   sudo netstat -tlnp | grep :3000
   
   # Restart PM2
   pm2 restart code-aqua-erp
   ```

2. **Nginx errors**
   ```bash
   # Check Nginx configuration
   sudo nginx -t
   
   # Check Nginx logs
   sudo tail -f /var/log/nginx/error.log
   
   # Restart Nginx
   sudo systemctl restart nginx
   ```

3. **SSL certificate issues**
   ```bash
   # Renew certificate manually
   sudo certbot renew
   
   # Check certificate status
   sudo certbot certificates
   ```

### Step 10: Performance Optimization

1. **Enable gzip compression in Nginx**
   ```nginx
   # Add to your server block
   gzip on;
   gzip_vary on;
   gzip_min_length 1024;
   gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
   ```

2. **Setup CloudWatch monitoring** (optional)
   ```bash
   # Install CloudWatch agent
   wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
   sudo rpm -U ./amazon-cloudwatch-agent.rpm
   ```

### Cost Optimization Tips

- Use **t3.small** instance for development, **t3.medium** or larger for production
- Set up **CloudWatch alarms** for CPU/memory usage
- Use **Application Load Balancer** for high availability (if needed)
- Consider **RDS** for database instead of running on same instance
- Set up **auto-scaling groups** for traffic spikes

This deployment guide provides a production-ready setup for the Code Aqua ERP Solutions ERP on AWS Linux 2 with proper security, monitoring, and SSL configuration.

## 📄 License

This project is proprietary and developed by Code Aqua ERP Solutions.

## Environment Configuration

### API URL Management

The application uses `NEXT_PUBLIC_API_URL` to connect to the backend API.

#### Development Environments

```bash
# Local development with local backend
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# Local development with staging backend  
NEXT_PUBLIC_API_URL=http://192.168.1.100:5000/api

# Local development with production backend
NEXT_PUBLIC_API_URL=https://api.codeaqua.lk/api
```

#### Production Environments

```bash
# Production with HTTPS
NEXT_PUBLIC_API_URL=https://api.codeaqua.lk/api

# Staging environment
NEXT_PUBLIC_API_URL=https://staging-api.codeaqua.lk/api

# Internal server (non-HTTPS)
NEXT_PUBLIC_API_URL=http://10.0.0.50:9001/api
```

### HTTPS Configuration

#### For Frontend (Next.js)

1. **Using Vercel**: Automatic HTTPS
2. **Using custom domain**: Configure SSL certificate in your hosting provider
3. **Using reverse proxy** (Nginx/Apache):
   ```nginx
   server {
       listen 443 ssl;
       server_name erp.suniltraders.lk;
       
       ssl_certificate /path/to/certificate.crt;
       ssl_certificate_key /path/to/private.key;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

#### For Backend API

Ensure your backend API server supports HTTPS:
- Use SSL certificates (Let's Encrypt, commercial CA)
- Configure proper CORS headers
- Update firewall rules for HTTPS (port 443)

### Environment-Specific Configurations

#### .env.local (Development)
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

#### .env.production (Production)
```bash
NEXT_PUBLIC_API_URL=https://api.suniltraders.lk/api
```

#### .env.staging (Staging)
```bash
NEXT_PUBLIC_API_URL=https://staging-api.suniltraders.lk/api
```

## Performance Optimization

### Build Optimization

```bash
# Analyze bundle size
pnpm build && pnpm analyze

# Enable compression in next.config.mjs
const nextConfig = {
  compress: true,
  swcMinify: true,
  experimental: {
    optimizeCss: true
  }
}
```

### Runtime Optimization

- Use Next.js Image optimization
- Implement proper caching headers
- Enable gzip/brotli compression
- Use CDN for static assets

## Monitoring & Debugging

### Development Debugging

```bash
# Enable debug mode
DEBUG=* pnpm dev

# Check network requests in browser DevTools
# Monitor API calls in Network tab
```

### Production Monitoring

- Set up error tracking (Sentry, LogRocket)
- Monitor API response times
- Track user interactions and performance
- Set up uptime monitoring

## Troubleshooting

### Common Issues

1. **API Connection Errors**
   ```bash
   # Check if backend is running
   curl http://localhost:5000/api/health
   
   # Verify CORS configuration
   # Check network connectivity
   ```

2. **Build Failures**
   ```bash
   # Clear Next.js cache
   rm -rf .next
   
   # Reinstall dependencies
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   ```

3. **Environment Variable Issues**
   - Ensure variables start with `NEXT_PUBLIC_` for client-side access
   - Restart development server after changing environment variables
   - Check that `.env.local` is not committed to version control

## Project Structure

- `app/` - Next.js app directory (pages, API routes, layouts)
- `components/` - Reusable UI components
- `hooks/` - Custom React hooks
- `lib/` - API helpers, type definitions
- `public/` - Static assets
- `styles/` - Global styles

## Key Files

- `app/master/items/page.tsx` - Items master data CRUD
- `app/master/item-prices/page.tsx` - Customer-wise item price management
- `app/sales/page.tsx` - Sales order management, customer filter
- `lib/api.ts` - Central API and type definitions
- `.env.local` - Environment configuration
- `next.config.mjs` - Next.js configuration

## Contributing

1. Create feature branch: `git checkout -b feature/new-feature`
2. Make changes and test locally
3. Update documentation if needed
4. Submit pull request

## Support

For technical support or questions:
- Check the troubleshooting section above
- Review API documentation
- Contact the development team at Code Aqua ERP Solutions

## License

This project is proprietary and developed by Code Aqua ERP Solutions.
