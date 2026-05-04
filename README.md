# Proyecto Integrador: Auditoría de IA y Optimización Final

## Auditoría de Seguridad con Prompts de IA

**Prompt utilizado**

````
Actúa como un experto en ciberseguridad y auditoría de aplicaciones web.

Analiza el siguiente código React y las políticas RLS de Supabase.

Identifica vulnerabilidades relacionadas con:
- XSS
- Inyección (SQL o inputs no sanitizados)
- Fallos de autenticación/autorización
- Exposición de datos sensibles
- Mal uso de Supabase client

Por cada vulnerabilidad:
1. Explica el problema
2. Indica el riesgo real
3. Propón una solución concreta (código o policy)
````

**Respuesta**

````
1. Manipulación del total del pedido (integridad / fraude)
Problema
El importe del pedido lo fija el cliente: createOrder inserta total tal cual llega desde CartPage, y las líneas no recalculan precios en base de datos. Las políticas RLS solo comprueban auth.uid() = user_id, no que total coincida con los productos y cantidades.

Riesgo real
Alto en un e‑commerce real: cualquier usuario autenticado puede crear pedidos con total = 0 o muy inferior al real, manteniendo order_items con productos caros (el catálogo es legítimo, el importe no).

Solución
Recalcular el total en el servidor (única fuente de verdad):

Opción A: RPC en Postgres (SECURITY DEFINER, revocar EXECUTE a anon si aplica) que reciba solo order_id o lista de {product_id, quantity}, lea precios de products con bloqueo/validación e inserte orders + order_items y total calculado.
Opción B: Supabase Edge Function con service role solo ahí, nunca en el cliente.
Ejemplo de idea en SQL (esquema, no copiar ciego a prod sin pruebas):

-- El cliente NO envía total; la función lo calcula desde products.
create or replace function public.create_order_from_cart(items jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_order_id uuid;
  computed_total numeric(12,2);
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  select coalesce(sum((p.price * (i->>'quantity')::int)), 0)
    into computed_total
  from jsonb_array_elements(items) i
  join products p on p.id = (i->>'product_id')::uuid;
  insert into orders (user_id, total) values (uid, computed_total)
  returning id into new_order_id;
  insert into order_items (order_id, product_id, quantity)
  select new_order_id,
         (i->>'product_id')::uuid,
         (i->>'quantity')::int
  from jsonb_array_elements(items) i;
  return new_order_id;
end;
$$;
revoke all on function public.create_order_from_cart(jsonb) from public;
grant execute on function public.create_order_from_cart(jsonb) to authenticated;
Y en el cliente: dejar de enviar total; llamar solo a supabase.rpc('create_order_from_cart', { items: [...] }).

2. Redirección abierta tras login (location.state.from)
Problema
En LoginPage, from se toma de location.state?.from?.pathname y se usa en navigate(from). Ese state lo controla quien construye el enlace (o un sitio que enlace a tu app con state inyectado si el flujo lo permitiera).

Riesgo real
Medio: facilita phishing (“inicia sesión en EcoMart” y tras login redirige a un dominio atacante si el valor no es una ruta interna segura). React Router suele trabajar con rutas relativas, pero rutas como //evil.com o rutas externas mal validadas pueden ser problemáticas según versión y uso.

Solución
Lista blanca de rutas internas o comprobar que sea path relativo sin //:

const DEFAULT = '/dashboard'
function safeInternalPath(pathname) {
  if (!pathname || typeof pathname !== 'string') return DEFAULT
  if (!pathname.startsWith('/') || pathname.startsWith('//')) return DEFAULT
  const allowed = new Set(['/', '/cart', '/dashboard', '/products'])
  if (allowed.has(pathname)) return pathname
  if (pathname.startsWith('/products/')) return pathname
  return DEFAULT
}
const from = safeInternalPath(location.state?.from?.pathname)
// navigate(from, { replace: true })
3. XSS almacenado / contenido no confiable en image_url y nombres de producto
Problema
product.name, product.category y mensajes de error se renderizan como texto en React (bien por defecto: se escapan).
En cambio product.image_url va a <img src={...}> sin validación: el origen del dato es la BD (si alguien con acceso a escritura en products — cuenta comprometida con permisos de admin, bug en panel, etc. — inyecta URLs maliciosas).

Riesgo real
Bajo–medio según quién pueda escribir en products:

javascript: en img src en navegadores modernos suele estar acotado; siguen existiendo vectores de abuso de recursos, tracking, SVG/HTML en otros contextos si en el futuro esa URL se usa en iframe o se pasa a dangerouslySetInnerHTML.
Riesgo mayor si más adelante se renderiza HTML crudo desde el mismo campo.
Solución

Validar en backend al insertar/actualizar productos: solo https: (y dominios permitidos) para image_url.
En frontend, helper que rechace otros esquemas antes de asignar a src:
function safeImageUrl(url) {
  if (!url || typeof url !== 'string') return null
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return null
    return u.href
  } catch {
    return null
  }
}
// <img src={safeImageUrl(product.image_url) ?? '/placeholder.png'} />
4. Carrito en localStorage sin validación de esquema
Problema
readStoredCart() hace JSON.parse y asume un array de líneas con product y quantity, sin comprobar tipos ni IDs UUID.

Riesgo real
Bajo para XSS directo en React (sigue siendo texto escapado).
Medio en lógica de negocio: un usuario (o extensión) puede alterar precios en localStorage; combinado con el punto 1, el fraude ya es posible vía API aunque no toquen localStorage.
Medio si en el futuro algún campo se usa en href, eval, plantillas HTML, etc.

Solución

Validar con esquema (Zod, etc.) al leer, o firmar el carrito en servidor (overkill para demo).
Lo crítico sigue siendo no confiar en precios/total del cliente en el servidor (punto 1).
5. Exposición de mensajes de error de Supabase
Problema
Se muestra error.message de Supabase en UI (LoginPage, RegisterPage, CartPage, etc.).

Riesgo real
Bajo: raramente filtra secretos con anon key; puede revelar detalles internos (nombres de tablas, políticas) útiles para un atacante que prueba el API.

Solución
Mapear errores a mensajes genéricos en producción y registrar el detalle solo en consola/servicio de logs:

function publicAuthErrorMessage(_error) {
  return 'No se pudo iniciar sesión. Comprueba email y contraseña.'
}
6. Sesión en localStorage (Supabase por defecto en SPA)
Problema
supabaseClient usa storage: window.localStorage para tokens de sesión. Cualquier XSS en tu origen puede leer localStorage y robar la sesión.

Riesgo real
Medio–alto si aparece XSS en la app o en dependencias; con React bien usado el riesgo XSS es menor, pero el modelo de amenaza incluye extensiones maliciosas y supply chain.

Solución

Endurecer CSP, dependencias y revisiones de código.
Valorar httpOnly cookies con flujo PKCE y dominio propio (BFF o Supabase con configuración que lo permita) para que JS no lea el token.
Mantener RLS estricta para limitar daño si roban un JWT.
7. Políticas RLS: superficie y función SECURITY DEFINER
Aspectos positivos

orders / order_items acotados a auth.uid().
products solo lectura pública (coherente con catálogo).
No hay service_role en el frontend.
Problema (menor / hardening)

profiles permite INSERT/UPDATE al propio usuario: coherente, pero amplía superficie frente a “solo trigger”; conviene documentar y evitar duplicados con el trigger.
handle_new_user es SECURITY DEFINER: correcto para insertar en profiles; hay que asegurarse en Supabase de que no sea invocable arbitrariamente por roles públicos (en la práctica el trigger es el uso previsto; revisar GRANT EXECUTE en la función).
Riesgo real
Bajo si la función solo se dispara por trigger y no está expuesta como RPC pública.

Solución

revoke all on function public.handle_new_user() from public;
-- y solo lo que necesite el trigger (interno al owner postgres)
(Ajustar nombres exactos según versión de Postgres/Supabase.)

8. “Inyección SQL” desde el cliente
Problema
No aplica el patrón clásico: el cliente usa el SDK con parámetros; no concatena SQL.

Riesgo real
Muy bajo para SQLi en el código actual.

Solución
Seguir sin concatenar SQL; cualquier RPC futura con format() y strings sería el nuevo riesgo — usar siempre parámetros / jsonb como en el ejemplo del punto 1.

9. Ausencia de transacción atómica en createOrder
Problema
Si falla el insert de order_items, puede quedar un order huérfano con total incorrecto o sin líneas.

Riesgo real
Bajo en seguridad; medio en integridad y auditoría.

Solución
Una sola RPC/transacción (mismo bloque PL/pgSQL que en el punto 1) con ROLLBACK en error.

Resumen ejecutivo
Área	Hallazgo principal
Autorización / datos	Total del pedido confiado al cliente (crítico)
Redirección	from sin validar tras login
XSS / contenido	image_url sin restricción; texto en React OK
Supabase client	Uso razonable; mejorar errores, RPC para pedidos
RLS	Adecuado para aislar pedidos por usuario; no sustituye validación de negocio
Si quieres, en el siguiente paso puedo implementar en el repo la RPC create_order_from_cart, las políticas asociadas y los cambios mínimos en ordersApi.js / CartPage.jsx más la lista blanca de redirección en LoginPage.jsx.
````

## Análisis y Optimización del Bundle

**Prompt utilizado**
````
Actúa como un experto en performance frontend.

Este es mi análisis de bundle:
vite v8.0.10 building client environment for production...
✓ 86 modules transformed.
computing gzip size...
dist/index.html                              0.92 kB │ gzip:  0.47 kB
dist/assets/index-DoMoh5Fe.css              21.29 kB │ gzip:  4.77 kB
dist/assets/formatCurrency-g5hbFMns.js       0.11 kB │ gzip:  0.11 kB
dist/assets/productsApi-N3EzHHOv.js          0.37 kB │ gzip:  0.21 kB
dist/assets/ordersApi-ChYN8lhL.js            0.91 kB │ gzip:  0.44 kB
dist/assets/LoginPage-CSCjTRUG.js            1.94 kB │ gzip:  0.84 kB
dist/assets/RegisterPage-D7VCjvQi.js         2.11 kB │ gzip:  0.93 kB
dist/assets/DashboardPage-D8zzBPq4.js        2.13 kB │ gzip:  0.96 kB
dist/assets/ProductDetailPage-CkOBXHgg.js    2.40 kB │ gzip:  1.05 kB
dist/assets/CartPage-BCxZuIvc.js             3.35 kB │ gzip:  1.36 kB
dist/assets/HomePage-BVNlIlgu.js             4.28 kB │ gzip:  1.59 kB
dist/assets/supabaseClient-Cv9g1vUz.js     203.95 kB │ gzip: 52.81 kB
dist/assets/index-BAWCOcBG.js              230.71 kB │ gzip: 73.87 kB

✓ built in 486ms

Sugiere:
- Librerías más ligeras
- Estrategias de code splitting
- Mejoras en Vite y React
````

**Respuesta**
````
Tu build ya está bastante bien repartido: las páginas van en chunks pequeños y el peso real se concentra en dos piezas: Supabase (~204 kB / ~53 kB gzip) y el entry + React + router (~231 kB / ~74 kB gzip). Abajo va el desglose accionable.

Librerías más ligeras
@supabase/supabase-js: Es el mayor coste fijo del bundle. No hay un sustituto oficial “mini” con las mismas capacidades (auth + PostgREST + cliente integrado). Opciones reales:
Quedarte con Supabase y optimizar cómo se carga (es lo habitual en apps BaaS).
Sustituir por fetch directo a la REST API de PostgREST + flujo de auth más manual (p. ej. solo @supabase/gotrue-js o incluso auth propio): menos KB, mucho más código y mantenimiento.
react-router-dom v7: Es razonable para el tamaño; migrar a algo más minimalista rara vez compensa frente a Supabase/React.
No añadir librerías de utilidades pesadas (moment, lodash completo, icon packs enteros) sin importación por icono o sin alternativas nativas (Intl, structuredClone, etc.).
Code splitting (estratégico)
Ya usas React.lazy en AppRoutes.jsx y Suspense en App.jsx, lo cual es correcto.

Supabase en el arranque: AuthContext importa supabase de forma estática, así que todo visitante paga el chunk de Supabase en la primera carga (coherente con getSession + onAuthStateChange al montar). Mejorar “perceived performance” sin quitar bytes:
Skeleton / shell mientras resuelve sesión (ya tienes loading en auth).
Prefetch de la ruta más probable al hacer hover en <Link> (React Router tiene APIs de prefetch en entornos con data routers; con BrowserRouter clásico puedes prefetch manual con requestIdleCallback + import() de la página objetivo).
Evitar que el “main” arrastre páginas: Mantén APIs (productsApi, ordersApi) importadas solo desde páginas que las usan (ya ocurre en buena parte).
Chunks de vendor (no bajan el total, mejoran caché): separar react, react-dom, react-router-dom y eventualmente @supabase/supabase-js en manualChunks hace que un cambio en tu código no invalide el JS de React.
Vite
rollup-plugin-visualizer: Tienes open: true en vite.config.js; en CI o builds repetidos suele molestar. Mejor activarlo solo con un script tipo ANALYZE=true vite build o un vite.config que lea process.env.ANALYZE.
build.rollupOptions.output.manualChunks: Para cacheo (ver arriba).
build.target: Si solo soportas navegadores recientes, subir el target (p. ej. es2022 o baseline-widely-available según documentación de Vite 8) puede reducir transpilación.
Compresión en red: gzip ya lo muestras; en producción Brotli en el CDN/servidor suele bajar un poco más el transferido frente a gzip.
Imágenes: Las URLs de Supabase Storage no entran en el JS; optimiza peso de imágenes (formatos modernos, tamaños) para LCP, no para el bundle.
React
React 19 ya es una base sólida; el coste principal sigue siendo el ecosistema (router + Supabase), no React en sí.
useMemo / useCallback: No reducen el bundle; solo micro-optimizan runtime. No los uses “por performance del build”.
Si en el futuro el árbol de contexto crece, valorar dividir contextos para que componentes que no necesitan auth no re-rendericen; eso es runtime, no tamaño de bundle.
Resumen: Tus números son normales para una SPA con Supabase en la primera visita. El mayor salto de KB solo llegaría con arquitectura distinta (menos SDK, más fetch), o aceptando el coste y optimizando caché de chunks, target de build, Brotli y UX de carga (skeletons, prefetch). Si quieres, en un siguiente paso puedo proponerte un vite.config.js concreto con manualChunks y el visualizer condicionado a variable de entorno.
````

## Endurecimiento de Supabase (Hardening)

**Prompt utilizado**
````
Actúa como un Arquitecto de Seguridad especializado en Supabase, aplicaciones frontend con React y protección de datos.

Tu tarea es realizar una auditoría de seguridad enfocada en el "hardening" de la comunicación entre el frontend (cliente) y Supabase.

## 🎯 Objetivo

Garantizar que:

* No haya exposición de claves sensibles
* La comunicación sea mínima y segura
* Se sigan buenas prácticas de seguridad en el uso de Supabase

---

## 🔍 Instrucciones

Analiza el siguiente código y configuración del proyecto:

1. Archivos de variables de entorno (.env)
2. Inicialización del cliente de Supabase
3. Llamadas desde el frontend a la base de datos
4. Uso de queries (select, insert, etc.)

---

## 🚨 Identifica problemas en:

### 🔑 Variables de entorno

* Exposición de claves sensibles (ej: service_role)
* Uso incorrecto de prefijos (VITE_)
* Variables hardcodeadas en el código

---

### 🔗 Cliente Supabase

* Uso indebido de claves privilegiadas en frontend
* Configuración insegura del cliente

---

### 📡 Comunicación frontend → Supabase

* Queries excesivas (select *)
* Falta de restricción de datos
* Operaciones que deberían estar protegidas por RLS

---

### 🔒 Seguridad general

* Posibles filtraciones de datos
* Superficie de ataque innecesaria
* Malas prácticas en acceso a datos

---

## 📋 Formato de respuesta

Para cada problema encontrado:

### ❌ Problema

Explica claramente qué está mal

### ⚠️ Riesgo

Describe el impacto real (ej: exposición total de la base de datos)

### ✅ Solución

Proporciona:

* Código corregido
* Mejores prácticas aplicadas

---

## 📄 Sección final obligatoria

### ✔ Checklist de Hardening

Genera una lista clara tipo checklist con:

* Buenas prácticas implementadas
* Verificaciones que el desarrollador debe hacer antes de producción


````

**Respuesta**
````
Resumen ejecutivo
El proyecto no expone service_role en el frontend, usa VITE_ solo para URL y clave anon (adecuado en Vite) y las consultas evitan select('*'). El esquema SQL incluye RLS coherente con lo que hace el cliente. Los riesgos más serios están en lógica de negocio y confianza en datos enviados desde el navegador (totales y precios), no tanto en la forma del cliente Supabase.

Hallazgos por categoría
1. Variables de entorno
❌ Problema: Cualquier variable con prefijo VITE_ termina en el bundle público
En Vite, import.meta.env.VITE_* se sustituye en build time y es visible para cualquiera que inspeccione el JS del sitio (no es un “secreto”).

⚠️ Riesgo
La anon key y la URL del proyecto son públicas por diseño en una SPA; el control real debe estar en RLS, políticas y backend. El riesgo aparece si alguien cree que “.env = privado” y mete ahí secretos reales con VITE_ (API keys de terceros, webhooks, etc.).

✅ Solución
Mantener en VITE_ solo lo que debe conocer el navegador (como ahora: URL + anon).
Secretos (service_role, claves de pago, etc.) solo en Edge Functions, servidor o CI, sin prefijo VITE_ y nunca importados desde código de cliente.
Tu .env.example ya orienta bien:

# Copia este archivo a .env y rellena con tu proyecto Supabase (Settings > API).
# Usa la clave anon/public — nunca la service_role en el frontend.
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anon_publica
❌ Problema: Cliente Supabase creado con URL/clave vacías si faltan variables
Si faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY, solo hay un console.warn y se llama a createClient con '':

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[EcoMart] Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env'
  )
}
export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})
⚠️ Riesgo
En despliegues mal configurados, errores confusos, posibles llamadas a endpoints incorrectos y mala señal operativa (la app “arranca” aunque sea inutilizable).

✅ Solución (práctica)
Fallar de forma explícita en producción cuando falten variables (y opcionalmente mostrar UI de error), en lugar de instanciar un cliente vacío:

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const missing = !supabaseUrl || !supabaseAnonKey
if (missing && import.meta.env.PROD) {
  throw new Error('[EcoMart] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY')
}
if (missing) {
  console.warn('[EcoMart] Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env')
}
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.local',
  supabaseAnonKey || 'placeholder',
  { auth: { /* ... */ } }
)
(Ajusta el placeholder solo si necesitas que el módulo cargue en dev sin .env; o bien no exportes cliente hasta tener valores válidos.)

✅ Aspecto positivo: .gitignore protege .env
.env y .env.* están ignorados, con excepción de .env.example — correcto para no subir claves al repositorio.

2. Cliente Supabase
❌ Problema: Sesión en localStorage (comportamiento por defecto del snippet)
⚠️ Riesgo
Cualquier XSS en tu origen puede leer localStorage y apropiarse del refresh token. Es el trade-off habitual del SDK en navegador.

✅ Solución / mitigación
Endurecer CSP, sanitizar HTML, dependencias al día, evitar dangerouslySetInnerHTML.
Valorar auth.storage en memoria solo para flujos ultra sensibles (peor UX: sesión se pierde al recargar), o flujos que combinen servidor + cookies httpOnly (más arquitectura).
✅ Aspecto positivo: No hay service_role ni claves privilegiadas en src/
Solo se usa la clave anon vía env — alineado con Supabase.

3. Comunicación frontend → Supabase (queries y negocio)
❌ Problema: El total del pedido lo decide el cliente
export async function createOrder(userId, lines, total) {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({ user_id: userId, total })
    .select('id')
    .single()
El carrito guarda precios en localStorage (CartContext), editables por el usuario.

⚠️ Riesgo
Con las políticas actuales, un usuario autenticado puede insertar pedidos con total arbitrario (descuentos falsos, totales a 0) si RLS solo exige auth.uid() = user_id y no valida el total frente a precios de catálogo. Eso es fraude / integridad contable, no “hackeo de otras cuentas”.

✅ Solución
RPC o Edge Function create_order_from_cart que:
Lea items (ids + cantidades).
Recalcule precios desde products en el servidor (Postgres con security definer o función con rol elevado controlado).
Inserte orders + order_items en una transacción (una sola unidad atómica).
En order_items, guardar precio unitario al momento de la compra (unit_price) y opcionalmente snapshot fiscal, calculado en el servidor.
El frontend solo envía ids y cantidades, nunca total ni precios de confianza.
Tu README ya apunta en esa dirección (mención a rpc('create_order_from_cart', ...)).

❌ Problema: Dos insert separados (pedido y líneas) sin transacción explícita desde el cliente
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({ user_id: userId, total })
    ...
  const { error: itemsError } = await supabase.from('order_items').insert(rows)
⚠️ Riesgo
Si el segundo insert falla, puedes dejar un pedido huérfano (sin líneas) o estado inconsistente.

✅ Solución
Encapsular en una función SQL o RPC con transacción interna; el cliente hace una llamada.

✅ Aspecto positivo: select con columnas explícitas
  const { data, error } = await supabase
    .from('products')
    .select('id,name,price,image_url,category')
    .order('name')
No hay select('*'); reduce superficie de datos y acoplamiento.

❌ Problema (ligero): unitPrice en el checkout no se persiste
    const payload = lines.map((l) => ({
      productId: l.product.id,
      quantity: l.quantity,
      unitPrice: Number(l.product.price),
    }))
createOrder solo usa productId y quantity en order_items, no unitPrice.

⚠️ Riesgo
Menor para seguridad inmediata, pero auditoría y disputas peores (no queda precio congelado por línea). Convierte el diseño en dependiente del precio actual en products.

✅ Solución
Incluir unit_price en order_items (rellenado solo desde servidor en la RPC recomendada).

4. RLS y políticas (revisión cruzada con el repo)
Tu schema.sql activa RLS y acota bien lectura/escritura por auth.uid() en pedidos y líneas; productos son lectura pública — coherente con un catálogo.

create policy "orders_select_own" on public.orders
  for select using (auth.uid () = user_id);
create policy "orders_insert_own" on public.orders
  for insert with check (auth.uid () = user_id);
...
create policy "order_items_insert_own" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid ()
    )
  );
Importante: RLS aquí protege aislamiento entre usuarios, pero no sustituye validación de negocio del importe si el cliente manda total.

5. Seguridad general / superficie
dist/ en .gitignore: bien; no subir builds con strings de env embebidos a repos públicos si alguna vez se buildeó con .env real (mejor CI limpio).
vite.config.js: visualizer({ open: true }) es comodidad de desarrollo; en pipelines puede abrir navegador o filtrar estructura del bundle — conviene condicionarlo a mode === 'development' (tema de DX más que Supabase).
✔ Checklist de hardening
Buenas prácticas ya alineadas con el repo


Solo
anon/public
en frontend; comentario explícito en
.env.example
contra
service_role
.

RLS activado
en tablas sensibles y políticas por
auth.uid()
en pedidos/líneas.

Consultas con
lista de columnas
, sin
*
.

.env
/
.env.*
en
.gitignore
(excepto
.env.example
).

Permisos SQL mínimos (
grant select
catálogo,
insert
/
select
acotados por RLS).
Verificaciones antes de producción


Confirmar en el panel de Supabase que el SQL desplegado coincide con
schema.sql
(RLS no desactivado en producción).

Sustituir
el flujo de checkout por
RPC/Edge Function
que recalcule totales y use
transacción
.

Añadir
unit_price
(y si aplica impuestos) en
order_items
, rellenado solo en servidor.

Revisar
Auth
: confirmación por email, rate limits, opcional
CAPTCHA
en login/signup si hay abuso.

CSP
estricta y revisión de XSS; asumir que
localStorage
con sesión es objetivo.

No
usar
VITE_
para secretos de terceros; rotar claves si alguna vez se filtró.

Fallar de forma clara si faltan
VITE_SUPABASE_*
en
producción
.

Probar como usuario B que
no
puede leer pedidos ni
order_items
de A (prueba manual o tests de integración contra proyecto staging).

Opcional: políticas explícitas de
UPDATE/DELETE
denegadas por omisión o
FOR ALL
auditado, según necesidad.

Monitoreo: logs de Auth y de API en Supabase; alertas por picos anómalos.
En conjunto: la capa cliente ↔ Supabase está razonablemente acotada para una SPA (anon + RLS + selects explícitos). El endurecimiento que más impacto da ahora es mover la creación de pedidos y el cálculo de importes al servidor (Postgres RPC o Edge Function) y tratar el total como dato no confiable desde el navegador.
````