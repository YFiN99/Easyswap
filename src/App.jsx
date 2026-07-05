// src/App.jsx
import { useState } from "react";
import TopNav from "./components/TopNav";
import SwapCard from "./components/SwapCard";
import PoolCard from "./components/PoolCard";
import { useWallet } from "./hooks/useWallet";
import { NATIVE_TOKEN, DEFAULT_TOKENS, ADDRESSES } from "./config";

const TOKENS = [NATIVE_TOKEN, ...DEFAULT_TOKENS];

export default function App() {
  const wallet = useWallet();
  const [page, setPage] = useState("swap");

  return (
    <>
      <TopNav wallet={wallet} page={page} onPageChange={setPage} />

      <div className="page">
        <div style={{ width: "100%", maxWidth: 420 }}>
          {wallet.error && <div className="alert alert-error">{wallet.error}</div>}

          {page === "swap" ? <SwapCard wallet={wallet} tokens={TOKENS} /> : <PoolCard wallet={wallet} tokens={TOKENS} />}

          <div className="footer-note">
            Router: {ADDRESSES.router}
            <br />
            Swap fee 0.30% — 0.15% to liquidity providers, 0.15% to the protocol. Unaudited, testnet only.
          </div>
        </div>
      </div>
    </>
  );
}
