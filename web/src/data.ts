import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useRuntime } from "./context";
import {
  read,
  readGlobal,
  readItems,
  readPet,
  readPets,
  scanActivity,
  verifyContracts,
} from "./chain";
import { STATUS_URL } from "./config";
import { readWheel } from "./domain";
export function useVerification() {
  const r = useRuntime();
  return useQuery({
    queryKey: ["verification"],
    queryFn: () => verifyContracts(r),
    staleTime: 300000,
    refetchInterval: 240000,
    retry: 1,
  });
}
export function useGlobal() {
  const r = useRuntime();
  return useQuery({
    queryKey: ["global"],
    queryFn: () => readGlobal(r),
    refetchInterval: 12000,
    retry: 1,
  });
}
export function useEligibility() {
  const r = useRuntime(),
    { address } = useAccount();
  return useQuery({
    queryKey: ["eligibility", address],
    queryFn: () => read<boolean>(r, "hasHatched", [address]),
    enabled: !!address,
    refetchInterval: 12000,
  });
}
export function useItems() {
  const r = useRuntime();
  return useQuery({
    queryKey: ["items"],
    queryFn: () => readItems(r),
    staleTime: Infinity,
  });
}
export function usePet(id: bigint) {
  const r = useRuntime();
  return useQuery({
    queryKey: ["pet", String(id)],
    queryFn: () => readPet(r, id),
    refetchInterval: 12000,
    retry: 1,
  });
}
export function useActivity(pages = 12, owned = false) {
  const r = useRuntime(),
    { address } = useAccount();
  return useQuery({
    queryKey: ["activity", pages, owned ? address : undefined],
    queryFn: () => scanActivity(r, pages, owned ? address : undefined),
    enabled: !owned || !!address,
    refetchInterval: 30000,
    retry: 1,
  });
}
export function usePets(ids: bigint[] | undefined, owned = false) {
  const r = useRuntime(),
    { address } = useAccount();
  return useQuery({
    queryKey: ["pets", ids?.map(String), owned ? address : undefined],
    queryFn: () => readPets(r, ids ?? [], owned ? address : undefined),
    enabled: !!ids,
    refetchInterval: 15000,
    retry: 1,
  });
}
export function useWheel() {
  return useQuery({
    queryKey: ["wheel"],
    queryFn: async () => {
      const response = await fetch(STATUS_URL, {
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw Error("Status unavailable");
      return readWheel(await response.json());
    },
    refetchInterval: 15000,
    retry: 0,
    staleTime: 10000,
  });
}
