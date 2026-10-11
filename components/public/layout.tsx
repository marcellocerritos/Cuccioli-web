"use client";
import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ArrowRight, ChevronDown, Menu, Search, ShoppingBag, X } from "lucide-react";
import { whatsappUrl } from "@/lib/catalog";
import { useCatalog } from "@/lib/client";
import { cleanTitle, formatWhatsAppNumber } from "@/lib/display";
import { finderPath } from "@/lib/routes";
import { site } from "@/content/site";
import { CatalogContext, useOrganization, useSettings, type PublicCategory } from "./context";
import { OrderProvider, useOrder } from "./order";
import { Brand, EditorialImage, WhatsApp, useDialog, whatsappSoon } from "./ui";
import { SearchForm } from "./search-form";

function Announcement() {
  const settings = useSettings();
  const url = whatsappUrl(settings.whatsappNumber);
  const cta = <>{site.announcement.cta}<ArrowRight size={14} aria-hidden="true" /></>;
  return <div className="announcement"><span>{site.announcement.text}</span><span aria-hidden="true" className="announcement-dot">·</span>{url ? <a href={url} target="_blank" rel="noopener noreferrer">{cta}</a> : <button type="button" onClick={whatsappSoon}>{cta}</button>}</div>;
}

function OrderButton({ className = "" }: { className?: string }) {
  const { count, setOpen } = useOrder();
  return <button type="button" className={`order-button ${className}`} onClick={() => setOpen(true)} aria-label={`${site.header.order}, ${site.order.count(count)}`}>
    <ShoppingBag size={19} strokeWidth={1.6} aria-hidden="true" /><span className="order-button-label">{site.header.order}</span><span className="order-count" aria-hidden="true">{count}</span>
  </button>;
}

function Header({ onMenu, onSearch }: { onMenu: () => void; onSearch: () => void }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = window.scrollY, ticking = false;
    function update() {
      const y = window.scrollY;
      if (Math.abs(y - last) > 6) { setHidden(y > last && y > 160); last = y; }
      ticking = false;
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return <header className={`site-header ${hidden ? "is-hidden" : ""}`} onFocus={() => setHidden(false)}>
    <div className="header-cells">
      <div className="header-cell header-left">
        <button type="button" className="header-action" onClick={onMenu} aria-haspopup="dialog"><Menu size={20} strokeWidth={1.6} aria-hidden="true" /><span>{site.header.shop}</span></button>
      </div>
      <div className="header-cell header-center"><Brand /></div>
      <div className="header-cell header-right">
        <Link to={finderPath} className="header-action header-finder">{site.header.finder}</Link>
        <button type="button" className="header-action header-search" onClick={onSearch} aria-label={site.header.search} aria-haspopup="dialog"><Search size={19} strokeWidth={1.6} aria-hidden="true" /></button>
        <OrderButton className="header-action" />
        <button type="button" className="header-action header-menu-mobile" onClick={onMenu} aria-label={site.header.openMenu} aria-haspopup="dialog"><Menu size={22} strokeWidth={1.6} aria-hidden="true" /></button>
      </div>
    </div>
  </header>;
}

function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useDialog(open, onClose);
  const { categories } = useOrganization();
  if (!open) return null;
  return <div className="overlay search-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div ref={ref} className="search-sheet" role="dialog" aria-modal="true" aria-label={site.search.title}>
      <div className="search-sheet-inner">
        <div className="sheet-top"><p className="sheet-title">{site.search.title}</p><button type="button" className="icon-button" onClick={onClose} aria-label={site.search.close}><X size={22} strokeWidth={1.5} /></button></div>
        <SearchForm onDone={onClose} big id="overlay-search" />
        <p className="search-browse">{site.search.browse}</p>
        <div className="chip-row">{categories.map(c => <Link key={c.id} to={`/${c.path}`} className="chip" onClick={onClose}>{c.shortLabel}</Link>)}</div>
      </div>
    </div>
  </div>;
}

function MenuBrands({ category, subBrands, brandPath, onClose }: { category: PublicCategory; subBrands: ReturnType<typeof useOrganization>["subBrands"]; brandPath: (t: string, b: string) => string; onClose: () => void }) {
  return <ul className="menu-brands">
    <li><Link to={`/${category.path}`} onClick={onClose} className="menu-brand menu-brand-all">{site.menu.seeAll}<ArrowRight size={16} aria-hidden="true" /></Link></li>
    {category.brands.map(b => {
      const subs = subBrands(b, category.id);
      const path = brandPath(category.id, b);
      return <li key={b}><Link to={path} onClick={onClose} className="menu-brand">{cleanTitle(b)}</Link>
        {subs.length > 0 && <ul className="menu-subs">{subs.map(s => <li key={s.id}><Link to={`${path}?${new URLSearchParams({ linea: s.id })}`} onClick={onClose}>{cleanTitle(s.name)}</Link></li>)}</ul>}
      </li>;
    })}
  </ul>;
}

function FullMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useDialog(open, onClose);
  const { categories, subBrands, brandPath } = useOrganization();
  const settings = useSettings();
  const [active, setActive] = useState<string>("");
  const [expanded, setExpanded] = useState<string>("");
  useEffect(() => { if (open) { setActive(categories[0]?.id || ""); setExpanded(""); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!open) return null;
  const current = categories.find(c => c.id === active) || categories[0];
  return <div ref={ref} className="overlay full-menu" role="dialog" aria-modal="true" aria-labelledby="menu-title">
    <div className="menu-top">
      <button type="button" className="header-action" onClick={onClose}><X size={20} strokeWidth={1.6} aria-hidden="true" /><span>{site.menu.close}</span></button>
      <p id="menu-title" className="sr-only">{site.menu.title}</p>
      <Brand />
      <span className="menu-top-spacer" />
    </div>
    <div className="menu-body">
      <div className="menu-search-mobile"><SearchForm onDone={onClose} id="menu-search" /></div>
      <nav aria-label={site.menu.title} className="menu-nav">
        <ol className="menu-list">
          {categories.map((c, i) => <li key={c.id} className={`menu-item ${current?.id === c.id ? "is-active" : ""}`} onMouseEnter={() => setActive(c.id)}>
            <div className="menu-row">
              <Link to={`/${c.path}`} onClick={onClose} onFocus={() => setActive(c.id)} className="menu-link"><span className="menu-index" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>{c.shortLabel}</Link>
              {c.brands.length > 0 && <button type="button" className="menu-toggle" aria-expanded={expanded === c.id} aria-controls={`menu-brands-${c.id}`} aria-label={`${site.menu.brandsOf} ${c.shortLabel}`} onClick={() => setExpanded(expanded === c.id ? "" : c.id)}><ChevronDown size={22} strokeWidth={1.5} /></button>}
            </div>
            <div id={`menu-brands-${c.id}`} className="menu-brands-mobile" hidden={expanded !== c.id}><MenuBrands category={c} subBrands={subBrands} brandPath={brandPath} onClose={onClose} /></div>
          </li>)}
        </ol>
        <div className="menu-aside">
          {current && <div className="menu-panel"><p className="menu-panel-title">{site.menu.brandsOf} {current.shortLabel}</p><MenuBrands category={current} subBrands={subBrands} brandPath={brandPath} onClose={onClose} /></div>}
          <EditorialImage name="menu" className="menu-photo" />
        </div>
      </nav>
    </div>
    <div className="menu-foot">
      <Link to="/promociones" onClick={onClose} className="menu-foot-link">{site.menu.promotions}</Link>
      <Link to={finderPath} onClick={onClose} className="menu-foot-link"><span className="menu-foot-lead">{site.menu.finderLead}</span> {site.menu.finder}<ArrowRight size={16} aria-hidden="true" /></Link>
      <WhatsApp settings={settings} className="menu-foot-link">{site.menu.whatsapp}</WhatsApp>
    </div>
  </div>;
}

function Footer() {
  const { categories } = useOrganization();
  const settings = useSettings();
  const url = whatsappUrl(settings.whatsappNumber);
  return <footer className="footer">
    <div className="footer-inner">
      <div className="footer-cols">
        <div className="footer-about"><p>{settings.cleanDescription}</p></div>
        <nav aria-label={site.footer.shop}><h2>{site.footer.shop}</h2><ul>{categories.map(c => <li key={c.id}><Link to={`/${c.path}`}>{c.shortLabel}</Link></li>)}<li><Link to="/catalogo">{site.menu.seeAll}</Link></li></ul></nav>
        <nav aria-label={site.footer.help}><h2>{site.footer.help}</h2><ul><li><Link to={finderPath}>{site.footer.finder}</Link></li><li><Link to="/#como-funciona">{site.footer.howTo}</Link></li><li><Link to="/promociones">{site.footer.promotions}</Link></li></ul></nav>
        <div><h2>{site.footer.contact}</h2><ul>
          <li><WhatsApp settings={settings} className="footer-whatsapp">{url ? formatWhatsAppNumber(settings.whatsappNumber) : site.footer.whatsappSoon}</WhatsApp></li>
          <li><span>{site.footer.country}</span></li>
          <li><span>{site.footer.delivery}</span></li>
        </ul></div>
      </div>
      <p className="footer-wordmark" aria-hidden="true">cuccioli<span>.</span></p>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} {settings.businessName}. {site.footer.madeWith}</span></div>
    </div>
  </footer>;
}

function MobileBar() {
  const settings = useSettings();
  const { count, setOpen } = useOrder();
  return <div className="mobile-bar">
    <button type="button" className="mobile-bar-order" onClick={() => setOpen(true)} aria-label={`${site.mobileBar.order}, ${site.order.count(count)}`}><ShoppingBag size={19} strokeWidth={1.6} aria-hidden="true" />{site.mobileBar.order}<span className="order-count" aria-hidden="true">{count}</span></button>
    <WhatsApp settings={settings} className="mobile-bar-whatsapp">{site.mobileBar.whatsapp}</WhatsApp>
  </div>;
}

function OrderLive() {
  const { count } = useOrder();
  const first = useRef(true);
  const [text, setText] = useState("");
  useEffect(() => { if (first.current) { first.current = false; return; } setText(site.order.count(count)); }, [count]);
  return <p className="sr-only" aria-live="polite" role="status">{text}</p>;
}

export function PublicLayout() {
  const catalog = useCatalog();
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => { const timer = setInterval(() => tick(n => n + 1), 30000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (location.hash) { document.getElementById(location.hash.slice(1))?.scrollIntoView(); return; }
    window.scrollTo(0, 0);
  }, [location.pathname, location.search, location.hash, catalog.data === null]);
  return <CatalogContext.Provider value={catalog}>
    <OrderProvider>
      <a href="#contenido" className="skip-link">{site.skip}</a>
      <Announcement />
      <Header onMenu={() => setMenu(true)} onSearch={() => setSearch(true)} />
      <main id="contenido" tabIndex={-1}>
        {catalog.error && <div className="page-pad"><div className="notice error" role="alert">{catalog.error}<button onClick={() => void catalog.refresh()}>Reintentar</button></div></div>}
        <Outlet />
      </main>
      <Footer />
      <MobileBar />
      <OrderLive />
      <FullMenu open={menu} onClose={() => setMenu(false)} />
      <SearchOverlay open={search} onClose={() => setSearch(false)} />
    </OrderProvider>
  </CatalogContext.Provider>;
}

