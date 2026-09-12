# RestPilot Custom SMTP & Resend Setup Guide

By default, Supabase provides a built-in email service to send Magic Links, Invitations, and Password Resets. However, **this default service is strictly for development purposes**. It has a strict limit (e.g., 3 emails per hour on the free tier) and emails frequently end up in users' Spam folders.

To ensure your production application works flawlessly, you must configure a custom SMTP provider. This guide covers how to set up **[Resend](https://resend.com)**, a modern and highly reliable email delivery service, and connect it to your Supabase project.

---

## 1. Create a Resend Account

1. Go to [Resend.com](https://resend.com/) and sign up for a free account.
2. The free tier allows you to send up to 3,000 emails per month, which is more than enough to get RestPilot started.

## 2. Add and Verify Your Domain

To send emails that look like they came directly from your application (e.g., `noreply@restpilot.space`), you need to prove to Resend that you actually own the domain.

1. In the Resend Dashboard, navigate to **Domains** on the left sidebar.
2. Click **Add Domain**.
3. Enter your domain name (e.g., `restpilot.space`) and select a region (usually `us-east-1` is fine).
4. Click **Add**.

### Update Your DNS Records

Resend will now give you a list of DNS records (TXT and MX records). You need to add these to the service where you bought your domain name (e.g., Vercel, GoDaddy, Namecheap, Cloudflare).

1. Log in to your domain registrar (or Vercel, if Vercel manages your domains).
2. Go to the **DNS Settings** or **DNS Management** page for your domain.
3. Copy and paste each record from Resend exactly as shown:
   - Make sure to match the **Type** (TXT or MX).
   - Copy the **Name/Host** exactly.
   - Copy the **Value** exactly.
4. Once all records are added, return to Resend and click **Verify DNS Records**.
5. *Note: DNS propagation can take anywhere from a few minutes to a few hours. Once verified, the status in Resend will change to a green "Verified" badge.*

## 3. Generate an SMTP API Key

Now that your domain is verified, you need to create an API key that Supabase will use to securely communicate with Resend.

1. In the Resend Dashboard, go to **API Keys** on the left sidebar.
2. Click **Create API Key**.
3. Name it something recognizable, like `Supabase SMTP`.
4. Give it **Sending Access** permissions.
5. Click **Add** and **copy the API Key**. 
   > **⚠️ Important:** You will only be shown this key once. Keep this tab open or save it somewhere secure.

## 4. Configure Supabase SMTP

It's time to connect Resend to Supabase.

1. Open your [Supabase Dashboard](https://supabase.com/dashboard) and go to your RestPilot project.
2. Navigate to **Authentication > SMTP Configuration**.
3. Toggle the switch to **Enable Custom SMTP**.
4. Fill in the fields with Resend's standard SMTP settings:

   - **Host:** `smtp.resend.com`
   - **Port:** `465`
   - **User:** `resend` *(literally type the word "resend")*
   - **Password:** Paste the API Key you copied from Resend in Step 3.
   - **Sender Name:** The name you want users to see (e.g., `RestPilot`).
   - **Sender Email:** An email address from your verified domain (e.g., `noreply@restpilot.space`).

5. Click **Save**.

## 5. Customize Your Email Templates

Now that emails are sending reliably, you should customize the actual content of the emails so they match your branding.

1. In Supabase, go to **Authentication > Email Templates**.
2. Go through each tab (`Confirm signup`, `Invite user`, `Magic Link`, `Change email`, `Reset password`) and update the **Subject** and **Message Body**.

### Important Rule for Templates
You **must** keep the `{{ .ConfirmationURL }}` tag in your templates. Supabase automatically replaces this tag with the actual secure magic link. If you remove it, the user will have nothing to click!

**Example Magic Link Template:**

```html
<h2>Welcome to RestPilot!</h2>
<p>You requested a magic link to log in.</p>
<p>
  <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:10px 20px;background-color:#FF6B35;color:white;text-decoration:none;border-radius:5px;">
    Log In to Your Dashboard
  </a>
</p>
<p>If you didn't request this, you can safely ignore this email.</p>
```

## 6. Test Your Setup

1. Go to your live RestPilot application at `https://www.restpilot.space`.
2. Try logging in via a Magic Link.
3. Check your inbox. The email should arrive almost instantly, shouldn't go to spam, and should clearly state it came from your custom domain (e.g., `noreply@restpilot.space`).
4. Click the link and verify it successfully logs you into the dashboard.

Congratulations! Your authentication flow is now completely production-ready.
