// Run from web: node scripts/generate-brand-assets.mjs
// Vector artwork is the source of truth; PNG and ICO outputs are committed.
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const sharp=require(require.resolve('sharp',{paths:[require.resolve('next/package.json')]}));
const mark=`<rect width="128" height="128" rx="28" fill="#193c2a"/><path d="M28 94V37h15v8c5-7 12-10 20-10 17 0 25 11 25 29v30H72V65c0-11-4-16-12-16-10 0-16 7-16 19v26Z" fill="#f5f4ec"/><circle cx="103" cy="87" r="8" fill="#79b898"/>`;
const icon=`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">${mark}</svg>`;
const card=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#f5f4ec"/>
<path d="M0 0H1200V9H0Z" fill="#193c2a"/>
<g transform="translate(64 54) scale(.55)">${mark}</g>
<text x="153" y="104" font-family="Helvetica,Arial,sans-serif" font-size="43" letter-spacing="-2" fill="#193c2a"><tspan font-weight="700">najd</tspan>arena<tspan fill="#4c8967">.</tspan></text>
<text x="65" y="213" font-family="Helvetica,Arial,sans-serif" font-size="16" letter-spacing="3" fill="#466751">INDEPENDENT EVALUATION BY NAJD RESEARCH</text>
<text x="60" y="308" font-family="Georgia,serif" font-size="78" letter-spacing="-2" fill="#202a23">The benchmark for</text>
<text x="60" y="402" font-family="Georgia,serif" font-size="78" letter-spacing="-2" fill="#356448">Arabic and Saudi AI.</text>
<path d="M64 474H1136" stroke="#cbd4c9"/>
<text x="64" y="536" font-family="Helvetica,Arial,sans-serif" font-size="23" fill="#526458">Language. Local knowledge. Real-world tasks.</text>
<text x="1136" y="536" text-anchor="end" font-family="Helvetica,Arial,sans-serif" font-size="23" font-weight="700" fill="#193c2a">najdarena.com ↗</text>
</svg>`;
await writeFile(new URL('../app/icon.svg',import.meta.url),icon);
await writeFile(new URL('../public/social-card.svg',import.meta.url),card);
await sharp(Buffer.from(card)).png().toFile(new URL('../public/social-card.png',import.meta.url).pathname);
await sharp(Buffer.from(icon)).resize(180,180).png().toFile(new URL('../app/apple-icon.png',import.meta.url).pathname);
const sizes=[16,32,48];
const images=await Promise.all(sizes.map(size=>sharp(Buffer.from(icon)).resize(size,size).png().toBuffer()));
const header=Buffer.alloc(6+16*sizes.length);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);
let offset=header.length;
images.forEach((img,i)=>{const pos=6+i*16;header[pos]=sizes[i];header[pos+1]=sizes[i];header.writeUInt16LE(1,pos+4);header.writeUInt16LE(32,pos+6);header.writeUInt32LE(img.length,pos+8);header.writeUInt32LE(offset,pos+12);offset+=img.length;});
await writeFile(new URL('../app/favicon.ico',import.meta.url),Buffer.concat([header,...images]));
