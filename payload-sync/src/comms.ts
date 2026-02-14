export const jsonResponse = (body: unknown, status = 200): Response =>
  Response.json(body, { status });

export const textResponse = (body: string, status = 200): Response =>
  new Response(body, { status, headers: { "Content-Type": "text/plain" } });
