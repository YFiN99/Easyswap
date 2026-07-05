// src/components/TokenBox.jsx
export default function TokenBox({
  label,
  tokens,
  selected,
  onSelectToken,
  amount,
  onAmountChange,
  readOnly,
  balance,
  onMax,
}) {
  return (
    <div className="io-box">
      <div className="io-box-toprow">
        <span className="io-label">{label}</span>
      </div>
      <div className="io-mainrow">
        <input
          className="io-amount"
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={amount}
          readOnly={readOnly}
          onChange={(e) => onAmountChange && onAmountChange(e.target.value)}
        />
        <div style={{ position: "relative" }}>
          <select
            className="token-pill"
            value={selected.address}
            onChange={(e) => {
              const t = tokens.find((tk) => tk.address === e.target.value);
              if (t) onSelectToken(t);
            }}
            style={{
              appearance: "none",
              WebkitAppearance: "none",
              paddingRight: 26,
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237b8ba0' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 10px center",
            }}
          >
            {tokens.map((t) => (
              <option key={t.address} value={t.address}>
                {t.symbol}
              </option>
            ))}
          </select>
        </div>
      </div>
      {balance !== undefined && (
        <div className="io-bottomrow">
          <span />
          <span>
            Balance: {balance}
            {onMax && (
              <button className="max-btn" onClick={onMax} style={{ marginLeft: 6 }}>
                MAX
              </button>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
