import { brand } from "@repo/brand";
import { GameCards } from "./game-cards";

export function Landing() {
  return (
    <>
      <h1 className="display max-w-xl text-6xl font-bold text-balance sm:text-8xl">{brand.tagline}</h1>
      <p className="mt-5 max-w-md text-lg text-muted">
        Partidas cortas para cuando necesitas desconectar cinco minutos. Compite en el ranking y reta a tus amigos.
      </p>
      <div className="mt-16">
        <GameCards />
      </div>
    </>
  );
}
