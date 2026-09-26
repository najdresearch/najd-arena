"use client";
import Image from "next/image";
import {useCatalog} from "./CatalogProvider";
export function ProviderLogo({model,size=32}:{model:string;size?:number}){
 const metadata=useCatalog().find(m=>m.id===model);
 return metadata?.logoUrl?<Image className="provider-logo" src={metadata.logoUrl} width={size} height={size} alt="" unoptimized/>:<span className="provider-logo-fallback" aria-hidden="true">{(metadata?.displayName??model).slice(0,1).toUpperCase()}</span>;
}
