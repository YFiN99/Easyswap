// src/components/PoolCard.jsx
import { useState } from "react";
import AddLiquidityPanel from "./AddLiquidityPanel";
import RemoveLiquidityPanel from "./RemoveLiquidityPanel";

export default function PoolCard({ wallet, tokens }) {
  const [mode, setMode] = useState("add");

  return (
    <div className="uni-card">
      <div className="uni-card-header">
        <span className="uni-card-title">Pool</span>
      </div>
      <div className="subnav">
        <button className={mode === "add" ? "active" : ""} onClick={() => setMode("add")}>
          Add Liquidity
        </button>
        <button className={mode === "remove" ? "active" : ""} onClick={() => setMode("remove")}>
          Remove Liquidity
        </button>
      </div>

      {mode === "add" ? <AddLiquidityPanel wallet={wallet} tokens={tokens} /> : <RemoveLiquidityPanel wallet={wallet} tokens={tokens} />}
    </div>
  );
}
