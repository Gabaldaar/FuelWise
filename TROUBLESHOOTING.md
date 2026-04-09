# Guía para Solucionar Problemas de Autenticación con GitHub

Este archivo contiene pasos para resolver errores de autenticación al intentar hacer `git push`.

## Problema: `Authentication failed` y `credential-manager` is not a git command

Este error ocurre cuando Git está configurado para usar un gestor de credenciales que no está instalado o no funciona correctamente en tu sistema. En lugar de pedirte un usuario y contraseña, falla.

### Solución

Necesitamos forzar a Git a que olvide esa configuración y te pida tus credenciales de nuevo.

**Paso 1: Eliminar la configuración del gestor de credenciales**

Abre una terminal en tu proyecto y ejecuta el siguiente comando. Esto eliminará la configuración a nivel global en tu máquina, afectando a todos tus repositorios.

```bash
git config --global --unset credential.helper
```

**Paso 2: Generar un Token de Acceso Personal (PAT) en GitHub**

GitHub ya no permite usar tu contraseña directamente. Necesitas un token:

1.  Ve a tu cuenta de GitHub -> **Settings**.
2.  En el menú de la izquierda, ve a **Developer settings**.
3.  Haz clic en **Personal access tokens** -> **Tokens (classic)**.
4.  Haz clic en **"Generate new token"** y luego en **"Generate new token (classic)"**.
5.  Dale un nombre (ej: `MotorLog App Token`), una fecha de expiración (ej: 90 días) y **marca la casilla `repo`**.
6.  Genera el token y **cópialo inmediatamente**. No podrás volver a verlo.

**Paso 3: Intentar el `git push` de nuevo**

1.  Vuelve a tu terminal y ejecuta:
    ```bash
    git push
    ```

2.  Ahora, la terminal debería pedirte tus credenciales:
    *   **Username:** Ingresa tu nombre de usuario de GitHub (`Gabaldaar`).
    *   **Password:** **Pega el Token de Acceso Personal (PAT)** que copiaste en el paso 2.

Esto debería solucionar el problema de autenticación de forma definitiva.