"use client";
import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AdminBrands, AdminCategories } from "./cuccioli-taxonomy";
import { AdminLogin, AdminLayout, AdminProducts, ProductEditor, AdminPromotions, AdminSettings } from "./cuccioli-admin";
import { PublicLayout } from "./public/layout";
import { Home } from "./public/home";
import { CatalogPage, NotFound, PromotionsPage } from "./public/catalog";
import { ProductPage } from "./public/product";
import { FinderPage } from "./public/finder";
import { NoIndexOutlet } from "./public/robots";
import { site } from "@/content/site";

// El admin importa Brand desde este módulo.
export { Brand } from "./public/ui";
export { ProductCard } from "./public/product-card";

export default function Cuccioli() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return <div className="boot-screen" aria-label="Cargando Cuccioli"><strong>cuccioli<span>.</span></strong><span>{site.loading}</span></div>;
  return <BrowserRouter>
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/catalogo" element={<CatalogPage />} />
        <Route path="/promociones" element={<PromotionsPage />} />
        {/* Las rutas fijas ganan a /:category/:brand en React Router 6. */}
        <Route path="/producto/:id" element={<ProductPage />} />
        <Route path="/encontra-su-comida" element={<FinderPage />} />
        <Route path="/:category" element={<CatalogPage />} />
        <Route path="/:category/:brand" element={<CatalogPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      {/* Rutas privadas: sin enlaces públicos y con noindex. */}
      <Route element={<NoIndexOutlet />}>
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route path="dashboard" element={<Navigate to="/admin/productos" replace />} />
        <Route path="productos" element={<AdminProducts />} />
        <Route path="productos/nuevo" element={<ProductEditor />} />
        <Route path="productos/:id" element={<ProductEditor />} />
        <Route path="promociones" element={<AdminPromotions />} />
        <Route path="configuracion" element={<AdminSettings />} />
        <Route path="marcas" element={<AdminBrands />} />
        <Route path="categorias" element={<AdminCategories />} />
      </Route>
      </Route>
    </Routes>
    <Toaster containerAriaLabel="Notificaciones" position="bottom-right" richColors closeButton={false} toastOptions={{ className: "cuccioli-toast" }} />
  </BrowserRouter>;
}
