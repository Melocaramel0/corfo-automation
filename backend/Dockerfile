# 1. La base: Usamos una imagen de Node.js (versión 18)
FROM node:18-slim

# 2. Creamos la carpeta de trabajo DENTRO del contenedor
WORKDIR /app

# 3. Copiamos los archivos de dependencias
COPY package.json package-lock.json ./

# 4. Instalamos las dependencias de Node
RUN npm install

# 5. ¡CRÍTICO! Instalamos los navegadores de Playwright
RUN npx playwright install --with-deps

# 6. Copiamos TODO el resto del código del backend
COPY . .

# 7. Compilamos el TypeScript
RUN npm run build

# 8. Exponemos el puerto 3001
EXPOSE 3001

# 9. El comando para arrancar el servidor compilado
CMD [ "npm", "run", "server" ]