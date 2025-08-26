# Mesh Integration Demo
Mock-up artist portfolio with a donation button that
- Creates Mesh link token
- Connects to Coinbase test account
- Sends payment to test wallet
- Fetches portfolio holdings

## Prerequisites
- Node.js 18+
- An account on Mesh to obtain the CLIENT_ID and SANDBOX_KEY 

## Instructions
- Copy `.env.example` and rename to `.env`
  - Change the CLIENT_ID and SANDBOX_KEY to match your client id and client key found in your Mesh dashboard
- From the mesh-demo directory, run `npm install` to install dependencies then `npm run build` to build the frontend
- Start the server with `npm start`, app can be found at http://localhost:3001 (or the port designated at BACKEND_PORT)
