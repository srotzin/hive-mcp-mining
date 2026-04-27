<!-- HIVE_BANNER_V1 -->
<p align="center">
  <a href="https://hive-mcp-gateway.onrender.com/mining/health">
    <img src="https://hive-mcp-gateway.onrender.com/og.svg" alt="Hive Civilization MCP Gateway · Bitcoin hashrate routing + Boltz BTC↔USDC · signed receipts" width="100%"/>
  </a>
</p>

<h1 align="center">hive-mcp-mining</h1>

<p align="center"><strong>Bitcoin hashrate routing across Tether MDK fleets · Boltz BTC↔USDC payout · signed receipts</strong></p>

<p align="center">
  <a href="https://smithery.ai/server/hivecivilization/hive-mcp-mining"><img alt="Smithery" src="https://img.shields.io/badge/Smithery-hivecivilization%2Fhive--mcp--mining-C08D23?style=flat-square"/></a>
  <a href="https://glama.ai/mcp/servers"><img alt="Glama" src="https://img.shields.io/badge/Glama-pending-C08D23?style=flat-square"/></a>
  <a href="https://hive-mcp-gateway.onrender.com/mining/health"><img alt="Live" src="https://img.shields.io/badge/gateway-live-C08D23?style=flat-square"/></a>
  <a href="https://github.com/srotzin/hive-mcp-mining/releases"><img alt="Release" src="https://img.shields.io/github/v/release/srotzin/hive-mcp-mining?style=flat-square&color=C08D23"/></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-C08D23?style=flat-square"/></a>
</p>

<p align="center">
  <code>https://hive-mcp-gateway.onrender.com/mining/mcp</code>
</p>

---

# HiveMining

**Bitcoin hashrate routing across Tether MDK fleets + Hive auction. Boltz BTC↔USDC payout — atomic, never custody.**

MCP server for the Hive Mining vertical. 8 tools wrap the Bitcoin hashrate routing core (Tether MDK fleets + the Hive auction), Bortlesboat-attributed mempool fee intel, and a Boltz reverse swap so callers never hand their BTC to a custodian. **Three gates (NEED + YIELD + CLEAN-MONEY)** enforced on every booking. 2% routing fee at `/book`, 40bps spread fee on payouts. Real rails only — when a rail cannot settle, the API returns HTTP 503 with `rail_inactive` or `swap_failed`. No mocks.

## Tools (8)

| Tool                  | Backend                            | Price (USDC) | Notes                                          |
|-----------------------|------------------------------------|--------------|------------------------------------------------|
| `list_rigs`           | `GET /v1/mining/scan`              | free         | MDK + auction discovery                        |
| `quote_hashrate`      | `POST /v1/mining/route`            | free         | Routing query; fee taken at `/book`            |
| `book_hashrate`       | `POST /v1/mining/book`             | $0.05        | 3 gates · 2% routing fee · EIP-191 receipt     |
| `mining_pnl`          | `GET /v1/mining/pnl`               | free         | Cumulative routing fee P&L                     |
| `bitcoin_fee_advice`  | `GET /v1/mining/fee-intel`         | $0.02        | Bortlesboat fees/landscape + nextblock         |
| `next_block_forecast` | `GET /v1/mining/next-block-advice` | $0.03        | Auction state + Bortlesboat /ai/fees/advice    |
| `payout_btc_to_usdc`  | `POST /v1/mining/payout`           | free gate    | Boltz reverse swap; 40bps spread fee           |
| `mining_economics`    | `GET /v1/mining/economics`         | free         | Routing revenue + Bortlesboat data spend       |

## Why atomic swap, not custody?

Boltz reverse swaps move BTC into a HTLC and unlock USDC on Base when the swap completes. Hive never holds BTC at any point — there is no Hive BTC recipient address, by design (`RAILS_RULES.md` Rule 5). If Boltz returns an error or the rail is inactive, callers receive an HTTP 503; Hive will never fall back to a synthetic receipt.

## Bortlesboat attribution

Every response from `bitcoin_fee_advice` and `next_block_forecast` carries:

```json
{
  "attribution": "cdp-bitcoinsapi-com",
  "consume_tx": "0x…",   // real Base USDC tx hash
  "cache_age_seconds": 0
}
```

The `consume_tx` is a real on-chain transaction proving Hive paid the upstream `cdp-bitcoinsapi-com` service — auditable forever. We cap daily Bortlesboat spend at `MINING_SATOSHI_DAILY_BUDGET_USD` (default `$0.50`) and fail-closed when the cap is reached, falling back to the most recent cached payload (with `cache_age_seconds` annotated).

## Quick start

```bash
npx hive-mcp-mining
# or
git clone https://github.com/srotzin/hive-mcp-mining
cd hive-mcp-mining && npm install && node server.js
```

```bash
curl http://localhost:3000/.well-known/mcp.json
curl http://localhost:3000/health
curl -s -X POST http://localhost:3000/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## MCP host config

```json
{
  "mcpServers": {
    "hive-mining": {
      "transport": "streamable-http",
      "url": "https://hive-mcp-gateway.onrender.com/mining/mcp"
    }
  }
}
```

## Three rails rules honored

1. **No mocks.** Every settlement is a real on-chain hop or HTTP 503.
2. **Recipients hardcoded.** Safe Treasury / Solana / Evaluator / CI signer addresses come from `hivemorph/RAILS_RULES.md` Rule 5. We did **not** add a BTC recipient — Stage 2 is atomic-swap by design.
3. **Three gates per morph.** NEED + YIELD + CLEAN-MONEY checked inside `/v1/mining/book`. Stub workers refuse to settle until `HIVE_MDK_ENABLED=1` and a real worker URL is provided.

## License

MIT — see [LICENSE](LICENSE).

## Related Hive MCP servers

- [hive-mcp-gateway](https://github.com/srotzin/hive-mcp-gateway) — unified gateway hosting all Hive MCP servers
- [hive-mcp-compute-grid](https://github.com/srotzin/hive-mcp-compute-grid) — cross-pool compute auction (io.net / Akash / Render)
- [hive-mcp-depin](https://github.com/srotzin/hive-mcp-depin) — DePIN reward routing & verification
- [hive-mcp-morph](https://github.com/srotzin/hive-mcp-morph) — morph spawn/cull, ROI exploitation
