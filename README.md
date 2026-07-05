# EasySwap Frontend

Frontend React (Vite) untuk EasySwap DEX. Terhubung ke kontrak `EasySwapRouter` yang sudah kamu deploy di testnet Aeredium.

Tampilan mengikuti skema warna dashboard gelap (navy + cyan) sesuai referensi, dengan elemen "timbangan keadilan" sebagai representasi visual pembagian fee 50:50 (0.15% ke liquidity provider, 0.15% ke protokol).

## Fitur

- **Connect Wallet** (MetaMask) + deteksi & switch ke network Aeredium testnet otomatis
- **Swap** — ETH ↔ Token, dengan quote live, slippage adjustable, minimum received
- **Add Liquidity** — mode Token+ETH atau Token+Token, auto approve, auto buat pool baru kalau belum ada
- **Remove Liquidity** — slider persentase, estimasi token yang diterima, auto approve LP token

## Cara jalankan

```bash
npm install
npm run dev
```

Buka `http://localhost:5173` di browser yang ada extension MetaMask.

## Konfigurasi

Semua alamat kontrak & daftar token ada di `src/config.js`:

```js
export const ADDRESSES = {
  router: "0x3F08e8faDB2AbcE8951d6Ea4d24137BaD8418E53",
  factory: "0x14800904B60a1395d50cC036EeD52fEb81037367",
  weth: "0x11e9860eaC58aB7f04154585abbB938FccDdd20A",
};

export const DEFAULT_TOKENS = [
  { symbol: "EASY", address: "0xB74118A15E65757DA3f3365cC7357Dd7b9b6b926", decimals: 18 },
];
```

Kalau deploy ulang kontrak, atau mau tambah token lain, cukup edit file ini — tidak perlu ubah kode komponen.

## Struktur folder

```
src/
├── App.jsx                    # Halaman utama, atur tab aktif
├── config.js                  # Alamat kontrak, ABI, daftar token, info network
├── styles.css                 # Semua styling (skema warna dashboard gelap)
├── hooks/
│   └── useWallet.js           # Koneksi MetaMask, deteksi network, auto switch
├── lib/
│   └── contracts.js           # Helper bikin instance kontrak ethers.js
└── components/
    ├── Header.jsx             # Logo + status badge + tombol connect
    ├── AmbientBars.jsx         # Dekorasi bar animasi (murni visual)
    ├── FeeScale.jsx            # Signature element: timbangan fee 50:50
    ├── Tabs.jsx                # Switch Swap / Add / Remove
    ├── TokenBox.jsx            # Input jumlah + dropdown pilih token
    ├── SwapCard.jsx            # Logika & UI swap
    ├── LiquidityAddCard.jsx    # Logika & UI tambah liquidity
    └── LiquidityRemoveCard.jsx # Logika & UI tarik liquidity
```

## Catatan

- Ini sudah dites `npm run build` dan berhasil tanpa error.
- Wallet & interaksi blockchain HANYA bisa jalan kalau dibuka di browser dengan extension MetaMask (atau wallet compatible lain) — tidak bisa dites lewat preview chat.
- Belum diaudit, khusus untuk testnet/development.
