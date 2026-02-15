import type { SyncRemotePayloadOptions } from "./types";

export const jsonResponse = (body: unknown, status = 200): Response =>
  Response.json(body, { status });

export const textResponse = (body: string, status = 200): Response =>
  new Response(body, { status, headers: { "Content-Type": "text/plain" } });

export const getRemoteHeaders = (
  remote: SyncRemotePayloadOptions["remote"],
): HeadersInit => ({
  Authorization: `${remote.apiKeyCollection} API-Key ${remote.apiKey}`,
});

export const fetchJSON = async <T>(
  url: string,
  headers: HeadersInit,
): Promise<T> => {
  const response = await fetch(url, {
    headers,
    method: "GET",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed (${response.status}): ${body}`);
  }

  return (await response.json()) as T;
};
