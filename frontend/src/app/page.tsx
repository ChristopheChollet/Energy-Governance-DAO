import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <header className="flex justify-between items-center px-6 py-6 mx-auto max-w-5xl">
        <h1 className="text-xl font-semibold">Energy Governance DAO</h1>
        <nav className="flex gap-4 text-sm text-zinc-300">
          <Link href="/" className="hover:text-white">
            Accueil
          </Link>
          <Link href="/proposals" className="hover:text-white">
            Propositions
          </Link>
        </nav>
      </header>

      <main className="px-6 py-16 mx-auto max-w-5xl">
        <p className="text-sm text-zinc-400">MVP DAO • Gouvernance energie</p>
        <h2 className="mt-4 text-4xl font-semibold">
          Proposer, voter, executer des decisions energie-climat
        </h2>
        <p className="mt-4 max-w-2xl text-zinc-300">
          Ce MVP montre une gouvernance simple: creation de propositions,
          votes oui/non, puis execution apres la deadline.
        </p>

        <div className="flex gap-4 mt-10">
          <Link
            href="/proposals"
            className="px-5 py-3 text-sm font-medium bg-blue-600 rounded-xl hover:bg-blue-500"
          >
            Voir les propositions
          </Link>
        </div>
      </main>
    </div>
  );
}