export type ApiError = {
  error: unknown;
};

export async function apiFetch<T>(input: RequestInfo, init: RequestInit = {}): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    credentials: "include",
  });

  if (!response.ok) {
    let message: string | undefined;
    try {
      const data = (await response.json()) as ApiError;
      const errorValue = data?.error;
      if (typeof errorValue === "string") {
        message = errorValue;
      } else if (
        errorValue &&
        typeof errorValue === "object" &&
        "message" in errorValue &&
        typeof (errorValue as { message?: unknown }).message === "string"
      ) {
        message = (errorValue as { message: string }).message;
      }
    } catch {
      message = undefined;
    }
    throw new Error(message ?? `Erreur API (${response.status})`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data = (await response.json()) as T;
  return data;
}
