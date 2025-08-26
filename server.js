// import express from 'express'
// import fetch from 'node-fetch'
// import dotenv from 'dotenv'


// dotenv.config()

// const app = express()
// const PORT = process.env.BACKEND_PORT || 3001
// const CLIENT_ID = process.env.CLIENT_ID
// const SANDBOX_KEY = process.env.SANDBOX_KEY

// // Network mapping
// const NETWORKS = {
//   ethereum: 'e3c7fdd8-b1fc-4e51-85ae-bb276e075611'
// }

// // Default test address
// const sandboxWallet = '0x0Ff0000f0A0f0000F0F000000000ffFf00f0F0f0'
// const sandboxUser = 'sandboxUser001'


// app.use(express.static('dist')) 
// app.use(express.json())


// // POST /portfolio/holdings  (uses accessToken + type, e.g. 'coinbase')
// app.post('/portfolio/holdings', async (req, res) => {
//   const { authToken, type = 'coinbase' } = req.body || {}
//   if (!authToken) return res.status(400).json({ error: 'authToken_required' })

//   const url = 'https://sandbox-integration-api.meshconnect.com/api/v1/holdings/get'
//   const options = {
//     method: 'POST',
//     headers: {
//       'X-Client-Id': CLIENT_ID,
//       'X-Client-Secret': SANDBOX_KEY,
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify({ authToken, type, includeMarketValue: true })
//   }

//   try {
//     const r = await fetch(url, options)
//     const data = await r.json()
//     if (!r.ok) return res.status(r.status).json(data)
//     return res.json(data.content)
//   } catch (e) {
//     return res.status(500).json({ error: 'mesh_call_failed', detail: e.message })
//   }
// })



// // Getting the session token
// app.get('/link-token', async (_req, res) => {
//   const url = 'https://sandbox-integration-api.meshconnect.com/api/v1/linktoken'

//   const payloadBody = {
//     userId: sandboxUser,
//     transferOptions: {
//       toAddresses: [
//         { networkId: NETWORKS.ethereum, symbol: 'USDC', address: sandboxWallet }
//       ],
//       amountInFiat: 50,
//       isInclusiveFeeEnabled: false,
//       transactionId: 'sandboxTransaction20250826',
//       generatePayLink: false
//     }
//   }

//   const options = {
//     method: 'POST',
//     headers: {
//       'X-Client-Id': CLIENT_ID,
//       'X-Client-Secret': SANDBOX_KEY,
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify(payloadBody)
//   }

//   try {
//     const response = await fetch(url, options)
//     const data = await response.json()

//       // minimal debug to see server reply shape
//     console.log('[mesh] status:', data?.status, 'message:', data?.message)
//     const linkToken = data?.content?.linkToken
//     if (!linkToken) {
//       console.error('[mesh] no linkToken in response:', data)

//     return res.status(400).json({ error: 'no_link_token_in_response', raw: data })
//   }
//     res.json({ linkToken: data.content.linkToken, clientId: CLIENT_ID })
//   } catch (error) {
//     console.error('Error fetching token:', error)
//     res.status(500).json({ error: 'Failed to fetch token', detail: error.message})
//   }
// }
// )

// // Getting the Coinbase portfolio for that userId: 'sandboxUser001'
// // Returns Mesh's aggregated portfolio content for that userId
// app.get('/portfolio/aggregated', async (req, res) => {
//   const { userId } = req.query || sandboxUser

//   const url = `https://sandbox-integration-api.meshconnect.com/api/v1/holdings/portfolio?UserId=${encodeURIComponent(userId)}`
//   const options = {
//     method: 'GET',
//     headers: {
//       'X-Client-Id': CLIENT_ID,
//       'X-Client-Secret': SANDBOX_KEY
//     }
//   }

//   try {
//     const r = await fetch(url, options)
//     const data = await r.json()
//     if (!r.ok) return res.status(r.status).json(data)   // bubble Mesh error
//     return res.json(data.content)                       // aggregated portfolio
//   } catch (e) {
//     console.error('[portfolio/aggregated] error:', e?.message || e)
//     return res.status(500).json({ error: 'mesh_call_failed', detail: e.message })
//   }
// })

// app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))


// server.js
import express from 'express'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.BACKEND_PORT || 3001
const CLIENT_ID = process.env.CLIENT_ID
const SANDBOX_KEY = process.env.SANDBOX_KEY

const API = 'https://sandbox-integration-api.meshconnect.com/api/v1'
const NETWORKS = { ethereum: 'e3c7fdd8-b1fc-4e51-85ae-bb276e075611' }
const sandboxWallet = '0x0Ff0000f0A0f0000F0F000000000ffFf00f0F0f0'
const sandboxUser = 'sandboxUser001'

app.use(express.static('dist'))
app.use(express.json())

// expose defaults to prefill donate form
app.get('/donation-defaults', (_req,res) => res.json({ address: sandboxWallet, symbol: 'USDC' }))


// CREATE LINK TOKEN (takes in amount, symbol, address from form)
app.get('/link-token', async (req, res) => {
  const { amountFiat, symbol = 'USDC', address } = req.query || {}
  const toAddress = (address && String(address)) || sandboxWallet

  const transferOptions = {
    toAddresses: [{ networkId: NETWORKS.ethereum, symbol, address: toAddress }],
    isInclusiveFeeEnabled: false,
    transactionId: 'sandboxTransaction20250826',
    amountInFiat: amountFiat,
    generatePayLink: false
  }

  const payloadBody = { 
    userId: sandboxUser, 
    transferOptions 
  }
  const options = {
    method: 'POST',
    headers: { 
      'X-Client-Id': CLIENT_ID, 
      'X-Client-Secret': SANDBOX_KEY, 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify(payloadBody)
  }

  try {
    const r = await fetch(`${API}/linktoken`, options)
    const data = await r.json()
    const linkToken = data?.content?.linkToken
    if (!linkToken) return res.status(400).json({ error: 'no_link_token_in_response', raw: data })
    return res.json({ linkToken, clientId: CLIENT_ID })
  } catch (error) {
    console.error('Error fetching token:', error)
    return res.status(500).json({ error: 'Failed to fetch token', detail: error.message })
  }
})


// ACCOUNT HOLDINGS (read and display portfolio after transfer)
app.post('/portfolio/holdings', async (req, res) => {
  const { authToken, type = 'coinbase' } = req.body || {}
  if (!authToken) return res.status(400).json({ error: 'authToken_required' })
  try {
    const r = await fetch(`${API}/holdings/get`, {
      method: 'POST',
      headers: { 'X-Client-Id': CLIENT_ID, 'X-Client-Secret': SANDBOX_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ authToken, type, includeMarketValue: true })
    })
    const data = await r.json()
    if (!r.ok) return res.status(r.status).json(data)
    return res.json(data.content)
  } catch (e) {
    console.error('[portfolio/holdings] error:', e?.message || e)
    return res.status(500).json({ error: 'mesh_call_failed', detail: e.message })
  }
})

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
