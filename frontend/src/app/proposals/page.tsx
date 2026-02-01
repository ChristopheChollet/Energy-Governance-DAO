"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ethers } from "ethers";

const DAO_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

const DAO_ABI = [
  "function proposalCount() view returns (uint256)",
  "function proposals(uint256) view returns (string description, uint256 yes, uint256 no, uint256 deadline, bool executed)",
  "function propose(string description, uint256 durationSeconds)",
  "function vote(uint256 proposalId, bool support)",
  "function execute(uint256 proposalId)",
  "function owner() view returns (address)",
  "function hasVoted(uint256 proposalId, address voter) view returns (bool)",
  "event ProposalCreated(uint256 indexed id, string description, uint256 deadline)",
  "event Voted(uint256 indexed id, address indexed voter, bool support)",
  "event Executed(uint256 indexed id)",
];

type Proposal = {
  id: number;
  description: string;
  yes: number;
  no: number;
  deadline: number;
  executed: boolean;
  voted: boolean;
};

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [status, setStatus] = useState<string>("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("600");
  const [account, setAccount] = useState<string | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function load() {
    setIsLoading(true);
    if (!window.ethereum) {
      setStatus("MetaMask non detecte.");
      setIsLoading(false);
      return;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(DAO_ADDRESS, DAO_ABI, provider);
    const signer = await provider.getSigner();
    const accountAddress = await signer.getAddress();
    setAccount(accountAddress);

    const network = await provider.getNetwork();
    const currentChainId = Number(network.chainId);
    setChainId(currentChainId);
    if (currentChainId !== 31337) {
      setStatus("Reseau invalide. Passe sur Hardhat Local (31337).");
      setIsLoading(false);
      return;
    }

    const code = await provider.getCode(DAO_ADDRESS);
    if (code === "0x") {
      setStatus("Contrat non deploye a cette adresse.");
      setIsLoading(false);
      return;
    }

    try {
      setOwner(await contract.owner());
    } catch {
      setStatus("Impossible de lire owner() (mauvaise adresse?).");
      setIsLoading(false);
      return;
    }

    const count = Number(await contract.proposalCount());
    const items: Proposal[] = [];

    for (let i = 0; i < count; i++) {
      const p = await contract.proposals(i);
      const voted = accountAddress
        ? await contract.hasVoted(i, accountAddress)
        : false;
      items.push({
        id: i,
        description: p.description,
        yes: Number(p.yes),
        no: Number(p.no),
        deadline: Number(p.deadline),
        executed: p.executed,
        voted: Boolean(voted),
      });
    }

    setProposals(items);
    setStatus("");
    setIsLoading(false);
  }

  async function vote(id: number, support: boolean) {
    if (!window.ethereum) return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(DAO_ADDRESS, DAO_ABI, signer);

    try {
      const tx = await contract.vote(id, support);
      await tx.wait();
      await load();
      setStatus("");
    } catch {
      setStatus("Vote impossible (deadline passee ou vote deja effectue).");
    }
  }

  async function propose() {
    if (!window.ethereum) return;
    if (!description.trim()) {
      setStatus("Description obligatoire.");
      return;
    }

    const seconds = Number(duration);
    if (!seconds || seconds <= 0) {
      setStatus("Duree invalide.");
      return;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(DAO_ADDRESS, DAO_ABI, signer);

    const tx = await contract.propose(description.trim(), seconds);
    await tx.wait();
    setDescription("");
    setStatus("");
    await load();
  }

  async function execute(id: number) {
    if (!window.ethereum) return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(DAO_ADDRESS, DAO_ABI, signer);

    try {
      const tx = await contract.execute(id);
      await tx.wait();
      await load();
      setStatus("");
    } catch {
      setStatus("Execution impossible (owner ou deadline).");
    }
  }

  async function fastForward(seconds: number) {
    if (!window.ethereum) return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    setIsAdvancing(true);
    try {
      await provider.send("evm_increaseTime", [seconds]);
      await provider.send("evm_mine", []);
      await load();
      setStatus("");
    } catch {
      try {
        const response = await fetch("/api/evm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: "evm_increaseTime",
            params: [seconds],
          }),
        });
        if (!response.ok) {
          throw new Error("rpc_failed");
        }
        await fetch("/api/evm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method: "evm_mine", params: [] }),
        });
        await load();
        setStatus("");
      } catch {
        setStatus("Impossible d'avancer le temps (mode local requis).");
      }
    } finally {
      setIsAdvancing(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <header className="flex justify-between items-center px-6 py-6 mx-auto max-w-5xl">
        <h1 className="text-xl font-semibold">Propositions</h1>
        <nav className="flex gap-4 text-sm text-zinc-300">
          <Link href="/" className="hover:text-white">
            Accueil
          </Link>
          <Link href="/proposals" className="hover:text-white">
            Propositions
          </Link>
        </nav>
      </header>

      <main className="px-6 pb-16 mx-auto max-w-5xl">
        {status && (
          <div className="px-4 py-3 mb-6 text-sm text-amber-200 rounded-xl border border-amber-500/40 bg-amber-500/10">
            {status}
          </div>
        )}

        <div className="mb-8 rounded-2xl border border-zinc-800 bg-[#111827] p-6">
          <h2 className="text-lg font-semibold">Nouvelle proposition</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Seul le owner peut proposer. Duree en secondes (ex: 600 = 10 min).
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_160px]">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Financer un projet solaire"
              className="px-3 py-2 w-full text-sm text-white bg-transparent rounded-lg border border-zinc-700"
            />
            <input
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Duree (sec)"
              className="px-3 py-2 w-full text-sm text-white bg-transparent rounded-lg border border-zinc-700"
            />
          </div>

          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={propose}
              disabled={
                !account ||
                !owner ||
                account.toLowerCase() !== owner.toLowerCase()
              }
              className="px-3 py-2 text-xs font-medium bg-blue-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Proposer
            </button>
            <button
              type="button"
              onClick={load}
              disabled={isLoading}
              className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-zinc-700 hover:border-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Rafraichir"
            >
              <span
                className={`h-4 w-4 rounded-full border-2 border-zinc-400 border-t-transparent ${
                  isLoading ? "animate-spin" : ""
                }`}
              />
            </button>
            {chainId === 31337 && (
              <button
                onClick={() => fastForward(600)}
                disabled={isAdvancing}
                className="px-3 py-2 text-xs font-medium rounded-lg border border-zinc-700 hover:border-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAdvancing ? "Avance en cours..." : "Avancer +10 min"}
              </button>
            )}
            {account && owner && (
              <span className="text-xs text-zinc-400">
                {account.toLowerCase() === owner.toLowerCase()
                  ? "Compte owner"
                  : "Compte non-owner"}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {proposals.length === 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-[#111827] p-6 text-sm text-zinc-400">
              Aucune proposition pour le moment.
            </div>
          )}
          {proposals.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-zinc-800 bg-[#111827] p-6"
            >
              <p className="text-sm text-zinc-400">Proposition #{p.id}</p>
              <h3 className="mt-2 text-lg font-semibold">{p.description}</h3>
              <div className="flex gap-4 mt-4 text-sm">
                <span>Oui: {p.yes}</span>
                <span>Non: {p.no}</span>
                <span>
                  Deadline: {new Date(p.deadline * 1000).toLocaleString()}
                </span>
                <span>
                  Statut: {p.executed ? "Executee" : "En cours"}
                </span>
                {p.voted && (
                  <span className="text-emerald-300">Vote enregistre</span>
                )}
              </div>
              {now >= p.deadline * 1000 && !p.executed && (
                <p className="mt-2 text-xs text-emerald-300">
                  Deadline atteinte. Execution possible.
                </p>
              )}
              {now < p.deadline * 1000 && !p.executed && (
                <p className="mt-2 text-xs text-zinc-400">
                  Execution possible apres la deadline.
                </p>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => vote(p.id, true)}
                  disabled={p.voted || now >= p.deadline * 1000}
                  className="px-3 py-2 text-xs font-medium bg-green-600 rounded-lg disabled:opacity-50"
                >
                  Voter Oui
                </button>
                <button
                  onClick={() => vote(p.id, false)}
                  disabled={p.voted || now >= p.deadline * 1000}
                  className="px-3 py-2 text-xs font-medium bg-red-600 rounded-lg disabled:opacity-50"
                >
                  Voter Non
                </button>
                <button
                  onClick={() => execute(p.id)}
                  disabled={
                    now < p.deadline * 1000 ||
                    p.executed ||
                    !account ||
                    !owner ||
                    account.toLowerCase() !== owner.toLowerCase()
                  }
                  className="px-3 py-2 text-xs font-medium rounded-lg border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Executer
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}