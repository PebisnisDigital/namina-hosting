const DEFAULT_TIMEOUT_MS = 11000;

export async function briefStore(action: string, data: Record<string, unknown> = {}) {
  const baseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const gatewaySecret = process.env.NAMINA_BRIEF_GATEWAY_SECRET;
  if (!baseUrl || !gatewaySecret) {
    throw new Error("Penyimpanan formulir belum siap. Hubungi tim NAMINA.");
  }
  const endpoint = new URL("/functions/v1/namina-briefs", baseUrl);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-namina-gateway-secret": gatewaySecret,
    },
    body: JSON.stringify({ action, ...data }),
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Penyimpanan formulir tidak merespons. Coba kembali.");
  }
  if (!response.ok) {
    const detail = (payload as { error?: string })?.error;
    throw new Error(detail || "Penyimpanan formulir sedang bermasalah.");
  }
  return payload;
}
