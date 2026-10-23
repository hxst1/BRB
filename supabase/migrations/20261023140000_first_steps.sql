-- Primeros pasos de la portada (personalizar el monster, añadir un amigo y
-- jugar el reto diario). Se ocultan solos al completarlos; esto es para quien
-- prefiere cerrarlos antes y no volver a verlos en ningún dispositivo.

alter table public.profiles
  add column first_steps_dismissed boolean not null default false;

-- La política de update ya limita a la fila propia.
grant update (first_steps_dismissed) on public.profiles to authenticated;
