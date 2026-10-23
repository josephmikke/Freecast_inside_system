/**
 * Releases the socket backing a `fetch` response whose body will never be read.
 *
 * `HttpClientAdaptor.get` uses node-fetch, which pairs with an `https.Agent` that has
 * `keepAlive: true`. A response whose body is never consumed is never handed back to that
 * agent and never destroyed, so its file descriptor leaks for the life of the Lambda
 * container. Call this before throwing on a non-success status.
 */
export default async function drainResponse(response: Response): Promise<void> {
  const { body } = response as unknown as { body?: { destroy?: () => void } | null };

  try {
    if (typeof body?.destroy === 'function') {
      body.destroy();
    } else {
      await response.text();
    }
  } catch (e) {
    // The socket is already gone, which is the outcome we wanted.
  }
}
