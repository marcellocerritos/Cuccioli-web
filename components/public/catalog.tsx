"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronRight, PawPrint, SlidersHorizontal, X } from "lucide-react";
import { promotionActive, type Product } from "@/lib/catalog";
import { matchesSearch } from "@/lib/search";
import { classify, isStage, matchesStage, stageValues, type Stage } from "@/lib/finder";
import { cleanTitle } from "@/lib/display";
import { site } from "@/content/site";
import { usePublic, useOrganization, useSettings } from "./context";
import { LoadingCards, ProductCard } from "./product-card";
import { SearchForm } from "./search-form";
import { Cta, EditorialImage, Reg, WhatsApp } from "./ui";
import { categoryPhotoKey, editorialPhotos, type EditorialKey } from "@/content/editorial";

export function useTitle(title?: string) {
  useEffect(() => { document.title = title ? `${title} · Cuccioli` : "Cuccioli · Comida y cuidado para tus mascotas"; }, [title]);
}

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return <nav className="crumbs" aria-label={site.catalog.breadcrumbs}><ol>{items.map((it, i) => <li key={i}>{it.to ? <Link to={it.to}>{it.label}</Link> : <span aria-current="page">{it.label}</span>}{i < items.length - 1 && <ChevronRight size={13} aria-hidden="true" />}</li>)}</ol></nav>;
}

function PageHead({ kicker, title, text, aside, media, children }: { kicker?: string; title: string; text?: ReactNode; aside?: ReactNode; media?: EditorialKey; children?: ReactNode }) {
  const photo = media && editorialPhotos[media] ? media : undefined;
  return <header className={`page-head ${photo ? "has-media" : ""}`}>
    <div className="page-head-copy">
      {kicker && <p className="kicker">{kicker}</p>}
      <div className="page-head-row"><h1 className="page-title"><Reg text={title} /></h1>{aside}</div>
      {text && <p className="page-text">{text}</p>}
      {children}
    </div>
    {photo && <EditorialImage name={photo} className="page-head-photo" eager />}
  </header>;
}

export function EmptyState({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return <div className="empty-state"><p className="empty-state-title">{title}</p><p>{text}</p>{children && <div className="empty-state-actions">{children}</div>}</div>;
}

export function ProductGrid({ products }: { products: Product[] }) {
  const { data, error, refresh } = usePublic();
  if (!data) return error ? <EmptyState title={site.catalog.errorTitle} text={site.catalog.errorText}><button type="button" className="btn btn-outline" onClick={() => void refresh()}>{site.catalog.retry}</button></EmptyState> : <LoadingCards />;
  if (!products.length) return <EmptyState title={site.catalog.emptyTitle} text={site.catalog.emptyText}><Cta to="/catalogo" variant="outline">{site.catalog.emptyCta}</Cta></EmptyState>;
  return <div className="card-grid">{products.map((p, i) => <ProductCard key={p.id} product={p} eager={i < 4} />)}</div>;
}

function Chip({ to, active, children, onClick }: { to?: string; active?: boolean; children: ReactNode; onClick?: () => void }) {
  if (to) return <Link to={to} className={`chip ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined}>{children}</Link>;
  return <button type="button" className={`chip ${active ? "is-active" : ""}`} aria-pressed={!!active} onClick={onClick}>{children}</button>;
}

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return <div className="filter-row" role="group" aria-label={label}><p className="filter-label">{label}</p><div className="filter-chips">{children}</div></div>;
}

type ActiveFilter = { key: string; label: string; to?: string; onRemove?: () => void };
const FILTERS_KEY = "cuccioli_filtros";
function initialOpen() {
  try { const saved = sessionStorage.getItem(FILTERS_KEY); if (saved === "open" || saved === "closed") return saved === "open"; } catch { /* sin sessionStorage */ }
  return typeof window === "undefined" || !window.matchMedia("(max-width: 767px)").matches;
}

// Panel de filtros plegable: abierto al entrar (en móvil empieza plegado) y recuerda
// la preferencia en sessionStorage. Plegado, muestra los filtros activos como chips.
function FiltersPanel({ active, count, clearTo, clearLabel, children }: { active: ActiveFilter[]; count: string; clearTo: string; clearLabel: string; children: ReactNode }) {
  const [open, setOpen] = useState(initialOpen);
  function toggle() {
    const next = !open;
    setOpen(next);
    try { sessionStorage.setItem(FILTERS_KEY, next ? "open" : "closed"); } catch { /* sin sessionStorage */ }
  }
  const f = site.catalog.filters;
  return <div className={`filters-panel ${open ? "is-open" : ""}`}>
    <div className="filters-bar">
      <button type="button" className="filters-toggle" aria-expanded={open} aria-controls="filters-body" onClick={toggle}>
        <SlidersHorizontal size={18} strokeWidth={1.6} aria-hidden="true" />{f.title}{active.length > 0 && <span className="filters-count">{active.length}</span>}<ChevronDown className="filters-chevron" size={18} aria-hidden="true" />
      </button>
      {!open && active.length > 0 && <ul className="filters-active" aria-label={f.active}>{active.map(a => <li key={a.key}>{a.to
        ? <Link to={a.to} className="chip chip-removable" aria-label={f.remove(a.label)}>{a.label}<X size={14} aria-hidden="true" /></Link>
        : <button type="button" className="chip chip-removable" onClick={a.onRemove} aria-label={f.remove(a.label)}>{a.label}<X size={14} aria-hidden="true" /></button>}</li>)}</ul>}
      <span className="filters-results" role="status">{count}</span>
      {active.length > 0 && <Link to={clearTo} className="filters-clear">{clearLabel}</Link>}
    </div>
    <div id="filters-body" className="filters-body" inert={!open}><div className="filters-body-inner"><div className="filters">{children}</div></div></div>
  </div>;
}

export function CatalogPage() {
  const { categories, brandPath, taxonomy } = useOrganization();
  const { category, brand } = useParams();
  const [search, setSearch] = useSearchParams();
  const settings = useSettings();
  const { data } = usePublic();
  const query = (search.get("q") || "").trim().slice(0, 120);
  const requestedSub = search.get("linea") || "todas";
  const requestedStage = search.get("etapa");
  const cat = categories.find(c => c.path === category);
  const selectedBrand = cat?.brands.find(b => taxonomy.brands.find(x => x.name === b)?.path === brand);
  const brandEntry = taxonomy.brands.find(b => b.name === selectedBrand);
  const subBrands = brandEntry?.subBrands.filter(s => s.active && (!cat || s.categoryIds.includes(cat.id))) || [];
  const sub = brandEntry?.subBrands.find(s => s.id === requestedSub || s.name === requestedSub || s.aliases.includes(requestedSub));
  const products = useMemo(() => (data?.products || []).filter(p => (!cat || p.petType === cat.type) && (!selectedBrand || p.brand === selectedBrand)), [data, cat, selectedBrand]);
  const classes = useMemo(() => new Map(products.map(p => [p.id, classify(p)])), [products]);
  const stageable = !!cat && (cat.id === "dog" || cat.id === "cat") && products.some(p => { const c = classes.get(p.id)!; return c.stages.length > 0 || c.allStages; });
  const stage: Stage | null = stageable && isStage(requestedStage) ? requestedStage : null;
  const shown = products.filter(p => (!sub || p.subBrand === sub.name) && (!stage || matchesStage(classes.get(p.id)!, stage)) && matchesSearch(p, query, taxonomy));
  const promotions = shown.filter(p => promotionActive(p));
  const brandLabel = selectedBrand ? cleanTitle(selectedBrand) : "";
  useTitle(query ? site.searchPage.title : brandLabel || cat?.label || site.catalog.title);

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(search);
    if (value) next.set(key, value); else next.delete(key);
    setSearch(next);
  }

  if (!data) return <div className="page"><LoadingCards /></div>;
  if ((category && !cat) || (brand && !selectedBrand)) return <NotFound />;

  if (query) {
    return <div className="page">
      <Breadcrumbs items={[{ label: site.catalog.home, to: "/" }, { label: site.catalog.catalog, to: "/catalogo" }, { label: site.searchPage.crumb }]} />
      <PageHead kicker={site.searchPage.kicker} title={site.searchPage.title} text={<>{site.searchPage.query} <strong>“{query}”</strong></>} aside={<span className="page-count" role="status">{site.searchPage.count(shown.length)}</span>}>
        <div className="page-search"><SearchForm id="page-search" onDone={() => {}} /></div>
      </PageHead>
      <FiltersPanel count={site.searchPage.count(shown.length)} clearTo="/catalogo" clearLabel={site.searchPage.clear} active={[{ key: "q", label: `“${query}”`, to: cat ? `/${cat.path}` : "/catalogo" }, ...(cat ? [{ key: "cat", label: cat.shortLabel, to: `/catalogo?${new URLSearchParams({ q: query })}` }] : [])]}>
        <FilterRow label={site.catalog.filters.category}>
          <Chip to={`/catalogo?${new URLSearchParams({ q: query })}`} active={!cat}>{site.catalog.filters.all}</Chip>
          {categories.map(c => <Chip key={c.id} to={`/${c.path}?${new URLSearchParams({ q: query })}`} active={cat?.id === c.id}>{c.shortLabel}</Chip>)}
        </FilterRow>
      </FiltersPanel>
      {shown.length ? <ProductGrid products={shown} /> : <EmptyState title={site.searchPage.emptyTitle} text={site.searchPage.emptyText}><WhatsApp settings={settings} cta="dark">{site.searchPage.whatsapp}</WhatsApp><Link to="/catalogo" className="text-cta">{site.searchPage.all}</Link></EmptyState>}
    </div>;
  }

  const crumbs = [{ label: site.catalog.home, to: "/" }, ...(cat && selectedBrand ? [{ label: cat.shortLabel, to: `/${cat.path}` }, { label: brandLabel }] : [{ label: cat?.label || site.catalog.catalog }])];
  const stageLabel = (s: Stage) => s === "cachorro" && cat?.id === "cat" ? site.catalog.stages.gatito : site.catalog.stages[s];
  const active: ActiveFilter[] = [
    ...(cat ? [{ key: "cat", label: cat.shortLabel, to: "/catalogo" }] : []),
    ...(cat && selectedBrand ? [{ key: "brand", label: brandLabel, to: `/${cat.path}` }] : []),
    ...(sub ? [{ key: "linea", label: cleanTitle(sub.name), onRemove: () => setParam("linea", null) }] : []),
    ...(stage ? [{ key: "etapa", label: stageLabel(stage), onRemove: () => setParam("etapa", null) }] : []),
  ];
  return <div className="page">
    <Breadcrumbs items={crumbs} />
    <PageHead kicker={cat?.shortLabel || site.catalog.kicker} title={brandLabel || cat?.label || site.catalog.title} text={selectedBrand ? site.catalog.brandText(brandLabel) : (cleanTitle(cat?.description) || site.catalog.text)} aside={<span className="page-count">{site.catalog.count(shown.length)}</span>} media={!cat ? "catalog" : !selectedBrand ? categoryPhotoKey(cat.id) : undefined} />
    <FiltersPanel active={active} count={site.catalog.count(shown.length)} clearTo="/catalogo" clearLabel={site.catalog.filters.clearAll}>
      <FilterRow label={site.catalog.filters.category}>
        <Chip to="/catalogo" active={!cat}>{site.catalog.filters.all}</Chip>
        {categories.map(c => <Chip key={c.id} to={`/${c.path}`} active={cat?.id === c.id}>{c.shortLabel}</Chip>)}
      </FilterRow>
      {cat && cat.brands.length > 0 && <FilterRow label={site.catalog.filters.brand}>
        <Chip to={`/${cat.path}`} active={!selectedBrand}>{site.catalog.filters.all}</Chip>
        {cat.brands.map(b => <Chip key={b} to={brandPath(cat.type, b)} active={b === selectedBrand}>{cleanTitle(b)}</Chip>)}
      </FilterRow>}
      {selectedBrand && subBrands.length > 0 && <FilterRow label={site.catalog.filters.line}>
        <Chip active={!sub} onClick={() => setParam("linea", null)}>{site.catalog.filters.all}</Chip>
        {subBrands.map(s => <Chip key={s.id} active={sub?.id === s.id} onClick={() => setParam("linea", s.id)}>{cleanTitle(s.name)}</Chip>)}
      </FilterRow>}
      {stageable && <FilterRow label={site.catalog.filters.stage}>
        <Chip active={!stage} onClick={() => setParam("etapa", null)}>{site.catalog.filters.all}</Chip>
        {stageValues.map(s => <Chip key={s} active={stage === s} onClick={() => setParam("etapa", s)}>{stageLabel(s)}</Chip>)}
      </FilterRow>}
    </FiltersPanel>
    {promotions.length > 0 && <section className="page-section" aria-labelledby="catalog-promos"><p className="kicker">{site.catalog.promoKicker}</p><h2 id="catalog-promos" className="display-3 page-section-title"><Reg text={site.catalog.promoTitle(brandLabel || undefined)} /></h2><ProductGrid products={promotions} /></section>}
    <section className="page-section" aria-labelledby="catalog-grid">
      <h2 id="catalog-grid" className={promotions.length ? "display-3 page-section-title" : "sr-only"}>{selectedBrand ? site.catalog.brandGridTitle(brandLabel) : site.catalog.gridTitle}</h2>
      <ProductGrid products={shown} />
    </section>
  </div>;
}

export function PromotionsPage() {
  const { allBrands } = useOrganization();
  const { data } = usePublic();
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(x => x + 1), 60000); return () => clearInterval(t); }, []);
  useTitle(site.promotionsPage.crumb);
  const promotions = (data?.products || []).filter(p => promotionActive(p));
  const brands = allBrands.filter(b => promotions.some(p => p.brand === b));
  const p = site.promotionsPage;
  return <div className="page">
    <Breadcrumbs items={[{ label: site.catalog.home, to: "/" }, { label: p.crumb }]} />
    <PageHead kicker={p.kicker} title={p.title} text={p.text} media="promotions" />
    {!data ? <LoadingCards /> : brands.length ? brands.map(b => <section className="page-section" key={b} aria-label={cleanTitle(b)}><h2 className="display-3 page-section-title"><Reg text={cleanTitle(b)} /></h2><ProductGrid products={promotions.filter(x => x.brand === b)} /></section>)
      : <EmptyState title={p.emptyTitle} text={p.emptyText}><Cta to="/catalogo">{p.emptyCta}</Cta></EmptyState>}
  </div>;
}

export function NotFound() {
  useTitle(site.notFound.eyebrow);
  return <div className="not-found"><PawPrint size={48} strokeWidth={1.25} aria-hidden="true" /><p className="kicker">{site.notFound.eyebrow}</p><h1>{site.notFound.title}</h1><p>{site.notFound.text}</p><Cta to="/" className="not-found-cta">{site.notFound.cta}</Cta></div>;
}

