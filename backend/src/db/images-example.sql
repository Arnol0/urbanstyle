-- Ejecuta en el SQL Editor de Neon DESPUÉS de subir las fotos a frontend/img/
-- La ruta es relativa a la carpeta frontend, sin barra al inicio.
UPDATE products SET image_url = 'img/hoodie-negro.svg'    WHERE name = 'Hoodie Oversize Negro';
UPDATE products SET image_url = 'img/polo-gris.svg'       WHERE name = 'Polo Boxy Gris Cemento';
UPDATE products SET image_url = 'img/cargo-oliva.svg'     WHERE name = 'Cargo Pants Verde Oliva';
UPDATE products SET image_url = 'img/gorra-dad-hat.svg'   WHERE name = 'Gorra Dad Hat';

-- Producto nuevo con foto:
-- INSERT INTO products (name, description, price, category, image_url, stock)
-- VALUES ('Polo Estampado', 'Algodón 220 g', 59.90, 'polos', 'img/polo-estampado.svg', 15);
