# POS Studio — demo de Ganesha POS V2

Webapp de demostración basada en el sistema de POS, inventario y operación que Luciano creó para Ganesha's Lounge. Esta versión usa **datos ficticios** y muestra cómo se conectan las ventas, existencias, proveedores, caja, equipo y reportes.

## Abrir la demo local

Requiere Python 3 para servir los módulos JavaScript del navegador. No hay dependencias de npm ni cuentas externas.

```bash
python3 -m http.server 4173
```

Abrir `http://localhost:4173` en el navegador. Los cambios se guardan en `localStorage` del propio navegador. **Configuración → Restablecer** vuelve a los datos de ejemplo. `npm test` ejecuta las pruebas de reglas de negocio con Node.js.

## Recorridos disponibles

1. Abrir caja, vender en efectivo, consultar comprobante y observar stock, caja y reportes.
2. Registrar una entrega o retiro de proveedor, consultar saldo y aplicar un pago.
3. Registrar entrada/salida de un integrante y revisar sus horas y comisiones.
4. Devolver una venta y verificar movimientos compensatorios.
5. Cambiar nombre, logo local, color, áreas, impuestos, moneda de visualización, medios de pago y reglas de stock; probar un segundo escenario de negocio.
6. Simular la cola de sincronización del catálogo, consultar una vista previa de balance y exportar ventas a CSV.

## Estructura

- `src/data.js`: escenarios sintéticos y estado inicial.
- `src/domain.js`: reglas de venta, inventario, proveedores, caja y personal. No depende del DOM.
- `src/app.js`: pantallas, formularios y navegación.
- `styles.css`: diseño responsive para escritorio e iPad.
- `tests/domain.test.js`: recorridos de negocio importantes.

## Alcance de esta versión

Es una **demo local**. El selector de rol sirve para mostrar vistas; no es autenticación real. `localStorage` mantiene los cambios por navegador y no coordina ventas entre dispositivos. Los conectores Wix/correo se simulan, sin usar cuentas reales ni enviar mensajes. La moneda configura el formato de los importes de ejemplo y no realiza conversión de divisas.

Una versión operativa para clientes necesitaría servidor, base de datos transaccional, autenticación y permisos reales, respaldos, importación controlada y pruebas con procesos del negocio. El proyecto de origen en Apps Script se mantiene separado.

**Estado:** borrador privado para revisión de Luciano. No publicar ni distribuir como material final sin su revisión.
