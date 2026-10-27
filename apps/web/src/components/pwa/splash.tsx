import { brand } from "@repo/brand";
import { renderMonsterSvg } from "@repo/avatars";
import { InlineScript } from "@/components/inline-script";
import { MASCOT } from "@/lib/app-icon";
import { SPLASH_END_SCRIPT } from "@/lib/splash";

/** Fichas de colores de los juegos que suben por detrás: color, posición, tamaño y retraso. */
const TILES = [
  { color: "#ff6b6b", left: 8, size: 34, delay: 0 },
  { color: "#ffd43b", left: 24, size: 22, delay: 0.25 },
  { color: "#8ce99a", left: 41, size: 28, delay: 0.1 },
  { color: "#74c0fc", left: 62, size: 38, delay: 0.3 },
  { color: "#845ef7", left: 78, size: 24, delay: 0.05 },
  { color: "#ff922b", left: 90, size: 30, delay: 0.2 },
  { color: "#e599f7", left: 52, size: 18, delay: 0.4 },
];

/**
 * Splash animado de la app instalada (ver lib/splash.ts): la mascota bota,
 * caen las letras del nombre, suben fichas de los juegos y la pantalla se
 * cierra en círculo sobre la mascota. Solo con la app instalada y una vez por
 * sesión; en el navegador no se ve (#splash de globals.css).
 */
export function Splash() {
  return (
    <>
      <div id="splash" aria-hidden>
        <div className="splash-tiles">
          {TILES.map((tile, i) => (
            <span
              key={i}
              style={{ background: tile.color, left: `${tile.left}%`, width: tile.size, height: tile.size, animationDelay: `${tile.delay}s` }}
            />
          ))}
        </div>
        <div className="splash-monster" dangerouslySetInnerHTML={{ __html: renderMonsterSvg(MASCOT, "happy", "splash") }} />
        <div className="splash-text">
          <p className="splash-word display">
            {[...brand.name].map((letter, i) => (
              <span key={i} style={{ animationDelay: `${0.35 + i * 0.1}s` }}>
                {letter}
              </span>
            ))}
          </p>
          <p className="splash-tagline">{brand.tagline}</p>
        </div>
      </div>
      <InlineScript html={SPLASH_END_SCRIPT} />
    </>
  );
}
