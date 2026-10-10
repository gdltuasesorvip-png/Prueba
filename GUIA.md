# Guía paso a paso para poner la app en línea

Esta guía está pensada para alguien que nunca ha publicado una aplicación. Sigue los pasos en orden.
Tiempo estimado: entre 30 y 45 minutos. Costo aproximado: unos 8 dólares al mes de servidor, más
centavos por cada PDF que Claude lea.

## Lo que vas a necesitar

- Tu cuenta de GitHub (donde ya está el código).
- Una tarjeta para pagar el servidor y el uso de Claude.
- Un correo para crear dos cuentas: Anthropic (Claude) y Render (el servidor).

## Paso 1. Unir el código a la rama principal

El código está en una rama de trabajo. Hay que pasarlo a la rama principal del repositorio.

1. Entra a https://github.com/gdltuasesorvip-png/Prueba
2. Verás un aviso amarillo que dice **Compare & pull request**. Haz clic.
   Si no aparece, ve a la pestaña **Pull requests** → **New pull request** y elige la rama
   `claude/insurance-quotes-app-nyrp4u`.
3. Haz clic en **Create pull request**.
4. En la página que se abre, haz clic en **Merge pull request** y luego **Confirm merge**.

Listo: el código quedó en la rama principal.

## Paso 2. Conseguir la clave de Claude

1. Entra a https://console.anthropic.com y crea una cuenta.
2. En el menú, ve a **Billing** (facturación) y carga saldo. Con 10 dólares alcanza para cientos de PDFs.
3. Ve a **API Keys** → **Create Key**. Ponle un nombre (por ejemplo "cotizador").
4. Copia la clave que aparece. Empieza por `sk-ant-`. Guárdala en un lugar seguro: solo se muestra una vez.

## Paso 3. Crear el servidor en Render

1. Entra a https://render.com y crea una cuenta con el botón **Sign in with GitHub**.
   Autoriza a Render a ver tus repositorios cuando lo pida.
2. Arriba a la derecha, haz clic en **New** → **Blueprint**.
3. Elige el repositorio **Prueba**. Si no aparece, haz clic en **Configure account** y dale acceso.
4. Render leerá el archivo `render.yaml` y te pedirá dos valores:
   - **ANTHROPIC_API_KEY**: pega la clave del paso 2.
   - **ADMIN_PASSWORD**: inventa la clave con la que entrarás como administradora. Mínimo 6 caracteres.
5. Haz clic en **Apply**. Render construirá la app; tarda entre 3 y 6 minutos.
6. Cuando el estado diga **Live**, haz clic en el enlace que termina en `.onrender.com`. Esa es la
   dirección de tu app. Compártela con tu equipo.

Render cobra el plan **Starter** (unos 7 dólares al mes) más el disco de 1 GB (unos 25 centavos).
El disco guarda la base de datos y los PDFs, así que no se pierde nada al reiniciar.

## Paso 4. Entrar por primera vez

1. Abre la dirección de la app.
2. Usuario: `admin`. Clave: la que pusiste en ADMIN_PASSWORD.
3. Arriba a la derecha, haz clic en tu nombre para cambiar la clave si quieres.

## Paso 5. Crear a tu equipo

1. Menú **Usuarios** → **+ Nuevo usuario**.
2. Escribe el usuario (por ejemplo `maria`), su nombre, una clave inicial y el rol:
   - **Agente**: cotiza, compara, crea clientes.
   - **Administrador**: además crea usuarios y carga tarifarios.
3. Entrégale a cada persona su usuario y clave. Ella puede cambiarla desde su nombre arriba a la derecha.
4. Si alguien deja el equipo, en **Usuarios** haz clic en **Desactivar**.

## Paso 6. Probar con una cotización real

1. **Clientes** → **+ Nuevo cliente**. Crea uno de prueba.
2. **Cotizaciones** → **+ Nueva comparativa**. Elige el cliente y el ramo.
3. Entra al portal de una compañía, descarga la cotización en PDF y súbela en la app eligiendo la compañía.
4. Espera unos segundos. La página se actualiza sola cuando Claude termina de leer el PDF.
5. Haz clic en **Editar** para revisar lo que leyó. Corrige lo que haga falta y guarda.
6. Repite con las otras compañías. Con dos o más, aparece la tabla comparativa y el botón
   **Generar análisis con Claude**.
7. **Vista para el cliente** abre la versión limpia para imprimir o guardar como PDF.

## Paso 7. Cargar los tarifarios reales

1. Menú **Tarifarios**. Verás tres de EJEMPLO con precios inventados.
2. Entra a cada uno, cambia el nombre del plan, corrige los rangos de edad y las primas, y guarda.
   O bien elimínalos y crea los tuyos con **+ Nuevo tarifario**.
3. Si tienes el tarifario en Excel, guárdalo como CSV con tres columnas (edad desde, edad hasta, prima)
   e impórtalo desde el tarifario.
4. Con los tarifarios cargados, **Cotizar rápido** calcula las primas al instante.

## Si algo falla

- **La app dice "Sin clave de API"**: en Render, entra al servicio → **Environment** y revisa que
  `ANTHROPIC_API_KEY` esté bien pegada. Guarda y Render reinicia solo.
- **Un PDF queda en "Error"**: haz clic en **Releer**. Si vuelve a fallar, el mensaje de error explica
  por qué (clave inválida, sin saldo, documento ilegible). Siempre puedes cargar los datos con **Editar**.
- **Olvidaste la clave de admin**: en Render → **Environment** cambia `ADMIN_PASSWORD`. Eso solo sirve
  si la base de datos está vacía; si ya hay usuarios, pide a otro administrador que la restablezca
  desde **Usuarios**.
- **Quieres ver qué pasó**: en Render, la pestaña **Logs** muestra la actividad del servidor.

## Respaldos

Los datos viven en el disco de Render. En el servicio → **Disks** puedes crear **snapshots** (copias)
manuales antes de cualquier cambio importante.
