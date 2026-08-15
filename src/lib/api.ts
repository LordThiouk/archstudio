/** The one-line fetch wrapper the client components share: JSON in, JSON out,
 *  and the server's own `error` string on the way back up so a failed call
 *  reads as what went wrong rather than as "500". */
export const api = {
  async json<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
    return res.json();
  }
};
