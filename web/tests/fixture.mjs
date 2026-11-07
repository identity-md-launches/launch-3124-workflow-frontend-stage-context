// Deterministic, in-memory RPC and EIP-1193 fixtures. No wallet keys or live transactions.
import { readFile } from "node:fs/promises";
import {
  decodeFunctionData,
  encodeFunctionResult,
  encodeAbiParameters,
  encodeEventTopics,
  parseAbi,
  toHex,
  zeroAddress,
} from "viem";
import path from "node:path";
export async function makeFixture(root) {
  const manifest = JSON.parse(
    await readFile(path.join(root, "dist/imd-deployment.json"), "utf8"),
  );
  const game = manifest.contracts.find((c) => c.name === "Squeeklings"),
    art = manifest.contracts.find((c) => c.name === "SqueeklingsArt");
  const abi = JSON.parse(
    await readFile(path.join(root, "dist", game.abiPath), "utf8"),
  );
  const coreAbi = parseAbi([
    "function state() view returns (uint64,uint64,uint96,uint64,uint96,uint32,uint256,bool)",
    "function configuration() view returns (bytes32,uint64,uint64,uint64,uint16,address,address,uint32,uint64,uint64,uint96)",
  ]);
  const multi = parseAbi([
    "function aggregate3((address target,bool allowFailure,bytes callData)[] calls) payable returns ((bool success,bytes returnData)[] returnData)",
  ]);
  const addr = (n) => toHex(BigInt(n), { size: 20 }),
    hash = (n) => toHex(BigInt(n), { size: 32 });
  const account = addr(1001),
    recipient = addr(1002),
    admin = addr(1003),
    core = addr(1004);
  const now = Math.floor(Date.now() / 1000),
    genesis = BigInt(now - 100 * 600);
  const state = {
    account,
    recipient,
    admin,
    core,
    abi,
    game,
    art,
    manifest,
    chainId: manifest.chainId,
    connected: false,
    knownChain: true,
    hasHatched: false,
    supply: 1n,
    epoch: 1n,
    current: 101n,
    settled: 100n,
    genesis,
    duration: 600n,
    signalLost: false,
    failRpc: false,
    failSimulation: false,
    rejectWallet: false,
    receiptDelay: 0,
    wheel: "IDLE",
    calls: [],
    sent: [],
    logs: [],
    receipts: new Map(),
    operatorApprovals: new Set(),
    pets: new Map(),
    nextHash: 100n,
  };
  const seed = hash(345);
  function pet(id, owner = account) {
    return {
      owner,
      display: {
        seed,
        ageBlocks: 350n,
        pity: 5,
        stage: 1,
        mood: 0,
        away: false,
        signalLost: false,
        equipped: [0, 0, 1, 0],
      },
      trip: {
        startRound: 0n,
        endRound: 0n,
        epoch: state.epoch,
        route: 0,
        away: false,
      },
      inventory: [1n, ...Array(7).fill(0n), 1n, ...Array(8).fill(0n)],
    };
  }
  state.pets.set(1n, pet(1n));
  function event(name, args, tx = hash(50), index = 0) {
    const e = abi.find((v) => v.type === "event" && v.name === name);
    return {
      address: game.address,
      topics: encodeEventTopics({ abi: [e], eventName: name, args }),
      data: encodeAbiParameters(
        e.inputs.filter((i) => !i.indexed),
        e.inputs.filter((i) => !i.indexed).map((i) => args[i.name]),
      ),
      blockNumber: toHex(12085596n),
      blockHash: hash(1),
      transactionHash: tx,
      transactionIndex: "0x0",
      logIndex: toHex(index),
      removed: false,
    };
  }
  state.logs.push(
    event("Hatched", { minter: account, tokenId: 1n, seed, birthUnits: 0n }),
    event(
      "Transfer",
      { from: zeroAddress, to: account, tokenId: 1n },
      hash(50),
      1,
    ),
  );
  function value(name, args) {
    const p = args?.length ? state.pets.get(BigInt(args[0] ?? 0)) : undefined;
    switch (name) {
      case "totalSupply":
        return state.supply;
      case "MAX_SUPPLY":
        return 88888n;
      case "core":
        return state.core;
      case "art":
        return art.address;
      case "owner":
        return admin;
      case "coreEpoch":
        return state.epoch;
      case "hasHatched":
        return state.hasHatched;
      case "balanceOf":
        return [...state.pets.values()].filter(
          (p) => p.owner.toLowerCase() === String(args[0]).toLowerCase(),
        ).length
          ? BigInt(
              [...state.pets.values()].filter(
                (p) => p.owner.toLowerCase() === String(args[0]).toLowerCase(),
              ).length,
            )
          : 0n;
      case "currentRound":
        if (state.signalLost) throw Error("CoreUnavailable");
        return state.current;
      case "mood":
        return [0, state.signalLost];
      case "ownerOf":
        if (!p) throw Error("ERC721NonexistentToken");
        return p.owner;
      case "displayData":
        if (!p) throw Error("ERC721NonexistentToken");
        return { ...p.display, signalLost: state.signalLost };
      case "expedition":
        if (!p) throw Error("ERC721NonexistentToken");
        return p.trip;
      case "inventory":
        return p.inventory;
      case "getApproved":
        return p?.approved ?? zeroAddress;
      case "isApprovedForAll":
        return state.operatorApprovals.has(String(args[1]).toLowerCase());
      case "itemInfo": {
        const names = [
          "Acorn",
          "Sunflower Seed",
          "Clover Sprig",
          "Leaf Scarf",
          "Copper Wheel",
          "Walnut Helmet",
          "Golden Wheel",
          "Zoomies Relic",
          "Moon Pebble",
          "Star Seed",
          "Nightcap",
          "Dream Scarf",
          "Cloud Bed",
          "Comet Crown",
          "Aurora Sky",
          "Wishing Star",
          "Compass",
        ];
        const i = Number(args[0]) - 1;
        return [
          names[i],
          [2, 2, 0, 1, 3, 0, 3, 1, 2, 2, 0, 1, 3, 0, 3, 1, 2][i],
          [0, 0, 0, 1, 1, 2, 2, 3, 0, 0, 0, 1, 1, 2, 2, 3, 1][i],
          i < 8 ? 0 : i < 16 ? 1 : 2,
        ];
      }
      case "tokenURI": {
        const svg =
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320"><rect width="320" height="320" fill="#e1d5bc"/><circle cx="110" cy="115" r="28" fill="#d1a26e"/><circle cx="210" cy="115" r="28" fill="#d1a26e"/><ellipse cx="160" cy="195" rx="92" ry="80" fill="#d1a26e"/><ellipse cx="160" cy="220" rx="60" ry="46" fill="#f4deaf"/><circle cx="130" cy="180" r="6"/><circle cx="190" cy="180" r="6"/><path d="m154 203 6 6 6-6" fill="#8a5847"/></svg>';
        return (
          "data:application/json;base64," +
          Buffer.from(
            JSON.stringify({
              name: "Mock Squeekling",
              image:
                "data:image/svg+xml;base64," +
                Buffer.from(svg).toString("base64"),
            }),
          ).toString("base64")
        );
      }
      case "hatch":
        if (state.hasHatched) throw Error("AlreadyHatched");
        return state.supply + 1n;
      case "returnHome":
        return { itemId: 16, kind: 1, rarity: 3, pity: 0 };
      case "embark":
      case "equip":
      case "unequip":
      case "approve":
      case "setApprovalForAll":
      case "safeTransferFrom":
      case "setCore":
        return undefined;
      default:
        throw Error(`Unhandled fixture function: ${name}`);
    }
  }
  function contractCall(to, data) {
    let decoded;
    try {
      decoded = decodeFunctionData({ abi: multi, data });
    } catch {}
    if (decoded?.functionName === "aggregate3")
      return encodeFunctionResult({
        abi: multi,
        functionName: "aggregate3",
        result: decoded.args[0].map((call) => {
          try {
            return {
              success: true,
              returnData: contractCall(call.target, call.callData),
            };
          } catch {
            return { success: false, returnData: "0x" };
          }
        }),
      });
    if (to?.toLowerCase() === state.core.toLowerCase()) {
      const d = decodeFunctionData({ abi: coreAbi, data });
      if (state.signalLost) throw Error("CoreUnavailable");
      return encodeFunctionResult({
        abi: coreAbi,
        functionName: d.functionName,
        result:
          d.functionName === "state"
            ? [state.settled, 123n, 1999n * 1000000000n, 0n, 0n, 0, 0n, false]
            : [
                hash(0),
                state.genesis,
                state.duration,
                0n,
                0,
                account,
                admin,
                0,
                0n,
                0n,
                1000000000n,
              ],
      });
    }
    const d = decodeFunctionData({ abi, data });
    const item = abi.find(
      (v) =>
        v.type === "function" &&
        v.name === d.functionName &&
        v.inputs.length === (d.args?.length ?? 0),
    );
    if (
      state.failSimulation &&
      item.stateMutability !== "view" &&
      item.stateMutability !== "pure"
    )
      throw Error("CoreUnavailable");
    return encodeFunctionResult({
      abi: [item],
      functionName: d.functionName,
      result: value(d.functionName, d.args),
    });
  }
  const block = () => ({
    number: toHex(12085610n),
    hash: hash(1),
    parentHash: hash(2),
    timestamp: toHex(BigInt(now)),
    nonce: "0x0000000000000000",
    sha3Uncles: hash(0),
    logsBloom: "0x" + "00".repeat(256),
    transactionsRoot: hash(0),
    stateRoot: hash(0),
    receiptsRoot: hash(0),
    miner: account,
    difficulty: "0x0",
    totalDifficulty: "0x0",
    extraData: "0x",
    size: "0x100",
    gasLimit: "0x1c9c380",
    gasUsed: "0x100",
    baseFeePerGas: "0x1",
    transactions: [],
    uncles: [],
    mixHash: hash(0),
  });
  async function rpc(request) {
    state.calls.push({ method: request.method, params: request.params });
    let result;
    try {
      if (state.failRpc) throw Error("Fixture RPC offline");
      switch (request.method) {
        case "eth_chainId":
          result = toHex(manifest.chainId);
          break;
        case "eth_blockNumber":
          result = toHex(12085610n);
          break;
        case "eth_getBlockByNumber":
          result = block();
          break;
        case "eth_getCode":
          result = state.missingCode ? "0x" : "0x60806040";
          break;
        case "eth_call":
          result = contractCall(request.params[0].to, request.params[0].data);
          break;
        case "eth_getLogs": {
          const filter = request.params[0];
          result = state.logs.filter(
            (l) =>
              BigInt(l.blockNumber) >= BigInt(filter.fromBlock) &&
              BigInt(l.blockNumber) <= BigInt(filter.toBlock),
          );
          break;
        }
        case "eth_getTransactionReceipt": {
          const record = state.receipts.get(request.params[0]);
          if (state.holdReceipt) {
            result = null;
          } else if (state.receiptDelay > 0) {
            state.receiptDelay--;
            result = null;
          } else result = record ?? null;
          break;
        }
        case "eth_getTransactionByHash": {
          const record = state.sent.find((x) => x.hash === request.params[0]);
          result = record
            ? {
                hash: record.hash,
                from: account,
                to: game.address,
                input: record.data,
                value: "0x0",
                nonce: "0x0",
                blockHash: hash(1),
                blockNumber: toHex(12085596n),
                transactionIndex: "0x0",
                gas: "0x100000",
                gasPrice: "0x1",
                type: "0x0",
                v: "0x1b",
                r: hash(1),
                s: hash(2),
              }
            : null;
          break;
        }
        case "eth_getBalance":
          result = toHex(1000000000000000000n);
          break;
        default:
          throw Error(`Unhandled fixture RPC: ${request.method}`);
      }
      return { jsonrpc: "2.0", id: request.id, result };
    } catch (error) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32000, message: error.message },
      };
    }
  }
  function send(transaction) {
    if (state.rejectWallet)
      throw { code: 4001, message: "User rejected the request" };
    const decoded = decodeFunctionData({ abi, data: transaction.data }),
      id = decoded.args?.length ? BigInt(decoded.args[0] ?? 0) : 0n,
      p = state.pets.get(id),
      txHash = hash(++state.nextHash);
    const logs = [];
    state.sent.push({
      ...transaction,
      hash: txHash,
      functionName: decoded.functionName,
    });
    switch (decoded.functionName) {
      case "hatch": {
        state.hasHatched = true;
        state.supply++;
        state.pets.set(state.supply, pet(state.supply));
        logs.push(
          event(
            "Hatched",
            { minter: account, tokenId: state.supply, seed, birthUnits: 0n },
            txHash,
          ),
          event(
            "Transfer",
            { from: zeroAddress, to: account, tokenId: state.supply },
            txHash,
            1,
          ),
        );
        break;
      }
      case "embark": {
        p.trip = {
          startRound: state.current + 1n,
          endRound:
            state.current + BigInt([6, 18, 36][Number(decoded.args[1])]),
          epoch: state.epoch,
          route: Number(decoded.args[1]),
          away: true,
        };
        p.display.away = true;
        logs.push(
          event(
            "Embarked",
            { tokenId: id, petOwner: account, ...p.trip },
            txHash,
          ),
        );
        break;
      }
      case "returnHome": {
        p.trip.away = false;
        p.display.away = false;
        p.display.pity = 0;
        p.inventory[15]++;
        logs.push(
          event(
            "Returned",
            {
              tokenId: id,
              petOwner: p.owner,
              itemId: 16,
              kind: 1,
              rarity: 3,
              work: 0n,
              blocks: 0n,
              busiest: 0n,
              entropy: hash(0),
              pity: 0,
            },
            txHash,
          ),
        );
        break;
      }
      case "equip": {
        const slot = value("itemInfo", [decoded.args[1]])[1];
        p.display.equipped[slot] = Number(decoded.args[1]);
        break;
      }
      case "unequip":
        p.display.equipped[Number(decoded.args[1])] = 0;
        break;
      case "safeTransferFrom":
        state.pets.get(BigInt(decoded.args[2])).owner = decoded.args[1];
        break;
      case "approve":
        state.pets.get(BigInt(decoded.args[1])).approved = decoded.args[0];
        break;
      case "setApprovalForAll":
        if (decoded.args[1])
          state.operatorApprovals.add(String(decoded.args[0]).toLowerCase());
        else
          state.operatorApprovals.delete(String(decoded.args[0]).toLowerCase());
        break;
      case "setCore":
        state.core = decoded.args[0];
        state.epoch++;
        break;
    }
    state.logs.push(...logs);
    state.receipts.set(txHash, {
      transactionHash: txHash,
      transactionIndex: "0x0",
      blockHash: hash(1),
      blockNumber: toHex(12085596n),
      from: account,
      to: game.address,
      cumulativeGasUsed: "0x10000",
      gasUsed: "0x10000",
      effectiveGasPrice: "0x1",
      contractAddress: null,
      logs,
      logsBloom: "0x" + "00".repeat(256),
      status: "0x1",
      type: "0x0",
    });
    return txHash;
  }
  return Object.assign(state, { rpc, send, event, hash });
}
export async function installWallet(page, fixture, legacy = true) {
  await page.exposeBinding("fixtureWallet", async (_, request) => {
    fixture.calls.push({ wallet: request.method, params: request.params });
    switch (request.method) {
      case "eth_accounts":
        return fixture.connected ? [fixture.account] : [];
      case "eth_requestAccounts":
        if (fixture.rejectWallet)
          throw { code: 4001, message: "User rejected the request" };
        fixture.connected = true;
        return [fixture.account];
      case "eth_chainId":
        return toHex(fixture.chainId);
      case "wallet_requestPermissions":
        return [{ parentCapability: "eth_accounts" }];
      case "wallet_getPermissions":
        return fixture.connected ? [{ parentCapability: "eth_accounts" }] : [];
      case "wallet_switchEthereumChain":
        if (!fixture.knownChain)
          return { fixtureError: { code: 4902, message: "Unknown chain" } };
        fixture.chainId = Number(BigInt(request.params[0].chainId));
        return null;
      case "wallet_addEthereumChain":
        fixture.knownChain = true;
        return null;
      case "eth_sendTransaction":
        return fixture.send(request.params[0]);
      default:
        throw Error(`Unhandled wallet method ${request.method}`);
    }
  });
  await page.addInitScript(
    ({ legacy }) => {
      const listeners = {};
      const provider = {
        isMetaMask: false,
        request: async (args) => {
          try {
            const result = await window.fixtureWallet(args);
            if (result?.fixtureError)
              throw Object.assign(
                Error(result.fixtureError.message),
                result.fixtureError,
              );
            if (args.method === "wallet_switchEthereumChain")
              provider.emit("chainChanged", args.params[0].chainId);
            return result;
          } catch (e) {
            if (/User rejected/.test(e.message))
              throw Object.assign(Error("User rejected the request"), {
                code: 4001,
              });
            throw e;
          }
        },
        on: (name, fn) => {
          (listeners[name] ??= []).push(fn);
        },
        removeListener: (name, fn) => {
          listeners[name] = (listeners[name] ?? []).filter((f) => f !== fn);
        },
        emit: (name, arg) => {
          for (const fn of listeners[name] ?? []) fn(arg);
        },
      };
      if (legacy) window.ethereum = provider;
      window.testWallet = provider;
      const announce = () =>
        window.dispatchEvent(
          new CustomEvent("eip6963:announceProvider", {
            detail: {
              info: {
                uuid: "4760119c-d431-4b4c-ad42-1498bc9e1fd6",
                name: "Test Burrow Wallet",
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12" fill="green"/></svg>',
                rdns: "test.squeeklings.wallet",
              },
              provider,
            },
          }),
        );
      window.addEventListener("eip6963:requestProvider", announce);
      announce();
    },
    { legacy },
  );
}
