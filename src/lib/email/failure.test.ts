import { describe, expect, test } from "bun:test";

import { failureReason, SendError, sendFailure } from "./failure";

describe("sendFailure", () => {
  test("no answer may still have sent it", () => {
    expect(sendFailure(new SendError("Resend didn't answer within 15 seconds.", null))).toBe("unclear");
    expect(sendFailure(new SendError("Couldn't reach Resend.", null))).toBe("unclear");
  });

  test("a server error, a timeout or a rate limit may still have sent it", () => {
    for (const status of [500, 502, 503, 408, 429]) {
      expect(sendFailure(new SendError(`Resend (${status}): busy`, status))).toBe("unclear");
    }
    expect(sendFailure(new SendError("Resend (409): in progress", 409, "concurrent_idempotent_requests"))).toBe("unclear");
  });

  test("any other 4xx is a refusal", () => {
    expect(sendFailure(new SendError("Resend (403): verify a domain", 403, "validation_error"))).toBe("rejected");
    expect(sendFailure(new SendError("Resend (422): bad address", 422, "validation_error"))).toBe("rejected");
    expect(sendFailure(new SendError("Resend (401): bad key", 401, "missing_api_key"))).toBe("rejected");
  });

  test("an error before Resend was asked means it did not go", () => {
    expect(sendFailure(new Error("Resend is not configured. Set RESEND_API_KEY."))).toBe("rejected");
    expect(sendFailure("template broke")).toBe("rejected");
  });

  test("the key already used for a different email means an earlier try may have gone", () => {
    const error = new SendError("Resend (409): different body", 409, "invalid_idempotent_request");
    expect(sendFailure(error)).toBe("earlier_try");
    expect(failureReason(error, "shipped")).toBe(
      "An earlier try may have gone through. Check with the customer before sending again."
    );
    // The alert went to the admins, not the customer.
    expect(failureReason(error, "new_order_alert")).toBe(
      "An earlier try may have gone through. Check your inbox before sending again."
    );
    expect(failureReason(error, "unpaid_order_alert")).toBe(
      "An earlier try may have gone through. Check your inbox before sending again."
    );
    expect(failureReason(error, "refunded")).toBe(
      "An earlier try may have gone through. Check with the customer before sending again."
    );
  });
});

test("failureReason gives the error's own message otherwise", () => {
  expect(failureReason(new SendError("Resend (422): Invalid `to` field.", 422, "validation_error"), "delivered")).toBe(
    "Resend (422): Invalid `to` field."
  );
  expect(failureReason("plain text", "new_order_alert")).toBe("plain text");
});
