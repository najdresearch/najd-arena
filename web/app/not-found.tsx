import Link from "next/link";
export default function NotFound(){return <main className="shell category-page"><div className="eyebrow">404 / Not found</div><h1>This page isn’t available.</h1><p className="lede">The model, result, or category may not have been published.</p><Link className="button" href={{pathname:"/models"}}>Explore models →</Link></main>;}
