# ----- ETAPA 1: Construir la App React -----
    FROM node:18-alpine AS builder

    WORKDIR /app
    
    # Copiar dependencias e instalarlas
    COPY package.json package-lock.json ./
    RUN npm install
    
    # Copiar el resto del código y construir la app
    COPY . .
    RUN npm run build
    
    # ----- ETAPA 2: Servir los archivos estáticos -----
    FROM nginx:stable-alpine
    
    # Copiar los archivos construidos de la etapa "builder"
    COPY --from=builder /app/dist /usr/share/nginx/html
    
    # ¡IMPORTANTE! Copiar nuestra configuración de Nginx (Paso 2.B)
    COPY nginx.conf /etc/nginx/conf.d/default.conf
    
    # Exponer el puerto 80 (puerto por defecto de Nginx)
    EXPOSE 80
    
    # Comando para iniciar Nginx
    CMD ["nginx", "-g", "daemon off;"]