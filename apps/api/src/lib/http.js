const SECURITY_HEADERS = Object.freeze({
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
});

export function json(status, body) {
  return {
    status,
    headers: SECURITY_HEADERS,
    jsonBody: body,
  };
}

export function publicError(error, context) {
  if (Number.isInteger(error?.status) && error.status >= 400 && error.status < 500) {
    return json(error.status, { error: error.message });
  }
  context.error("Unhandled API error", error);
  return json(500, { error: "The VM service could not complete the request." });
}

export class RequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
