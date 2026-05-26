"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { secureStorage } from "@/app/lib/secureStorage";

// EIP-1193 provider type (window.ethereum)
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: { toBase58: () => string } }>;
      disconnect: () => Promise<void>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
      publicKey?: {
        toBase58: () => string;
      };
    };
  }
}

export type WalletType = "metamask" | "phantom";

export interface WalletState {
  address: string | null;
  chainId: string | null;
  walletType: WalletType | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

interface WalletContextType extends WalletState {
  connectMetaMask: () => Promise<void>;
  connectPhantom: () => Promise<void>;
  disconnect: () => void;
  clearError: () => void;
}

const STORAGE_KEY = "clipcash_wallet";

/**
 * Allowed chain IDs.
 * 0x1 = Ethereum Mainnet, 0xaa36a7 = Sepolia testnet.
 * Extend this set when adding support for other networks.
 */
const ALLOWED_CHAIN_IDS = new Set(["0x1", "0xaa36a7"]);

/** Validate an Ethereum address: 0x followed by exactly 40 hex characters. */
function isValidEthAddress(address: unknown): address is string {
  return typeof address === "string" && /^0x[0-9a-fA-F]{40}$/.test(address);
}

/** Validate a chainId: must be a hex string like "0x1". */
function isValidChainId(chainId: unknown): chainId is string {
  return typeof chainId === "string" && /^0x[0-9a-fA-F]+$/.test(chainId);
}

/** Wrap a promise with a timeout to prevent indefinite UI hangs. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

const defaultState: WalletState = {
  address: null,
  chainId: null,
  walletType: null,
  isConnected: false,
  isConnecting: false,
  error: null,
};

const WalletContext = createContext<WalletContextType>({
  ...defaultState,
  connectMetaMask: async () => {},
  connectPhantom: async () => {},
  disconnect: () => {},
  clearError: () => {},
});

export const useWallet = () => useContext(WalletContext);

/** Truncate a wallet address for display: 0x1234...5678 */
export function truncateAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WalletState>(defaultState);
  const stateRef = useRef(state);

  // Sync ref with state so event listeners always see latest values
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Restore persisted session on mount.
  // sessionStorage is used instead of localStorage so the session is cleared
  // when the browser tab is closed, reducing the window for session hijacking.
  useEffect(() => {
    try {
      secureStorage.getItem(STORAGE_KEY).then((stored) => {
        if (stored) {
          const parsed: Partial<WalletState> = JSON.parse(stored);
          if (parsed.address && parsed.walletType) {
            setState((prev: WalletState) => ({
              ...prev,
              address: parsed.address!,
              chainId: parsed.chainId ?? null,
              walletType: parsed.walletType!,
              isConnected: true,
            }));
          }
        }
      });
    } catch {
      // Malformed JSON — clear it
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Listen for MetaMask account / chain changes
  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum) return;

    const handleAccountsChanged = (accounts: unknown) => {
      // Runtime type guard — never trust provider data blindly
      if (!Array.isArray(accounts) || !accounts.every((a) => typeof a === "string")) return;
      const accs = accounts as string[];
      if (accs.length === 0) {
        // User disconnected from MetaMask side
        handleDisconnect();
      } else {
        const address = accs[0];
        setState((prev: WalletState) => ({ ...prev, address }));
        persistSession({ address, chainId: stateRef.current.chainId, walletType: "metamask" });
      }
    };

    const handleChainChanged = (chainId: unknown) => {
      const id = chainId as string;
      setState((prev: WalletState) => ({ ...prev, chainId: id }));
      persistSession({ address: stateRef.current.address, chainId: id, walletType: stateRef.current.walletType });
    };

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);

    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged);
      ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  // Listen for Solana account changes
  useEffect(() => {
    const solana = window.solana;
    if (!solana) return;

    const handleAccountChanged = (publicKey: { toBase58: () => string } | null) => {
      if (!publicKey) {
        handleDisconnect();
      } else {
        const address = publicKey.toBase58();
        setState((prev: WalletState) => ({ ...prev, address }));
        persistSession({ address, chainId: "5EJ9Vc47M3VvM2x6wCk3F2nZ3qG7yB9rD6aX8cE5fG1h", walletType: "phantom" });
      }
    };

    const handleConnect = (publicKey: { toBase58: () => string }) => {
      const address = publicKey.toBase58();
      setState((prev: WalletState) => ({
        ...prev,
        address,
        isConnected: true,
        isConnecting: false,
        error: null,
      }));
      persistSession({ address, chainId: "5EJ9Vc47M3VvM2x6wCk3F2nZ3qG7yB9rD6aX8cE5fG1h", walletType: "phantom" });
    };

    solana.on("accountChanged", handleAccountChanged);
    solana.on("connect", handleConnect);

    return () => {
      solana.removeListener("accountChanged", handleAccountChanged);
      solana.removeListener("connect", handleConnect);
    };
  }, []);

  function persistSession(data: { address: string | null; chainId: string | null; walletType: WalletType | null }) {
    if (data.address) {
      secureStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } else {
      secureStorage.removeItem(STORAGE_KEY);
    }
  }

  function handleDisconnect() {
    setState({ ...defaultState });
    secureStorage.removeItem(STORAGE_KEY);
    
    // Disconnect from Phantom if connected
    const solana = window.solana;
    if (solana && state.walletType === "phantom") {
      solana.disconnect().catch(() => {});
    }
  }

  const connectMetaMask = useCallback(async () => {
    if (!window.ethereum || !window.ethereum.isMetaMask) {
      setState((prev: WalletState) => ({
        ...prev,
        error: "MetaMask is not installed. Please install the MetaMask browser extension.",
      }));
      return;
    }

    setState((prev: WalletState) => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Request accounts with a 30-second timeout to prevent UI freeze
      const rawAccounts = await withTimeout(
        window.ethereum.request({ method: "eth_requestAccounts" }),
        30_000,
        "eth_requestAccounts"
      );

      // Runtime type guard — never trust the provider blindly
      if (!Array.isArray(rawAccounts) || !rawAccounts.every((a) => typeof a === "string")) {
        throw new Error("Unexpected response from wallet provider.");
      }
      const accounts = rawAccounts as string[];

      if (accounts.length === 0) {
        throw new Error("No accounts returned. Please unlock MetaMask and try again.");
      }

      const address = accounts[0];

      // Validate the address format before storing it
      if (!isValidEthAddress(address)) {
        throw new Error("Wallet returned an invalid address. Please try again.");
      }

      const rawChainId = await withTimeout(
        window.ethereum.request({ method: "eth_chainId" }),
        10_000,
        "eth_chainId"
      );

      if (!isValidChainId(rawChainId)) {
        throw new Error("Unexpected chain ID format from wallet provider.");
      }
      const chainId = rawChainId;

      // Enforce network allowlist
      if (!ALLOWED_CHAIN_IDS.has(chainId)) {
        throw new Error(
          "Unsupported network. Please switch MetaMask to Ethereum Mainnet or Sepolia."
        );
      }

      setState({
        address,
        chainId,
        walletType: "metamask",
        isConnected: true,
        isConnecting: false,
        error: null,
      });

      persistSession({ address, chainId, walletType: "metamask" });
    } catch (err: unknown) {
      const message =
        (err as { code?: number; message?: string })?.code === 4001
          ? "Connection rejected. Please approve the request in MetaMask."
          : (err as Error)?.message ?? "Failed to connect wallet. Please try again.";

      setState((prev: WalletState) => ({
        ...prev,
        isConnecting: false,
        error: message,
      }));
    }
  }, []);

  const connectPhantom = useCallback(async () => {
    const solana = window.solana;
    if (!solana || !solana.isPhantom) {
      setState((prev: WalletState) => ({
        ...prev,
        error: "Phantom wallet not detected. Please install the Phantom browser extension.",
      }));
      return;
    }

    setState((prev: WalletState) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const response = await solana.connect();
      const address = response.publicKey.toBase58();

      setState({
        address,
        chainId: "5EJ9Vc47M3VvM2x6wCk3F2nZ3qG7yB9rD6aX8cE5fG1h",
        walletType: "phantom",
        isConnected: true,
        isConnecting: false,
        error: null,
      });

      persistSession({ address, chainId: "5EJ9Vc47M3VvM2x6wCk3F2nZ3qG7yB9rD6aX8cE5fG1h", walletType: "phantom" });
    } catch (err: unknown) {
      const message =
        (err as { code?: number; message?: string })?.code === 4001
          ? "Connection rejected. Please approve the request in Phantom."
          : (err as Error)?.message ?? "Failed to connect Phantom wallet. Please try again.";

      setState((prev: WalletState) => ({
        ...prev,
        isConnecting: false,
        error: message,
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    handleDisconnect();
  }, [state.walletType]);

  const clearError = useCallback(() => {
    setState((prev: WalletState) => ({ ...prev, error: null }));
  }, []);

  return (
    <WalletContext.Provider
      value={{ ...state, connectMetaMask, connectPhantom, disconnect, clearError }}
    >
      {children}
    </WalletContext.Provider>
  );
}
