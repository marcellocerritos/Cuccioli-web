"use client";
import { useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Cat, Dog, RotateCcw } from "lucide-react";
import { whatsappUrl } from "@/lib/catalog";
import { cleanTitle } from "@/lib/display";
import { categoryForPet, currentStep, finderSteps, helpMessage, parseAnswers, rankProducts, type FinderAnswers, type FinderStep, type Reason } from "@/lib/finder";
import { site } from "@/content/site";
import { usePublic, useOrganization, useSettings } from "./context";
import { LoadingCards, ProductCard } from "./product-card";
import { useTitle } from "./catalog";
import { EditorialImage, WhatsApp } from "./ui";
import type { EditorialKey } from "@/content/editorial";

const order: FinderStep[] = ["para", "etapa", "tamano", "marca"];
const f = site.finder;
const sizeLabels: Record<string, string> = { pequeno: f.size.small, mediano: f.size.medium, grande: f.size.large, nose: f.size.unknown };
const breedLabels: Record<string, string> = { pequeno: f.reasons.smallBreed, mediano: f.reasons.mediumBreed, grande: f.reasons.largeBreed };

export function FinderPage() {
  const [params, setParams] = useSearchParams();
  const { data } = usePublic();
  const settings = useSettings();
  const { categories, taxonomy } = useOrganization();
  const answers = parseAnswers(params);
  const step = currentStep(answers);
  const steps = finderSteps(answers);
  const index = step === "resultados" ? steps.length : steps.indexOf(step);
  const heading = useRef<HTMLHeadingElement>(null);
  useTitle(f.title);
  useEffect(() => { heading.current?.focus(); }, [step]);

  function answer(key: FinderStep, value: string) {
    const next = new URLSearchParams();
    for (const k of order) { if (k === key) { next.set(k, value); break; } const v = answers[k]; if (v) next.set(k, v); }
    setParams(next);
  }
  function back() {
    const answered = order.filter(k => answers[k]);
    const next = new URLSearchParams();
    answered.slice(0, -1).forEach(k => next.set(k, answers[k]!));
    setParams(next);
  }
  const stageLabel = (s: string) => s === "cachorro" ? (answers.para === "gato" ? f.stage.kitten : f.stage.puppy) : s === "adulto" ? f.stage.adult : f.stage.senior;
  const brands = useMemo(() => {
    if (!answers.para || !data) return [];
    const cat = categoryForPet(answers.para);
    const ids = new Set(data.products.filter(p => p.petType === cat && p.brandId).map(p => p.brandId!));
    return taxonomy.brands.filter(b => b.active && ids.has(b.id));
  }, [answers.para, data, taxonomy]);
  const shortcuts = categories.filter(c => ["litter", "medicine", "care"].includes(c.id));

  return <div className="finder">
    <div className="finder-top">
      <div className="finder-progress" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={index} aria-label={f.title}><span style={{ width: `${(index / steps.length) * 100}%` }} /></div>
      <div className="finder-nav">
        {index > 0 ? <button type="button" className="text-cta" onClick={back}><ArrowLeft size={18} aria-hidden="true" />{f.back}</button> : <span />}
        <p className="finder-step">{step === "resultados" ? f.title : f.step(index + 1, steps.length)}</p>
        {index > 0 ? <button type="button" className="text-cta finder-restart" onClick={() => setParams({})}><RotateCcw size={16} aria-hidden="true" /><span className="finder-restart-label">{f.restart}</span></button> : <span />}
      </div>
    </div>
    <div className="finder-body" key={step}>
      {step === "para" && <Question ref={heading} title={f.pet.question} photo="finderPara">
        <div className="finder-options">
          <Option onClick={() => answer("para", "perro")} icon={<Dog size={28} strokeWidth={1.25} />} label={f.pet.dog} />
          <Option onClick={() => answer("para", "gato")} icon={<Cat size={28} strokeWidth={1.25} />} label={f.pet.cat} />
        </div>
        {shortcuts.length > 0 && <div className="finder-shortcuts"><p className="kicker">{f.pet.shortcuts}</p><div className="chip-row">{shortcuts.map(c => <Link key={c.id} to={`/${c.path}`} className="chip">{c.shortLabel}</Link>)}</div></div>}
      </Question>}
      {step === "etapa" && <Question ref={heading} title={f.stage.question} photo="finderEtapa">
        <div className="finder-options">{(["cachorro", "adulto", "senior"] as const).map(s => <Option key={s} onClick={() => answer("etapa", s)} label={stageLabel(s)} hint={s === "senior" ? f.stage.seniorHint : undefined} />)}</div>
      </Question>}
      {step === "tamano" && <Question ref={heading} title={f.size.question} photo="finderTamano">
        <div className="finder-options">{(["pequeno", "mediano", "grande", "nose"] as const).map(s => <Option key={s} onClick={() => answer("tamano", s)} label={sizeLabels[s]} />)}</div>
      </Question>}
      {step === "marca" && <Question ref={heading} title={f.brand.question} photo="finderMarca">
        <div className="finder-options">{brands.map(b => <Option key={b.id} onClick={() => answer("marca", b.id)} label={cleanTitle(b.name)} />)}<Option onClick={() => answer("marca", "sin")} label={f.brand.none} /></div>
      </Question>}
      {step === "resultados" && <Results answers={answers} heading={heading} stageLabel={stageLabel} settingsNumber={settings.whatsappNumber} brandName={brands.find(b => b.id === answers.marca)?.name} />}
    </div>
  </div>;

  function Results({ answers, heading, stageLabel, settingsNumber, brandName }: { answers: FinderAnswers; heading: React.RefObject<HTMLHeadingElement | null>; stageLabel: (s: string) => string; settingsNumber: string; brandName?: string }) {
    if (!data) return <LoadingCards />;
    const result = rankProducts(data.products, answers);
    const label = (r: Reason) => r.kind === "stage" ? stageLabel(r.value!) : r.kind === "allStages" ? f.reasons.allStages : r.kind === "size" ? breedLabels[r.value!] : r.kind === "allSizes" ? f.reasons.allSizes : r.kind === "anySize" ? f.reasons.anySize : cleanTitle(r.value);
    const summary = [answers.para === "perro" ? f.pet.dog : f.pet.cat, answers.etapa && stageLabel(answers.etapa), answers.tamano && sizeLabels[answers.tamano], brandName ? cleanTitle(brandName) : answers.marca === "sin" ? f.brand.none : ""].filter(Boolean);
    const text = helpMessage(answers, f.helpText, answers.tamano ? sizeLabels[answers.tamano].toLowerCase() : undefined, brandName ? cleanTitle(brandName) : undefined);
    const helpUrl = whatsappUrl(settingsNumber) ? `https://wa.me/${settingsNumber}?text=${encodeURIComponent(text)}` : null;
    const cat = categories.find(c => c.id === categoryForPet(answers.para!));
    return <section aria-labelledby="finder-results">
      <h1 id="finder-results" ref={heading} tabIndex={-1} className="finder-question">{f.results}</h1>
      <p className="finder-summary">{summary.join(" · ")}</p>
      {result.fallback && <p className="finder-fallback" role="status">{f.fallback}</p>}
      <div className="finder-help"><WhatsApp settings={settings} url={helpUrl} cta="dark">{f.help}</WhatsApp>{cat && <Link to={`/${cat.path}`} className="text-cta">{f.seeAll}</Link>}</div>
      <div className="card-grid">{result.matches.map((m, i) => <ProductCard key={m.product.id} product={m.product} eager={i < 4} note={m.reasons.map(label).join(" · ") || undefined} />)}</div>
    </section>;
  }
}

import { forwardRef, type ReactNode } from "react";
const Question = forwardRef<HTMLHeadingElement, { title: string; photo: EditorialKey; children: ReactNode }>(function Question({ title, photo, children }, ref) {
  return <section className="finder-step-body"><div className="finder-q"><h1 ref={ref} tabIndex={-1} className="finder-question">{title}</h1>{children}</div><EditorialImage name={photo} className="finder-photo" eager /></section>;
});

function Option({ onClick, label, icon, hint }: { onClick: () => void; label: string; icon?: ReactNode; hint?: string }) {
  return <button type="button" className="finder-option" onClick={onClick}>{icon && <span aria-hidden="true">{icon}</span>}<span className="finder-option-label">{label}</span>{hint && <small>{hint}</small>}</button>;
}
