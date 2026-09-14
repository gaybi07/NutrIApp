-- Crear una tabla no la suma sola a las transmisiones en vivo de Supabase --
-- hay que agregarla a mano a la publicación "supabase_realtime". Sin esto,
-- la suscripción realtime del cliente (useSharedInventory/useSharedPurchases)
-- se queda esperando avisos que nunca llegan: cada cuenta ve sus propios
-- cambios al toque (porque después de escribir vuelve a pedir la lista),
-- pero no los cambios que hizo la OTRA persona del grupo hasta que recarga
-- la app entera.
alter publication supabase_realtime add table public.inventory_items;
alter publication supabase_realtime add table public.purchase_history;
