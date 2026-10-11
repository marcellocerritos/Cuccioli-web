"use client";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, X } from "lucide-react";
import { money, promotionActive, variantPrice, type Product } from "@/lib/catalog";
import { cleanTitle } from "@/lib/display";
import { productPath } from "@/lib/routes";
import { site } from "@/content/site";
import { useOrder } from "./order";
import { ProductImage } from "./ui";

// Precio "desde": el menor precio vigente entre las presentaciones activas con precio.
export function fromPrice(p: Product) {
  const prices = p.variants.filter(v => v.active).map(v => variantPrice(p, v)).filter(n => n > 0);
  return prices.length ? Math.min(...prices) : 0;
}

export function ProductCard({ product: p, eager = false, note }: { product: Product; eager?: boolean; note?: string }) {
  const { add } = useOrder();
  const active = p.variants.filter(v => v.active);
  const price = fromPrice(p);
  const promo = promotionActive(p) && active.some(v => v.promoPrice > 0);
  const [picking, setPicking] = useState(false);
  const picker = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!picking) return;
    picker.current?.querySelector<HTMLElement>(".size-chip")?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setPicking(false); trigger.current?.focus(); } };
    const away = (e: MouseEvent) => { if (!picker.current?.contains(e.target as Node) && e.target !== trigger.current) setPicking(false); };
    document.addEventListener("keydown", key); document.addEventListener("mousedown", away);
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("mousedown", away); };
  }, [picking]);
  function onAdd() {
    if (active.length === 1) add(p, active[0].id);
    else setPicking(v => !v);
  }
  function pick(id: string) { add(p, id); setPicking(false); trigger.current?.focus(); }
  return <article className="card">
    <Link to={productPath(p.id)} className="card-link">
      <span className="card-media"><ProductImage product={p} eager={eager} />{promo && <span className="card-badge">{site.card.promo}</span>}</span>
      <span className="card-brand">{cleanTitle(p.brand)}</span>
      <span className="card-name">{p.name}</span>
      {note && <span className="card-note">{note}</span>}
      <span className="card-meta">
        {price > 0 ? <span className={`card-price ${promo ? "is-promo" : ""}`}><small>{site.card.from}</small> {money(price)}</span> : <span className="card-price card-consult">{site.card.consult}</span>}
        <span className="card-sizes">{active.length > 0 ? site.card.presentations(active.length) : site.card.unavailable}</span>
      </span>
    </Link>
    {active.length > 0 && <button ref={trigger} type="button" className="card-add" onClick={onAdd} aria-expanded={active.length > 1 ? picking : undefined} aria-label={`${site.card.add}: ${p.name}`}><Plus size={17} strokeWidth={1.75} aria-hidden="true" />{site.card.add}</button>}
    {picking && <div ref={picker} className="card-picker" role="group" aria-label={`${site.card.choose}: ${p.name}`}>
      <div className="card-picker-head"><p>{site.card.choose}</p><button type="button" className="card-picker-close" onClick={() => { setPicking(false); trigger.current?.focus(); }} aria-label={site.card.closeChoose}><X size={16} aria-hidden="true" /></button></div>
      <div className="card-picker-options">{active.map(v => { const vp = variantPrice(p, v); return <button key={v.id} type="button" className="size-chip" onClick={() => pick(v.id)}><span>{v.size}</span><small>{vp > 0 ? money(vp) : site.card.consult}</small></button>; })}</div>
    </div>}
  </article>;
}

export function LoadingCards({ count = 8 }: { count?: number }) {
  return <div className="card-grid" aria-busy="true" aria-label={site.catalog.loading}>{Array.from({ length: count }, (_, i) => <div className="card card-skeleton" key={i}><span className="well skeleton-block" /><span className="skeleton-line short" /><span className="skeleton-line" /><span className="skeleton-line mid" /></div>)}</div>;
}
