<!-- HIVE_BANNER_V1 -->
<p align="center">
  <a href="https://hive-mcp-mining.onrender.com/health">
    <img src="https://hive-mcp-mining.onrender.com/og.svg" alt="Tether MOS Telemetry + Boltz BTC↔USDC Atomic Swap Broker · Hive Civilization" width="100%"/>
  </a>
</p>

<h1 align="center">hive-mcp-mining</h1>

<p align="center"><strong>Tether MOS Telemetry + Boltz BTC↔USDC Atomic Swap Broker</strong></p>

<p align="center">
  <a href="https://smithery.ai/server/hivecivilization"><img alt="Smithery" src="https://img.shields.io/badge/Smithery-hivecivilization-C08D23?style=flat-square"/></a>
  <a href="https://glama.ai/mcp/servers"><img alt="Glama" src="https://img.shields.io/badge/Glama-pending-C08D23?style=flat-square"/></a>
  <a href="https://hive-mcp-mining.onrender.com/health"><img alt="Live" src="https://img.shields.io/badge/service-live-C08D23?style=flat-square"/></a>
  <a href="https://github.com/srotzin/hive-mcp-mining/releases"><img alt="Release" src="https://img.shields.io/github/v/release/srotzin/hive-mcp-mining?style=flat-square&color=C08D23"/></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-C08D23?style=flat-square"/></a>
</p>

<p align="center">
  <code>https://hive-mcp-mining.onrender.com/mcp</code>
</p>

---

# Tether MOS Telemetry + Boltz BTC↔USDC Atomic Swap Broker

**Read-only Tether MOS site telemetry and Boltz BTC↔USDC atomic swap broker via the Hive Civilization.**

> **Doctrine disclaimer:** Hive does NOT route hashrate. Hive does NOT custody BTC. This service is read-only telemetry plus atomic-swap broker only.

MCP server for Hive — Tether MOS site telemetry (read-only) and Boltz BTC↔USDC atomic swap broker. 5 doctrine-clean tools. USDC settlement on Base L2. No mocks. Partners: Tether MOS (telemetry) and Boltz (atomic swap).

**Reclass note:** This repo was reclassed from hashrate routing per Hive supreme rules (precedent: hive-swarm-trader → hive-swarm-signal-relay). All former hashrate-routing routes now return `410 Gone`.

## What this is

`hive-mcp-mining` is a Model Context Protocol (MCP) server that exposes:

1. **Tether MOS Telemetry** — read-only queries to Tether MOS sites and payout balances via the Hive orchestration layer. Partner: Tether.
2. **Boltz BTC↔USDC Atomic Swap Broker** — Boltz reverse swap: deposit BTC at the HTLC address, receive USDC on Base. Hive never custodies BTC. Partner: Boltz.
3. **Bitcoin fee intel** — Bortlesboat-attributed mempool fee landscape and next-block forecast.

- **Protocol:** MCP 2024-11-05 over Streamable-HTTP / JSON-RPC 2.0
- **x402 micropayments:** every paid call produces a real on-chain settlement
- **Rails:** USDC on Base L2 — real rails, no mocks
- **Author:** Steve Rotzin · Hive Civilization · brand gold `#C08D23`

## Tools (5 doctrine-clean)

| Tool | Tier | Price | Description |
|------|------|-------|-------------|
| `mos.query_sites` | Tier 1 | $0.001 | Query Tether MOS sites + telemetry (read-only). Partner: Tether MOS. |
| `mos.query_payouts` | Tier 1 | $0.001 | Get operator pending USDC payout balance (read-only). Partner: Tether MOS. |
| `bitcoin_fee_advice` | Tier 2 | $0.02 | Bortlesboat BTC mempool fee landscape + nextblock candidate pool. |
| `next_block_forecast` | Tier 2 | $0.03 | Next-block fee window forecast with Bortlesboat. |
| `payout_btc_to_usdc` | Tier 3 | 40bps spread | Boltz reverse swap: BTC → USDC on Base. Atomic. No custody. Partner: Boltz. |

### Deprecated tools (removed per doctrine)

The following tools were removed in v2.0.0 per Hive supreme rules. Any call to them via the MCP tools/call interface returns `410 Gone`. The corresponding HTTP routes also return `410 Gone`.

| Tool | Reason |
|------|--------|
| `list_rigs` | Removed per doctrine — see swarm-trader→signal-relay reclass |
| `quote_hashrate` | Removed per doctrine — see swarm-trader→signal-relay reclass |
| `book_hashrate` | Removed per doctrine — see swarm-trader→signal-relay reclass |
| `mining_pnl` | Removed per doctrine — see swarm-trader→signal-relay reclass |
| `mining_economics` | Removed per doctrine — see swarm-trader→signal-relay reclass |
| `mos.book_hashrate` | Removed per doctrine — see swarm-trader→signal-relay reclass |

## Endpoints

| Path | Purpose |
|------|---------|
| `POST /mcp` | JSON-RPC 2.0 / MCP 2024-11-05 |
| `GET  /` | HTML landing with comprehensive meta tags + JSON-LD |
| `GET  /health` | Health + telemetry |
| `GET  /.well-known/mcp.json` | MCP discovery descriptor |
| `GET  /.well-known/agent.json` | Agent metadata (A2A card) |
| `GET  /.well-known/security.txt` | RFC 9116 security contact |
| `GET  /robots.txt` | Allow-all crawl policy |
| `GET  /sitemap.xml` | Crawler sitemap |
| `GET  /og.svg` | 1200×630 Hive-gold OG image |
| `GET  /seo.json` | JSON-LD structured data (SoftwareApplication) |
| `* /v1/hashrate/*` | **410 Gone** — hashrate routing removed per doctrine |
| `* /mining/route` | **410 Gone** — hashrate routing removed per doctrine |
| `* /mining/book` | **410 Gone** — hashrate routing removed per doctrine |
| `* /hashrate-booking` | **410 Gone** — hashrate routing removed per doctrine |

## Doctrine

Three gates satisfied:

- **NEED** — Tether MOS telemetry + Boltz atomic swap address a real infrastructure need
- **YIELD** — per-call pricing on every tool (Tier 1–3, USDC on Base L2)
- **CLEAN-MONEY** — brand-attributed (#C08D23), no custody (Boltz atomic swap), read-only MOS

Hive as PARTNER throughout — Tether as MOS partner, Boltz as atomic swap partner.

Forbidden categories (never present): HASHRATE · GAS · GPU-PERP · energy futures · external market routing.

## License

MIT. © Steve Rotzin / Hive Civilization. Brand gold `#C08D23` (Pantone 1245 C). Never `#f5c518`.

## Hive Civilization Directory

Part of the Hive Civilization — agent-native financial infrastructure.

- Endpoint Directory: https://thehiveryiq.com
- Live Leaderboard: https://hive-a2amev.onrender.com/leaderboard
- Other MCP Servers: https://github.com/srotzin?tab=repositories&q=hive-mcp

Brand: #C08D23
<!-- /hive-footer -->
