"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ImagePlus, Plus, X } from "lucide-react";
import { QuoteShell } from "@/widgets/quote/QuoteShell";
import { QuoteStepFooter } from "@/widgets/quote/QuoteStepFooter";
import { useQuoteFlowCopy } from "@/widgets/quote/quoteFlowCopy";
import styles from "@/widgets/quote/QuoteFlow.module.css";
import {
  ARTIST_REASONS,
  ARTIST_REASONS_MAX,
  sanitizeArtistReasons,
  sanitizeStyleLikes,
  STYLE_LIKES,
  type ArtistReason,
  type StyleLike,
} from "@/widgets/quote/quoteInspiration";
import {
  compressReferenceImage,
  loadReferenceImages,
  MAX_REFERENCE_IMAGES,
  saveReferenceImages,
  type QuoteReferenceImage,
} from "@/widgets/quote/quoteReferenceImages";
import { getQuoteDraft, saveQuoteDraft, type QuoteDraft } from "@/shared/lib/quoteDraft";
import { QUOTE_FLOW_PATHS } from "@/shared/lib/quoteFlow";
import { useQuoteOnboardingGate } from "@/widgets/quote/useQuoteOnboardingGate";
import { draftHasLocation } from "@/widgets/quote/quoteBodyLocation";

const EXTRA_NOTE_MAX = 400;

function toggle<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((value) => value !== item) : [...list, item];
}

/**
 * Paso 5 · Inspiración, en dos pantallas cortas:
 *  A) imágenes de referencia + qué le gusta del estilo
 *  B) por qué Malianteo + campo abierto
 */
export function QuoteReferenceStep() {
  const router = useRouter();
  const copy = useQuoteFlowCopy();
  const c = copy.inspiration;
  const reduceMotion = useReducedMotion();
  const gateReady = useQuoteOnboardingGate();
  const inputRef = useRef<HTMLInputElement>(null);
  const extraId = useId();

  const [screen, setScreen] = useState<0 | 1>(0);
  const [images, setImages] = useState<QuoteReferenceImage[]>(loadReferenceImages);
  const [processing, setProcessing] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [likes, setLikes] = useState<StyleLike[]>(() =>
    sanitizeStyleLikes(getQuoteDraft()?.styleLikes),
  );
  const [reasons, setReasons] = useState<ArtistReason[]>(() =>
    sanitizeArtistReasons(getQuoteDraft()?.artistReasons),
  );
  const [extra, setExtra] = useState(() => getQuoteDraft()?.notes ?? "");
  const [error, setError] = useState("");
  const [reasonsNotice, setReasonsNotice] = useState(false);

  useEffect(() => {
    if (!gateReady) return;
    const draft = getQuoteDraft();
    if (!draft?.size) {
      router.replace(QUOTE_FLOW_PATHS.quoteStart);
      return;
    }
    if (!draftHasLocation(draft)) router.replace(QUOTE_FLOW_PATHS.location);
  }, [gateReady, router]);

  const persist = (patch: Partial<QuoteDraft>) => {
    const current = getQuoteDraft();
    if (!current) return;
    saveQuoteDraft({ ...current, ...patch });
  };

  const goToScreen = (next: 0 | 1) => {
    setError("");
    setScreen(next);
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const onPickFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    const free = MAX_REFERENCE_IMAGES - images.length;
    if (free <= 0) {
      setUploadError(c.uploadLimit);
      return;
    }
    setUploadError(files.length > free ? c.uploadLimit : "");
    setProcessing(true);
    const next = [...images];
    for (const file of files.slice(0, free)) {
      try {
        next.push(await compressReferenceImage(file));
      } catch {
        setUploadError(c.uploadError);
      }
    }
    // Si el navegador no tiene espacio, se conserva lo que sí cupo.
    while (next.length > images.length && !saveReferenceImages(next)) {
      next.pop();
      setUploadError(c.uploadError);
    }
    setImages(next);
    persist({ referenceCount: next.length });
    setProcessing(false);
  };

  const removeImage = (id: string) => {
    const next = images.filter((image) => image.id !== id);
    saveReferenceImages(next);
    setImages(next);
    setUploadError("");
    persist({ referenceCount: next.length });
  };

  const onNextA = () => {
    if (likes.length === 0) {
      setError(c.errorLikes);
      return;
    }
    persist({ styleLikes: likes, referenceCount: images.length });
    goToScreen(1);
  };

  const onNextB = () => {
    if (reasons.length === 0) {
      setError(c.errorReasons);
      return;
    }
    persist({
      styleLikes: likes,
      artistReasons: reasons,
      notes: extra.trim().slice(0, EXTRA_NOTE_MAX),
      referenceCount: images.length,
    });
    router.push(QUOTE_FLOW_PATHS.estimate);
  };

  const motionProps = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <QuoteShell
      showGreeting={false}
      journey={{ step: "inspiracion", sub: screen === 0 ? 0 : 0.5 }}
    >
      <div className={styles.column}>
        {gateReady ? (
          <AnimatePresence mode="wait" initial={false}>
            {screen === 0 ? (
              <motion.div key="a" {...motionProps}>
                <header className={styles.head}>
                  <h1 className="typo-section quote-step-title">{c.titleA}</h1>
                  <p className={styles.lead}>{c.bodyA}</p>
                </header>

                <section className={styles.block} aria-labelledby="quote-ref-title">
                  <h2 id="quote-ref-title" className={styles.question}>
                    {c.uploadTitle}
                    <span className={styles.optionalTag}>· {copy.common.optional}</span>
                  </h2>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => void onPickFiles(event)}
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden
                  />
                  {images.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      disabled={processing}
                      className={`${styles.uploadEmpty} focus-ring`}
                    >
                      <span className={styles.uploadIcon}>
                        <ImagePlus className="h-5 w-5" aria-hidden />
                      </span>
                      <span>
                        <span className={styles.uploadTitle}>
                          {processing ? c.uploadProcessing : c.uploadCta}
                        </span>
                        <span className={styles.uploadHint}>{c.uploadHint}</span>
                      </span>
                    </button>
                  ) : (
                    <div className={styles.uploadRow}>
                      {images.map((image) => (
                        <div key={image.id} className={styles.uploadTile}>
                          {/* eslint-disable-next-line @next/next/no-img-element -- data URL local */}
                          <img src={image.dataUrl} alt="" />
                          <button
                            type="button"
                            onClick={() => removeImage(image.id)}
                            className={`${styles.uploadRemove} focus-ring`}
                            aria-label={c.removeImage}
                          >
                            <X className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                      ))}
                      {images.length < MAX_REFERENCE_IMAGES ? (
                        <button
                          type="button"
                          onClick={() => inputRef.current?.click()}
                          disabled={processing}
                          className={`${styles.uploadAdd} focus-ring`}
                        >
                          <Plus className="h-5 w-5" aria-hidden />
                          {processing ? c.uploadProcessing : c.uploadMore}
                        </button>
                      ) : null}
                    </div>
                  )}
                  {uploadError ? (
                    <p className={styles.uploadStatus} role="status">
                      {uploadError}
                    </p>
                  ) : null}
                </section>

                <fieldset className={styles.block}>
                  <legend className={styles.question}>{c.likesQuestion}</legend>
                  <p className={styles.hint}>{c.likesHint}</p>
                  <div className={styles.chips}>
                    {STYLE_LIKES.map((id) => {
                      const selected = likes.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          role="checkbox"
                          aria-checked={selected}
                          onClick={() => {
                            setLikes((current) => toggle(current, id));
                            setError("");
                          }}
                          className={`${styles.chip} focus-ring`}
                        >
                          {selected ? <Check className={styles.chipIcon} aria-hidden /> : null}
                          {c.likes[id]}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                {error ? (
                  <p className={styles.fieldError} role="alert">
                    {error}
                  </p>
                ) : null}

                <QuoteStepFooter
                  onBack={() => router.push(QUOTE_FLOW_PATHS.location)}
                  nextLabel={copy.common.continue}
                  onNext={onNextA}
                  loading={processing}
                />
              </motion.div>
            ) : (
              <motion.div key="b" {...motionProps}>
                <header className={styles.head}>
                  <h1 className="typo-section quote-step-title">{c.titleB}</h1>
                </header>

                <fieldset className={styles.block}>
                  <legend className={styles.question}>{c.reasonsQuestion}</legend>
                  <p className={styles.hint}>{c.reasonsHint}</p>
                  <div className={styles.chips}>
                    {ARTIST_REASONS.map((id) => {
                      const selected = reasons.includes(id);
                      const full = !selected && reasons.length >= ARTIST_REASONS_MAX;
                      return (
                        <button
                          key={id}
                          type="button"
                          role="checkbox"
                          aria-checked={selected}
                          aria-disabled={full || undefined}
                          onClick={() => {
                            if (full) {
                              setReasonsNotice(true);
                              return;
                            }
                            setReasonsNotice(false);
                            setReasons((current) => toggle(current, id));
                            setError("");
                          }}
                          className={`${styles.chip} focus-ring`}
                        >
                          {selected ? <Check className={styles.chipIcon} aria-hidden /> : null}
                          {c.reasons[id]}
                        </button>
                      );
                    })}
                  </div>
                  {reasonsNotice ? (
                    <p className={styles.uploadStatus} role="status">
                      {c.reasonsMax}
                    </p>
                  ) : null}
                </fieldset>

                <div className={styles.block}>
                  <label htmlFor={extraId} className={styles.question}>
                    {c.extraLabel}
                    <span className={styles.optionalTag}>· {copy.common.optional}</span>
                  </label>
                  <textarea
                    id={extraId}
                    value={extra}
                    onChange={(event) => setExtra(event.target.value.slice(0, EXTRA_NOTE_MAX))}
                    rows={4}
                    maxLength={EXTRA_NOTE_MAX}
                    placeholder={c.extraPlaceholder}
                    className={`${styles.input} mt-3`}
                  />
                </div>

                {error ? (
                  <p className={styles.fieldError} role="alert">
                    {error}
                  </p>
                ) : null}

                <QuoteStepFooter
                  onBack={() => goToScreen(0)}
                  nextLabel={c.ctaEstimate}
                  onNext={onNextB}
                />
              </motion.div>
            )}
          </AnimatePresence>
        ) : null}
      </div>
    </QuoteShell>
  );
}
