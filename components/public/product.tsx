"use client";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronDown, Minus, Plus, ShoppingBag } from "lucide-react";
import { money, promotionActive, variantPrice } from "@/lib/catalog";
import { cleanTitle } from "@/lib/display";
import { site } from "@/content/site";
import { usePublic, useOrganization, useSettings } from "./context";
import { useOrder } from "./order";
import { ProductCard } from "./product-card";
import { Breadcrumbs, NotFound, useTitle } from "./catalog";
import { ProductImage, Reg, WhatsApp } from "./ui";

const MAX_QTY = 99;

export function ProductPage() {
  const { id = "" } = useParams();
  const { data } = usePublic();
  const settings = useSettings();
  const { categories, brandPath } = useOrganization();
  const { add } = useOrder();
  const product = data?.products.find(p => p.id === id);
  const active = product?.variants.filter(v => v.active) || [];
  const [selected, setSelected] = useState("");
  const [qty, setQty] = useState(1);
  useEffect(() => { setSelected(""); setQty(1); }, [id]);
  useTitle(product?.name);

  if (!data) return <div className="page product-page" aria-busy="true"><div className="product-layout"><span className="well skeleton-block product-well" /><div className="product-info"><span className="skeleton-line short" /><span className="skeleton-line" /><span className="skeleton-line mid" /></div></div></div>;
  if (!product) return <NotFound />;

  const variant = active.find(v => v.id === selected) || active[0];
  const cat = categories.find(c => c.id === product.petType);
  const brandLabel = cleanTitle(product.brand);
  const price = variant ? variantPrice(product, variant) : 0;
  const promo = !!variant && promotionActive(product) && variant.promoPrice > 0;
  const more = data.products.filter(p => p.id !== product.id && p.brand === product.brand).sort((a, b) => Number(b.petType === product.petType) - Number(a.petType === product.petType)).slice(0, 4);
  const crumbs = [{ label: site.catalog.home, to: "/" }, ...(cat ? [{ label: cat.shortLabel, to: `/${cat.path}` }, { label: brandLabel, to: brandPath(cat.id, product.brand) }] : [{ label: site.catalog.catalog, to: "/catalogo" }]), { label: product.name }];

  return <div className="page product-page">
    <Breadcrumbs items={crumbs} />
    <div className="product-layout">
      <div className="product-media"><ProductImage product={product} size={900} eager className="product-well" />{promo && <span className="card-badge product-badge">{site.card.promo}</span>}</div>
      <div className="product-info">
        {cat ? <Link to={brandPath(cat.id, product.brand)} className="product-brand">{brandLabel}</Link> : <p className="product-brand">{brandLabel}</p>}
        <h1 className="product-title"><Reg text={product.name} /></h1>
        {variant ? <div className="product-price" aria-live="polite">
          {price > 0 ? <><strong className={promo ? "is-promo" : ""}>{money(price)}</strong>{promo && variant.price > 0 && <del>{money(variant.price)}</del>}<span>{site.product.currency}</span></> : <strong className="product-consult">{site.card.consult}</strong>}
        </div> : <p className="product-unavailable">{site.card.unavailable}</p>}

        {active.length > 0 && <fieldset className="product-field">
          <legend>{site.product.presentation}</legend>
          <div className="size-options">{active.map(v => { const vp = variantPrice(product, v); return <button key={v.id} type="button" className={`size-chip ${variant?.id === v.id ? "is-active" : ""}`} aria-pressed={variant?.id === v.id} onClick={() => setSelected(v.id)}><span>{v.size}</span><small>{vp > 0 ? money(vp) : site.card.consult}</small></button>; })}</div>
        </fieldset>}

        {variant && <>
          <div className="product-field">
            <p className="product-label" id="qty-label">{site.product.quantity}</p>
            <div className="qty" role="group" aria-labelledby="qty-label">
              <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1} aria-label={site.product.decrease}><Minus size={16} aria-hidden="true" /></button>
              <input type="number" inputMode="numeric" min={1} max={MAX_QTY} value={qty} aria-labelledby="qty-label" onChange={e => setQty(Math.min(MAX_QTY, Math.max(1, Math.floor(Number(e.target.value) || 1))))} />
              <button type="button" onClick={() => setQty(q => Math.min(MAX_QTY, q + 1))} disabled={qty >= MAX_QTY} aria-label={site.product.increase}><Plus size={16} aria-hidden="true" /></button>
            </div>
          </div>
          <div className="product-actions">
            <button type="button" className="cta cta-primary product-add" onClick={() => add(product, variant.id, qty)}><span className="cta-label"><ShoppingBag size={18} strokeWidth={1.75} aria-hidden="true" />{site.product.add}</span><span className="cta-arrow" aria-hidden="true"><Plus size={18} strokeWidth={1.75} /></span></button>
            <WhatsApp settings={settings} product={product} variant={variant} className="product-single">{site.product.single}</WhatsApp>
          </div>
        </>}

        {product.description && <section className="product-copy" aria-labelledby="product-description"><h2 id="product-description">{site.product.description}</h2><p>{product.description}</p></section>}
        {product.specifications && <details className="product-specs"><summary>{site.product.specifications}<ChevronDown size={18} aria-hidden="true" /></summary><p>{product.specifications}</p></details>}
      </div>
    </div>
    {more.length > 0 && <section className="page-section product-more" aria-labelledby="product-more"><h2 id="product-more" className="display-3 page-section-title">{site.product.moreOf(brandLabel)}</h2><div className="card-grid">{more.map(p => <ProductCard key={p.id} product={p} />)}</div></section>}
  </div>;
}
