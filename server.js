#!/usr/bin/env node
/**
 * hive-mcp-mining — Tether MOS Telemetry + Boltz BTC↔USDC Atomic Swap Broker
 * v2.0.0 — doctrine reclass: hashrate routing removed per Hive supreme rules.
 * Precedent: hive-swarm-trader → hive-swarm-signal-relay.
 *
 * Hive does NOT route hashrate. Hive does NOT custody BTC.
 * This service is read-only MOS telemetry plus atomic-swap broker only.
 *
 * Backend: https://hivemorph.onrender.com
 * Spec   : MCP 2024-11-05 / Streamable-HTTP / JSON-RPC 2.0
 * Brand  : Hive Civilization gold #C08D23 (Pantone 1245 C)
 *
 * Tools (5):
 *   mos.query_sites    — GET /v1/mining/orchestrate/sites (Tier1 $0.001)
 *   mos.query_payouts  — GET /v1/mining/orchestrate/payouts (Tier1 $0.001)
 *   bitcoin_fee_advice — GET /v1/mining/fee-intel (Tier2 $0.02)
 *   next_block_forecast — GET /v1/mining/next-block-advice (Tier2 $0.03)
 *   payout_btc_to_usdc — POST /v1/mining/payout — Boltz atomic swap (Tier3)
 *
 * KILLED routes (410 Gone):
 *   /v1/hashrate/*  /mining/route  /mining/book  hashrate-booking
 *   Tools removed: list_rigs, quote_hashrate, book_hashrate,
 *                  mining_pnl, mining_economics, mos.book_hashrate
 */

import express from 'express';
import { renderLanding, renderRobots, renderSitemap, renderSecurity, renderOgImage, seoJson, BRAND_GOLD } from './meta.js';

const app = express();
app.use(express.json({ limit: '256kb' }));

const PORT = process.env.PORT || 3000;
const HIVE_BASE = process.env.HIVE_BASE || 'https://hivemorph.onrender.com';

// ─── 410 Gone — hashrate routing doctrine kill ───────────────────────────────
const HASHRATE_GONE = {
  error: 'gone',
  reason: 'hashrate routing removed per Hive doctrine — see swarm-trader→signal-relay reclass precedent',
};

// ─── Tool definitions (5 doctrine-clean tools) ───────────────────────────────
const TOOLS = [
  // ── MOS Telemetry (read-only Tether MOS) ─────────────────────────────────
  {
    name: 'mos.query_sites',
    description:
      'Query an operator\'s registered Tether MOS sites and latest site telemetry via the Hive orchestration layer. Read-only. Tier 1 — $0.001 USDC. Returns site list, worker count, and telemetry snapshots. Partner: Tether MOS. Backend: GET /v1/mining/orchestrate/sites.',
    inputSchema: {
      type: 'object',
      required: ['operator_did'],
      properties: {
        operator_did: {
          type: 'string',
          description: 'Operator DID registered with Hive MOS (e.g. did:hive:miner-us-east-1 or did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK). Obtain via your MOS fleet dashboard.',
        },
      },
    },
  },
  {
    name: 'mos.query_payouts',
    description:
      'Get an operator\'s pending USDC payout balance from the Hive earn rails ledger. Read-only. Tier 1 — $0.001 USDC. Returns pending_usdc, settle_chain=base, settle_asset=USDC, payout_threshold_usdc. Partner: Tether MOS. Backend: GET /v1/mining/orchestrate/payouts.',
    inputSchema: {
      type: 'object',
      required: ['operator_did'],
      properties: {
        operator_did: {
          type: 'string',
          description: 'Operator DID registered with Hive earn rails (e.g. did:hive:miner-us-east-1 or did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK). Must match the DID used when registering with hive_onboard or orchestrate/operator/register.',
        },
      },
    },
  },
  // ── Bitcoin fee intel (read-only) ─────────────────────────────────────────
  {
    name: 'bitcoin_fee_advice',
    description:
      'Bortlesboat-attributed Bitcoin mempool fee landscape + nextblock candidate pool. Tier 2 — $0.02 USDC. Real Base USDC settlement of the upstream cdp-bitcoinsapi-com calls — every response carries a consume_tx hash for audit.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'next_block_forecast',
    description:
      'Combines Hive telemetry with Bortlesboat /ai/fees/advice to forecast the next-block fee window. Tier 2 — $0.03 USDC. Useful for fee-sensitive BTC tx submitters timing their submissions.',
    inputSchema: { type: 'object', properties: {} },
  },
  // ── Boltz BTC↔USDC atomic swap broker ────────────────────────────────────
  {
    name: 'payout_btc_to_usdc',
    description:
      'Boltz reverse swap: deposit BTC at the returned HTLC address, recipient gets USDC on Base. Atomic — Hive never custodies BTC. Partner: Boltz. 40bps Hive spread fee taken from the swap output. Returns 503 with rail_inactive when HIVE_BOLTZ_ENABLED=0.',
    inputSchema: {
      type: 'object',
      required: ['btc_amount_sats', 'recipient_usdc_address'],
      properties: {
        btc_amount_sats: { type: 'integer', exclusiveMinimum: 0 },
        recipient_usdc_address: { type: 'string', description: '0x… EVM address that receives the swap output' },
      },
    },
  },
];

// ── DEPRECATED tools (410 doctrine kill) — surfaced for transparency ─────────
const DEPRECATED_TOOLS = [
  { name: 'list_rigs',          status: 'DEPRECATED', description: 'Removed per doctrine — see swarm-trader→signal-relay reclass' },
  { name: 'quote_hashrate',     status: 'DEPRECATED', description: 'Removed per doctrine — see swarm-trader→signal-relay reclass' },
  { name: 'book_hashrate',      status: 'DEPRECATED', description: 'Removed per doctrine — see swarm-trader→signal-relay reclass' },
  { name: 'mining_pnl',         status: 'DEPRECATED', description: 'Removed per doctrine — see swarm-trader→signal-relay reclass' },
  { name: 'mining_economics',   status: 'DEPRECATED', description: 'Removed per doctrine — see swarm-trader→signal-relay reclass' },
  { name: 'mos.book_hashrate',  status: 'DEPRECATED', description: 'Removed per doctrine — see swarm-trader→signal-relay reclass' },
];

const SERVICE_CFG = {
  service: "hive-mcp-mining",
  shortName: "HiveMOS",
  title: "Tether MOS Telemetry + Boltz BTC↔USDC Atomic Swap Broker · Hive Civilization",
  tagline: "Read-only MOS telemetry + Boltz BTC↔USDC atomic swap. No hashrate routing. No custody. Real rails.",
  description: "MCP server for Hive — Tether MOS site telemetry (read-only) and Boltz BTC↔USDC atomic swap broker. 5 tools: MOS site queries, MOS payout queries, Bitcoin fee intel, next-block forecast, and Boltz BTC→USDC reverse swap. USDC settlement on Base L2. Hive does NOT route hashrate. Hive does NOT custody BTC.",
  keywords: ["mcp", "model-context-protocol", "x402", "agentic", "ai-agent", "ai-agents", "llm", "hive", "hive-civilization", "tether", "mos", "mining-os", "boltz", "atomic-swap", "btc", "usdc", "usdt", "base", "base-l2", "agent-economy", "a2a"],
  externalUrl: "https://hive-mcp-mining.onrender.com",
  gatewayMount: "/mining",
  version: "2.0.0",
  pricing: [
    { name: "mos_query_sites",    priceUsd: 0.001, label: "MOS site telemetry (Tier 1)" },
    { name: "mos_query_payouts",  priceUsd: 0.001, label: "MOS payout query (Tier 1)" },
    { name: "bitcoin_fee_advice", priceUsd: 0.02,  label: "Bitcoin fee advice (Tier 2)" },
    { name: "next_block_forecast",priceUsd: 0.03,  label: "Next-block forecast (Tier 2)" },
    { name: "payout_btc_to_usdc", priceUsd: 0,     label: "Boltz BTC→USDC swap (40bps spread)" },
  ],
};
SERVICE_CFG.tools = (typeof TOOLS !== 'undefined' ? TOOLS : []).map(t => ({ name: t.name, description: t.description }));

// ─── HTTP helpers ─────────────────────────────────────────────────────────────
async function hiveGet(path, params = {}) {
  const url = new URL(`${HIVE_BASE}${path.startsWith('/') ? path : '/' + path}`);
  Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(20000) });
  let data; try { data = await res.json(); } catch { data = { raw: await res.text() }; }
  return { status: res.status, data };
}

async function hivePost(path, body) {
  const url = new URL(`${HIVE_BASE}${path}`);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  let data; try { data = await res.json(); } catch { data = { raw: await res.text() }; }
  return { status: res.status, data };
}

function asText(payload) {
  return { type: 'text', text: JSON.stringify(payload, null, 2) };
}

// ─── Tool execution ───────────────────────────────────────────────────────────
async function executeTool(name, args) {
  switch (name) {
    // ── MOS Telemetry ─────────────────────────────────────────────────────
    case 'mos.query_sites': {
      const { status, data } = await hiveGet('/v1/mining/orchestrate/sites', {
        operator_did: args.operator_did,
      });
      return asText({ status, ...data });
    }
    case 'mos.query_payouts': {
      const { status, data } = await hiveGet('/v1/mining/orchestrate/payouts', {
        operator_did: args.operator_did,
      });
      return asText({ status, ...data });
    }
    // ── Bitcoin fee intel ─────────────────────────────────────────────────
    case 'bitcoin_fee_advice': {
      const { status, data } = await hiveGet('/v1/mining/fee-intel');
      return asText({ status, ...data });
    }
    case 'next_block_forecast': {
      const { status, data } = await hiveGet('/v1/mining/next-block-advice');
      return asText({ status, ...data });
    }
    // ── Boltz BTC↔USDC atomic swap broker ────────────────────────────────
    case 'payout_btc_to_usdc': {
      const { status, data } = await hivePost('/v1/mining/payout', {
        btc_amount_sats: args.btc_amount_sats,
        recipient_usdc_address: args.recipient_usdc_address,
      });
      return asText({ status, ...data });
    }
    // ── KILLED tools — doctrine 410 ───────────────────────────────────────
    case 'list_rigs':
    case 'quote_hashrate':
    case 'book_hashrate':
    case 'mining_pnl':
    case 'mining_economics':
    case 'mos.book_hashrate':
      throw Object.assign(new Error('gone'), { code: 410, gone: true, detail: HASHRATE_GONE });
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── MCP JSON-RPC handler ─────────────────────────────────────────────────────
app.post('/mcp', async (req, res) => {
  const { jsonrpc, id, method, params } = req.body || {};
  if (jsonrpc !== '2.0') return res.json({ jsonrpc: '2.0', id, error: { code: -32600, message: 'Invalid JSON-RPC' } });
  try {
    switch (method) {
      case 'initialize':
        return res.json({
          jsonrpc: '2.0', id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: { listChanged: false } },
            serverInfo: {
              name: 'hive-mcp-mining',
              version: '2.0.0',
              description: 'Tether MOS telemetry + Boltz BTC↔USDC atomic swap broker. Read-only MOS site queries + payout queries + Bitcoin fee intel + Boltz reverse swap. Hive does NOT route hashrate. 5 tools.',
            },
          },
        });
      case 'tools/list':
        return res.json({
          jsonrpc: '2.0', id,
          result: {
            tools: TOOLS,
            deprecated: DEPRECATED_TOOLS,
          },
        });
      case 'tools/call': {
        const { name, arguments: args } = params || {};
        try {
          const out = await executeTool(name, args || {});
          return res.json({ jsonrpc: '2.0', id, result: { content: [out] } });
        } catch (err) {
          if (err.gone) {
            return res.json({
              jsonrpc: '2.0', id,
              error: { code: 410, message: 'Gone', data: HASHRATE_GONE },
            });
          }
          throw err;
        }
      }
      case 'ping':
        return res.json({ jsonrpc: '2.0', id, result: {} });
      default:
        return res.json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
    }
  } catch (err) {
    return res.json({ jsonrpc: '2.0', id, error: { code: -32000, message: err.message } });
  }
});

// ─── 410 Gone — hashrate routing kill routes ──────────────────────────────────
// Any /v1/hashrate/*, /mining/route, /mining/book, hashrate-booking surface
const hashrateKillPaths = [
  '/v1/hashrate',
  '/v1/hashrate/*',
  '/mining/route',
  '/mining/book',
  '/hashrate-booking',
];

for (const p of hashrateKillPaths) {
  app.all(p, (req, res) => res.status(410).json(HASHRATE_GONE));
}
// Wildcard kill for any /v1/hashrate/ subtree
app.all('/v1/hashrate/*', (req, res) => res.status(410).json(HASHRATE_GONE));

// ─── Discovery + health ───────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({
  status: 'ok',
  service: 'hive-mcp-mining',
  version: '2.0.0',
  reclass: 'doctrine: hashrate routing removed — Tether MOS telemetry + Boltz BTC↔USDC atomic swap broker only',
  backend: HIVE_BASE,
  tool_count: TOOLS.length,
  deprecated_tool_count: DEPRECATED_TOOLS.length,
  capabilities: [
    'mos-telemetry',
    'boltz-btc-usdc',
    'fee-intel',
    'x402',
  ],
  doctrine: {
    no_hashrate_routing: true,
    no_btc_custody: true,
    read_only_mos: true,
    atomic_swap_broker_only: true,
    precedent: 'hive-swarm-trader→hive-swarm-signal-relay reclass',
  },
  brand: '#C08D23',
  x402: {
    settle_chain: 'base',
    settle_asset: 'USDC',
    treasury: '0x15184bf50b3d3f52b60434f8942b7d52f2eb436e',
  },
  boltz_status: process.env.HIVE_BOLTZ_ENABLED === '1' ? 'live' : 'inactive',
  boltz_note: 'payout_btc_to_usdc available when boltz_status=live. Check this field before calling that tool.',
  partners: {
    mos: 'Tether MOS — read-only telemetry',
    boltz: 'Boltz — BTC↔USDC atomic swap, no custody',
  },
}));

app.get('/.well-known/mcp.json', (req, res) => res.json({
  name: 'hive-mcp-mining',
  version: '2.0.0',
  endpoint: '/mcp',
  transport: 'streamable-http',
  protocol: '2024-11-05',
  description: 'Tether MOS telemetry + Boltz BTC↔USDC atomic swap broker. Hive does NOT route hashrate. Hive does NOT custody BTC.',
  tools: TOOLS.map(t => ({ name: t.name, description: t.description })),
  deprecated_tools: DEPRECATED_TOOLS,
  payment: {
    scheme: 'x402', protocol: 'x402', network: 'base',
    currency: 'USDC', asset: 'USDC',
    address:   '0x15184bf50b3d3f52b60434f8942b7d52f2eb436e',
    recipient: '0x15184bf50b3d3f52b60434f8942b7d52f2eb436e',
    treasury:  'Monroe (W1)',
    rails: [
      {chain:'base',     asset:'USDC', address:'0x15184bf50b3d3f52b60434f8942b7d52f2eb436e'},
      {chain:'base',     asset:'USDT', address:'0x15184bf50b3d3f52b60434f8942b7d52f2eb436e'},
      {chain:'ethereum', asset:'USDT', address:'0x15184bf50b3d3f52b60434f8942b7d52f2eb436e'},
      {chain:'solana',   asset:'USDC', address:'B1N61cuL35fhskWz5dw8XqDyP6LWi3ZWmq8CNA9L3FVn'},
      {chain:'solana',   asset:'USDT', address:'B1N61cuL35fhskWz5dw8XqDyP6LWi3ZWmq8CNA9L3FVn'},
    ],
  },
  extensions: {
    hive_pricing: {
      currency:'USDC', network:'base', model:'per_call',
      first_call_free:true, loyalty_threshold:6,
      loyalty_message:'Every 6th paid call is free',
      treasury:'0x15184bf50b3d3f52b60434f8942b7d52f2eb436e',
      treasury_codename:'Monroe (W1)',
    },
  },
  bogo: {
    first_call_free:true, loyalty_threshold:6,
    pitch:"Pay this once, your 6th paid call is on the house. New here? Add header 'x-hive-did' to claim your first call free.",
    claim_with:'x-hive-did header',
  },
}));

app.get('/.well-known/agent.json', (req, res) => res.json({
  "@context": [
    "https://schema.org",
    "https://hivemorph.onrender.com/v1/a2a/context"
  ],
  "@type": "Service",
  "name": "hive-mcp-mining",
  "version": "2.0.0",
  "description": "Tether MOS telemetry + Boltz BTC↔USDC atomic swap broker. Read-only MOS site queries, payout queries, Bitcoin fee intel, and Boltz reverse swap. Hive does NOT route hashrate. Hive does NOT custody BTC. 5 doctrine-clean tools.",
  "reclass": {
    "from": "hashrate routing + MOS + Boltz",
    "to": "MOS telemetry (read-only) + Boltz atomic swap broker",
    "date": "2026-04-29",
    "precedent": "hive-swarm-trader → hive-swarm-signal-relay",
    "doctrine": "HASHRATE permanently forbidden per Hive supreme rules",
  },
  "url": "https://github.com/srotzin/hive-mcp-mining",
  "provider": {
    "@type": "Organization",
    "name": "Hive",
    "url": "https://hivemorph.onrender.com",
    "email": "hive@hivemorph.ai"
  },
  "license": "https://opensource.org/licenses/MIT",
  "brand": {
    "color": "#C08D23"
  },
  "partners": {
    "mos": "Tether MOS — read-only telemetry partner",
    "boltz": "Boltz — BTC↔USDC atomic swap partner, no custody"
  },
  "capabilities": [
    "mos-telemetry",
    "boltz-btc-usdc",
    "fee-intel",
    "x402",
    "a2a",
    "mcp"
  ],
  "doctrine": {
    "no_hashrate_routing": true,
    "no_btc_custody": true,
    "read_only_mos": true,
    "forbidden": ["HASHRATE", "GAS", "GPU-PERP", "energy-futures"],
    "clean_money": "brand-attributed + no custody"
  },
  "x402": {
    "settle_chain": "base",
    "settle_asset": "USDC",
    "treasury": "0x15184bf50b3d3f52b60434f8942b7d52f2eb436e",
    "pricing": {
      "mos.query_sites":     { "tier": "Tier1", "price_usd": 0.001, "backend": "GET /v1/mining/orchestrate/sites" },
      "mos.query_payouts":   { "tier": "Tier1", "price_usd": 0.001, "backend": "GET /v1/mining/orchestrate/payouts" },
      "bitcoin_fee_advice":  { "tier": "Tier2", "price_usd": 0.02,  "backend": "GET /v1/mining/fee-intel" },
      "next_block_forecast": { "tier": "Tier2", "price_usd": 0.03,  "backend": "GET /v1/mining/next-block-advice" },
      "payout_btc_to_usdc":  { "tier": "Tier3", "price_usd": 0,     "backend": "POST /v1/mining/payout" }
    }
  },
  "a2a": {
    "mcp_endpoint": "https://hive-mcp-mining.onrender.com/mcp",
    "protocol": "2024-11-05",
    "transport": "streamable-http"
  },
  "tools": [
    { "name": "mos.query_sites",     "tier": "Tier1", "price_usd": 0.001, "description": "Query operator Tether MOS sites and telemetry (read-only)" },
    { "name": "mos.query_payouts",   "tier": "Tier1", "price_usd": 0.001, "description": "Get operator pending USDC payout balance (read-only)" },
    { "name": "bitcoin_fee_advice",  "tier": "Tier2", "price_usd": 0.02,  "description": "Bortlesboat BTC mempool fee landscape (real USDC settlement)" },
    { "name": "next_block_forecast", "tier": "Tier2", "price_usd": 0.03,  "description": "Next-block fee forecast with Bortlesboat" },
    { "name": "payout_btc_to_usdc",  "tier": "Tier3", "price_usd": 0,     "description": "Boltz BTC→USDC reverse swap (40bps spread, no custody)" }
  ],
  "deprecated_tools": [
    { "name": "list_rigs",         "status": "DEPRECATED", "description": "Removed per doctrine — see swarm-trader→signal-relay reclass" },
    { "name": "quote_hashrate",    "status": "DEPRECATED", "description": "Removed per doctrine — see swarm-trader→signal-relay reclass" },
    { "name": "book_hashrate",     "status": "DEPRECATED", "description": "Removed per doctrine — see swarm-trader→signal-relay reclass" },
    { "name": "mining_pnl",        "status": "DEPRECATED", "description": "Removed per doctrine — see swarm-trader→signal-relay reclass" },
    { "name": "mining_economics",  "status": "DEPRECATED", "description": "Removed per doctrine — see swarm-trader→signal-relay reclass" },
    { "name": "mos.book_hashrate", "status": "DEPRECATED", "description": "Removed per doctrine — see swarm-trader→signal-relay reclass" }
  ]
}));

// HIVE_META_BLOCK_v1 — comprehensive meta tags + JSON-LD + crawler discovery
app.get('/', (req, res) => {
  res.type('text/html; charset=utf-8').send(renderLanding(SERVICE_CFG));
});
app.get('/og.svg', (req, res) => {
  res.type('image/svg+xml').send(renderOgImage(SERVICE_CFG));
});
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(renderRobots(SERVICE_CFG));
});
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml').send(renderSitemap(SERVICE_CFG));
});
app.get('/.well-known/security.txt', (req, res) => {
  res.type('text/plain').send(renderSecurity());
});
app.get('/seo.json', (req, res) => res.json(seoJson(SERVICE_CFG)));

app.get('/.well-known/agent-card.json', (req, res) => res.json({
  protocolVersion: '0.3.0',
  name: 'hive-mcp-mining',
  description: "Hive Civilization — Tether MOS telemetry + Boltz BTC↔USDC atomic swap broker MCP. Read-only. No custody. No hashrate routing.",
  url: 'https://hive-mcp-mining.onrender.com',
  version: '2.0.0',
  provider: { organization: 'Hive Civilization', url: 'https://hiveagentiq.com' },
  capabilities: { streaming: false, pushNotifications: false },
  defaultInputModes: ['application/json'],
  defaultOutputModes: ['application/json'],
  authentication: { schemes: ['x402', 'api-key'] },
  payment: {
    protocol: 'x402', currency: 'USDC', network: 'base',
    address: '0x15184bf50b3d3f52b60434f8942b7d52f2eb436e'
  },
  extensions: {
    hive_pricing: {
      currency: 'USDC', network: 'base', model: 'per_call',
      first_call_free: true, loyalty_threshold: 6,
      loyalty_message: 'Every 6th paid call is free'
    }
  },
  bogo: {
    first_call_free: true, loyalty_threshold: 6,
    pitch: "Pay this once, your 6th paid call is on the house. New here? Add header 'x-hive-did' to claim your first call free.",
    claim_with: 'x-hive-did header'
  }
}));

app.get('/.well-known/ap2.json', (req, res) => res.json({
  ap2_version: '1.0',
  agent: 'hive-mcp-mining',
  payment_methods: ['x402-usdc-base'],
  treasury: '0x15184bf50b3d3f52b60434f8942b7d52f2eb436e',
  bogo: { first_call_free: true, loyalty_threshold: 6, claim_with: 'x-hive-did header' }
}));

app.listen(PORT, () => {
  console.log(`hive-mcp-mining v2.0.0 — Tether MOS Telemetry + Boltz BTC↔USDC Atomic Swap Broker`);
  console.log(`  Backend : ${HIVE_BASE}`);
  console.log(`  Tools   : ${TOOLS.length} (doctrine-clean)`);
  console.log(`  Killed  : ${DEPRECATED_TOOLS.length} tools (hashrate routing — 410 Gone)`);
});
