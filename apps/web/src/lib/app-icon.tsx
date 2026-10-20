import { ImageResponse } from "next/og";
import { renderMonsterSvg, type MonsterParts } from "@repo/avatars";

/** La mascota de la app: siempre la misma, contenta. */
const MASCOT: MonsterParts = { body: "round", palette: "coral", eyes: "two", mouth: "tongue", top: "horns", cheeks: true };
const BACKGROUND = "#15171c";

/**
 * Icono de la app en PNG. `maskable` deja más margen: Android puede recortar
 * el icono en círculo y el monstruo tiene que quedar dentro de la zona segura.
 */
export function appIcon(size: number, { maskable = false } = {}) {
  const svg = renderMonsterSvg(MASCOT, "happy");
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  const monster = Math.round(size * (maskable ? 0.58 : 0.74));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BACKGROUND,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse solo admite <img> */}
        <img src={src} width={monster} height={monster} alt="" style={{ marginTop: size * 0.04 }} />
      </div>
    ),
    { width: size, height: size },
  );
}
