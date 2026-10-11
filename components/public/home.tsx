"use client";
import { useMemo, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Check, Cat, Dog, Droplets, Package, PawPrint, Pill } from "lucide-react";
import { defaultSettings, promotionActive, type Product } from "@/lib/catalog";
import { brandFamily, cleanTitle } from "@/lib/display";
import { finderPath, finderUrl } from "@/lib/routes";
import { site } from "@/content/site";
import { usePublic, useOrganization, useSettings, withPhotos } from "./context";
import { ProductCard } from "./product-card";
import { Cta, EditorialImage, Headline, HeroCrop, PackShot, ProductImage, Reg, Reveal, WhatsApp } from "./ui";

const categoryIcons: Record<string, typeof Dog> = { dog: Dog, cat: Cat, litter: Package, medicine: Pill, care: Droplets, paw: PawPrint };

function Hero() {
  const settings = useSettings();
  const title = settings.tagline === defaultSettings.tagline || !settings.cleanTagline ? site.hero.defaultTitle : settings.cleanTagline;
  return <section className="hero" aria-labelledby="hero-title">
    <div className="hero-media"><img src="/cuccioli-hero.webp" alt={site.hero.imageAlt} width="1536" height="1024" fetchPriority="high" decoding="async" /></div>
    <div className="hero-copy">
      <Headline as="h1" id="hero-title" text={title} className="hero-title" />
      <p className="hero-sub">{site.hero.subtitle}</p>
      <div className="hero-actions">
        <Cta to="/catalogo" variant="dark">{site.hero.cta}</Cta>
        <Link to={finderPath} className="text-cta">{site.hero.secondary}<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" /></Link>
      </div>
    </div>
  </section>;
}

function Audience() {
  const { categories } = useOrganization();
  const has = (id: string) => categories.some(c => c.id === id);
  const o = site.audience.options;
  const dogs = [{ label: o.puppy, to: finderUrl({ para: "perro", etapa: "cachorro" }) }, { label: o.adultDog, to: finderUrl({ para: "perro", etapa: "adulto" }) }, { label: o.seniorDog, to: finderUrl({ para: "perro", etapa: "senior" }) }];
  const cats = [{ label: o.kitten, to: finderUrl({ para: "gato", etapa: "cachorro" }) }, { label: o.adultCat, to: finderUrl({ para: "gato", etapa: "adulto" }) }];
  const others = categories.filter(c => c.id !== "dog" && c.id !== "cat");
  return <section className="section audience" aria-labelledby="audience-title">
    <Reveal className="audience-intro">
      <Headline id="audience-title" text={site.audience.title} className="display-2" />
      <p className="lead">{site.audience.lead}</p>
      <EditorialImage name="audience" className="audience-photo" fallback={<HeroCrop focus={[45, 62]} zoom={2.6} className="audience-photo" />} />
    </Reveal>
    <Reveal className="audience-groups">
      {has("dog") && <div className="audience-group"><p className="group-label"><Dog size={18} strokeWidth={1.5} aria-hidden="true" />{site.audience.dogs}</p><div className="need-row">{dogs.map(d => <Link key={d.label} to={d.to} className="need">{d.label}<ArrowUpRight size={18} strokeWidth={1.5} aria-hidden="true" /></Link>)}</div></div>}
      {has("cat") && <div className="audience-group"><p className="group-label"><Cat size={18} strokeWidth={1.5} aria-hidden="true" />{site.audience.cats}</p><div className="need-row">{cats.map(d => <Link key={d.label} to={d.to} className="need">{d.label}<ArrowUpRight size={18} strokeWidth={1.5} aria-hidden="true" /></Link>)}</div></div>}
      {others.length > 0 && <div className="audience-group"><p className="group-label"><PawPrint size={18} strokeWidth={1.5} aria-hidden="true" />{site.audience.more}</p><div className="need-row">{others.map(c => { const Icon = categoryIcons[c.icon] || PawPrint; return <Link key={c.id} to={`/${c.path}`} className="need need-category"><Icon size={18} strokeWidth={1.5} aria-hidden="true" />{c.shortLabel}<ArrowUpRight size={18} strokeWidth={1.5} aria-hidden="true" /></Link>; })}</div></div>}
    </Reveal>
  </section>;
}

function CategoryList({ products }: { products: Product[] }) {
  const { categories } = useOrganization();
  const rows = categories.map(c => {
    const items = products.filter(p => p.petType === c.id);
    return { c, count: items.length, image: withPhotos(items)[0] };
  });
  return <section className="section catlist" aria-labelledby="catlist-title">
    <div className="section-head"><Headline id="catlist-title" text={site.categories.title} className="display-2" /><Link to="/catalogo" className="text-cta">{site.categories.seeAll}<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" /></Link></div>
    <ol className="catlist-list">
      {rows.map(({ c, count, image }, i) => <li key={c.id}>
        <Link to={`/${c.path}`} className="catlist-row">
          <span className="catlist-index" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
          {image && <span className="catlist-thumb" aria-hidden="true"><ProductImage product={image} size={160} /></span>}
          <span className="catlist-name">{c.shortLabel}</span>
          <span className="catlist-count">{site.categories.products(count)}</span>
          <ArrowUpRight className="catlist-arrow" size={28} strokeWidth={1.25} aria-hidden="true" />
          {image && <span className="catlist-float" aria-hidden="true"><ProductImage product={image} size={360} /></span>}
        </Link>
      </li>)}
    </ol>
  </section>;
}

function Figures({ products }: { products: Product[] }) {
  const brands = new Set(products.map(p => brandFamily(p.brand))).size;
  const items = [{ n: products.length, label: site.figures.products }, { n: brands, label: site.figures.brands }, { n: 1, label: site.figures.message }];
  return <section className="figures" aria-label={site.figures.title}>
    <div className="figures-grid">{items.map(f => <Reveal key={f.label} className="figure"><span className="figure-n">{f.n}</span><span className="figure-label">{f.label}</span></Reveal>)}</div>
    <p className="figures-note">{site.figures.note}</p>
  </section>;
}

const stepPhotos = ["step1", "step2", "step3"] as const;

function Steps() {
  return <section className="steps" id="como-funciona" aria-labelledby="steps-title">
    <div className="steps-inner">
      <Headline id="steps-title" text={site.steps.title} className="impact" />
      <ol className="steps-list">{site.steps.items.map((s, i) => <Reveal as="li" key={s.title} className="step"><EditorialImage name={stepPhotos[i]} className="step-photo" /><span className="step-n" aria-hidden="true">{i + 1}</span><h3>{s.title}</h3><p>{s.text}</p></Reveal>)}</ol>
    </div>
  </section>;
}

function Marquee({ products }: { products: Product[] }) {
  const { brandPath, taxonomy } = useOrganization();
  const brands = useMemo(() => {
    // Las marcas destacadas (featured) van primero.
    const featured = new Set(taxonomy.brands.filter(b => b.featured).map(b => brandFamily(b.name)));
    const seen = new Map<string, { name: string; product?: Product; count: number; brand: string; type: string }>();
    for (const p of withPhotos(products)) {
      const key = brandFamily(p.brand);
      const entry = seen.get(key) || { name: cleanTitle(p.brand).replace(/\s+Alimento.*$/i, ""), product: p, count: 0, brand: p.brand, type: p.petType };
      entry.count++;
      seen.set(key, entry);
    }
    return [...seen.entries()].sort(([ka, a], [kb, b]) => Number(featured.has(kb)) - Number(featured.has(ka)) || b.count - a.count).map(([, v]) => v);
  }, [products, taxonomy]);
  if (!brands.length) return null;
  const track = (hidden: boolean) => <div className="marquee-track" aria-hidden={hidden || undefined}>{brands.map(b => <span className="marquee-item" key={b.name}><span className="marquee-word"><Reg text={b.name} /></span>{b.product && <PackShot product={b.product} className="marquee-pack" size={200} />}</span>)}</div>;
  return <section className="marquee" aria-label={site.marquee.label}>
    <ul className="sr-only">{brands.map(b => <li key={b.name}><Link to={brandPath(b.type, b.brand)}>{b.name}</Link></li>)}</ul>
    <div className="marquee-window" aria-hidden="true" style={{ "--marquee-duration": `${Math.max(30, brands.length * 5)}s` } as CSSProperties}>{track(false)}{track(true)}</div>
  </section>;
}

function Promotions({ products }: { products: Product[] }) {
  const promos = products.filter(p => promotionActive(p)).slice(0, 4);
  if (promos.length) return <section className="section promos" aria-labelledby="promos-title">
    <div className="section-head"><div><p className="kicker">{site.promotions.eyebrow}</p><h2 id="promos-title" className="display-2">{site.promotions.title}</h2></div><Link to="/promociones" className="text-cta">{site.promotions.link}<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" /></Link></div>
    <div className="card-grid">{promos.map(p => <ProductCard key={p.id} product={p} />)}</div>
  </section>;
  // Sin promociones: banda con una composición de empaques reales.
  const picks: Product[] = [];
  for (const p of withPhotos(products)) if (!picks.some(x => x.petType === p.petType) && picks.length < 3) picks.push(p);
  return <section className="section promo-band-wrap" aria-labelledby="promos-title">
    <Reveal className="promo-band">
      <div className="promo-band-copy"><h2 id="promos-title" className="display-3">{site.promotions.emptyTitle}</h2><p>{site.promotions.emptyText}</p><Link to="/promociones" className="text-cta">{site.promotions.link}<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" /></Link></div>
      <div className="promo-band-art stack" aria-hidden="true">{picks.map(p => <ProductImage key={p.id} product={p} size={280} className="packshot" />)}</div>
    </Reveal>
  </section>;
}

function Compare() {
  const c = site.compare;
  return <section className="section compare" aria-labelledby="compare-title">
    <h2 id="compare-title" className="display-2 compare-title">{c.ours} <span aria-hidden="true">/</span> <s>{c.theirs}</s></h2>
    <div className="compare-layout">
    <EditorialImage name="compare" className="compare-photo" />
    <Reveal>
      <table className="compare-table">
        <thead><tr><th scope="col">{c.ours}</th><th scope="col">{c.theirs}</th></tr></thead>
        <tbody>{c.rows.map(r => <tr key={r.ours}><td><Check size={20} strokeWidth={1.75} aria-hidden="true" />{r.ours}</td><td><s>{r.theirs}</s></td></tr>)}</tbody>
      </table>
    </Reveal>
    </div>
  </section>;
}

function Closing() {
  const settings = useSettings();
  return <section className="closing" aria-labelledby="closing-title">
    <div className="closing-inner">
      <EditorialImage name="closing" className="closing-photo" fallback={<HeroCrop focus={[62, 27]} zoom={3.2} className="closing-photo" />} />
      <div className="closing-copy">
        <Headline id="closing-title" text={site.closing.title} className="impact" />
        <p>{site.closing.text}</p>
        <div className="closing-actions"><Cta to={finderPath}>{site.closing.finder}</Cta><WhatsApp settings={settings} cta="outline-light">{site.closing.whatsapp}</WhatsApp></div>
      </div>
    </div>
  </section>;
}

export function Home() {
  const { data } = usePublic();
  const products = data?.products || [];
  return <>
    <Hero />
    <Audience />
    {data && <CategoryList products={products} />}
    {data && <Figures products={products} />}
    <Steps />
    {data && <Marquee products={products} />}
    {data && <Promotions products={products} />}
    <Compare />
    <Closing />
  </>;
}
