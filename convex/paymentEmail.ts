import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { paymentConfirmationEmail, sendEmail } from "./email";

const MAX_ATTEMPTS = 6;
const BASE_RETRY_DELAY_MS = 60_000;

export const sendPaymentConfirmation = internalAction({
  args: {
    waitlistId: v.id("waitlist"),
    attempt: v.number(),
  },
  handler: async (ctx, args) => {
    const recipient = await ctx.runQuery(internal.waitlist.getPaymentEmailRecipient, {
      waitlistId: args.waitlistId,
    });
    if (recipient === null) return;

    const firstName = recipient.name.split(" ")[0] || "there";
    const { subject, html } = paymentConfirmationEmail(firstName);
    const sent = await sendEmail({ to: recipient.email, subject, html });

    await ctx.runMutation(internal.waitlist.markConfirmationEmailSent, {
      waitlistId: args.waitlistId,
      attempt: args.attempt,
      sent,
    });

    if (!sent && args.attempt < MAX_ATTEMPTS) {
      const delay = BASE_RETRY_DELAY_MS * 2 ** (args.attempt - 1);
      await ctx.scheduler.runAfter(delay, internal.paymentEmail.sendPaymentConfirmation, {
        waitlistId: args.waitlistId,
        attempt: args.attempt + 1,
      });
    }
  },
});
