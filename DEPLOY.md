# 🚀 Deployment Guide

This guide provides a complete step-by-step process for deploying Simple CRM to production.

## Prerequisites

- Node.js 18+
- Supabase account
- RingCentral developer account
- Vercel account (recommended)

## Features Overview

This CRM includes:

### Sprint 1 Features ✅
- **Kanban Deals Board**: Drag & drop deals across pipeline stages
- **Contacts Management**: Search, view, and manage contacts
- **Companies Management**: Organize business accounts
- **Settings Page**: Basic configuration
- **RingCentral Integration**: OAuth setup for telephony
- **Click-to-Call**: Make calls from contact/deal pages

### Sprint 2 Features ✅ (Multi-User & Hardening)
- **Authentication**: Email magic link authentication with Supabase Auth
- **User Mirroring**: Automatic sync of auth.users → public.users
- **Organizations**: Multi-tenancy with organization-based data isolation
- **RLS Policies**: Row-level security for data protection
- **Phone Normalization**: E.164 format with deduplication
- **Token Refresh**: Automatic RingCentral token renewal
- **Webhook Verification**: Secure webhook signature validation
- **Realtime Screen Pop**: Live incoming call notifications
- **CSV Import**: Bulk import contacts and companies
- **UI Polish**: Enhanced tables, forms, toasts, and stats

## 1. Supabase Setup

### Create Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose your organization and project name
3. Select a database password (save this securely)
4. Choose a region close to your users
5. Wait for the project to be fully initialized (can take 2-3 minutes)

### Database Configuration
1. Navigate to your project's SQL Editor
2. Copy and paste the contents of `db/schema.sql`
3. Click "Run" to create all tables, relationships, and RLS policies

   The schema now includes:
   - **Organizations & Members**: Multi-tenancy support
   - **Organization-scoped data**: All core tables now have `organization_id`
   - **RLS Policies**: Automatic data isolation by organization
   - **Phone normalization**: Built-in support for E.164 format
   - **Webhook logging**: Call log tracking with organization context

4. Copy and paste the contents of `db/seed.sql`
5. Click "Run" to populate with sample data

   Sample data includes:
   - Demo organizations and users
   - Sample contacts with normalized phone numbers
   - Deals across different pipeline stages
   - Activity history and call logs

### Environment Variables
In your Supabase dashboard:
1. Go to Settings → API
2. Copy the following values:
   - `Project URL` (for NEXT_PUBLIC_SUPABASE_URL)
   - `anon public` key (for NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - `service_role` key (for SUPABASE_SERVICE_ROLE_KEY)

## 2. RingCentral Setup

### Create App
1. Go to [developers.ringcentral.com](https://developers.ringcentral.com)
2. Create a new app or use existing sandbox app
3. Configure app settings:
   - **App Type**: Private (for production) or Public
   - **Platform Type**: Server/Web
   - **Grant Types**: Authorization Code
   - **Permissions**: ReadCallLog, CallControl, SMS
   - **OAuth Redirect URI**: `https://yourdomain.com/api/ringcentral/callback`

### Environment Variables
From your RingCentral app dashboard, copy:
- `Client ID` (for RINGCENTRAL_CLIENT_ID)
- `Client Secret` (for RINGCENTRAL_CLIENT_SECRET)
- Set `RINGCENTRAL_SERVER_URL` to `https://platform.ringcentral.com`

## 3. Vercel Deployment

### Initial Setup
1. Connect your GitHub repository to Vercel
2. Import the Simple CRM project
3. Configure build settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./simple-crm`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### Environment Variables
Add these environment variables in Vercel dashboard:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# RingCentral
RINGCENTRAL_CLIENT_ID=your-client-id
RINGCENTRAL_CLIENT_SECRET=your-client-secret
RINGCENTRAL_SERVER_URL=https://platform.ringcentral.com
RINGCENTRAL_REDIRECT_URI=https://yourdomain.com/api/ringcentral/callback
RINGCENTRAL_ACCOUNT_MAIN_NUMBER=+1234567890
RINGCENTRAL_WEBHOOK_SECRET=your-webhook-secret
```

### Custom Domain (Optional)
1. In Vercel dashboard, go to Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update RingCentral OAuth redirect URI to use your custom domain

## 4. RingCentral Webhook Configuration

### Post-Deployment Setup
After your app is deployed and has a production URL:

1. Go to your RingCentral app dashboard
2. Navigate to Webhooks section
3. Add webhook subscription:
   - **Event Filters**: Call Log Events
   - **Delivery Address**: `https://yourdomain.com/api/ringcentral/webhook`
   - **Method**: POST
   - **Format**: JSON

### Test Webhook
Use the sample payload in `scripts/mock-webhook.http` to test your webhook endpoint:

```bash
curl -X POST https://yourdomain.com/api/ringcentral/webhook \
  -H "Content-Type: application/json" \
  -d @scripts/mock-webhook.http
```

## 5. Database Security

### Row Level Security (RLS)
Enable RLS on your tables and create policies:

```sql
-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- Create basic policies (customize based on your auth system)
-- These are examples - implement proper policies for your use case
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view companies they created" ON public.companies
  FOR SELECT USING (auth.uid() = created_by);
```

### CORS Configuration
In Supabase dashboard:
1. Go to Settings → API
2. Add your production domain to allowed origins:
   - `https://yourdomain.com`
   - `https://www.yourdomain.com` (if using www)

## 6. Testing Checklist

### Pre-Deployment Tests
- [ ] All pages load without errors
- [ ] Database connection works
- [ ] Authentication flows work (if implemented)
- [ ] All forms submit correctly
- [ ] Drag & drop functionality works
- [ ] Responsive design works on mobile

### Post-Deployment Tests
- [ ] Visit your deployed site
- [ ] Test RingCentral OAuth flow:
  1. Go to Settings page
  2. Click "Connect RingCentral"
  3. Complete OAuth flow
  4. Verify connection status updates
- [ ] Test click-to-call:
  1. Add a contact with a phone number
  2. Click the call button
  3. Verify call log appears in database
- [ ] Test webhook (optional):
  1. Use mock webhook payload
  2. Verify call logs are created/updated

## 7. Monitoring & Maintenance

### Logs
- **Vercel Logs**: Check function logs in Vercel dashboard
- **Supabase Logs**: Monitor database queries and errors
- **RingCentral Logs**: Check API call logs in developer dashboard

### Performance
- Enable Vercel Analytics for performance monitoring
- Set up Supabase monitoring for database performance
- Monitor RingCentral API rate limits

### Backups
- Supabase automatically backs up your database
- Consider setting up additional backup strategies for critical data
- Test backup restoration procedures

## 8. Troubleshooting

### Common Issues

**OAuth Redirect Issues**
- Ensure RingCentral redirect URI matches your domain exactly
- Check that environment variables are set correctly
- Verify HTTPS is enabled (RingCentral requires HTTPS for production)

**Database Connection Errors**
- Verify Supabase URL and keys are correct
- Check that RLS policies allow necessary operations
- Ensure service role key is used only in server-side code

**Webhook Failures**
- Verify webhook URL is accessible
- Check RingCentral app has correct permissions
- Ensure webhook signature validation is implemented (currently TODO)

**Call Failures**
- Verify RingCentral credentials are correct
- Check that main number is configured
- Ensure proper phone number formatting (+country code)

### Support Resources
- [Next.js Deployment Docs](https://nextjs.org/docs/app/building-your-application/deploying)
- [Supabase Docs](https://supabase.com/docs)
- [RingCentral Developer Docs](https://developers.ringcentral.com)
- [Vercel Docs](https://vercel.com/docs)

## 9. Production Checklist

- [ ] Environment variables configured
- [ ] Database schema deployed
- [ ] Sample data seeded
- [ ] RingCentral app configured
- [ ] Webhook URL set
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] CORS configured
- [ ] RLS policies implemented
- [ ] Error monitoring set up
- [ ] Backup strategy in place
- [ ] All tests passing
- [ ] Documentation updated

## 10. Going Live

Once all checks are complete:

1. **Update DNS** (if using custom domain)
2. **Test all functionality** in production
3. **Monitor initial usage** closely
4. **Set up alerts** for critical errors
5. **Create rollback plan** if needed
6. **Communicate launch** to stakeholders

## 🎉 Success!

Your Simple CRM is now live! Users can:
- Manage contacts and companies
- Track deals in a Kanban board
- Make calls through RingCentral integration
- Log activities and communications
- Access everything through a responsive web interface

Remember to monitor your application closely in the first few days and address any issues promptly.
