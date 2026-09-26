import Link from "next/link";
import Image from "next/image";

export function Header() {
  return <header className="topbar"><div className="shell topbar-inner">
    <Link className="brand" href="/"><Image src="/najd-mark.png" alt="" width={40} height={32} priority />Najd Arena</Link>
    <nav className="nav" aria-label="Primary">
      <Link href="/leaderboard">Leaderboard</Link><Link href="/methodology">Methodology</Link>
      <Link href="/historical/m3">Historical study</Link>
      <Link href="/dashboard">Organization login</Link>
    </nav>
  </div></header>;
}
