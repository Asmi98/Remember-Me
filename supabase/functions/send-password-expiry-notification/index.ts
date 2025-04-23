
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  email: string;
  title: string;
  expiry_date: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, title, expiry_date }: NotificationRequest = await req.json();
    const expiryDate = new Date(expiry_date);
    const formattedDate = expiryDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const emailResponse = await resend.emails.send({
      from: "Password Manager <onboarding@resend.dev>",
      to: [email],
      subject: `Password Update Recommended: ${title}`,
      html: `
        <h1>Password Update Recommendation</h1>
        <p>Hello,</p>
        <p>Your password for <strong>${title}</strong> was last changed on ${formattedDate}.</p>
        <p>To maintain security best practices, we recommend updating your password as it has been more than 2 months since your last password change.</p>
        <p>Best regards,<br>Your Password Manager</p>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-password-expiry-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
