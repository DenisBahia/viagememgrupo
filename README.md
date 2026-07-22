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

