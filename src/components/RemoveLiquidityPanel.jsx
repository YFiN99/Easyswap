// src/components/RemoveLiquidityPanel.jsx
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { NATIVE_TOKEN } from "../config";
import { getRouter, getFactory, getPairContract, resolveForPath, isNative } from "../lib/contracts";
import TokenBox from "./TokenBox";

const DEADLINE_SECONDS = 60 * 20;
const SLIPPAGE_PERCENT = 2;

export default function RemoveLiquidityPanel({ wallet, tokens }) {
  const { provider, signer, address } = wallet;

  const [tokenA, setTokenA] = useState(NATIVE_TOKEN);
  const [tokenB, setTokenB] = useState(tokens.find((t) => t.address !== NATIVE_TOKEN.address) || tokens[0]);
  const [pairAddress, setPairAddress] = useState(null);
  const [lpBalance, setLpBalance] = useState(0n);
  const [lpTotalSupply, setLpTotalSupply] = useState(0n);
  const [reserves, setReserves] = useState(null);
  const [percent, setPercent] = useState(50);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  const readProvider = provider;

  const loadPoolInfo = useCallback(async () => {
    if (!readProvider || !address || tokenA.address === tokenB.address) {
      setPairAddress(null);
      return;
    }
    try {
      const factory = getFactory(readProvider);
      const pairAddr = await factory.getPair(resolveForPath(tokenA), resolveForPath(tokenB));
      if (pairAddr === ethers.ZeroAddress) {
        setPairAddress(null);
        setLpBalance(0n);
        setReserves(null);
        return;
      }
      setPairAddress(pairAddr);
      const pair = getPairContract(pairAddr, readProvider);
      const [bal, supply, [r0, r1], t0] = await Promise.all([
        pair.balanceOf(address),
        pair.totalSupply(),
        pair.getReserves(),
        pair.token0(),
      ]);
      setLpBalance(bal);
      setLpTotalSupply(supply);
      const aIsToken0 = resolveForPath(tokenA).toLowerCase() === t0.toLowerCase();
      setReserves({ reserveA: aIsToken0 ? r0 : r1, reserveB: aIsToken0 ? r1 : r0 });
    } catch {
      setPairAddress(null);
    }
  }, [readProvider, address, tokenA, tokenB]);

  useEffect(() => {
    loadPoolInfo();
  }, [loadPoolInfo]);

  const lpAmountToRemove = lpTotalSupply > 0n ? (lpBalance * BigInt(Math.round(percent * 100))) / 10000n : 0n;
  const estimatedA = reserves && lpTotalSupply > 0n ? (reserves.reserveA * lpAmountToRemove) / lpTotalSupply : 0n;
  const estimatedB = reserves && lpTotalSupply > 0n ? (reserves.reserveB * lpAmountToRemove) / lpTotalSupply : 0n;

  async function handleRemove() {
    if (!signer) {
      setStatus({ type: "error", text: "Connect your wallet first." });
      return;
    }
    if (!pairAddress || lpAmountToRemove <= 0n) {
      setStatus({ type: "error", text: "No LP tokens to remove for this pair." });
      return;
    }
    setBusy(true);
    setStatus({ type: "warn", text: "Approving LP token…" });
    try {
      const router = getRouter(signer);
      const pair = getPairContract(pairAddress, signer);
      const allowance = await pair.allowance(address, router.target);
      if (allowance < lpAmountToRemove) {
        const approveTx = await pair.approve(router.target, ethers.MaxUint256);
        await approveTx.wait();
      }

      const deadline = Math.floor(Date.now() / 1000) + DEADLINE_SECONDS;
      const amountAMin = (estimatedA * BigInt(100 - SLIPPAGE_PERCENT)) / 100n;
      const amountBMin = (estimatedB * BigInt(100 - SLIPPAGE_PERCENT)) / 100n;

      setStatus({ type: "warn", text: "Removing liquidity…" });
      let tx;
      if (isNative(tokenA) || isNative(tokenB)) {
        const token = isNative(tokenA) ? tokenB : tokenA;
        const tokenMin = isNative(tokenA) ? amountBMin : amountAMin;
        const ethMin = isNative(tokenA) ? amountAMin : amountBMin;
        tx = await router.removeLiquidityETH(token.address, lpAmountToRemove, tokenMin, ethMin, address, deadline, {
          gasLimit: 1_500_000,
        });
      } else {
        tx = await router.removeLiquidity(
          tokenA.address,
          tokenB.address,
          lpAmountToRemove,
          amountAMin,
          amountBMin,
          address,
          deadline,
          { gasLimit: 1_500_000 }
        );
      }
      const receipt = await tx.wait();
      setStatus({ type: "success", text: `Liquidity removed. Tx: ${receipt.hash.slice(0, 12)}…` });
      await loadPoolInfo();
    } catch (err) {
      setStatus({ type: "error", text: err.shortMessage || err.reason || err.message || "Failed to remove liquidity." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="io-stack">
        <TokenBox label="Token A" tokens={tokens} selected={tokenA} onSelectToken={setTokenA} amount="" readOnly />
        <TokenBox label="Token B" tokens={tokens} selected={tokenB} onSelectToken={setTokenB} amount="" readOnly />
      </div>

      {!pairAddress ? (
        <div className="alert alert-warn">There is no pool for this token pair yet.</div>
      ) : (
        <>
          <div className="pool-info" style={{ marginTop: 12 }}>
            <div className="row">
              <span>Your LP tokens</span>
              <span className="val">{ethers.formatUnits(lpBalance, 18)}</span>
            </div>
          </div>

          <div className="slippage-panel">
            <div className="slippage-title">Amount to remove: {percent}%</div>
            <input type="range" min="1" max="100" step="1" value={percent} onChange={(e) => setPercent(Number(e.target.value))} />
          </div>

          <div className="pool-info">
            <div className="row">
              <span>Estimated {tokenA.symbol}</span>
              <span className="val">{Number(ethers.formatUnits(estimatedA, tokenA.decimals)).toFixed(6)}</span>
            </div>
            <div className="row">
              <span>Estimated {tokenB.symbol}</span>
              <span className="val">{Number(ethers.formatUnits(estimatedB, tokenB.decimals)).toFixed(6)}</span>
            </div>
          </div>
        </>
      )}

      {status && <div className={`alert alert-${status.type}`}>{status.text}</div>}

      <button className="action-btn" onClick={handleRemove} disabled={busy || !signer || !pairAddress}>
        {busy ? "Processing…" : !signer ? "Connect Wallet" : "Remove Liquidity"}
      </button>
    </>
  );
}
