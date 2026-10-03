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

## Publicación en Athaleo

El repositorio personal es `git@github.com:lucianomarchese/pos.git`. El destino de la demo es `https://pos.athaleo.dev`, servido por el VPS de Athaleo y Caddy. El DNS comodín de `*.athaleo.dev` ya apunta al VPS.

Cada push a `main`, incluido un merge, ejecuta pruebas y prepara los archivos estáticos. Si pasan, GitHub Actions sube una nueva versión al VPS, cambia el enlace `current` y recarga Caddy. Los pull requests a `main` solo ejecutan verificaciones. También se puede iniciar el workflow manualmente.

Para activar el primer despliegue:

1. Verificar `gh auth status` desde una terminal del VPS con acceso de red. Si la credencial no funciona, autenticar `gh` con la cuenta personal `lucianomarchese`.
2. Ejecutar `bash ops/configure-github-secrets.sh` desde una copia de este repositorio en el VPS. El script lee credenciales ya existentes **fuera del repositorio** y crea los seis secretos requeridos en `lucianomarchese/pos`.
3. Subir `main` al remoto o iniciar **Verify and deploy POS demo** en Actions. Comprobar el resultado del workflow y abrir `https://pos.athaleo.dev`.

El workflow instala `/etc/caddy/sites/pos.athaleo.dev.caddy` y publica archivos en `/srv/www/astro/pos`. No requiere crear un servicio de Node ni una base de datos. La configuración de Caddy está en `ops/pos.athaleo.dev.caddy`.

## Estructura

- `src/data.js`: escenarios sintéticos y estado inicial.
- `src/domain.js`: reglas de venta, inventario, proveedores, caja y personal. No depende del DOM.
- `src/app.js`: pantallas, formularios y navegación.
- `styles.css`: diseño responsive para escritorio e iPad.
- `tests/domain.test.js`: recorridos de negocio importantes.
- `scripts/build.mjs`: prepara solo los archivos públicos en `dist/`.
- `.github/workflows/deploy.yml`: verificaciones y despliegue al VPS.

## Alcance de esta versión

Es una **demo local**. El selector de rol sirve para mostrar vistas; no es autenticación real. `localStorage` mantiene los cambios por navegador y no coordina ventas entre dispositivos. Los conectores Wix/correo se simulan, sin usar cuentas reales ni enviar mensajes. La moneda configura el formato de los importes de ejemplo y no realiza conversión de divisas.

Una versión operativa para clientes necesitaría servidor, base de datos transaccional, autenticación y permisos reales, respaldos, importación controlada y pruebas con procesos del negocio. El proyecto de origen en Apps Script se mantiene separado.

**Estado:** demo pública autorizada por Luciano con datos ficticios. Los textos comerciales, capturas y el caso de portfolio siguen en revisión.
