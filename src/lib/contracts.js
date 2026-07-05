// src/lib/contracts.js
import { ethers } from "ethers";
import { ADDRESSES, ROUTER_ABI, FACTORY_ABI, PAIR_ABI, ERC20_ABI, NATIVE_TOKEN } from "../config";

export function getRouter(signerOrProvider) {
  return new ethers.Contract(ADDRESSES.router, ROUTER_ABI, signerOrProvider);
}

export function getFactory(signerOrProvider) {
  return new ethers.Contract(ADDRESSES.factory, FACTORY_ABI, signerOrProvider);
}

export function getPairContract(pairAddress, signerOrProvider) {
  return new ethers.Contract(pairAddress, PAIR_ABI, signerOrProvider);
}

export function getErc20(tokenAddress, signerOrProvider) {
  return new ethers.Contract(tokenAddress, ERC20_ABI, signerOrProvider);
}

// Menerjemahkan token 'NATIVE' (ETH) menjadi alamat WETH untuk keperluan
// path swap / library kontrak, karena pool selalu berbasis ERC20 (WETH).
export function resolveForPath(token) {
  return token.address === NATIVE_TOKEN.address ? ADDRESSES.weth : token.address;
}

export function isNative(token) {
  return token.address === NATIVE_TOKEN.address;
}
