"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { site } from "@/content/site";

// Búsqueda por texto: reutiliza la ruta existente /catalogo?q=…
export function SearchForm({ onDone, big = false, id }: { onDone: () => void; big?: boolean; id: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search).get("q") || "";
  const [value, setValue] = useState(query);
  useEffect(() => setValue(query), [query]);
  function submit(e: FormEvent) { e.preventDefault(); const text = value.trim(); navigate(text ? `/catalogo?${new URLSearchParams({ q: text })}` : "/catalogo"); onDone(); }
  return <form className={`search-form ${big ? "search-form-big" : ""}`} role="search" aria-label={site.search.title} onSubmit={submit}>
    <label className="sr-only" htmlFor={id}>{site.search.label}</label>
    <Search size={big ? 26 : 20} strokeWidth={1.5} aria-hidden="true" />
    <input id={id} type="search" placeholder={site.search.placeholder} value={value} onChange={e => setValue(e.target.value)} maxLength={120} enterKeyHint="search" autoComplete="off" data-autofocus={big ? "" : undefined} />
    <button type="submit" className="search-submit">{site.search.submit}</button>
  </form>;
}
