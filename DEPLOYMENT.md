# 🚀 Netlify Deployment Guide

This guide will help you deploy your Hospital Management System to Netlify.

## 📋 Prerequisites

Before deploying, make sure you have:

1. **Supabase Project** - Set up with all required tables and RLS policies
2. **Google Gemini API Key** - For the AI chatbot functionality
3. **GitHub Repository** - Your code should be pushed to GitHub
4. **Netlify Account** - Sign up at [netlify.com](https://netlify.com)

## 🔧 Environment Variables Setup

### Required Environment Variables

You need to set up these environment variables in Netlify:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://your-project-id.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `VITE_GEMINI_API_KEY` | Your Google Gemini API key | `AIzaSyAGYNnfRX9VCMhbMbOpnAJdO6oq3pnwhkM` |

### How to Set Environment Variables in Netlify

1. Go to your Netlify dashboard
2. Select your site
3. Navigate to **Site Settings** > **Environment Variables**
4. Click **Add Variable**
5. Add each variable with its corresponding value
6. Click **Save**

## 🚀 Deployment Steps

### Method 1: Deploy from GitHub (Recommended)

1. **Connect to GitHub**
   - Log in to [Netlify](https://netlify.com)
   - Click **"New site from Git"**
   - Choose **GitHub** as your Git provider
   - Authorize Netlify to access your repositories

2. **Select Repository**
   - Find and select `Hospital-Management-System`
   - Click **"Deploy site"**

3. **Configure Build Settings**
   - Netlify will auto-detect the settings from `netlify.toml`
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: `18`

4. **Set Environment Variables**
   - Go to **Site Settings** > **Environment Variables**
   - Add all required variables (see above)

5. **Deploy**
   - Click **"Deploy site"**
   - Wait for the build to complete
   - Your site will be live at `https://your-site-name.netlify.app`

### Method 2: Manual Deploy

1. **Build Locally**
   ```bash
   npm install
   npm run build
   ```

2. **Deploy to Netlify**
   - Drag and drop the `dist` folder to Netlify
   - Or use Netlify CLI:
   ```bash
   npm install -g netlify-cli
   netlify deploy --prod --dir=dist
   ```

## 🔧 Build Configuration

The project includes these Netlify configuration files:

### `netlify.toml`
- Build settings and environment configuration
- Redirect rules for SPA routing
- Security headers
- Cache optimization

### `public/_redirects`
- SPA routing support
- Ensures all routes work with React Router

## 🛠️ Troubleshooting

### Common Issues

1. **Build Fails**
   - Check that all environment variables are set
   - Ensure Node.js version is 18+
   - Check build logs in Netlify dashboard

2. **Environment Variables Not Working**
   - Variables must start with `VITE_` for Vite to include them
   - Restart the build after adding variables
   - Check variable names match exactly

3. **Routing Issues**
   - Ensure `_redirects` file is in the `public` folder
   - Check that `netlify.toml` redirect rules are correct

4. **Supabase Connection Issues**
   - Verify Supabase URL and anon key are correct
   - Check Supabase project is active
   - Ensure RLS policies are properly configured

### Build Logs

To debug build issues:
1. Go to **Deploys** tab in Netlify dashboard
2. Click on the failed deploy
3. Check the build logs for specific error messages

## 🔒 Security Considerations

### Environment Variables
- Never commit `.env.local` to version control
- Use Netlify's environment variables for sensitive data
- Rotate API keys regularly

### Supabase Security
- Ensure RLS policies are properly configured
- Use service role keys only on the backend
- Regularly audit database permissions

## 📊 Performance Optimization

### Build Optimization
- The project uses Vite for fast builds
- Assets are automatically optimized
- Code splitting is enabled

### Runtime Performance
- Static assets are cached for 1 year
- Service worker caching is configured
- Images are optimized automatically

## 🔄 Continuous Deployment

Once connected to GitHub:
- Every push to `main` branch triggers automatic deployment
- Pull requests can be previewed with deploy previews
- Rollback to previous deployments is available

## 📱 Custom Domain

To use a custom domain:
1. Go to **Domain Settings** in Netlify dashboard
2. Add your custom domain
3. Configure DNS records as instructed
4. Enable HTTPS (automatic with Netlify)

## 🆘 Support

If you encounter issues:
1. Check the [Netlify Documentation](https://docs.netlify.com/)
2. Review build logs in the Netlify dashboard
3. Ensure all environment variables are correctly set
4. Verify Supabase and Gemini API configurations

## 🎉 Success!

Once deployed, your Hospital Management System will be live and accessible to users worldwide!

**Live URL**: `https://your-site-name.netlify.app`

Remember to:
- Test all functionality after deployment
- Monitor the site for any issues
- Keep dependencies updated
- Regularly backup your Supabase database
