import test from "node:test";
import assert from "node:assert/strict";
import {
  tripState,
  tripProgress,
  formatDuration,
  normalizeAddress,
  safePetId,
  readWheel,
  explainError,
} from "../src/domain.ts";
const trip = {
  startRound: 101n,
  endRound: 106n,
  epoch: 1n,
  route: 0,
  away: true,
};
const calendar = { genesis: 1000n, duration: 10n, settled: 105n, epoch: 1n };
test("expedition state machine keeps unsettled history unknown", () => {
  assert.equal(tripState({ ...trip, away: false }, { epoch: 1n }), "Home");
  assert.equal(tripState(trip, { epoch: 1n }), "Signal lost");
  assert.equal(tripState(trip, calendar, 2000), "Away");
  assert.equal(tripState(trip, calendar, 2060), "Waiting for settlement");
  assert.equal(tripState(trip, { ...calendar, settled: 106n }, 2000), "Ready");
  assert.equal(tripState(trip, { epoch: 2n }), "Ready · Lost in the Fog");
});
test("time progress is clamped and absent without a calendar", () => {
  assert.equal(tripProgress(trip, { epoch: 1n }), undefined);
  assert.equal(tripProgress(trip, calendar, 1990), 0);
  assert.equal(tripProgress(trip, calendar, 2030), 0.5);
  assert.equal(tripProgress(trip, calendar, 2070), 1);
});
test("time formatting uses actual core duration", () => {
  assert.equal(formatDuration(36 * 600), "6 hr");
  assert.equal(formatDuration(18 * 600), "3 hr");
  assert.equal(formatDuration(6 * 600), "1 hr");
  assert.equal(formatDuration(25), "25 sec");
});
test("pet IDs and addresses reject malformed and unsafe values", () => {
  for (const raw of ["0", "-1", "88889", "1.5", "../2", "1e4"])
    assert.throws(() => safePetId(raw));
  assert.equal(safePetId("88888"), 88888n);
  assert.throws(() => normalizeAddress("0x" + "0".repeat(40)));
  assert.throws(() => normalizeAddress("not an address"));
  assert.equal(
    normalizeAddress(" 0x" + "1".repeat(40) + " "),
    "0x" + "1".repeat(40),
  );
});
test("wheel uses measurement only, rests for idle, stale and malformed signals", () => {
  const now = Date.now(),
    measurement = {
      observedAt: new Date(now).toISOString(),
      coreStatus: "ACTIVE",
      freshness: "online",
      staleAfterSeconds: 120,
      rpmMilli: 12500,
    };
  assert.equal(readWheel({ measurement }, now).rpm, 12.5);
  assert.equal(
    readWheel({ measurement: { ...measurement, coreStatus: "IDLE" } }, now).rpm,
    0,
  );
  assert.equal(readWheel({ measurement }, now + 121000).rpm, 0);
  assert.equal(
    readWheel({ measurement: { ...measurement, freshness: "offline" } }, now)
      .rpm,
    0,
  );
  assert.equal(
    readWheel({ builder: { projected: { rpmMilli: 100000 } } }, now).rpm,
    0,
  );
  assert.equal(readWheel({}, now).rpm, 0);
});
test("contract and wallet errors have actionable messages", () => {
  assert.match(explainError({ code: 4001 }), /declined/);
  assert.match(
    explainError(Error("execution reverted: AlreadyHatched")),
    /already hatched/,
  );
  assert.match(explainError(Error("NotSettledYet")), /not settled/);
  assert.match(explainError(Error("CoreUnavailable")), /Signal lost/);
  assert.match(explainError(Error("insufficient funds")), /Sepolia ETH/);
  assert.doesNotMatch(
    explainError(Error("private obscure stack 0xaabbcc")),
    /aabbcc/,
  );
});
