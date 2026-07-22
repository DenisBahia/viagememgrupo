FROM node:22-alpine AS frontend-build
WORKDIR /src/frontend
ARG VITE_GOOGLE_MAPS_API_KEY=""
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend-build
WORKDIR /src
COPY Backend/Backend.csproj Backend/
RUN dotnet restore Backend/Backend.csproj
COPY Backend/ Backend/
RUN dotnet publish Backend/Backend.csproj -c Release -o /out /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_ENVIRONMENT=Production
COPY --from=backend-build /out ./
COPY --from=frontend-build /src/frontend/dist ./wwwroot
EXPOSE 8080
CMD ["sh", "-c", "ASPNETCORE_URLS=http://0.0.0.0:${PORT:-8080} dotnet Backend.dll"]


