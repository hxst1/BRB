/** Bloque gris que late mientras carga. */
const block = "animate-pulse rounded-2xl bg-line/40 motion-reduce:animate-none";

/**
 * Hueco con la forma del panel mientras llegan sus datos: mismas secciones,
 * mismos márgenes y tamaños parecidos, para que al cargar no salte nada.
 */
export function DashboardSkeleton() {
  return (
    <div aria-hidden>
      <section className="flex flex-wrap items-center gap-6">
        <div className={`size-28 shrink-0 rounded-[1.75rem] ${block}`} />
        <div className="flex min-w-60 flex-1 flex-col gap-4">
          <div className={`h-12 w-56 sm:h-15 sm:w-72 ${block}`} />
          <div className="flex max-w-sm flex-col gap-2">
            <div className={`h-4 w-full max-w-60 rounded-md ${block}`} />
            <div className={`h-2 rounded-full ${block}`} />
          </div>
        </div>
      </section>

      <div className="mt-12">
        <div className={`h-7 w-24 rounded-lg ${block}`} />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className={`h-17 ${block}`} />
          <div className={`h-17 ${block}`} />
        </div>
      </div>

      <div className={`mt-12 h-56 max-w-xl rounded-3xl ${block}`} />

      <div className="mt-14">
        <div className={`h-7 w-32 rounded-lg ${block}`} />
        <div className={`mt-2 mb-4 h-4 w-56 rounded-md ${block}`} />
        {/* Como la fila de juegos: deslizable en el móvil (asoma la siguiente), en cuadrícula después. */}
        <div className="-mx-4 flex gap-3 overflow-hidden px-4 pt-1 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:p-0 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-44 w-[clamp(16rem,78%,20rem)] shrink-0 rounded-3xl sm:h-80 sm:w-auto ${block}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
