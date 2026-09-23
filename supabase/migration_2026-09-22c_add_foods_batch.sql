-- Lote grande de alimentos comunes (dieta argentina/genérica) para la tabla
-- `foods` -- ver migration_2026-09-22_add_foods.sql para el porqué de esta
-- tabla. A DIFERENCIA de la semilla original (30 alimentos, origen
-- 'seed_curado', verificado=true de una), este lote entra como
-- 'aprendido_ia' y verificado=false a propósito: son estimaciones mías, NO
-- revisadas a mano todavía. Con eso, resolveMealFromFoods (lib/foodsResolver.ts)
-- no confía en ellos hasta que se usen 3 veces de verdad o alguien los marque
-- verificado=true manualmente -- mismo criterio "estricto" ya charlado.
--
-- PENDIENTE: revisar los valores antes de marcarlos verificado=true a mano
-- (o dejar que el uso real los vaya validando solo).
insert into public.foods (nombre, nombre_key, kcal, protein, carbs, fat, fiber, gramos_por_unidad, origen, verificado) values
  -- Carnes y pescados
  ('Carne picada', 'carne picada', 233, 20, 0, 17, 0, null, 'aprendido_ia', false),
  ('Bife de chorizo', 'bife de chorizo', 271, 25, 0, 19, 0, null, 'aprendido_ia', false),
  ('Asado', 'asado', 280, 24, 0, 21, 0, null, 'aprendido_ia', false),
  ('Cerdo', 'cerdo', 242, 27, 0, 14, 0, null, 'aprendido_ia', false),
  ('Pollo pata y muslo', 'pollo pata y muslo', 172, 20, 0, 10, 0, null, 'aprendido_ia', false),
  ('Merluza', 'merluza', 90, 19, 0, 1, 0, null, 'aprendido_ia', false),
  ('Salmón', 'salmon', 208, 20, 0, 13, 0, null, 'aprendido_ia', false),
  ('Chorizo', 'chorizo', 320, 16, 2, 28, 0, 90, 'aprendido_ia', false),
  ('Morcilla', 'morcilla', 379, 15, 15, 30, 0, 90, 'aprendido_ia', false),
  ('Salchicha', 'salchicha', 260, 11, 3, 22, 0, 45, 'aprendido_ia', false),
  ('Panceta', 'panceta', 541, 12, 1, 53, 0, null, 'aprendido_ia', false),
  ('Bondiola', 'bondiola', 300, 22, 0, 23, 0, null, 'aprendido_ia', false),
  ('Milanesa de carne', 'milanesa de carne', 250, 22, 10, 13, 1, 150, 'aprendido_ia', false),
  ('Hamburguesa', 'hamburguesa', 254, 17, 4, 19, 0, 110, 'aprendido_ia', false),
  ('Atún al aceite', 'atun al aceite', 189, 25, 0, 9, 0, null, 'aprendido_ia', false),
  -- Lácteos y huevo
  ('Leche descremada', 'leche descremada', 35, 3, 5, 0, 0, null, 'aprendido_ia', false),
  ('Yogur griego', 'yogur griego', 97, 9, 4, 5, 0, 170, 'aprendido_ia', false),
  ('Queso port salut', 'queso port salut', 330, 22, 2, 26, 0, null, 'aprendido_ia', false),
  ('Queso rallado', 'queso rallado', 400, 36, 3, 28, 0, null, 'aprendido_ia', false),
  ('Ricota', 'ricota', 174, 11, 3, 13, 0, null, 'aprendido_ia', false),
  ('Manteca', 'manteca', 717, 1, 0, 81, 0, null, 'aprendido_ia', false),
  ('Crema de leche', 'crema de leche', 340, 2, 3, 36, 0, null, 'aprendido_ia', false),
  ('Clara de huevo', 'clara de huevo', 52, 11, 1, 0, 0, 33, 'aprendido_ia', false),
  ('Dulce de leche', 'dulce de leche', 315, 7, 56, 7, 0, null, 'aprendido_ia', false),
  -- Verduras
  ('Brócoli', 'brocoli', 34, 3, 7, 0, 3, null, 'aprendido_ia', false),
  ('Espinaca', 'espinaca', 23, 3, 4, 0, 2, null, 'aprendido_ia', false),
  ('Calabaza', 'calabaza', 26, 1, 7, 0, 1, null, 'aprendido_ia', false),
  ('Berenjena', 'berenjena', 25, 1, 6, 0, 3, null, 'aprendido_ia', false),
  ('Zapallito', 'zapallito', 17, 1, 3, 0, 1, null, 'aprendido_ia', false),
  ('Morrón', 'morron', 31, 1, 6, 0, 2, 120, 'aprendido_ia', false),
  ('Choclo', 'choclo', 96, 3, 21, 1, 2, null, 'aprendido_ia', false),
  ('Batata', 'batata', 86, 2, 20, 0, 3, 130, 'aprendido_ia', false),
  ('Champiñones', 'champiñon', 22, 3, 3, 0, 1, null, 'aprendido_ia', false),
  ('Repollo', 'repollo', 25, 1, 6, 0, 3, null, 'aprendido_ia', false),
  ('Ajo', 'ajo', 149, 6, 33, 0, 2, 5, 'aprendido_ia', false),
  ('Rúcula', 'rucula', 25, 3, 4, 1, 2, null, 'aprendido_ia', false),
  -- Frutas
  ('Sandía', 'sandia', 30, 1, 8, 0, 0, null, 'aprendido_ia', false),
  ('Melón', 'melon', 34, 1, 8, 0, 1, null, 'aprendido_ia', false),
  ('Uva', 'uva', 69, 1, 18, 0, 1, null, 'aprendido_ia', false),
  ('Frutilla', 'frutilla', 32, 1, 8, 0, 2, null, 'aprendido_ia', false),
  ('Ciruela', 'ciruela', 46, 1, 11, 0, 1, 60, 'aprendido_ia', false),
  ('Ananá', 'anana', 50, 1, 13, 0, 1, null, 'aprendido_ia', false),
  ('Damasco', 'damasco', 48, 1, 11, 0, 2, 35, 'aprendido_ia', false),
  ('Higo', 'higo', 74, 1, 19, 0, 3, 50, 'aprendido_ia', false),
  -- Cereales, legumbres y harinas
  ('Lentejas cocidas', 'lenteja cocida', 116, 9, 20, 0, 8, null, 'aprendido_ia', false),
  ('Garbanzos cocidos', 'garbanzo cocido', 164, 9, 27, 3, 8, null, 'aprendido_ia', false),
  ('Porotos cocidos', 'poroto cocido', 127, 9, 23, 1, 6, null, 'aprendido_ia', false),
  ('Quinoa cocida', 'quinoa cocida', 120, 4, 21, 2, 3, null, 'aprendido_ia', false),
  ('Polenta', 'polenta', 85, 2, 18, 0, 1, null, 'aprendido_ia', false),
  ('Galletitas de agua', 'galletita de agua', 430, 10, 75, 10, 3, null, 'aprendido_ia', false),
  ('Galletitas dulces', 'galletita dulce', 450, 6, 68, 17, 2, null, 'aprendido_ia', false),
  ('Pan integral', 'pan integral', 246, 10, 41, 4, 6, 30, 'aprendido_ia', false),
  ('Pan de hamburguesa', 'pan de hamburguesa', 280, 9, 50, 5, 2, 60, 'aprendido_ia', false),
  ('Fideos secos crudos', 'fideo seco crudo', 371, 13, 75, 1, 3, null, 'aprendido_ia', false),
  ('Arroz crudo', 'arroz crudo', 365, 7, 80, 1, 1, null, 'aprendido_ia', false),
  ('Avena arrollada', 'avena arrollada', 389, 17, 66, 7, 10, null, 'aprendido_ia', false),
  ('Granola', 'granola', 471, 10, 64, 20, 7, null, 'aprendido_ia', false),
  -- Preparaciones típicas (útiles para el desglose de platos compuestos)
  ('Puré de papas', 'pure de papas', 90, 2, 20, 1, 2, null, 'aprendido_ia', false),
  ('Ensalada mixta', 'ensalada mixta', 25, 1, 5, 0, 2, null, 'aprendido_ia', false),
  ('Tarta de verdura', 'tarta de verdura', 210, 6, 18, 13, 2, 150, 'aprendido_ia', false),
  ('Empanada de pollo', 'empanada de pollo', 230, 9, 22, 12, 1, 100, 'aprendido_ia', false),
  ('Ñoquis', 'ñoqui', 160, 4, 30, 2, 1, null, 'aprendido_ia', false),
  ('Milanesa napolitana', 'milanesa napolitana', 310, 26, 12, 18, 1, 180, 'aprendido_ia', false),
  ('Pizza', 'pizza', 266, 11, 33, 10, 2, null, 'aprendido_ia', false),
  ('Sándwich de miga', 'sandwich de miga', 210, 8, 24, 9, 1, 60, 'aprendido_ia', false),
  ('Choripán', 'choripan', 380, 14, 30, 24, 2, 180, 'aprendido_ia', false),
  ('Sopa de verduras', 'sopa de verduras', 35, 1, 6, 1, 1, null, 'aprendido_ia', false),
  ('Guiso de lentejas', 'guiso de lentejas', 130, 8, 18, 3, 5, null, 'aprendido_ia', false),
  ('Locro', 'locro', 140, 8, 18, 4, 4, null, 'aprendido_ia', false),
  ('Milanesa con puré', 'milanesa con pure', 230, 15, 20, 12, 2, 300, 'aprendido_ia', false),
  -- Bebidas y condimentos
  ('Gaseosa', 'gaseosa', 42, 0, 10, 0, 0, null, 'aprendido_ia', false),
  ('Jugo de naranja', 'jugo de naranja', 45, 1, 10, 0, 0, null, 'aprendido_ia', false),
  ('Cerveza', 'cerveza', 43, 0, 4, 0, 0, null, 'aprendido_ia', false),
  ('Vino', 'vino', 83, 0, 3, 0, 0, null, 'aprendido_ia', false),
  ('Mayonesa', 'mayonesa', 680, 1, 1, 75, 0, null, 'aprendido_ia', false),
  ('Ketchup', 'ketchup', 112, 1, 27, 0, 0, null, 'aprendido_ia', false),
  ('Mostaza', 'mostaza', 66, 4, 8, 3, 3, null, 'aprendido_ia', false),
  ('Aceite de oliva', 'aceite de oliva', 884, 0, 0, 100, 0, null, 'aprendido_ia', false),
  ('Miel', 'miel', 304, 0, 82, 0, 0, null, 'aprendido_ia', false),
  ('Azúcar', 'azucar', 387, 0, 100, 0, 0, null, 'aprendido_ia', false),
  -- Snacks y golosinas
  ('Papas fritas de paquete', 'papa frita de paquete', 536, 6, 53, 35, 4, null, 'aprendido_ia', false),
  ('Chocolate', 'chocolate', 546, 5, 59, 31, 4, null, 'aprendido_ia', false),
  ('Turrón', 'turron', 430, 8, 55, 20, 2, 20, 'aprendido_ia', false),
  ('Barrita de cereal', 'barrita de cereal', 380, 6, 65, 10, 4, 25, 'aprendido_ia', false),
  ('Helado', 'helado', 207, 4, 24, 11, 0, null, 'aprendido_ia', false),
  ('Facturas', 'factura', 380, 7, 45, 19, 1, 60, 'aprendido_ia', false),
  ('Budín', 'budin', 350, 5, 45, 17, 1, null, 'aprendido_ia', false),
  ('Palmeritas', 'palmerita', 480, 6, 55, 26, 1, 15, 'aprendido_ia', false)
on conflict (nombre_key) do nothing;
