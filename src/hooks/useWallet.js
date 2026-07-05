// src/hooks/useWallet.js
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { NETWORK } from "../config";

export function useWallet() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const hasWallet = typeof window !== "undefined" && !!window.ethereum;

  const refreshSigner = useCallback(async (browserProvider) => {
    const s = await browserProvider.getSigner();
    const addr = await s.getAddress();
    const network = await browserProvider.getNetwork();
    setSigner(s);
    setAddress(addr);
    setChainId(Number(network.chainId));
  }, []);

  const connect = useCallback(async () => {
    if (!hasWallet) {
      setError("Wallet not detected. Please install MetaMask.");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      await window.ethereum.request({ method: "eth_requestAccounts" });
      setProvider(browserProvider);
      await refreshSigner(browserProvider);
    } catch (err) {
      setError(err.shortMessage || err.message || "Failed to connect wallet.");
    } finally {
      setConnecting(false);
    }
  }, [hasWallet, refreshSigner]);

  const switchToCorrectNetwork = useCallback(async () => {
    if (!hasWallet) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: NETWORK.chainIdHex }],
      });
    } catch (switchError) {
      // Network belum ada di wallet -> coba tambahkan
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: NETWORK.chainIdHex,
              chainName: NETWORK.name,
              rpcUrls: [NETWORK.rpcUrl],
              nativeCurrency: { name: NETWORK.currencySymbol, symbol: NETWORK.currencySymbol, decimals: 18 },
            },
          ],
        });
      } else {
        setError(switchError.shortMessage || switchError.message || "Failed to switch network.");
      }
    }
  }, [hasWallet]);

  const disconnect = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setChainId(null);
  }, []);

  useEffect(() => {
    if (!hasWallet) return;

    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        disconnect();
      } else if (provider) {
        await refreshSigner(provider);
      }
    };
    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);
    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [hasWallet, provider, refreshSigner, disconnect]);

  const isWrongNetwork = chainId !== null && chainId !== NETWORK.chainId;

  return {
    provider,
    signer,
    address,
    chainId,
    hasWallet,
    connecting,
    error,
    isWrongNetwork,
    connect,
    disconnect,
    switchToCorrectNetwork,
  };
}
