"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { PART_OPTIONS } from "@repo/avatars";
import { LevelBarSkeleton } from "@/components/level-bar";
import { Bone, TextLine, ToggleSkeleton } from "@/components/skeleton";
import { useMessages } from "@/lib/i18n/client";

/** Pestañas del perfil (en la URL: /perfil?seccion=logros), en el orden de perfil/page.tsx. */
export const PROFILE_SECTIONS = ["monster", "logros", "records", "opinion", "ajustes"] as const;
export type ProfileSection = (typeof PROFILE_SECTIONS)[number];
const SLOTS = ["body", "palette", "eyes", "mouth", "top"] as const;

/**
 * El perfil mientras carga: tu nombre y nivel, las pestañas y el esqueleto
 * de la pestaña abierta (`sections`, uno por pestaña). Cuál es se lee de la
 * URL en el navegador; en el HTML de partida, la del monstruo (sin ?seccion).
 */
export function ProfileSkeleton({ sections }: { sections: Record<ProfileSection, ReactNode> }) {
  return (
    <div aria-hidden inert className="flex flex-col gap-8">
      <div>
        <TextLine className="display mb-3 w-48 text-5xl sm:text-6xl" />
        <LevelBarSkeleton className="max-w-sm" />
      </div>
      <Suspense fallback={<SectionSkeleton section="monster" sections={sections} />}>
        <SectionFromUrl sections={sections} />
      </Suspense>
    </div>
  );
}

function SectionFromUrl({ sections }: { sections: Record<ProfileSection, ReactNode> }) {
  const seccion = useSearchParams().get("seccion");
  return <SectionSkeleton section={PROFILE_SECTIONS.find((s) => s === seccion) ?? "monster"} sections={sections} />;
}

function SectionSkeleton({ section, sections }: { section: ProfileSection; sections: Record<ProfileSection, ReactNode> }) {
  const m = useMessages();
  return (
    <>
      <ToggleSkeleton
        className="flex"
        item="flex-auto px-1 py-2 text-center text-[13px] whitespace-nowrap sm:px-4 sm:text-sm"
        active={PROFILE_SECTIONS.indexOf(section)}
        options={PROFILE_SECTIONS.map((tab) => m.profile.tabs[tab])}
      />
      {sections[section]}
    </>
  );
}

/** El editor del monstruo (avatar-editor) con sus textos y las piezas en gris. */
export function MonsterSkeleton() {
  const m = useMessages();
  const t = m.avatar;
  return (
    <div aria-hidden inert className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-12">
      <div className="flex items-center gap-6 lg:flex-col lg:items-start">
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <span className="grid size-40 place-items-center rounded-[2rem] bg-surface shadow-soft lg:size-48">
            <Bone className="size-28 rounded-full" />
          </span>
          <p className="text-xs text-muted">{t.tapToGreet}</p>
        </div>
        <div className="flex flex-col items-start gap-2">
          <span className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg">{t.roll}</span>
          <p className="min-h-5" />
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <ToggleSkeleton
            className="flex gap-1 overflow-hidden"
            item="flex-1 px-3 py-1.5 text-center text-sm whitespace-nowrap"
            options={SLOTS.map((slot) => t.slots[slot])}
          />
          <div className="flex flex-wrap gap-2">
            {PART_OPTIONS.body.map((id) => (
              <span key={id} className="grid size-16 place-items-center rounded-2xl bg-surface shadow-soft">
                <Bone className="size-11 rounded-full" />
              </span>
            ))}
          </div>
        </div>
        <p className="flex items-center gap-3 text-sm font-medium">
          <span className="size-4 rounded-sm border border-line" />
          {t.cheeks}
        </p>
        <p className="text-sm text-muted">
          {t.lockedHint} <span className="font-medium text-ink underline underline-offset-4">{t.achievementsLink}</span>. {t.supporterHint}{" "}
          <span className="font-medium text-ink underline underline-offset-4">{t.howToGet}</span>.
        </p>
      </div>
    </div>
  );
}

/** Opinión: contar algo y tus mensajes; tus valoraciones de juegos, en gris. */
export function OpinionSkeleton() {
  const card = "flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-soft";
  return (
    <div aria-hidden className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-10">
      <div className={card}>
        <div className="flex flex-col">
          <TextLine className="w-36" />
          <TextLine className="w-full text-sm" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Bone className="h-9 w-40 rounded-full" />
          <Bone className="h-9 w-36 rounded-full" />
          <Bone className="h-9 w-28 rounded-full" />
        </div>
      </div>
      <div className={card}>
        <TextLine className="w-44" />
        <TextLine className="w-full text-sm" />
        {[0, 1].map((i) => (
          <Bone key={i} className="h-10 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

/** Ajustes: las tarjetas de la app, tu cuenta y borrarla, en gris. */
export function SettingsSkeleton() {
  const card = "flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-soft";
  const field = (key: number) => (
    <div key={key} className="flex flex-col gap-2">
      <TextLine className="w-28 text-sm" />
      <Bone className="h-9 w-full max-w-72 rounded-full" />
    </div>
  );
  return (
    <div aria-hidden className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-10">
      <div className="flex flex-col gap-8">
        <div className={card}>
          <TextLine className="w-32" />
          {[0, 1, 2, 3, 4].map(field)}
        </div>
      </div>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-6 rounded-3xl bg-surface p-5 shadow-soft">
          <TextLine className="w-28" />
          <div className="flex flex-col gap-2">
            <TextLine className="w-36 text-sm" />
            <Bone className="h-11 w-full rounded-2xl" />
          </div>
          <div className="border-t border-line" />
          <div className="flex flex-col gap-3">
            <TextLine className="w-24 text-sm" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col gap-1 text-sm">
                <TextLine className="w-24" />
                <Bone className="h-11 w-full rounded-2xl" />
              </div>
            ))}
            <Bone className="h-9 w-40 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
