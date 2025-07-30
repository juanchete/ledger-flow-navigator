-- Construction Items Catalog
INSERT INTO invoice_items_catalog (id, company_type, category, name, description, unit, min_price, max_price, tax_rate) VALUES
-- Materials
('const-001', 'construction', 'Materials', 'Cemento Portland Tipo I', 'Saco de 42.5 kg', 'saco', 5.50, 7.50, 16.00),
('const-002', 'construction', 'Materials', 'Cemento Portland Tipo II', 'Saco de 42.5 kg resistente a sulfatos', 'saco', 6.00, 8.00, 16.00),
('const-003', 'construction', 'Materials', 'Arena Lavada', 'Metro cúbico de arena lavada para construcción', 'm³', 25.00, 35.00, 16.00),
('const-004', 'construction', 'Materials', 'Piedra Picada', 'Metro cúbico de piedra picada 3/4"', 'm³', 30.00, 40.00, 16.00),
('const-005', 'construction', 'Materials', 'Bloques de Concreto 15cm', 'Unidad de bloque de concreto 15x20x40cm', 'unidad', 0.45, 0.65, 16.00),
('const-006', 'construction', 'Materials', 'Bloques de Concreto 20cm', 'Unidad de bloque de concreto 20x20x40cm', 'unidad', 0.55, 0.75, 16.00),
('const-007', 'construction', 'Materials', 'Cabilla Corrugada #3 (3/8")', 'Barra de 12 metros', 'barra', 8.00, 12.00, 16.00),
('const-008', 'construction', 'Materials', 'Cabilla Corrugada #4 (1/2")', 'Barra de 12 metros', 'barra', 12.00, 18.00, 16.00),
('const-009', 'construction', 'Materials', 'Cabilla Corrugada #5 (5/8")', 'Barra de 12 metros', 'barra', 18.00, 25.00, 16.00),
('const-010', 'construction', 'Materials', 'Alambre de Amarre', 'Kilogramo de alambre galvanizado', 'kg', 2.50, 3.50, 16.00),
('const-011', 'construction', 'Materials', 'Cal Hidratada', 'Saco de 25 kg', 'saco', 3.50, 5.00, 16.00),
('const-012', 'construction', 'Materials', 'Yeso', 'Saco de 25 kg', 'saco', 4.00, 6.00, 16.00),

-- Tools and Equipment
('const-013', 'construction', 'Equipment', 'Alquiler de Mezcladora', 'Día de alquiler mezcladora de concreto', 'día', 25.00, 40.00, 16.00),
('const-014', 'construction', 'Equipment', 'Alquiler de Vibrador', 'Día de alquiler vibrador de concreto', 'día', 20.00, 35.00, 16.00),
('const-015', 'construction', 'Equipment', 'Alquiler de Andamios', 'Metro cuadrado por día', 'm²/día', 1.50, 2.50, 16.00),
('const-016', 'construction', 'Equipment', 'Alquiler de Martillo Demoledor', 'Día de alquiler', 'día', 45.00, 70.00, 16.00),

-- Labor
('const-017', 'construction', 'Labor', 'Mano de Obra Albañilería', 'Hora de trabajo albañil', 'hora', 8.00, 15.00, 16.00),
('const-018', 'construction', 'Labor', 'Mano de Obra Ayudante', 'Hora de trabajo ayudante', 'hora', 5.00, 10.00, 16.00),
('const-019', 'construction', 'Labor', 'Mano de Obra Maestro de Obra', 'Hora de trabajo maestro', 'hora', 15.00, 25.00, 16.00),
('const-020', 'construction', 'Labor', 'Mano de Obra Electricista', 'Hora de trabajo electricista', 'hora', 12.00, 20.00, 16.00),
('const-021', 'construction', 'Labor', 'Mano de Obra Plomero', 'Hora de trabajo plomero', 'hora', 12.00, 20.00, 16.00),

-- Finishing Materials
('const-022', 'construction', 'Finishing', 'Cerámica para Piso', 'Metro cuadrado de cerámica 45x45cm', 'm²', 15.00, 35.00, 16.00),
('const-023', 'construction', 'Finishing', 'Porcelanato', 'Metro cuadrado de porcelanato 60x60cm', 'm²', 25.00, 60.00, 16.00),
('const-024', 'construction', 'Finishing', 'Pintura Caucho Tipo 1', 'Galón de pintura', 'galón', 12.00, 20.00, 16.00),
('const-025', 'construction', 'Finishing', 'Fondo Antialcalino', 'Galón de fondo', 'galón', 8.00, 15.00, 16.00),

-- Electronics and Electrical Items Catalog
-- Cables and Wiring
('elec-001', 'electronics', 'Cables', 'Cable THW #12 AWG', 'Metro de cable', 'metro', 0.80, 1.50, 16.00),
('elec-002', 'electronics', 'Cables', 'Cable THW #10 AWG', 'Metro de cable', 'metro', 1.20, 2.00, 16.00),
('elec-003', 'electronics', 'Cables', 'Cable THW #8 AWG', 'Metro de cable', 'metro', 2.00, 3.50, 16.00),
('elec-004', 'electronics', 'Cables', 'Cable UTP Cat 6', 'Metro de cable de red', 'metro', 0.50, 1.00, 16.00),
('elec-005', 'electronics', 'Cables', 'Cable Coaxial RG6', 'Metro de cable coaxial', 'metro', 0.40, 0.80, 16.00),

-- Switches and Outlets
('elec-006', 'electronics', 'Switches', 'Interruptor Sencillo', 'Unidad', 'unidad', 3.00, 6.00, 16.00),
('elec-007', 'electronics', 'Switches', 'Interruptor Doble', 'Unidad', 'unidad', 4.00, 8.00, 16.00),
('elec-008', 'electronics', 'Switches', 'Interruptor Triple', 'Unidad', 'unidad', 5.00, 10.00, 16.00),
('elec-009', 'electronics', 'Outlets', 'Tomacorriente Doble Polarizado', 'Unidad', 'unidad', 4.00, 8.00, 16.00),
('elec-010', 'electronics', 'Outlets', 'Tomacorriente GFCI', 'Unidad con protección', 'unidad', 15.00, 25.00, 16.00),

-- Circuit Breakers
('elec-011', 'electronics', 'Protection', 'Breaker 1 Polo 20A', 'Unidad', 'unidad', 8.00, 15.00, 16.00),
('elec-012', 'electronics', 'Protection', 'Breaker 2 Polos 30A', 'Unidad', 'unidad', 15.00, 25.00, 16.00),
('elec-013', 'electronics', 'Protection', 'Breaker 2 Polos 40A', 'Unidad', 'unidad', 18.00, 30.00, 16.00),
('elec-014', 'electronics', 'Protection', 'Centro de Carga 8 Espacios', 'Unidad', 'unidad', 45.00, 75.00, 16.00),

-- Electronic Components
('elec-015', 'electronics', 'Components', 'Resistencia 1/4W Varios Valores', 'Paquete de 100 unidades', 'paquete', 2.00, 5.00, 16.00),
('elec-016', 'electronics', 'Components', 'Capacitor Electrolítico Varios', 'Paquete de 50 unidades', 'paquete', 5.00, 10.00, 16.00),
('elec-017', 'electronics', 'Components', 'LED 5mm Varios Colores', 'Paquete de 100 unidades', 'paquete', 3.00, 6.00, 16.00),
('elec-018', 'electronics', 'Components', 'Transistor 2N2222', 'Unidad', 'unidad', 0.25, 0.50, 16.00),

-- Lighting
('elec-019', 'electronics', 'Lighting', 'Bombillo LED 9W', 'Unidad', 'unidad', 2.50, 5.00, 16.00),
('elec-020', 'electronics', 'Lighting', 'Bombillo LED 12W', 'Unidad', 'unidad', 3.50, 7.00, 16.00),
('elec-021', 'electronics', 'Lighting', 'Reflector LED 50W', 'Unidad', 'unidad', 15.00, 30.00, 16.00),
('elec-022', 'electronics', 'Lighting', 'Lámpara Fluorescente 2x40W', 'Unidad completa', 'unidad', 25.00, 45.00, 16.00),

-- Paper and Office Supplies
('paper-001', 'papers', 'Paper', 'Resma Papel Carta', 'Resma de 500 hojas', 'resma', 3.50, 6.00, 16.00),
('paper-002', 'papers', 'Paper', 'Resma Papel Oficio', 'Resma de 500 hojas', 'resma', 4.00, 7.00, 16.00),
('paper-003', 'papers', 'Paper', 'Papel Bond Tamaño Pliego', 'Hoja individual', 'hoja', 0.50, 1.00, 16.00),
('paper-004', 'papers', 'Office', 'Carpeta Manila Carta', 'Paquete de 100 unidades', 'paquete', 8.00, 15.00, 16.00),
('paper-005', 'papers', 'Office', 'Sobre Manila Carta', 'Paquete de 100 unidades', 'paquete', 5.00, 10.00, 16.00),
('paper-006', 'papers', 'Office', 'Bolígrafo Azul/Negro', 'Caja de 12 unidades', 'caja', 3.00, 6.00, 16.00),
('paper-007', 'papers', 'Office', 'Marcador Permanente', 'Caja de 12 unidades', 'caja', 8.00, 15.00, 16.00),
('paper-008', 'papers', 'Office', 'Grapadora Estándar', 'Unidad', 'unidad', 5.00, 12.00, 16.00),
('paper-009', 'papers', 'Office', 'Grapas 26/6', 'Caja de 5000 grapas', 'caja', 1.50, 3.00, 16.00),
('paper-010', 'papers', 'Office', 'Clips Estándar', 'Caja de 100 unidades', 'caja', 0.50, 1.50, 16.00),

-- Electrical Services
('elec-serv-001', 'electricity', 'Services', 'Instalación Punto Eléctrico', 'Por punto instalado', 'punto', 15.00, 30.00, 16.00),
('elec-serv-002', 'electricity', 'Services', 'Instalación Centro de Carga', 'Instalación completa', 'servicio', 50.00, 100.00, 16.00),
('elec-serv-003', 'electricity', 'Services', 'Mantenimiento Eléctrico', 'Hora de servicio', 'hora', 20.00, 40.00, 16.00),
('elec-serv-004', 'electricity', 'Services', 'Diagnóstico Eléctrico', 'Servicio completo', 'servicio', 30.00, 60.00, 16.00),
('elec-serv-005', 'electricity', 'Services', 'Instalación Medidor', 'Servicio completo', 'servicio', 100.00, 200.00, 16.00);