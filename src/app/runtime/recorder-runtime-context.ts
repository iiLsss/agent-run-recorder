import { createContext, useContext } from "react";
import type { RuntimeStatus } from "./recorder-client";

export interface RecorderRuntimeValue {
  desktop: boolean;
  status: RuntimeStatus | null;
  error: string | null;
  refresh: () => Promise<void>;
  toggleCapture: () => Promise<void>;
}

export const RecorderRuntimeContext = createContext<RecorderRuntimeValue | null>(null);

export function useRecorderRuntime(): RecorderRuntimeValue {
  const runtime = useContext(RecorderRuntimeContext);
  if (!runtime) {
    throw new Error("useRecorderRuntime must be used inside RecorderRuntimeProvider");
  }
  return runtime;
}
