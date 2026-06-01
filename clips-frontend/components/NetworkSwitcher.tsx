"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import type { StellarNetwork } from "@/app/lib/networkConfig";

interface NetworkSwitcherProps {
  network: StellarNetwork;
  onChange: (network: StellarNetwork) => void;
}

function ConfirmDialog({
  target,
  onConfirm,
  onCancel,
}: {
  target: StellarNetwork;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isMainnet = target === "mainnet";
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="network-confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-sm mx-4 rounded-[20px] bg-surface border border-border p-6 shadow-2xl animate-in zoom-in duration-200">
        <button
          onClick={onCancel}
          aria-label="Cancel"
          className="absolute top-4 right-4 text-muted hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div
            className={`p-2 rounded-xl ${
              isMainnet ? "bg-yellow-500/10" : "bg-brand/10"
            }`}
          >
            <AlertTriangle
              className={`w-5 h-5 ${isMainnet ? "text-yellow-400" : "text-brand"}`}
              aria-hidden="true"
            />
          </div>
          <h3
            id="network-confirm-title"
            className="text-white font-bold text-[15px]"
          >
            Switch to {isMainnet ? "Mainnet" : "Testnet"}?
          </h3>
        </div>

        <p className="text-muted text-[13px] leading-relaxed mb-6">
          {isMainnet
            ? "You are switching to Mainnet. Transactions will use real XLM and incur actual fees. Make sure your wallet is funded before proceeding."
            : "You are switching to Testnet. Transactions are free and use test XLM only — no real funds will be used."}
        </p>

        <p className="text-muted text-[11px] mb-6 italic">
          The page will reload to apply the network change.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-border text-muted hover:text-white text-[13px] font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl font-bold text-[13px] transition-all cursor-pointer active:scale-[0.97] ${
              isMainnet
                ? "bg-yellow-400 hover:bg-yellow-300 text-black"
                : "bg-brand hover:bg-brand-hover text-black"
            }`}
          >
            Switch to {isMainnet ? "Mainnet" : "Testnet"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NetworkSwitcher({ network, onChange }: NetworkSwitcherProps) {
  const [pending, setPending] = useState<StellarNetwork | null>(null);

  return (
    <>
      <div className="flex items-center gap-2" role="group" aria-label="Network selector">
        <span className="text-[10px] text-muted font-semibold uppercase tracking-wider">
          Network
        </span>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["testnet", "mainnet"] as StellarNetwork[]).map((n) => {
            const active = network === n;
            return (
              <button
                key={n}
                onClick={() => !active && setPending(n)}
                aria-pressed={active}
                className={`px-3 py-1.5 text-[11px] font-bold transition-all duration-200 cursor-pointer ${
                  active
                    ? n === "mainnet"
                      ? "bg-yellow-400 text-black"
                      : "bg-brand text-black"
                    : "text-muted hover:text-white bg-transparent"
                }`}
              >
                {n === "testnet" ? "Testnet" : "Mainnet"}
              </button>
            );
          })}
        </div>
      </div>

      {pending && (
        <ConfirmDialog
          target={pending}
          onConfirm={() => { onChange(pending); setPending(null); }}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}
