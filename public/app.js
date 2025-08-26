import { createLink } from '@meshconnect/web-link-sdk'

const ENVIRON = 'sandbox'

// tiny helpers
const $ = s => document.querySelector(s)
const $$ = s => Array.from(document.querySelectorAll(s))
const show = el => el && el.classList.remove('u-hidden')
const hide = el => el && el.classList.add('u-hidden')
const openModal = el => el && el.classList.add('modal--open')
const closeModal = el => el && el.classList.remove('modal--open')
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))

let lastPayload = null // saved from onIntegrationConnected

// ---------- renderers ----------
const renderTransfer = t => {
  if (!t) return
  $('#xfer-body').innerHTML = [
    '<h3>Transfer Results</h3>',
    `<p><strong>Status:</strong> ${esc(t.status)}</p>`,
    `<p><strong>Amount:</strong> $${esc(t.amount)}</p>`,
    `<p><strong>Symbol:</strong> ${esc(t.symbol)}</p>`,
    `<p><strong>Network ID:</strong> <small>${esc(t.networkId)}</small></p>`,
    `<p><strong>To Address:</strong> <small>${esc(t.toAddress)}</small></p>`,
    `<p><strong>Transaction ID:</strong> <small>${esc(t.txId)}</small></p>`
  ].join('')
}

const extractCryptoRows = c => {
  const rows = []
  const push = p => {
    if (!p) return
    const name = p.name || p.tokenName || p.assetName || p.symbol || p.tokenSymbol
    const symbol = p.symbol || p.tokenSymbol || p.ticker
    const amount = p.amount ?? p.quantity ?? p.balance ?? p.units
    if (name || symbol || amount != null) rows.push({ name, symbol, amount })
  }
  if (Array.isArray(c?.cryptocurrencyPositions)) c.cryptocurrencyPositions.forEach(push)
  if (Array.isArray(c?.positions)) c.positions.filter(x => String(x?.assetType || x?.type || '').toLowerCase().includes('crypto')).forEach(push)
  if (Array.isArray(c?.accounts)) c.accounts.forEach(a => (a.cryptocurrencyPositions || a.positions || a.holdings || []).forEach(push))
  return rows
}

const renderCoinbase = h => {
  const rows = extractCryptoRows(h)
  $('#cb-body').innerHTML = rows.length ? `
    <h3>Receiver's Coinbase Portfolio</h3>
    <table>
      <thead><tr><th>Name</th><th>Symbol</th><th>Amount</th></tr></thead>
      <tbody>
        ${rows.map(r => `<tr><td>${esc(r.name || '')}</td><td>${esc(r.symbol || '')}</td><td>${esc(r.amount ?? '')}</td></tr>`).join('')}
      </tbody>
    </table>` : `<h3>Receiver's Coinbase Portfolio</h3><p>No crypto positions.</p>`
}

// after transfer completes: show results + fetch portfolio
const finalizeAfterTransfer = async t => {
  renderTransfer(t); show($('#xfer-box'))
  try {
    const at = lastPayload?.accessToken?.accountTokens?.[0]
    const authToken = at?.accessToken
    const type = lastPayload?.accessToken?.brokerType || 'coinbase'
    if (authToken) {
      const r = await fetch('/portfolio/holdings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authToken, type })
      })
      const holdings = await r.json()
      renderCoinbase(holdings); show($('#cb-box'))
    } else {
      $('#cb-body').innerHTML = `<h3>Receiver's Coinbase Portfolio</h3><p>Missing access token.</p>`
      show($('#cb-box'))
    }
  } catch (e) {
    console.error('holdings fetch failed:', e)
    $('#cb-body').innerHTML = `<h3>Receiver's Coinbase Portfolio</h3><p>Failed to load holdings.</p>`
    show($('#cb-box'))
  }
  
  // Show the receipt view in the modal
  hide($('#donation-form-view'))
  show($('#donation-receipt-view'))
  $('#donate-title').textContent = 'Donation Receipt'
  openModal($('#donate-modal'))
}

// open Mesh using server-generated link token
const openWithToken = async url => {
  const r = await fetch(url)
  const { linkToken, clientId } = await r.json()

  const link = createLink({
    clientId, environment: ENVIRON,
    onIntegrationConnected: p => { lastPayload = p },
    onTransferFinished: t => finalizeAfterTransfer(t),
    onEvent: ev => { if (ev?.type === 'transferExecuted' && ev?.payload) finalizeAfterTransfer(ev.payload) }
  })
  await link.openLink(linkToken)
}

// Loading donate-button values
document.addEventListener('DOMContentLoaded', () => {
  hide($('#xfer-box')); hide($('#cb-box'))
// navigation (Portfolio, About, Contact)
  const pages = {
    portfolio: $('#section-portfolio'),
    about: $('#section-about'),
    contact: $('#section-contact')
  }

  const updateActiveNav = key => {
    $$('.site-nav__links .nav__link').forEach(a => {
      const active = a.dataset.nav === key
      a.classList.toggle('nav__link--active', active)
      if (active) a.setAttribute('aria-current', 'page')
      else a.removeAttribute('aria-current')
    })
  }

  const showPage = key => {
    Object.entries(pages).forEach(([k, el]) => {
      if (!el) return
      if (k === key) show(el)
      else hide(el)
    })
    updateActiveNav(key)
  }

  // Bind nav clicks
  $$('.site-nav__links .nav__link').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault()
      const target = a.dataset.nav
      if (target) showPage(target)
    })
  })

  // Default route
  showPage('portfolio')

  // ----- Slideshow (Portfolio) -----
  const slideshow = $('#slideshow')
  if (slideshow) {
    const slides = $$('#slideshow .slide')
    let idx = 0
    const activate = i => slides.forEach((img, j) => img.classList.toggle('slide--active', j === i))
    if (slides.length) {
      activate(0)
      if (slides.length > 1) {
        setInterval(() => {
          idx = (idx + 1) % slides.length
          activate(idx)
        }, 4500)
      }
    }
  }

  // ----- Contact form (just a placeholder) -----
  const contactForm = $('#contact-form')
  if (contactForm) {
    contactForm.addEventListener('submit', e => {
      e.preventDefault()
      const email = $('#contact-email')?.value.trim()
      const subject = $('#contact-subject')?.value.trim()
      const message = $('#contact-message')?.value.trim()
      if (!email || !subject || !message) {
        alert('Please complete all contact fields.')
        return
      }
      alert('Thanks! Your message has been noted.')
      contactForm.reset()
    })
  }

  const modal = $('#donate-modal')
  const donateBtn = $('#donate-btn')
  const closeX = $('#modal-close')
  const cancelBtn = $('#modal-cancel')
  const form = $('#donate-form')
  const addrInput = $('#donate-address')
  const assetSel = $('#donate-asset')
  const SelectedAmt = $('#donate-amount')

  // open/close modal
  donateBtn?.addEventListener('click', () => openModal(modal))
  closeX?.addEventListener('click', () => closeModal(modal))
  cancelBtn?.addEventListener('click', () => closeModal(modal))
  modal?.addEventListener('click', e => { if (e.target?.dataset?.close === 'overlay') closeModal(modal) })

  // Prefill address with default
  ;(async () => {
    try {
      const cfg = await fetch('/donation-defaults').then(r => r.json())
      if (cfg?.address) addrInput.value = cfg.address
    } catch {
      // leave input empty on failure
    }
  })()


  // ensure amount buttons set hidden value
  $$('#amount-buttons .amounts__opt').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault()
      const amt = String(btn.dataset.amount || '').trim()
      $$('#amount-buttons .amounts__opt').forEach(x => x.classList.remove('amounts__opt--sel'))
      btn.classList.add('amounts__opt--sel')

      SelectedAmt.value = amt
    })
  })

  // Form on Submit: open Link UI
  form?.addEventListener('submit', async e => {
    e.preventDefault()
    const amt = Number.parseFloat((SelectedAmt.value || '50').trim())
    if (!Number.isFinite(amt) || amt <= 0) return alert('Please choose a valid amount.')

    const sym = (assetSel.value || 'USDC').trim()
    const addr = addrInput.value.trim()
    if (!addr) return alert('Destination address is required.')

    const qs = new URLSearchParams({ amountFiat: amt, symbol: sym, address: addr })

    closeModal(modal)
    await openWithToken(`/link-token?${qs}`)
  })

  // Done button handler for donation receipt
  const doneBtn = $('#modal-done')
  if (doneBtn) {
    doneBtn.addEventListener('click', () => {
      closeModal(modal)
      // Reset modal to form view for next time
      hide($('#donation-receipt-view'))
      show($('#donation-form-view'))
      $('#donate-title').textContent = 'Donate with Crypto'
      hide($('#xfer-box'))
      hide($('#cb-box'))
    })
  }
})
