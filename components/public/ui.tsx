"use client";
import { useEffect, useRef, useState, type ElementType, type ReactNode, type RefObject } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { whatsappUrl, type Product, type Settings } from "@/lib/catalog";
import { productImageUrl } from "@/lib/hosting";
import { productPlaceholder } from "@/lib/taxonomy";
import { splitLastWord } from "@/lib/display";
import { editorialPhotos, type EditorialKey } from "@/content/editorial";
import { site } from "@/content/site";

export function Brand({ small = false }: { small?: boolean }) {
  return <Link to="/" aria-label={site.header.home} className={`brand ${small ? "brand-small" : ""}`}>cuccioli<span className="brand-period">.</span></Link>;
}

// Titular con la última palabra en serif itálica ("…en un solo *lugar*").
export function Headline({ text, as: Tag = "h2", className = "", id }: { text: string; as?: ElementType; className?: string; id?: string }) {
  const { lead, last } = splitLastWord(text);
  return <Tag id={id} className={className}>{lead}<em className="serif">{last}</em></Tag>;
}

type CtaProps = { to?: string; href?: string; onClick?: () => void; variant?: "primary" | "dark" | "light" | "outline" | "outline-light"; icon?: ReactNode; children: ReactNode; className?: string; external?: boolean };
// Botón estilo Maev: rectangular, con una celda de flecha separada por una hairline.
export function Cta({ to, href, onClick, variant = "primary", icon, children, className = "", external }: CtaProps) {
  const body = <><span className="cta-label">{icon}{children}</span><span className="cta-arrow" aria-hidden="true"><ArrowRight size={18} strokeWidth={1.75} /></span></>;
  const cls = `cta cta-${variant} ${className}`;
  if (to) return <Link to={to} className={cls} onClick={onClick}>{body}</Link>;
  if (href) return <a href={href} className={cls} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{body}</a>;
  return <button type="button" className={cls} onClick={onClick}>{body}</button>;
}

export function whatsappSoon() { toast(site.whatsappSoon.title, { description: site.whatsappSoon.description }); }

export function WhatsAppIcon({ size = 19 }: { size?: number }) { return <MessageCircle size={size} className="whatsapp-icon" aria-hidden="true" />; }

// Enlace a WhatsApp con el mismo criterio de whatsappUrl. Si el número no es válido, avisa.
export function WhatsApp({ settings, product, variant, className = "", children, cta, url: customUrl }: { settings: Settings; product?: Product; variant?: Product["variants"][number]; className?: string; children: ReactNode; cta?: CtaProps["variant"]; url?: string | null }) {
  const url = customUrl !== undefined ? customUrl : whatsappUrl(settings.whatsappNumber, product, variant);
  if (cta) return url ? <Cta href={url} external variant={cta} icon={<WhatsAppIcon />} className={className}>{children}</Cta> : <Cta onClick={whatsappSoon} variant={cta} icon={<WhatsAppIcon />} className={className}>{children}</Cta>;
  return url
    ? <a href={url} target="_blank" rel="noopener noreferrer" className={`whatsapp-link ${className}`}><WhatsAppIcon />{children}</a>
    : <button type="button" className={`whatsapp-link ${className}`} onClick={whatsappSoon}><WhatsAppIcon />{children}</button>;
}

// Pozo color avena: la foto con multiply hace "desaparecer" los fondos blancos.
export function ProductImage({ product, size = 480, eager = false, className = "" }: { product: Product; size?: number; eager?: boolean; className?: string }) {
  return <span className={`well ${className}`}><img src={productImageUrl(product.imageUrl || productPlaceholder)} alt={product.name} width={size} height={size} loading={eager ? "eager" : "lazy"} decoding="async" onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = productPlaceholder; }} /></span>;
}

export function PackShot({ product, className = "", size = 320 }: { product: Product; className?: string; size?: number }) {
  return <span className={`packshot ${className}`}><img src={productImageUrl(product.imageUrl || productPlaceholder)} alt="" width={size} height={size} loading="lazy" decoding="async" onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = productPlaceholder; }} /></span>;
}

// Recorte de la foto del hero (o una foto editorial futura si existe en public/editorial/).
export function EditorialImage({ name, fallback = null, className = "", eager = false }: { name: EditorialKey; fallback?: ReactNode; className?: string; eager?: boolean }) {
  const photo = editorialPhotos[name];
  if (!photo) return <>{fallback}</>;
  return <span className={`editorial ${className}`}><img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} loading={eager ? "eager" : "lazy"} decoding="async" style={photo.position ? { objectPosition: photo.position } : undefined} /></span>;
}

export function HeroCrop({ focus, zoom = 2.4, className = "", alt = "" }: { focus: [number, number]; zoom?: number; className?: string; alt?: string }) {
  // focus: punto (en % de la foto original 1536×1024) que queda al centro del recorte.
  return <span className={`hero-crop ${className}`} style={{ ["--fx" as string]: `${focus[0]}%`, ["--fy" as string]: `${focus[1]}%`, ["--zoom" as string]: zoom }}><img src="/cuccioli-hero.webp" alt={alt} width="1536" height="1024" loading="lazy" decoding="async" /></span>;
}

// Revelado suave al entrar en pantalla. Sin movimiento si el usuario lo pidió.
export function useReveal<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { el.classList.add("is-visible"); return; }
    el.classList.add("reveal");
    const io = new IntersectionObserver(entries => { for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); } }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

export function Reveal({ as: Tag = "div", className = "", children, ...rest }: { as?: ElementType; className?: string; children: ReactNode; [key: string]: unknown }) {
  const ref = useReveal<HTMLElement>();
  return <Tag ref={ref} className={className} {...rest}>{children}</Tag>;
}

const focusable = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
// Diálogo accesible: focus trap, Escape, bloqueo del scroll y retorno del foco.
export function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const root = ref.current;
    const first = root?.querySelector<HTMLElement>("[data-autofocus]") || root?.querySelector<HTMLElement>(focusable);
    first?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); close.current(); return; }
      if (e.key !== "Tab" || !root) return;
      const items = [...root.querySelectorAll<HTMLElement>(focusable)].filter(el => el.offsetParent !== null || el === document.activeElement);
      if (!items.length) return;
      const a = items[0], z = items[items.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = overflow; previous?.focus?.(); };
  }, [open]);
  return ref;
}

export function useMediaQuery(query: string) {
  const [match, setMatch] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => { const m = window.matchMedia(query); const on = () => setMatch(m.matches); on(); m.addEventListener("change", on); return () => m.removeEventListener("change", on); }, [query]);
  return match;
}

// En tamaños display, ® y ™ se achican y suben para no competir con el nombre.
export function Reg({ text }: { text: string }) {
  const parts = text.split(/([®™])/);
  return <>{parts.map((part, i) => part === "®" || part === "™" ? <sup key={i} className="reg">{part}</sup> : part)}</>;
}
