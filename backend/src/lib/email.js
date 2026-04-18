import { Resend } from "resend";

let resend;

if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
} else {
}

export const sendVerificationEmail = async (email, code) => {
  try {
    if (!resend) throw new Error("Resend is not configured.");

    const { data, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Harmonix Verification Code",
      html: `
        <div style="font-family: sans-serif; max-w: 600px; margin: auto; padding: 20px; text-align: center;">
          <h2 style="color: #4C1D95;">Welcome to Harmonix</h2>
          <p>We're thrilled to have you! Here is your secure verification code:</p>
          <div style="margin: 24px 0; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1E3A8A; background: #F3F4F6; padding: 12px; border-radius: 8px;">
            ${code}
          </div>
          <p>This code expires in exactly 15 minutes.</p>
          <p style="font-size: 12px; color: #6B7280; margin-top: 32px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
};
