import Link from "next/link";
export function Footer() {
 return <footer className="footer"><div className="shell footer-content"><div><strong>NAJD RESEARCH</strong><p>Arabic intelligence. Measured with context.</p></div><nav aria-label="Research resources"><a href="mailto:salam@najdresearch.com">Contact & corrections</a><a href="https://github.com/najdresearch">GitHub</a><a href="https://x.com/najdresearch">Follow Najd</a><Link href="/methodology">Methodology</Link><a href="https://huggingface.co/datasets/najdresearch/najd-benchmark">Dataset ↗</a><Link href={{ pathname: "/about" }}>About Najd Arena</Link></nav><span>Measured results · Transparent scope</span></div></footer>;
}
