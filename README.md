# 🗺️ ViagemEmGrupo

Aplicativo web para organizar viagens em grupo com integração ao Google Maps.

## 🚀 Rodando Localmente

### Pré-requisitos
- .NET 10 SDK
- Node.js 20+
- PostgreSQL instalado e rodando

### 1. Backend (ASP.NET Core)

```bash
cd Backend
dotnet run --launch-profile http
# Rodando em: http://localhost:5000
```

### 2. Frontend (React + Vite)

```bash
cd frontend
npm install   # apenas na primeira vez
npm run dev
# Rodando em: http://localhost:5173
```

> O frontend faz proxy de `/api` para o backend em `localhost:5000` automaticamente.

## Deploy com Docker no Railway (FE + BE em 1 container)

Este repositório agora inclui um `Dockerfile` na raiz que:

- builda o frontend (`frontend`) com Vite
- publica o backend (`Backend`) com .NET
- copia o build do frontend para `wwwroot` do backend
- sobe tudo em uma URL/porta no mesmo container

### 1. Suba os arquivos para o GitHub

```bash
git add Dockerfile .dockerignore README.md
git commit -m "add docker deploy for railway"
git push origin main
```

### 2. Criar o projeto no Railway

1. Railway -> **New Project** -> **Deploy from GitHub repo**
2. Selecione este repositório
3. Railway detecta e usa o `Dockerfile` da raiz

### 3. Adicionar banco PostgreSQL no Railway

1. No mesmo projeto: **New** -> **Database** -> **PostgreSQL**
2. Copie a URL de conexão (ou use as variáveis fornecidas pelo plugin)

### 4. Configurar variáveis de ambiente do serviço web

Defina no serviço da aplicação:

- `ConnectionStrings__DefaultConnection` = string de conexão PostgreSQL
- `Jwt__Secret` = segredo forte (32+ caracteres)
- `Jwt__Issuer` = `ViagemEmGrupo`
- `Jwt__Audience` = `ViagemEmGrupoUsers`
- `GoogleMaps__ApiKey` = sua chave Google Maps
- `VITE_GOOGLE_MAPS_API_KEY` = mesma chave (usada no build do frontend)

> No .NET, `__` (duplo underscore) mapeia para `:` no `appsettings`.

### 5. Deploy e validação

Após salvar as variáveis, o Railway dispara novo deploy.

Teste na URL pública:

- abrir `/` (frontend)
- fazer login/cadastro
- validar chamadas `/api/*`
- abrir mapa e confirmar carregamento da Google Maps API

### 6. Deploy contínuo

Cada `git push` para a branch conectada dispara novo deploy automaticamente.

### Configurações

- **Banco de dados**: configurado em `Backend/appsettings.json`
  - `Host=localhost;Database=viagememgrupo;Username=<seu_usuario>`
- **Google Maps API Key**: configurada em `Backend/appsettings.json` e `frontend/.env`
- **JWT Secret**: configurado em `Backend/appsettings.json`

### Migrations (se precisar resetar o banco)

```bash
cd Backend
DOTNET_ROOT=/Users/denisbahia/.dotnet /Users/denisbahia/.dotnet/tools/dotnet-ef database update
```

## 📁 Estrutura

```
ViagemEmGrupo/
├── Backend/          # ASP.NET Core Web API (C#)
│   ├── Controllers/  # AuthController, GroupsController, LocationsController
│   ├── Models/       # User, TravelGroup, GroupMember, Location
│   ├── Data/         # AppDbContext (Entity Framework)
│   ├── Services/     # JwtService, GoogleMapsService
│   └── DTOs/         # Request/Response models
└── frontend/         # React + Vite + TypeScript + Tailwind
    └── src/
        ├── pages/    # LoginPage, RegisterPage, HomePage, DashboardPage
        ├── components/
        │   ├── map/      # TravelMap (Google Maps)
        │   └── locations/ # LocationCard, LocationForm
        └── services/ # api.ts (axios)
```

## 🗺️ Funcionalidades

- ✅ Autenticação (cadastro/login com JWT)
- ✅ Criar grupos de viagem com chave de compartilhamento
- ✅ Entrar em grupos de amigos via chave
- ✅ Adicionar locais via link do Google Maps (auto-preenche nome, endereço, coordenadas, rating)
- ✅ Classificar locais por prioridade: Com Certeza / Seria uma boa / Se rolar, rolou
- ✅ Tipos de local com ícone: 🍽️ 🍺 🏛️ ⛪ 🏨 🎨 🌿
- ✅ Data/hora/duração de visita + rótulo de dia
- ✅ Controle de reserva (precisa/já fez)
- ✅ Mapa interativo com marcadores coloridos por prioridade
- ✅ Filtros por dia, prioridade e tipo
- ✅ Exportar rota para Google Maps
- ✅ Rating do Google exibido nos cards e no mapa
- ✅ Compartilhar grupo com chave de 8 dígitos

