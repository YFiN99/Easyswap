// src/config.js
//
// GANTI alamat-alamat di bawah kalau kamu deploy ulang kontraknya.

export const NETWORK = {
  chainId: 1237, // Aeredium testnet
  chainIdHex: "0x4d5",
  name: "Aeredium Testnet",
  rpcUrl: "https://testnet.rpc.aeredium.io",
  currencySymbol: "ETH",
  blockExplorer: "", // isi kalau ada block explorer-nya
};

export const ADDRESSES = {
  router: "0x3F08e8faDB2AbcE8951d6Ea4d24137BaD8418E53",
  factory: "0x14800904B60a1395d50cC036EeD52fEb81037367",
  weth: "0x11e9860eaC58aB7f04154585abbB938FccDdd20A",
};

// Token bawaan yang muncul di daftar pilihan (selain ETH native).
// Tambah/kurangi sesuai kebutuhan — user juga bisa input alamat token custom di UI.
export const DEFAULT_TOKENS = [
  { symbol: "EASY", address: "0xB74118A15E65757DA3f3365cC7357Dd7b9b6b926", decimals: 18 },
];

// Simbol khusus untuk merepresentasikan ETH native di UI (bukan alamat kontrak asli)
export const NATIVE_TOKEN = { symbol: "ETH", address: "NATIVE", decimals: 18 };

// Total fee swap & pembagiannya — HARUS SAMA dengan yang di-hardcode di EasySwapPair.sol
export const FEE_INFO = {
  totalBps: 30, // 0.30%
  protocolBps: 15, // 0.15% -> ke deployer/feeTo
  lpBps: 15, // 0.15% -> otomatis nambah nilai LP token
};

// -----------------------------------------------------------------------
// ABI (human-readable, cukup untuk fungsi yang dipakai UI ini)
// -----------------------------------------------------------------------

export const ROUTER_ABI = [
  "function WETH() view returns (address)",
  "function factory() view returns (address)",
  "function getAmountsOut(uint256 amountIn, address[] path) view returns (uint256[] amounts)",
  "function getAmountsIn(uint256 amountOut, address[] path) view returns (uint256[] amounts)",
  "function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) returns (uint256 amountA, uint256 amountB, uint256 liquidity)",
  "function addLiquidityETH(address token, uint256 amountTokenDesired, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity)",
  "function removeLiquidity(address tokenA, address tokenB, uint256 liquidity, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) returns (uint256 amountA, uint256 amountB)",
  "function removeLiquidityETH(address token, uint256 liquidity, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) returns (uint256 amountToken, uint256 amountETH)",
  "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)",
  "function swapExactETHForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline) payable returns (uint256[] amounts)",
  "function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)",
];

export const FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) view returns (address)",
  "function feeTo() view returns (address)",
  "function allPairsLength() view returns (uint256)",
];

export const PAIR_ABI = [
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];
