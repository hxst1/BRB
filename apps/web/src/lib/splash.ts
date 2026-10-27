/**
 * Splash de la app instalada (PWA). Primero se ve el del sistema: en Android,
 * el fondo y el icono del manifiesto; en iPhone, las imágenes de arranque de
 * cada pantalla (app/splash). Encima, en cuanto carga la página, el animado
 * (components/pwa/splash.tsx) empieza con la mascota en el mismo sitio y del
 * mismo tamaño, para que no se note el cambio.
 */

/** Ancho de la mascota (fracción del ancho de la pantalla) y altura de su centro (fracción del alto). */
export const SPLASH_MONSTER = { width: 0.36, centerY: 0.46 };

/** Pantallas de iPhone en vertical: tamaño en puntos y densidad (la imagen va en píxeles). */
export const IOS_SCREENS = [
  { width: 440, height: 956, ratio: 3 },
  { width: 430, height: 932, ratio: 3 },
  { width: 428, height: 926, ratio: 3 },
  { width: 414, height: 896, ratio: 3 },
  { width: 414, height: 896, ratio: 2 },
  { width: 414, height: 736, ratio: 3 },
  { width: 402, height: 874, ratio: 3 },
  { width: 393, height: 852, ratio: 3 },
  { width: 390, height: 844, ratio: 3 },
  { width: 375, height: 812, ratio: 3 },
  { width: 375, height: 667, ratio: 2 },
  { width: 320, height: 568, ratio: 2 },
] as const;

export const splashFile = (screen: (typeof IOS_SCREENS)[number]) => `${screen.width * screen.ratio}x${screen.height * screen.ratio}.png`;

/**
 * Script del <head>: con la app instalada marca <html data-standalone>, y el
 * splash animado sale solo la primera vez de cada sesión (después,
 * data-splash="done" lo oculta antes de pintar). En el navegador no hace nada.
 */
export const SPLASH_SCRIPT = `(function(){try{var r=document.documentElement;if(!(matchMedia("(display-mode: standalone)").matches||navigator.standalone===true))return;r.dataset.standalone="1";if(sessionStorage.getItem("splash"))r.dataset.splash="done";else sessionStorage.setItem("splash","1")}catch(e){}})()`;

/**
 * Script justo después del splash: lo cierra (en círculo hacia la mascota) a
 * los 1,5 s, o antes si se toca; con "reducir movimiento", enseguida.
 */
export const SPLASH_END_SCRIPT = `(function(){var r=document.documentElement,s=document.getElementById("splash");if(!s||!r.dataset.standalone||r.dataset.splash)return;var out=function(){if(r.dataset.splash)return;r.dataset.splash="out";setTimeout(function(){r.dataset.splash="done"},480)};var t=setTimeout(out,matchMedia("(prefers-reduced-motion: reduce)").matches?450:1500);s.addEventListener("pointerdown",function(){clearTimeout(t);out()})})()`;
