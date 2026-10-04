# Rediseño "Kesar": POS con identidad india, pensado para iPad

**Fecha:** 3 de octubre de 2026 · **Rama:** `rediseno-kesar` · **Referencia visual:** dirección A (día) + C (noche) en `http://athaleo-core.tailc6b7b8.ts.net:9099/pos-direcciones.html`

## 1. Objetivo

La demo actual reutiliza el esqueleto de un dashboard SaaS (sidebar oscura, breadcrumb, tarjetas de métricas numeradas, selects para todo) y se parece demasiado al dashboard operativo inmobiliario del mismo portfolio. El objetivo es un rediseño de autor que:

- tenga identidad propia inspirada en la cultura india, en clave **contemporánea refinada** (no disfraz ni ornamento recargado);
- se sienta como una app nativa de iPad, con el mismo cuidado en escritorio;
- recupere el espíritu del Ganesha's original (home como puerta de entrada, accesos grandes, comanda al lado del catálogo, pagos de un toque);
- produzca 4 capturas nuevas para el caso de Workana.

**Fuera de alcance:** cambiar reglas de negocio, agregar backend o autenticación real, cambiar el pipeline de despliegue.

## 2. Decisiones tomadas con Luciano

| Tema | Decisión |
|---|---|
| Identidad | Negocio ficticio **Kesar** ("azafrán" en hindi). El nombre del software sigue siendo POS Studio. |
| Intensidad cultural | Contemporánea refinada: paleta, arcos mughal, celosía jali y tipografía de fundiciones indias |
| Navegación | Home-portal + dock inferior dentro de los módulos; se elimina la sidebar |
| Alcance | Todas las pantallas; diseño de autor en Home, Ventas y Caja; el resto hereda componentes |
| Dispositivos | iPad (horizontal y vertical) y escritorio por igual; móvil usable |
| Catálogo | Cambia a un catálogo coherente con la marca |
| Imágenes de producto | Set propio de íconos SVG de línea |
| Personalización | Temas curados en lugar de color libre; se mantiene el segundo escenario |
| Modo noche | Sí, basado en la dirección C |

## 3. Sistema visual

### 3.1 Tipografía
- **Títulos:** Rozha One (Ek Type).
- **Texto e interfaz:** Mukta 400–800 (Ek Type).
- Se cargan desde Google Fonts. El fallback es `Georgia, serif` para los títulos y `system-ui` para el texto.
- Las mismas fuentes en día y noche, para que alternar el modo no desplace nada.

### 3.2 Tokens
Todos los colores se definen como variables CSS. No hay colores sueltos en los componentes.

**Superficies (por modo)**

| Token | Día (Haveli) | Noche (Pavo real) |
|---|---|---|
| `--bg` | `#f8efe0` marfil + resplandor azafrán arriba a la derecha | `#0d1f24` + resplandores pavo real y ciruela |
| `--paper` | `#fffaf1` | `#132c32` |
| `--ink` | `#2a1a10` | `#f1e7d2` |
| `--muted` | `#7d6553` | `#93aaa6` |
| `--line` | `#ead8bd` | `rgba(214,170,82,.26)` (filete dorado) |
| `--ok` / `--warn` / `--danger` | `#3f8f5a` / `#b7791f` / `#b4321c` | `#6fcf97` / `#f0a830` / `#f08a7a` |

**Acentos (por tema curado, cada uno con variante de día y de noche)**

| Tema | `--primary` (acción principal) | `--hero` (panel de bienvenida, pestañas activas) | `--accent` (resaltado, chips) | `--tint` (fondos de íconos) |
|---|---|---|---|---|
| **Azafrán** (por defecto) | sindoor `#c8341c` / noche caléndula `#f0a830` | índigo `#23306b` / noche pavo real `#1f7a78` | azafrán `#e8891d` / noche oro `#d6aa52` | `#fbe6c8` / `rgba(214,170,82,.12)` |
| **Pavo real** | `#1f7a78` / noche `#2aa39f` | `#123f45` / noche `#1f7a78` | caléndula `#f2b632` / noche oro `#d6aa52` | `#d8ece8` / `rgba(42,163,159,.14)` |
| **Índigo** | granza `#a8322a` / noche `#e0705f` | índigo `#1d3466` / noche `#2c4a8a` | ocre `#c98a1b` / noche `#e0b45a` | `#e3e6f2` / `rgba(201,138,27,.14)` |

Los textos sobre `--primary` y `--hero` usan `--on-primary` / `--on-hero`, definidos por tema y verificados con contraste AA (≥ 4,5:1 en el texto de botones).

### 3.3 Firma visual
- **Arco mughal:** las tarjetas del home y el área de imagen de las tarjetas de producto tienen la parte superior en arco (`border-radius` elíptico). El panel de bienvenida tiene un arco más alto.
- **Celosía jali:** un patrón SVG inline (círculos entrelazados) al 14 % de opacidad en el panel de bienvenida y en los encabezados de módulo.
- **Íconos:** ~18 SVG de línea propios en `src/icons.js`, con trazo de 2px y `currentColor`.
- **De noche:** los bordes pasan a filetes dorados, el botón principal tiene un resplandor tipo diya (`box-shadow` caléndula) y el panel de bienvenida suma anillos concéntricos dorados.
- **Movimiento:** solo transiciones de 150–200 ms en presión (`:active` escala a .98) y cambio de modo. Se respeta `prefers-reduced-motion`. Sin efectos hover que dependan del mouse para entender la interfaz.

### 3.4 Modo noche
- Atributo `data-mode="day|night"` en `<html>`.
- El valor inicial sigue `prefers-color-scheme`. El botón ☀/☾ de la barra superior lo alterna y guarda la preferencia en `localStorage` (`pos-kesar-mode`), con lectura y escritura protegidas con `try/catch`.
- No se guarda en el estado de negocio de la demo.
- Se actualiza `<meta name="theme-color">` según el modo.

## 4. Navegación y layout

### 4.1 Home-portal (`inicio`)
- **Barra superior:** marca (logo cargado o monograma "क" en arco sindoor), nombre del negocio y subtítulo; a la derecha, el estado de caja con punto de color, el botón de modo y el chip de usuario.
- **Columna izquierda (≈ 360px):** panel de bienvenida en arco con jali. Contiene el saludo "Namaste, {persona}" (la primera persona activa con el rol seleccionado), la fecha y el turno, la tarjeta "Caja del día" (total de hoy, cantidad de ventas, tiempo desde la última) y el botón de **Checador**, que lleva a Equipo.
- **Columna derecha:** 6 tarjetas en arco (Ventas y Caja destacadas con relleno de color; Inventario, Proveedores, Transacciones y Equipo en papel). Cada una tiene ícono, título y un dato vivo (p. ej. "3 productos por reponer").
- **Debajo:** una fila secundaria con Reportes y Configuración (esta última solo para administrador).

### 4.2 Módulos
- **Barra superior:** botón ← (vuelve al home), título del módulo en Rozha One con el nombre del negocio debajo, acciones del módulo (p. ej. "+ Cargo manual"), estado de caja, botón de modo y chip de usuario.
- **Dock inferior (74px, fijo):** Ventas · Caja · Inventario · Equipo · Más. "Más" abre una hoja con Proveedores, Transacciones, Reportes y Configuración. Cada destino es un botón de al menos 56px de alto, y el activo se marca con `--tint` y `--primary`.
- **Chip de usuario:** reemplaza al "Ver como". Al tocarlo se abre un menú con Administrador y Vendedor. Mantiene `sessionStorage` (`pos-demo-role`).

### 4.3 Breakpoints
| Ancho | Comportamiento |
|---|---|
| ≥ 1280px (escritorio) | Contenido centrado con un máximo de 1320px; el dock es una píldora flotante centrada; en el home, tarjetas de 3 × 2 |
| 900–1279px (iPad horizontal, 1024 y 1180) | Layout de referencia de los mockups |
| 700–899px (iPad vertical, 820 y 834) | Home: el panel de bienvenida arriba en horizontal y las tarjetas en 2 columnas. Ventas: catálogo arriba y comanda como panel inferior fijo y expandible |
| < 700px (móvil) | Tarjetas en 1 columna; en Ventas, la comanda es una hoja inferior con el resumen "Ver comanda (n) · $total"; el dock solo con íconos y etiqueta corta |

En ningún ancho hay scroll horizontal de página. Las tablas anchas hacen scroll dentro de su tarjeta.

## 5. Pantallas

### 5.1 Ventas (diseño de autor)
- **Catálogo:** búsqueda (≥ 50px de alto) y pestañas de área ("Todas" + áreas configuradas) como botones grandes, y una grilla de tarjetas de producto de 3 columnas en iPad horizontal y 4 en escritorio. Cada tarjeta tiene el ícono SVG sobre un fondo en arco teñido según el área, el nombre, el precio en `--primary` y el stock ("6 en stock", "Servicio" o "Agotado" atenuado).
- **Comanda (340–380px):** título "Comanda", responsable y líneas con cantidad en un recuadro, nombre, precio unitario y total de línea, más botones − y + de ≥ 40px.
  - **Responsable:** chips de un toque con las personas activas.
  - **Descuento y propina:** campos compactos en una fila; el descuento con atajos 0 / 10 / 15 %.
  - **Pago:** botones segmentados de un toque con los medios habilitados.
  - **Total:** grande en Rozha One, con impuesto y propina en una línea secundaria.
  - **Botón "Cobrar $X":** `--primary`, ≥ 60px de alto.
  - **Nota de caja:** "Abre caja para aceptar efectivo" cuando corresponde.
- **Vacío:** ilustración de thali con el texto "Toca un producto para empezar".
- Al registrar, se mantiene el modal de comprobante (rediseñado como ticket con borde dentado).

### 5.2 Caja (diseño de autor)
- **Tarjeta de estado grande** (`--hero` con jali): "Caja abierta" o "cerrada", la hora de apertura y el **saldo esperado** en grande.
- **Acciones grandes:** Abrir caja, Ingreso, Egreso y Cerrar caja (solo administrador; el vendedor ve el estado). Ingreso y Egreso abren el modal de movimiento con el signo ya puesto.
- **Línea de tiempo** de movimientos de la sesión (íconos ↗/↘, motivo, hora e importe) y una lista de cierres anteriores con su diferencia (badge ok, sobrante o faltante).

### 5.3 Home
Ver §4.1.

### 5.4 Pantallas que heredan componentes
Inventario, Proveedores, Transacciones, Equipo, Reportes, Configuración y todos los modales se reescriben con los componentes nuevos. No cambian su contenido ni sus acciones.
- **Encabezado de página:** queda en la barra del módulo. Una línea de descripción en `--muted` y las acciones de página a la derecha.
- **Tarjetas de resumen:** reemplazan las `metric-card` numeradas por tarjetas de papel con ícono en círculo `--tint`, sin numeración.
- **Tablas:** dentro de una tarjeta de papel, con encabezados en versalitas `--muted`, filas de ≥ 52px y el producto con su mini ícono SVG.
- **Badges:** ok, warn, danger y neutral con fondos teñidos.
- **Formularios y modales:** hoja centrada con radio 24px y título en Rozha One. En iPad vertical y móvil, los modales suben como hoja inferior.
- **Reportes:** las barras por área y por medio de pago usan los colores del tema; la lista de auditoría queda como línea de tiempo.
- **Configuración:** la tarjeta de identidad muestra una vista previa del monograma o logo. Se reemplaza el selector de color por **3 tarjetas de tema** (muestra de los dos modos) y se conservan los escenarios de ejemplo, la integración simulada y la exportación.

## 6. Datos y lógica

### 6.1 Escenario Kesar (reemplaza a `lounge`; la clave del preset sigue siendo `lounge`)
Kesar está alineado con el negocio real que inspira la demo: un espacio wellness con boutique, cocina vegana, barra y bienestar (ver `portfolio-personal/casos/pos-studio/caso.md`). Por eso **todo el menú es vegano**.

- **Negocio:** `Kesar` · subtítulo `Bienestar · Boutique · Cocina · Barra` · tema `azafran` · MXN.
- **Áreas:** `Barra`, `Cocina`, `Boutique`, `Bienestar`.
- **Proveedores:** `Taller Bagru` (textiles en consignación), `Casa de Latón` (objetos en consignación), `Mercado Verde` (insumos de cocina, compra).
- **Productos** (los IDs nuevos se usan en los tests):

| id | Nombre | Área | Precio | Stock |
|---|---|---|---|---|
| `p-chai` | Chai masala con avena | Barra | 65 | servicio |
| `p-lassi` | Lassi de mango y coco | Barra | 85 | servicio |
| `p-jamaica` | Agua de jamaica y cardamomo | Barra | 55 | servicio |
| `p-samosa` | Samosas de papa (3) | Cocina | 95 | servicio |
| `p-thali` | Thali vegano | Cocina | 210 | servicio |
| `p-dal` | Dal de lentejas rojas | Cocina | 160 | servicio |
| `p-chal` | Chal block-print | Boutique | 890 | 3 · Taller Bagru · consignación |
| `p-diya` | Diya de latón | Boutique | 240 | 6 · Casa de Latón · consignación |
| `p-incienso` | Incienso de sándalo | Boutique | 120 | 14 · Casa de Latón · consignación |
| `p-mala` | Mala de rudraksha | Boutique | 420 | 2 · Taller Bagru · consignación |
| `p-yoga` | Clase de yoga | Bienestar | 250 | servicio |
| `p-sonido` | Baño de sonido | Bienestar | 380 | servicio |

  Los costos siguen la proporción actual (≈ 30–55 % del precio). El primer producto con stock y el primer servicio alimentan el historial sintético, igual que hoy.
- **Equipo:** `emp-mara` Mara (vendedora), `emp-arjun` Arjun (vendedor), `emp-admin` Alex (administrador), con las mismas tarifas y comisiones de hoy.

### 6.2 Escenario `retail` (Mercado Norte)
Mismo contenido, con el tema `indigo` e íconos SVG asignados (café, miel, libreta, termo, taza). Demuestra que el sistema se adapta a otro negocio.

### 6.3 Cambios de modelo
- Producto: `emoji` y `color` se reemplazan por `icon` (clave en `src/icons.js`). El tono del fondo de la tarjeta sale del área (`areaTone(area)` según su posición en `settings.areas`), no del producto. El formulario de producto suma un selector visual de ícono.
- Settings: `accent` se reemplaza por `theme ∈ {azafran, pavo, indigo}`. Si `applyAction('settings')` recibe un valor fuera de la lista, conserva el anterior (mismo patrón que `currency`).
- Cargo manual: usa el ícono `spark`.
- `STORAGE_KEY` pasa a `pos-studio-demo-v2` y `state.version` a 2, así los navegadores con la v1 arrancan con el escenario nuevo.
- La API pública de `domain.js` (`applyAction`, `priceSale`, `dashboardStats`, etc.) no cambia de forma.

## 7. Estructura de código

| Archivo | Responsabilidad |
|---|---|
| `src/data.js` | Escenarios Kesar y Mercado Norte, `createSeed` (v2) |
| `src/domain.js` | Reglas; solo cambia la validación de `theme` |
| `src/icons.js` (nuevo) | `ICONS` (paths SVG), `icon(name, label?)` que devuelve el SVG inline, y la lista de íconos elegibles |
| `src/ui.js` (nuevo) | Componentes de presentación puros: barra superior, dock, encabezado, tarjeta, badge, empty, campo, chips, segmentados |
| `src/app.js` | Estado de la UI, render de vistas, modales y eventos (adelgaza al mover componentes a `ui.js`) |
| `styles.css` | Reescritura completa: tokens → base → layout → componentes → pantallas → breakpoints → night |
| `index.html` | Fuentes, `data-mode` inicial sin parpadeo (script inline mínimo) y `theme-color` |

Los nombres de clase CSS siguen el estilo actual (kebab-case, sin BEM estricto).

## 8. Verificación
1. `npm test` en verde, con los tests actualizados a los IDs nuevos y un test nuevo: "settings acepta un tema curado y conserva el anterior ante un valor desconocido".
2. `npm run build` correcto.
3. Script de capturas con Playwright (en el scratchpad) en 1024×768, 1180×820, 820×1180, 1440×900 y 390×844, en día y noche, sobre Home, Ventas (con 3 líneas en la comanda), Caja, Inventario, Reportes y un modal. Revisión visual de cada captura.
4. Chequeos automáticos en esas corridas: `document.documentElement.scrollWidth <= innerWidth`, ningún botón visible por debajo de 44 × 44px y ningún error de consola.
5. Recorridos manuales del README (abrir caja → vender en efectivo → comprobante → devolución; entrega de proveedor y pago; checador; cambio de tema y de escenario) sin errores.

## 9. Entrega
1. Merge de `rediseno-kesar` a `main` y push (dispara el deploy automático). Esto se hace solo con la confirmación de Luciano.
2. Verificar que el workflow pasó y que `https://pos.athaleo.dev` sirve la versión nueva.
3. Capturas para Workana en `portfolio-personal/casos/pos-studio/capturas/`, reemplazando las antiguas **con los mismos nombres y orden** para no tocar `caso.md` ni `workana-carga.md`. Se toman de producción en iPad horizontal (1180×820 a 2x):
   - `01-portada-panorama.png`: Home de día.
   - `02-punto-de-venta.png`: Ventas de día, con 3–4 productos en la comanda.
   - `03-inventario.png`: Inventario de día.
   - `04-reportes.png`: Reportes **de noche** (muestra el modo noche).
4. Actualizar el README (nombre Kesar, modo noche, temas, nueva sección de diseño) y la sección de capturas de `caso.md` si cambia alguna descripción.
