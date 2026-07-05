// src/components/TopNav.jsx
import { NETWORK } from "../config";

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <circle cx="13" cy="13" r="12" stroke="#35c3e8" strokeWidth="2" />
      <path d="M8 15c1.5 2 3 3 5 3s3.5-1 5-3" stroke="#35c3e8" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="9" cy="10" r="1.4" fill="#35c3e8" />
      <circle cx="17" cy="10" r="1.4" fill="#35c3e8" />
    </svg>
  );
}

function shortenAddress(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function TopNav({ wallet, page, onPageChange }) {
  const { address, connect, connecting, hasWallet, isWrongNetwork, switchToCorrectNetwork } = wallet;

  return (
    <nav className="topnav">
      <div className="topnav-left">
        <div className="brand">
          <Logo />
          <span className="brand-name">EasySwap</span>
        </div>
        <div className="nav-links">
          <button className={`nav-link ${page === "swap" ? "active" : ""}`} onClick={() => onPageChange("swap")}>
            Swap
          </button>
          <button className={`nav-link ${page === "pool" ? "active" : ""}`} onClick={() => onPageChange("pool")}>
            Pool
          </button>
        </div>
      </div>

      <div className="topnav-right">
        <span className="network-pill">
          <span className={`network-dot ${isWrongNetwork ? "wrong" : ""}`} />
          {NETWORK.name}
        </span>

        {!address ? (
          <button className="btn-connect" onClick={connect} disabled={connecting}>
            {connecting ? "Connecting…" : hasWallet ? "Connect Wallet" : "Install Wallet"}
          </button>
        ) : isWrongNetwork ? (
          <button className="btn-connect" onClick={switchToCorrectNetwork}>
            Switch Network
          </button>
        ) : (
          <span className="addr-chip">{shortenAddress(address)}</span>
        )}
      </div>
    </nav>
  );
}
