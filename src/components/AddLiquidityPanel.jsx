// src/components/AddLiquidityPanel.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { NATIVE_TOKEN } from "../config";
import { getRouter, getFactory, getPairContract, getErc20, resolveForPath, isNative } from "../lib/contracts";
import TokenBox from "./TokenBox";

const DEADLINE_SECONDS = 60 * 20;
const SLIPPAGE_PERCENT = 2;

export default function AddLiquidityPanel({ wallet, tokens }) {
  const { provider, signer, address } = wallet;

  const [tokenA, setTokenA] = useState(NATIVE_TOKEN);
  const [tokenB, setTokenB] = useState(tokens.find((t) => t.address !== NATIVE_TOKEN.address) || tokens[0]);
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  // Info pool yang sudah ada (kalau ada) untuk auto-hitung rasio
  const [poolExists, setPoolExists] = useState(false);
  const [reserveA, setReserveA] = useState(0n); // raw BigInt, satuan token A
  const [reserveB, setReserveB] = useState(0n); // raw BigInt, satuan token B
  const lastEdited = useRef(null); // 'A' | 'B' | null -> field mana yang terakhir diketik manual

  const readProvider = provider;

  // Ambil reserve pool tiap kali token A/B berganti
  const loadPoolInfo = useCallback(async () => {
    if (!readProvider || tokenA.address === tokenB.address) {
      setPoolExists(false);
      setReserveA(0n);
      setReserveB(0n);
      return;
    }
    try {
      const factory = getFactory(readProvider);
      const pairAddr = await factory.getPair(resolveForPath(tokenA), resolveForPath(tokenB));
      if (pairAddr === ethers.ZeroAddress) {
        setPoolExists(false);
        setReserveA(0n);
        setReserveB(0n);
        return;
      }
      const pair = getPairContract(pairAddr, readProvider);
      const [[r0, r1], t0] = await Promise.all([pair.getReserves(), pair.token0()]);
      const aIsToken0 = resolveForPath(tokenA).toLowerCase() === t0.toLowerCase();
      const rA = aIsToken0 ? r0 : r1;
      const rB = aIsToken0 ? r1 : r0;
      setPoolExists(rA > 0n && rB > 0n);
      setReserveA(rA);
      setReserveB(rB);
    } catch {
      setPoolExists(false);
      setReserveA(0n);
      setReserveB(0n);
    }
  }, [readProvider, tokenA, tokenB]);

  useEffect(() => {
    loadPoolInfo();
  }, [loadPoolInfo]);

  // Auto-hitung pasangan jumlah sesuai rasio pool yang sudah ada,
  // persis seperti Uniswap: kalau pool sudah ada, rasio A:B TIDAK bisa dipilih bebas.
  useEffect(() => {
    if (!poolExists) return;
    try {
      if (lastEdited.current === "A") {
        if (!amountA || Number(amountA) <= 0) {
          setAmountB("");
          return;
        }
        const amtA = ethers.parseUnits(amountA, tokenA.decimals);
        const amtB = (amtA * reserveB) / reserveA;
        setAmountB(ethers.formatUnits(amtB, tokenB.decimals));
      } else if (lastEdited.current === "B") {
        if (!amountB || Number(amountB) <= 0) {
          setAmountA("");
          return;
        }
        const amtB = ethers.parseUnits(amountB, tokenB.decimals);
        const amtA = (amtB * reserveA) / reserveB;
        setAmountA(ethers.formatUnits(amtA, tokenA.decimals));
      }
    } catch {
      // input belum berupa angka valid, biarkan saja (misal user masih ngetik "0.")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amountA, amountB, poolExists, reserveA, reserveB]);

  function handleAmountAChange(val) {
    lastEdited.current = "A";
    setAmountA(val);
  }

  function handleAmountBChange(val) {
    lastEdited.current = "B";
    setAmountB(val);
  }

  function handleSelectTokenA(t) {
    setTokenA(t);
    setAmountA("");
    setAmountB("");
    lastEdited.current = null;
  }

  function handleSelectTokenB(t) {
    setTokenB(t);
    setAmountA("");
    setAmountB("");
    lastEdited.current = null;
  }

  const poolRatioText =
    poolExists && reserveA > 0n
      ? `1 ${tokenA.symbol} ≈ ${Number(ethers.formatUnits((reserveB * 10n ** 18n) / reserveA, 18 + tokenB.decimals - tokenA.decimals)).toFixed(6)} ${tokenB.symbol}`
      : null;

  async function handleAddLiquidity() {
    if (!signer) {
      setStatus({ type: "error", text: "Connect your wallet first." });
      return;
    }
    if (!amountA || !amountB || Number(amountA) <= 0 || Number(amountB) <= 0) {
      setStatus({ type: "error", text: "Enter both token amounts correctly." });
      return;
    }
    if (tokenA.address === tokenB.address) {
      setStatus({ type: "error", text: "Select two different tokens." });
      return;
    }

    setBusy(true);
    setStatus({ type: "warn", text: "Preparing…" });
    try {
      const router = getRouter(signer);
      const deadline = Math.floor(Date.now() / 1000) + DEADLINE_SECONDS;
      const aIsNative = isNative(tokenA);
      const bIsNative = isNative(tokenB);

      if (aIsNative || bIsNative) {
        const token = aIsNative ? tokenB : tokenA;
        const amountTokenHuman = aIsNative ? amountB : amountA;
        const amountEthHuman = aIsNative ? amountA : amountB;

        const amountTokenDesired = ethers.parseUnits(amountTokenHuman, token.decimals);
        const amountEth = ethers.parseUnits(amountEthHuman, 18);

        setStatus({ type: "warn", text: "Approving token…" });
        const erc20 = getErc20(token.address, signer);
        const allowance = await erc20.allowance(address, router.target);
        if (allowance < amountTokenDesired) {
          const approveTx = await erc20.approve(router.target, ethers.MaxUint256);
          await approveTx.wait();
        }

        const amountTokenMin = (amountTokenDesired * BigInt(100 - SLIPPAGE_PERCENT)) / 100n;
        const amountEthMin = (amountEth * BigInt(100 - SLIPPAGE_PERCENT)) / 100n;

        setStatus({ type: "warn", text: "Adding liquidity…" });
        const tx = await router.addLiquidityETH(
          token.address,
          amountTokenDesired,
          amountTokenMin,
          amountEthMin,
          address,
          deadline,
          { value: amountEth, gasLimit: 3_000_000 }
        );
        const receipt = await tx.wait();
        setStatus({ type: "success", text: `Liquidity added. Tx: ${receipt.hash.slice(0, 12)}…` });
      } else {
        const amountADesired = ethers.parseUnits(amountA, tokenA.decimals);
        const amountBDesired = ethers.parseUnits(amountB, tokenB.decimals);

        setStatus({ type: "warn", text: "Approving token A…" });
        const erc20A = getErc20(tokenA.address, signer);
        const allowanceA = await erc20A.allowance(address, router.target);
        if (allowanceA < amountADesired) {
          const tx1 = await erc20A.approve(router.target, ethers.MaxUint256);
          await tx1.wait();
        }

        setStatus({ type: "warn", text: "Approving token B…" });
        const erc20B = getErc20(tokenB.address, signer);
        const allowanceB = await erc20B.allowance(address, router.target);
        if (allowanceB < amountBDesired) {
          const tx2 = await erc20B.approve(router.target, ethers.MaxUint256);
          await tx2.wait();
        }

        const amountAMin = (amountADesired * BigInt(100 - SLIPPAGE_PERCENT)) / 100n;
        const amountBMin = (amountBDesired * BigInt(100 - SLIPPAGE_PERCENT)) / 100n;

        setStatus({ type: "warn", text: "Adding liquidity…" });
        const tx = await router.addLiquidity(
          tokenA.address,
          tokenB.address,
          amountADesired,
          amountBDesired,
          amountAMin,
          amountBMin,
          address,
          deadline,
          { gasLimit: 3_000_000 }
        );
        const receipt = await tx.wait();
        setStatus({ type: "success", text: `Liquidity added. Tx: ${receipt.hash.slice(0, 12)}…` });
      }

      setAmountA("");
      setAmountB("");
      lastEdited.current = null;
      await loadPoolInfo();
    } catch (err) {
      setStatus({ type: "error", text: err.shortMessage || err.reason || err.message || "Failed to add liquidity." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="io-stack">
        <TokenBox
          label="Token A"
          tokens={tokens}
          selected={tokenA}
          onSelectToken={handleSelectTokenA}
          amount={amountA}
          onAmountChange={handleAmountAChange}
        />
        <div className="plus-divider">
          <svg className="plus-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <TokenBox
          label="Token B"
          tokens={tokens}
          selected={tokenB}
          onSelectToken={handleSelectTokenB}
          amount={amountB}
          onAmountChange={handleAmountBChange}
        />
      </div>

      {poolExists ? (
        <div className="pool-info" style={{ marginTop: 12 }}>
          <div className="row">
            <span>Pool ratio</span>
            <span className="val">{poolRatioText}</span>
          </div>
        </div>
      ) : (
        <div className="alert alert-warn">
          There's no pool for this pair yet. It will be created automatically, and the ratio you enter here sets its starting price.
        </div>
      )}

      {status && <div className={`alert alert-${status.type}`}>{status.text}</div>}

      <button className="action-btn" onClick={handleAddLiquidity} disabled={busy || !signer}>
        {busy ? "Processing…" : !signer ? "Connect Wallet" : "Add Liquidity"}
      </button>
    </>
  );
}
