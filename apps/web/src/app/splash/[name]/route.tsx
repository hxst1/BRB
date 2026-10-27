import { ImageResponse } from "next/og";
import { renderMonsterSvg } from "@repo/avatars";
import { BACKGROUND, MASCOT } from "@/lib/app-icon";
import { IOS_SCREENS, SPLASH_MONSTER, splashFile } from "@/lib/splash";

/**
 * Imágenes de arranque del iPhone (apple-touch-startup-image): la mascota sobre
 * el fondo del icono, en el sitio exacto en que empieza el splash animado.
 */
export function generateStaticParams() {
  return IOS_SCREENS.map((screen) => ({ name: splashFile(screen) }));
}

export async function GET(_request: Request, { params }: RouteContext<"/splash/[name]">) {
  const { name } = await params;
  const screen = IOS_SCREENS.find((item) => splashFile(item) === name);
  if (!screen) return new Response("No encontrado", { status: 404 });

  const width = screen.width * screen.ratio;
  const height = screen.height * screen.ratio;
  const size = Math.round(width * SPLASH_MONSTER.width);
  const src = `data:image/svg+xml;base64,${Buffer.from(renderMonsterSvg(MASCOT, "happy")).toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: BACKGROUND, position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse solo admite <img> */}
        <img
          src={src}
          width={size}
          height={size}
          alt=""
          style={{ position: "absolute", left: (width - size) / 2, top: Math.round(height * SPLASH_MONSTER.centerY - size / 2) }}
        />
      </div>
    ),
    { width, height },
  );
}
