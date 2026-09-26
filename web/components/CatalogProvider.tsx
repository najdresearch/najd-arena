"use client";
import {createContext,useContext} from "react";
import type {CatalogModel} from "@/lib/db";
const CatalogContext=createContext<CatalogModel[]>([]);
export function CatalogProvider({models,children}:{models:CatalogModel[];children:React.ReactNode}){return <CatalogContext.Provider value={models}>{children}</CatalogContext.Provider>;}
export const useCatalog=()=>useContext(CatalogContext);
