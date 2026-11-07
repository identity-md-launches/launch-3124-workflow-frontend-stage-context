import { createContext, useContext } from "react";
import type { Runtime } from "./config";
export const RuntimeContext = createContext<Runtime | null>(null);
export function useRuntime() {
  const r = useContext(RuntimeContext);
  if (!r) throw Error("Deployment not loaded.");
  return r;
}
