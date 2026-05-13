
"use client";

import { useEffect } from "react";

const PwaSetup = () => {
  useEffect(() => {
    // Solo registrar el Service Worker en producción para evitar errores de redirección en desarrollo
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => console.log("Service Worker registrado con éxito:", registration))
        .catch((error) => console.log("Error en el registro del Service Worker:", error));
    }
  }, []);

  return null;
};

export default PwaSetup;
