"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { money, type Product } from "@/lib/catalog";
import { cleanTitle } from "@/lib/display";
import { addLine, loadOrder, MAX_QTY, ORDER_KEY, orderWhatsAppUrl, parseOrder, refreshLines, removeLine, resolveOrder, saveOrder, setQuantity, type OrderLine, type ResolvedOrder } from "@/lib/order";
import { productPath } from "@/lib/routes";
import { site } from "@/content/site";
import { usePublic, useSettings } from "./context";
import { Cta, ProductImage, WhatsAppIcon, useDialog, whatsappSoon } from "./ui";

type OrderState = {
  lines: OrderLine[];
  order: ResolvedOrder | null;
  count: number;
  open: boolean;
  setOpen: (open: boolean) => void;
  add: (product: Product, variantId: string, quantity?: number) => void;
  update: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  commit: (lines: OrderLine[]) => void;
};
const OrderContext = createContext<OrderState | null>(null);
export function useOrder() { return useContext(OrderContext)!; }

export function OrderProvider({ children }: { children: ReactNode }) {
  const { data } = usePublic();
  const [lines, setLines] = useState<OrderLine[]>(() => loadOrder());
  const [open, setOpen] = useState(false);
  const commit = useCallback((next: OrderLine[]) => { setLines(next); saveOrder(next); }, []);
  // Sincroniza el pedido entre pestañas abiertas.
  useEffect(() => {
    const sync = (e: StorageEvent) => { if (e.key === ORDER_KEY) setLines(parseOrder(e.newValue)); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const order = useMemo(() => data ? resolveOrder(lines, data.products) : null, [lines, data]);
  const count = order ? order.count : lines.reduce((n, l) => n + l.quantity, 0);
  const add = useCallback((product: Product, variantId: string, quantity = 1) => {
    setLines(prev => { const next = addLine(prev, product, variantId, quantity); saveOrder(next); return next; });
    const size = product.variants.find(v => v.id === variantId)?.size;
    toast.success(site.card.added, { description: `${product.name}${size ? ` · ${size}` : ""}`, action: { label: site.order.view, onClick: () => setOpen(true) } });
  }, []);
  const update = useCallback((key: string, quantity: number) => setLines(prev => { const next = setQuantity(prev, key, quantity); saveOrder(next); return next; }), []);
  const remove = useCallback((key: string) => setLines(prev => { const next = removeLine(prev, key); saveOrder(next); return next; }), []);
  const clear = useCallback(() => commit([]), [commit]);
  const value = useMemo(() => ({ lines, order, count, open, setOpen, add, update, remove, clear, commit }), [lines, order, count, open, add, update, remove, clear, commit]);
  return <OrderContext.Provider value={value}>{children}<OrderPanel /></OrderContext.Provider>;
}

function OrderPanel() {
  const { order, count, open, setOpen, update, remove, clear, commit } = useOrder();
  const settings = useSettings();
  const ref = useDialog(open, () => setOpen(false));
  const [notices, setNotices] = useState<string[]>([]);
  const wasOpen = useRef(open);
  useEffect(() => { if (open && !wasOpen.current) setNotices([]); wasOpen.current = open; }, [open]);
  if (!open) return null;
  const close = () => setOpen(false);

  // Al enviar se recalcula con el catálogo actual. Si algo cambió, se avisa y se
  // actualiza el pedido; el cliente revisa y vuelve a tocar "Enviar".
  function send() {
    if (!order) return;
    const next: string[] = [];
    if (order.removed.length) next.push(...order.removed.map(l => site.order.removed(l.name || site.order.title)));
    if (order.priceChanged) next.push(site.order.pricesUpdated);
    if (next.length) { setNotices(next); commit(refreshLines(order)); return; }
    const url = orderWhatsAppUrl(settings.whatsappNumber, order);
    if (!url) { whatsappSoon(); return; }
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) window.location.assign(url);
  }

  const items = order?.items || [];
  return <div className="overlay order-overlay" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
    <div ref={ref} className="order-panel" role="dialog" aria-modal="true" aria-labelledby="order-title">
      <div className="order-head"><h2 id="order-title">{site.order.title}{count > 0 && <span className="order-head-count">{count}</span>}</h2><button type="button" className="icon-button" onClick={close} aria-label={site.order.close}><X size={22} strokeWidth={1.5} /></button></div>
      <div className="order-notices" aria-live="polite">{notices.map(n => <p key={n} className="order-notice">{n}</p>)}</div>
      {!items.length ? <div className="order-empty"><p className="order-empty-title">{site.order.emptyTitle}</p><p>{site.order.emptyText}</p><Cta to="/catalogo" onClick={close}>{site.hero.cta}</Cta></div> : <>
        <ul className="order-items">{items.map(i => <li key={i.key} className="order-item">
          <Link to={productPath(i.product.id)} onClick={close} className="order-thumb" tabIndex={-1} aria-hidden="true"><ProductImage product={i.product} size={120} /></Link>
          <div className="order-item-body">
            <p className="order-item-brand">{cleanTitle(i.product.brand)}</p>
            <Link to={productPath(i.product.id)} onClick={close} className="order-item-name">{i.product.name}</Link>
            <p className="order-item-size">{i.variant.size}</p>
            <div className="order-item-row">
              <div className="qty qty-small" role="group" aria-label={site.order.quantityOf(i.product.name)}>
                <button type="button" onClick={() => update(i.key, i.quantity - 1)} aria-label={site.order.decrease}><Minus size={14} aria-hidden="true" /></button>
                <input type="number" inputMode="numeric" min={1} max={MAX_QTY} value={i.quantity} aria-label={site.order.quantityOf(i.product.name)} onChange={e => { const n = Math.floor(Number(e.target.value)); if (n >= 1) update(i.key, n); }} />
                <button type="button" onClick={() => update(i.key, i.quantity + 1)} disabled={i.quantity >= MAX_QTY} aria-label={site.order.increase}><Plus size={14} aria-hidden="true" /></button>
              </div>
              <div className="order-item-price">{i.consult ? <span className="order-consult">{site.order.consult}</span> : <><strong>{money(i.total)}</strong>{i.quantity > 1 && <small>{site.order.each(money(i.unitPrice))}</small>}</>}</div>
            </div>
            <button type="button" className="order-remove" onClick={() => remove(i.key)}>{site.order.remove}</button>
          </div>
        </li>)}</ul>
        <div className="order-foot">
          {order && order.subtotal > 0 && <div className="order-subtotal"><span>{site.order.subtotal}</span><strong>{money(order.subtotal)}</strong></div>}
          {order && order.consultCount > 0 && <p className="order-note">{site.order.subtotalNote}</p>}
          <button type="button" className="cta cta-dark order-send" onClick={send}><span className="cta-label"><WhatsAppIcon />{site.order.send}</span><span className="cta-arrow" aria-hidden="true"><ArrowRight size={18} strokeWidth={1.75} /></span></button>
          <button type="button" className="order-clear" onClick={clear}>{site.order.clear}</button>
        </div>
      </>}
    </div>
  </div>;
}
