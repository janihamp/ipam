# Local Development Deployment

This guide explains how to run Azure IPAM locally for development and testing.

## Prerequisites

- [Node.js](https://nodejs.org/) v18+ 
- [Azure Functions Core Tools](https://docs.microsoft.com/azure/azure-functions/functions-run-local) v4+
- [Docker](https://www.docker.com/) (optional, for containerized deployment)
- Azure CLI (`az`) logged in
- Service Principal with IPAM Reader role (created during setup)

## Quick Start (Without Docker)

### 1. Configure Environment Variables

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your values:
```
AZURE_TENANT_ID=your-azure-tenant-id
AZURE_CLIENT_ID=your-service-principal-client-id
AZURE_CLIENT_SECRET=<your-client-secret>
```

### 2. Install Dependencies

```bash
# Install API dependencies
cd ../../api
npm install

# Install Frontend dependencies  
cd ../frontend
npm install
```

### 3. Start the API

```bash
cd ../../api
npm start
```

The API will run on `http://localhost:7071`

### 4. Start the Frontend

In a new terminal:

```bash
cd ../../frontend
npm run dev
```

The frontend will run on `http://localhost:3000`

### 5. Access the Dashboard

Open `http://localhost:3000` in your browser. Sign in with your Azure AD account.

---

## Docker Deployment

### 1. Build and Run with Docker Compose

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with your credentials

# Build and start containers
docker-compose up --build
```

### 2. Access the Application

- Frontend: `http://localhost:3000`
- API: `http://localhost:7071`

### 3. Stop the Application

```bash
docker-compose down
```

---

## Configuration Options

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `AZURE_TENANT_ID` | Azure AD tenant ID | Yes |
| `AZURE_CLIENT_ID` | Service principal app ID | Yes |
| `AZURE_CLIENT_SECRET` | Service principal secret | Yes |
| `VITE_AZURE_CLIENT_ID` | Frontend auth client ID (can be same as API) | Yes |
| `VITE_AZURE_TENANT_ID` | Frontend tenant ID | Yes |
| `VITE_API_BASE_URL` | API base URL (default: `/api`) | No |

### Using Azure CLI Authentication (Development Only)

For local development, you can skip the service principal and use your Azure CLI login:

1. Remove or comment out `AZURE_CLIENT_ID` and `AZURE_CLIENT_SECRET` from `.env`
2. Run `az login` before starting the API
3. The API will use `DefaultAzureCredential` which falls back to Azure CLI

---

## Troubleshooting

### "Access Denied" Errors

- Verify the service principal has the "IPAM Reader" role assigned
- Check role assignment scope (should be management group or subscription level)
- Wait a few minutes after role assignment for propagation

### API Not Connecting

- Ensure Azure Functions Core Tools is installed: `func --version`
- Check that port 7071 is not in use
- Verify `local.settings.json` has correct values

### Frontend Auth Issues

- Ensure `VITE_AZURE_CLIENT_ID` and `VITE_AZURE_TENANT_ID` are set
- Add `http://localhost:3000` as a redirect URI in your Azure AD app registration
- Check browser console for MSAL errors

---

## Development Workflow

1. **API Changes**: Edit files in `/api/src/`, the Functions runtime auto-reloads
2. **Frontend Changes**: Vite hot-reloads automatically
3. **To use real Azure data**: Set `USE_MOCK_DATA = false` in `frontend/src/services/api.ts`
