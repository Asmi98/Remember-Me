import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { differenceInDays } from 'https://esm.sh/date-fns@2.30.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Starting password expiry check...');
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create SMTP client
    const smtp = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: Deno.env.get('GMAIL_USER') ?? '',
          password: Deno.env.get('GMAIL_APP_PASSWORD') ?? '',
        },
      },
    });

    // Get all passwords
    console.log('Fetching passwords...');
    const { data: passwords, error: passwordsError } = await supabaseClient
      .from('passwords')
      .select('id, title, username, user_id, last_modified_date');

    if (passwordsError) {
      console.error('Error fetching passwords:', passwordsError);
      throw passwordsError;
    }

    // Get all users
    console.log('Fetching users...');
    const { data: users, error: usersError } = await supabaseClient
      .auth.admin.listUsers();

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    // Create a map of user IDs to their emails
    const userMap = new Map<string, string>();
    users.users.forEach((user) => {
      userMap.set(user.id, user.email);
    });

    // Group passwords by user
    const userPasswords = new Map<string, Array<{
      id: string;
      title: string;
      username: string;
      user_id: string;
      last_modified_date: string;
    }>>();
    
    passwords?.forEach((password) => {
      if (!userPasswords.has(password.user_id)) {
        userPasswords.set(password.user_id, []);
      }
      userPasswords.get(password.user_id)?.push(password);
    });

    // Check each user's passwords and send notifications
    for (const [userId, userPasswordList] of userPasswords) {
      const userEmail = userMap.get(userId);
      
      if (!userEmail) {
        console.log('No email found for user:', userId);
        continue;
      }

      const expiringPasswords = userPasswordList
        .map((password) => {
          const lastModified = new Date(password.last_modified_date);
          const daysUntilExpiry = 30 - differenceInDays(new Date(), lastModified);

          if (daysUntilExpiry <= 3) {
            return {
              title: password.title,
              username: password.username,
              daysUntilExpiry,
              lastModified: password.last_modified_date,
            };
          }
          return null;
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      // If there are expiring passwords, send notification
      if (expiringPasswords.length > 0) {
        console.log(`Found ${expiringPasswords.length} expiring passwords for ${userEmail}`);
        
        const passwordList = expiringPasswords
          .map(pwd => `
${pwd.title}
Last modified: ${new Date(pwd.lastModified).toLocaleDateString()}
`)
          .join('\n\n');

        try {
          console.log(`Sending email to ${userEmail}`);
          await smtp.send({
            from: Deno.env.get('GMAIL_USER') ?? '',
            to: userEmail,
            subject: '⚠️ Password Expiration Notice',
            content: `Greetings,

This is a reminder that some of your passwords were changed a month ago. For security purposes, it's recommended to update them.

${passwordList}

How to update your password:
1. Log into your Password Manager
2. Find the password(s) listed above
3. Click the "Edit" button to update them

Please take action soon to maintain the security of your accounts.`,
            contentType: "text/plain",
          });
          console.log(`Successfully sent notification to ${userEmail}`);
        } catch (emailError) {
          console.error('Error sending email:', emailError);
          throw emailError;
        }
      }
    }

    await smtp.close();
    console.log('Finished password expiry check');

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});