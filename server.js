#!/usr/bin/env node
/**
 * HiveMining MCP Server v1.0.0
 * Bitcoin hashrate routing across Tether MDK fleets + Hive auction.
 * Stage 1+2: routing core + Boltz BTC↔USDC payout (atomic swap, never custody).
 *
 * Backend: https://hivemorph.onrender.com
 * Spec   : MCP 2024-11-05 / Streamable-HTTP / JSON-RPC 2.0
 * Brand  : Hive Civilization gold #C08D23 (Pantone 1245 C)
 */

import express from 'express';

const app = express();
app.use(express.json({ limit: '256kb' }));

const PORT = process.env.PORT || 3000;
const HIVE_BASE = process.env.HIVE_BASE || 'https://hivemorph.onrender.com';

// ─── Tool definitions (8) ────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'list_rigs',
    description:
      'List all active Bitcoin mining workers (Tether MDK fleets + Hive auction). Tier 0 — discovery is free. Returns hashrate, energy cost per kWh, region, and operator for each rig.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'quote_hashrate',
    description:
      'Rank destinations for a fleet against the current rig market. Tier 0 — query is free; the 2% routing fee is taken at /book. Returns ranked list with margin estimates so callers can pick best $/TH/day.',
    inputSchema: {
      type: 'object',
      required: ['energy_cost_usdc_per_kwh', 'fleet_size_th_s'],
      properties: {
        energy_cost_usdc_per_kwh: { type: 'number', description: 'Caller fleet energy cost in USDC/kWh', exclusiveMinimum: 0 },
        region: { type: 'string', description: 'Optional region affinity (e.g. us-tx-permian)', default: 'any' },
        fleet_size_th_s: { type: 'number', description: 'Caller fleet size in TH/s', exclusiveMinimum: 0 },
      },
    },
  },
  {
    name: 'book_hashrate',
    description:
      'Book hashrate against a worker. $0.05 USDC at the gate; 2% routing fee on top. Three gates enforced: NEED + YIELD + CLEAN-MONEY. Real EIP-191 signed receipt by the Evaluator wallet — no mocks.',
    inputSchema: {
      type: 'object',
      required: ['worker_id', 'hashrate_th_s', 'duration_minutes', 'payer_address'],
      properties: {
        worker_id: { type: 'string' },
        hashrate_th_s: { type: 'number', exclusiveMinimum: 0 },
        duration_minutes: { type: 'integer', exclusiveMinimum: 0, maximum: 60 * 24 * 30 },
        payer_address: { type: 'string', description: '0x… EVM address paying for the hashrate' },
        settle_asset: { type: 'string', enum: ['USDC', 'USDT'], default: 'USDC' },
      },
    },
  },
  {
    name: 'mining_pnl',
    description:
      'Cumulative routing fee P&L from /v1/mining/book. Tier 0 — free read. Returns every booking row plus the running total in USDC.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'bitcoin_fee_advice',
    description:
      'Bortlesboat-attributed Bitcoin mempool fee landscape + nextblock candidate pool. $0.02 USDC. Real Base USDC settlement of the upstream cdp-bitcoinsapi-com calls — every response carries a consume_tx hash for audit.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'next_block_forecast',
    description:
      'Combines our auction state with Bortlesboat /ai/fees/advice to forecast the next-block fee window. $0.03 USDC. Useful for fee-sensitive submitters timing their BTC tx.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'payout_btc_to_usdc',
    description:
      'Boltz reverse swap: deposit BTC at the returned HTLC address, recipient gets USDC on Base. Atomic — Hive never custodies BTC. 40bps Hive spread fee taken from the swap output. Returns 503 with rail_inactive when HIVE_BOLTZ_ENABLED=0.',
    inputSchema: {
      type: 'object',
      required: ['btc_amount_sats', 'recipient_usdc_address'],
      properties: {
        btc_amount_sats: { type: 'integer', exclusiveMinimum: 0 },
        recipient_usdc_address: { type: 'string', description: '0x… EVM address that receives the swap output' },
      },
    },
  },
  {
    name: 'mining_economics',
    description:
      'Today and cumulative Hive routing-fee revenue plus daily Bortlesboat data spend (against the MINING_SATOSHI_DAILY_BUDGET_USD cap). Tier 0 — free read. Use to monitor budget headroom.',
    inputSchema: { type: 'object', properties: {} },
  },
];

// ─── HTTP helpers ────────────────────────────────────────────────────────────
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

// ─── Tool execution ──────────────────────────────────────────────────────────
async function executeTool(name, args) {
  switch (name) {
    case 'list_rigs': {
      const { status, data } = await hiveGet('/v1/mining/scan');
      return asText({ status, ...data });
    }
    case 'quote_hashrate': {
      const { status, data } = await hivePost('/v1/mining/route', {
        energy_cost_usdc_per_kwh: args.energy_cost_usdc_per_kwh,
        region: args.region || 'any',
        fleet_size_th_s: args.fleet_size_th_s,
      });
      return asText({ status, ...data });
    }
    case 'book_hashrate': {
      const { status, data } = await hivePost('/v1/mining/book', {
        worker_id: args.worker_id,
        hashrate_th_s: args.hashrate_th_s,
        duration_minutes: args.duration_minutes,
        payer_address: args.payer_address,
        settle_asset: args.settle_asset || 'USDC',
      });
      return asText({ status, ...data });
    }
    case 'mining_pnl': {
      const { status, data } = await hiveGet('/v1/mining/pnl');
      return asText({ status, ...data });
    }
    case 'bitcoin_fee_advice': {
      const { status, data } = await hiveGet('/v1/mining/fee-intel');
      return asText({ status, ...data });
    }
    case 'next_block_forecast': {
      const { status, data } = await hiveGet('/v1/mining/next-block-advice');
      return asText({ status, ...data });
    }
    case 'payout_btc_to_usdc': {
      const { status, data } = await hivePost('/v1/mining/payout', {
        btc_amount_sats: args.btc_amount_sats,
        recipient_usdc_address: args.recipient_usdc_address,
      });
      return asText({ status, ...data });
    }
    case 'mining_economics': {
      const { status, data } = await hiveGet('/v1/mining/economics');
      return asText({ status, ...data });
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── MCP JSON-RPC handler ────────────────────────────────────────────────────
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
              version: '1.0.0',
              description: 'Bitcoin hashrate routing across Tether MDK fleets + Hive auction. Real Bortlesboat-attributed fee intel. Boltz BTC↔USDC payout (atomic swap, never custody).',
            },
          },
        });
      case 'tools/list':
        return res.json({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
      case 'tools/call': {
        const { name, arguments: args } = params || {};
        const out = await executeTool(name, args || {});
        return res.json({ jsonrpc: '2.0', id, result: { content: [out] } });
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

// ─── Discovery + health ──────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({
  status: 'ok',
  service: 'hive-mcp-mining',
  version: '1.0.0',
  backend: HIVE_BASE,
  tool_count: TOOLS.length,
}));

app.get('/.well-known/mcp.json', (req, res) => res.json({
  name: 'hive-mcp-mining',
  version: '1.0.0',
  endpoint: '/mcp',
  transport: 'streamable-http',
  protocol: '2024-11-05',
  tools: TOOLS.map(t => ({ name: t.name, description: t.description })),
}));

app.listen(PORT, () => {
  console.log(`HiveMining MCP Server v1.0.0 running on :${PORT}`);
  console.log(`  Backend : ${HIVE_BASE}`);
  console.log(`  Tools   : ${TOOLS.length}`);
});
