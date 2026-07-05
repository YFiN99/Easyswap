// src/components/SwapCard.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { ethers } from "ethers";
import { NATIVE_TOKEN, FEE_INFO } from "../config";
import { getRouter, getErc20, resolveForPath, isNative } from "../lib/contracts";
import TokenBox from "./TokenBox";

const DEADLINE_SECONDS = 60 * 20;

export default function SwapCard({ wallet, tokens }) {
  const { provider, signer, address } = wallet;

  const [fromToken, setFromToken] = useState(NATIVE_TOKEN);
  const [toToken, setToToken] = useState(tokens.find((t) => t.address !== NATIVE_TOKEN.address) || tokens[0]);
  const [amountIn, setAmountIn] = useState("");
  const [amountOut, setAmountOut] = useState("");
  const [slippage, setSlippage] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [balances, setBalances] = useState({});
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const readProvider = provider || null;

  const fetchBalance = useCallback(
    async (token) => {
      if (!readProvider || !address) return "0";
      try {
        if (isNative(token)) {
          const bal = await readProvider.getBalance(address);
          return ethers.formatUnits(bal, 18);
        } else {
          const erc20 = getErc20(token.address, readProvider);
          const bal = await erc20.balanceOf(address);
          const dec = await erc20.decimals();
          return ethers.formatUnits(bal, dec);
        }
      } catch {
        return "0";
      }
    },
    [readProvider, address]
  );

  useEffect(() => {
    (async () => {
      const [fb, tb] = await Promise.all([fetchBalance(fromToken), fetchBalance(toToken)]);
      setBalances((prev) => ({ ...prev, [fromToken.address]: fb, [toToken.address]: tb }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromToken.address, toToken.address, address, readProvider]);

  const swapDirection = () => {
    const prevFrom = fromToken;
    setFromToken(toToken);
    setToToken(prevFrom);
    setAmountIn("");
    setAmountOut("");
  };

  useEffect(() => {
    let cancelled = false;
    async function runQuote() {
      if (!readProvider || !amountIn || Number(amountIn) <= 0) {
        setAmountOut("");
        return;
      }
      setQuoting(true);
      try {
        const router = getRouter(readProvider);
        const path = [resolveForPath(fromToken), resolveForPath(toToken)];
        const amtIn = ethers.parseUnits(amountIn, fromToken.decimals);
        const amounts = await router.getAmountsOut(amtIn, path);
        if (!cancelled) setAmountOut(ethers.formatUnits(amounts[1], toToken.decimals));
      } catch {
        if (!cancelled) setAmountOut("");
      } finally {
        if (!cancelled) setQuoting(false);
      }
    }
    runQuote();
    return () => {
      cancelled = true;
    };
  }, [amountIn, fromToken, toToken, readProvider]);

  const minReceived = useMemo(() => {
    if (!amountOut) return null;
    return (Number(amountOut) * (1 - slippage / 100)).toFixed(6);
  }, [amountOut, slippage]);

  const rate = useMemo(() => {
    if (!amountIn || !amountOut || Number(amountIn) === 0) return null;
    return (Number(amountOut) / Number(amountIn)).toFixed(6);
  }, [amountIn, amountOut]);

  async function handleSwap() {
    if (!signer) {
      setStatus({ type: "error", text: "Connect your wallet first." });
      return;
    }
    if (!amountIn || Number(amountIn) <= 0) {
      setStatus({ type: "error", text: "Enter the amount to swap." });
      return;
    }
    setBusy(true);
    setStatus({ type: "warn", text: "Preparing transaction…" });
    try {
      const router = getRouter(signer);
      const path = [resolveForPath(fromToken), resolveForPath(toToken)];
      const amtIn = ethers.parseUnits(amountIn, fromToken.decimals);
      const deadline = Math.floor(Date.now() / 1000) + DEADLINE_SECONDS;

      const amounts = await router.getAmountsOut(amtIn, path);
      const amountOutMin = (amounts[1] * BigInt(Math.floor((1 - slippage / 100) * 10000))) / 10000n;

      let tx;
      if (isNative(fromToken)) {
        tx = await router.swapExactETHForTokens(amountOutMin, path, address, deadline, {
          value: amtIn,
          gasLimit: 1_000_000,
        });
      } else if (isNative(toToken)) {
        setStatus({ type: "warn", text: "Approving token…" });
        const erc20 = getErc20(fromToken.address, signer);
        const allowance = await erc20.allowance(address, router.target);
        if (allowance < amtIn) {
          const approveTx = await erc20.approve(router.target, ethers.MaxUint256);
          await approveTx.wait();
        }
        setStatus({ type: "warn", text: "Sending swap…" });
        tx = await router.swapExactTokensForETH(amtIn, amountOutMin, path, address, deadline, {
          gasLimit: 1_000_000,
        });
      } else {
        setStatus({ type: "warn", text: "Approving token…" });
        const erc20 = getErc20(fromToken.address, signer);
        const allowance = await erc20.allowance(address, router.target);
        if (allowance < amtIn) {
          const approveTx = await erc20.approve(router.target, ethers.MaxUint256);
          await approveTx.wait();
        }
        setStatus({ type: "warn", text: "Sending swap…" });
        tx = await router.swapExactTokensForTokens(amtIn, amountOutMin, path, address, deadline, {
          gasLimit: 1_000_000,
        });
      }

      const receipt = await tx.wait();
      setStatus({ type: "success", text: `Swap successful. Tx: ${receipt.hash.slice(0, 12)}…` });
      setAmountIn("");
      setAmountOut("");
      const [fb, tb] = await Promise.all([fetchBalance(fromToken), fetchBalance(toToken)]);
      setBalances((prev) => ({ ...prev, [fromToken.address]: fb, [toToken.address]: tb }));
    } catch (err) {
      setStatus({ type: "error", text: err.shortMessage || err.reason || err.message || "Swap failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="uni-card">
      <div className="uni-card-header">
        <span className="uni-card-title">Swap</span>
        <button className="icon-btn" onClick={() => setShowSettings((s) => !s)} title="Slippage settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 15a3 3 0 100-6 3 3 0 000 6z"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="M19.4 13.5a1.7 1.7 0 000-3l1-1.7-1.7-1.7-1.7 1a1.7 1.7 0 00-3 0l-1-1.7-1.7 0-1 1.7a1.7 1.7 0 00-3 0l-1.7-1-1.7 1.7 1 1.7a1.7 1.7 0 000 3l-1 1.7 1.7 1.7 1.7-1a1.7 1.7 0 003 0l1 1.7h1.7l1-1.7a1.7 1.7 0 003 0l1.7 1 1.7-1.7-1-1.7z"
              stroke="currentColor"
              strokeWidth="1.1"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {showSettings && (
        <div className="slippage-panel">
          <div className="slippage-title">Slippage tolerance</div>
          <div className="slippage-options">
            {[0.5, 1, 3].map((v) => (
              <button key={v} className={slippage === v ? "active" : ""} onClick={() => setSlippage(v)}>
                {v}%
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="io-stack">
        <TokenBox
          label="From"
          tokens={tokens}
          selected={fromToken}
          onSelectToken={setFromToken}
          amount={amountIn}
          onAmountChange={setAmountIn}
          balance={balances[fromToken.address] ? Number(balances[fromToken.address]).toFixed(4) : "0"}
          onMax={() => setAmountIn(balances[fromToken.address] || "0")}
        />

        <div className="arrow-divider">
          <button className="arrow-btn" onClick={swapDirection} title="Balik arah">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 4v16m0 0l-5-5m5 5l5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <TokenBox
          label="To (estimated)"
          tokens={tokens}
          selected={toToken}
          onSelectToken={setToToken}
          amount={quoting ? "…" : amountOut}
          readOnly
          balance={balances[toToken.address] ? Number(balances[toToken.address]).toFixed(4) : "0"}
        />
      </div>

      {rate && (
        <div className="details-panel">
          <div className="detail-row">
            <span>Rate</span>
            <span className="val">
              1 {fromToken.symbol} = {rate} {toToken.symbol}
            </span>
          </div>
          <div className="detail-row">
            <span>Minimum received</span>
            <span className="val">
              {minReceived} {toToken.symbol}
            </span>
          </div>
          <div className="detail-row">
            <span>Fee ({(FEE_INFO.totalBps / 100).toFixed(2)}%)</span>
            <span className="val">
              {(FEE_INFO.lpBps / 100).toFixed(2)}% LP + {(FEE_INFO.protocolBps / 100).toFixed(2)}% protocol
            </span>
          </div>
        </div>
      )}

      {status && <div className={`alert alert-${status.type}`}>{status.text}</div>}

      <button className="action-btn" onClick={handleSwap} disabled={busy || !signer}>
        {busy ? "Processing…" : !signer ? "Connect Wallet" : "Swap"}
      </button>
    </div>
  );
}
