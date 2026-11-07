# MayCloud API

Backend del sitio web y del panel administrativo de **MayCloud**. Expone la API pública del sitio, recibe solicitudes de contacto y proporciona herramientas para gestionar prospectos, comunicación, analítica, usuarios y operación del servidor.

El proyecto está construido con NestJS, TypeScript, PostgreSQL y Prisma.

## Estado del proyecto

Actualmente están disponibles:

- Autenticación con JWT, sesiones renovables y control de acceso por permisos.
- Administración de usuarios, roles, permisos y navegación del panel.
- Formulario de contacto bilingüe con protección mediante Cloudflare Turnstile.
- Notificaciones administrativas en tiempo real mediante Socket.IO.
- Correos de contacto y correos comerciales en español e inglés.
- Conversión automática de mensajes del formulario en prospectos del CRM.
- CRM con prospectos, responsables, estados, categorías, notas, actividades, enlaces y servicios potenciales.
- Analítica básica de visitas e interacciones con el formulario.
- Consulta operativa del servidor, contenedores Docker y directorios autorizados.
- Documentación OpenAPI/Swagger configurable por entorno.

## Hoja de ruta

El desarrollo inmediato estará enfocado en convertir el panel administrativo en una herramienta de seguimiento comercial.

1. **Dashboard de seguimiento**
   - Resumen de prospectos por etapa.
   - Prospectos nuevos y pendientes de contactar.
   - Actividad comercial reciente.
   - Indicadores de seguimiento y conversión.
   - Accesos rápidos a prospectos que requieren atención.
2. **Tareas y recordatorios**
   - Próximas llamadas, reuniones y seguimientos.
   - Responsables, fechas límite y alertas de vencimiento.
3. **CMS**
   - Administración del contenido público del sitio desde el panel.
4. **Mejoras al CRM**
   - Tablero Kanban para visualizar y mover prospectos por las etapas del embudo.
   - Métricas comerciales, calificación de prospectos y automatizaciones.

## Tecnologías principales

- Node.js 22.13 o superior.
- NestJS 11.
- TypeScript.
- PostgreSQL.
- Prisma ORM.
- Passport y JWT.
- Socket.IO.
- React Email y Nodemailer.
- Jest, ESLint y Prettier.

## Requisitos

- Node.js `>=22.13.0`.
- npm.
- Una instancia de PostgreSQL accesible.
- Credenciales SMTP si el envío de correo está habilitado.
- Credenciales de Cloudflare Turnstile si su validación está habilitada.

Se recomienda utilizar la versión indicada en [.nvmrc](.nvmrc).

## Configuración local

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Crea el archivo de configuración local a partir del ejemplo:

   ```bash
   cp .env.example .env
   ```

   En PowerShell puedes utilizar:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Configura como mínimo la conexión a PostgreSQL, los secretos JWT, la URL del frontend y el usuario que registrará los prospectos creados desde el formulario.

4. Genera el cliente de Prisma y aplica las migraciones:

   ```bash
   npm run db:generate
   npm run db:deploy
   ```

5. Carga los catálogos, permisos, menús y usuario administrador inicial:

   ```bash
   npm run db:seed
   ```

6. Inicia el servidor en modo desarrollo:

   ```bash
   npm run start:dev
   ```

Por defecto, la API queda disponible en `http://localhost:3000/api`. Si Swagger está habilitado, su interfaz se publica en `http://localhost:3000/docs`.

## Variables de entorno

La lista completa y valores de referencia están en [.env.example](.env.example). No se debe versionar el archivo `.env` ni compartir sus secretos.

### Aplicación

| Variable               | Descripción                                    |
| ---------------------- | ---------------------------------------------- |
| `NODE_ENV`             | Entorno: `development`, `test` o `production`. |
| `PORT`                 | Puerto HTTP del backend.                       |
| `API_PREFIX`           | Prefijo global de la API.                      |
| `FRONTEND_URL`         | URL principal del frontend.                    |
| `CORS_ALLOWED_ORIGINS` | Orígenes permitidos, separados por comas.      |
| `SWAGGER_ENABLED`      | Habilita la documentación Swagger.             |

### Base de datos y seguridad

| Variable                        | Descripción                                                       |
| ------------------------------- | ----------------------------------------------------------------- |
| `DATABASE_URL`                  | Cadena de conexión de PostgreSQL.                                 |
| `JWT_ACCESS_SECRET`             | Secreto JWT de al menos 32 caracteres.                            |
| `JWT_ACCESS_EXPIRES_IN`         | Vigencia del token de acceso.                                     |
| `REFRESH_TOKEN_EXPIRES_IN_DAYS` | Vigencia de la sesión renovable.                                  |
| `CRM_CONTACT_CREATOR_USER_ID`   | UUID del usuario que crea prospectos provenientes del formulario. |

### Integraciones

| Grupo                 | Variables principales                                                                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Turnstile             | `TURNSTILE_ENABLED`, `TURNSTILE_SECRET_KEY`, `TURNSTILE_EXPECTED_HOSTNAME`, `TURNSTILE_EXPECTED_ACTION`                                         |
| Correo                | `MAIL_ENABLED`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`, `MAIL_CONTACT_TO` |
| Servidor              | `SERVER_HOST_ROOT`, `DOCKER_SOCKET_PATH`, `SERVER_DIRECTORIES_ROOT`, `SERVER_DIRECTORIES_NAME`                                                  |
| Administrador inicial | `ADMIN_EMAIL`, `ADMIN_PASSWORD`                                                                                                                 |

`CRM_CONTACT_CREATOR_USER_ID` debe pertenecer a un usuario activo. Primero puede ejecutarse el seed con las credenciales administrativas y después colocar el UUID generado en el entorno definitivo.

## Comandos disponibles

| Comando                   | Propósito                                        |
| ------------------------- | ------------------------------------------------ |
| `npm run start:dev`       | Inicia NestJS con recarga automática.            |
| `npm run build`           | Genera Prisma y compila la aplicación.           |
| `npm run start:prod`      | Ejecuta la compilación de producción.            |
| `npm run lint`            | Ejecuta ESLint.                                  |
| `npm run format`          | Formatea el código con Prettier.                 |
| `npm test -- --runInBand` | Ejecuta las pruebas unitarias.                   |
| `npm run test:e2e`        | Ejecuta las pruebas de extremo a extremo.        |
| `npm run validate`        | Verifica formato, lint, pruebas y compilación.   |
| `npm run db:migrate`      | Crea y aplica migraciones durante el desarrollo. |
| `npm run db:deploy`       | Aplica migraciones existentes en despliegues.    |
| `npm run db:seed`         | Carga datos iniciales y catálogos.               |
| `npm run db:studio`       | Abre Prisma Studio.                              |
| `npm run email:dev`       | Abre las previsualizaciones de correo.           |

## Organización del código

```text
src/
├── admin/          Roles, permisos y navegación administrativa
├── analytics/      Sesiones, eventos y métricas del sitio
├── auth/           Inicio de sesión, JWT y renovación de sesión
├── common/         Guards, decoradores, respuestas y validaciones comunes
├── contact/        Formulario público y bandeja de mensajes
├── crm/            Prospectos y seguimiento comercial
├── database/       Integración con Prisma
├── mail/           Envío y plantillas de correo
├── notifications/  Eventos en tiempo real
├── server/         Información operativa del servidor
└── users/          Administración de usuarios

prisma/
├── migrations/     Historial de cambios de base de datos
├── schema.prisma   Modelos y relaciones
└── seed.ts         Catálogos, permisos y datos iniciales
```

## Flujo de un contacto comercial

1. El visitante envía el formulario público.
2. El backend valida el contenido y, si está habilitado, el token de Turnstile.
3. Se guarda el mensaje y se evita crear un prospecto duplicado por correo.
4. Si el correo aún no existe en el CRM, se crea un prospecto con estado `NEW`.
5. Se notifica al panel administrativo y se preparan los correos correspondientes.
6. El equipo continúa el seguimiento desde el CRM mediante notas, actividades, estados y correos.

## Seguridad y convenciones

- Las rutas son privadas por defecto; las rutas públicas deben declararse explícitamente.
- El acceso administrativo se controla mediante permisos específicos.
- Los DTO rechazan propiedades no declaradas y validan los datos de entrada.
- Helmet, CORS y throttling se configuran globalmente.
- El contenido HTML de los correos del CRM se sanitiza en el servidor.
- Los secretos y credenciales pertenecen exclusivamente al archivo `.env` o al gestor de secretos del entorno.

## Validación antes de integrar cambios

Ejecuta:

```bash
npm run validate
```

Para trabajar específicamente sobre el CRM, cualquier cambio nuevo debe incluir pruebas del servicio y de sus reglas comerciales relevantes.
