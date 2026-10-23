-- Logro «Colaborador» también para quien mantiene el repo.
--
-- Quien programa la app sube los cambios directamente, sin issues ni pull
-- requests, así que el webhook de GitHub nunca le daba el logro. Un nuevo tipo
-- de colaboración, 'maintainer', lo registra a mano el servidor (con
-- record_github_contribution, solo service_role) y da el logro igual.

alter table private.github_contributions drop constraint github_contributions_kind_check;
alter table private.github_contributions
  add constraint github_contributions_kind_check check (kind in ('issue', 'pull_request', 'maintainer'));
