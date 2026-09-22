-- Ajuste ATÓMICO de stock de la alacena compartida, por delta relativo (no
-- por cantidad absoluta) -- soluciona una condición de carrera real: si dos
-- ediciones rápidas (ej. escribir "150" tecla por tecla en el gramaje de un
-- item cargado desde la Alacena) disparan cada una su propio
-- consumeAmounts/restoreAmounts, el código anterior calculaba la cantidad
-- final del lado del cliente a partir del estado `items` ya en memoria --
-- si la llamada anterior todavía no había vuelto con su refetch, la segunda
-- calculaba sobre un valor viejo, y la que terminaba último pisaba a la que
-- terminaba antes, perdiendo ese ajuste.
--
-- Mandando solo el delta y dejando que Postgres haga
-- "quantity = quantity + delta" en un único UPDATE atómico, no importa en
-- qué orden lleguen ni si se solapan: cada delta se aplica sobre el valor
-- REAL en ese momento en la base, nunca sobre una lectura vieja del cliente.
--
-- No es "security definer" a propósito: corre con los permisos de quien la
-- llama, así la policy "members can manage their shared inventory" de
-- inventory_items sigue aplicando tal cual (no puede tocar stock de un
-- hogar del que no es miembro).
create or replace function public.adjust_inventory_quantity(p_item_id uuid, p_delta numeric)
returns boolean -- true si encontró y ajustó la fila, false si ya no existía
language plpgsql
set search_path = public
as $$
declare
  v_found boolean := false;
begin
  update public.inventory_items
  set quantity = greatest(quantity + p_delta, 0)
  where id = p_item_id
  returning true into v_found;

  if not v_found then
    return false;
  end if;

  delete from public.inventory_items
  where id = p_item_id and quantity <= 0;

  return true;
end;
$$;

grant execute on function public.adjust_inventory_quantity(uuid, numeric) to authenticated;
