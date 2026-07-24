import { type ReactNode, useCallback, useEffect, useState } from "react";
import {
  getRuntimeStatus,
  isDesktopRuntime,
  setCapturePaused,
  type RuntimeStatus
} from "./recorder-client";
import { RecorderRuntimeContext } from "./recorder-runtime-context";

export function RecorderRuntimeProvider({ children }: { children: ReactNode }) {
  const [desktop] = useState(() => isDesktopRuntime());
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setStatus(await getRuntimeStatus());
      setError(null);
    } catch (runtimeError) {
      setError(toMessage(runtimeError));
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    if (!desktop) {
      return () => window.clearTimeout(initial);
    }
    const timer = window.setInterval(() => void refresh(), 5_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [desktop, refresh]);

  const toggleCapture = useCallback(async () => {
    if (!status) {
      return;
    }
    await setCapturePaused(!status.capturePaused);
    await refresh();
  }, [refresh, status]);

  return (
    <RecorderRuntimeContext.Provider
      value={{ desktop, status, error, refresh, toggleCapture }}
    >
      {children}
    </RecorderRuntimeContext.Provider>
  );
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
