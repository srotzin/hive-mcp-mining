# hive-mcp-mining v1.1.0

**MOS Orchestration tools — 3 new MCP tools wrapping the Tether MiningOS (MOS) layer.**

## What's new in 1.1.0

3 new MCP tools added (total: 11):

| Tool | Endpoint | Tier | Price |
|------|----------|------|-------|
| `mos.query_hashrate` | `GET /v1/mining/orchestrate/sites` | Tier1 | $0.001 |
| `mos.query_payouts` | `GET /v1/mining/orchestrate/payouts` | Tier1 | $0.001 |
| `mos.book_hashrate` | `POST /v1/mining/book` | Tier3 | $0.05 |

### MOS tool details

- **`mos.query_hashrate(operator_did)`** — Returns registered MOS sites and latest telemetry (hashrate_th_s, workers, temperature, power, efficiency) from the Hive orchestration layer. Read-only, Tier1.
- **`mos.query_payouts(operator_did)`** — Returns pending USDC payout balance from the earn rails ledger, settle_chain=base, settle_asset=USDC, payout threshold. Read-only, Tier1.
- **`mos.book_hashrate(buyer_did, th_per_day, max_price_usdc)`** — Books hashrate demand via the existing `/v1/mining/book` route. Applies 3 gates (NEED + YIELD + CLEAN-MONEY), 2% routing fee, real EIP-191 receipt.

### Updated A2A card / agent.json

- x402 metadata (price per call, treasury address, settle_chain=base, settle_asset=USDC)
- OAC JSON-LD (schema.org/Service)
- `mining-orchestrate` capability tag
- Brand gold `#C08D23`

### How to register an MOS operator

```bash
# 1. Register your MOS instance (Tier3, $0.05)
curl -X POST https://hivemorph.onrender.com/v1/mining/orchestrate/register \
  -H 'Content-Type: application/json' \
  -d '{"operator_did": "did:key:YOUR_DID", "mos_endpoint": "https://your-mos.example.com", "sites": ["site-a"], "wallet_addr": "0xYOUR_WALLET"}'

# 2. Push telemetry (Tier3, $0.05)
curl -X POST https://hivemorph.onrender.com/v1/mining/orchestrate/sites/sync \
  -H 'Content-Type: application/json' \
  -d '{"operator_did": "did:key:YOUR_DID", "site_id": "site-a", "batch_ts": 1714220000, "telemetry": {"hashrate_th_s": 100}}'

# 3. Check payout balance (Tier1, $0.001)
curl https://hivemorph.onrender.com/v1/mining/orchestrate/payouts?operator_did=did:key:YOUR_DID
```

Or use the one-line Docker plugin: [`srotzin/hive-mos-plugin`](https://github.com/srotzin/hive-mos-plugin)

### Smithery listing

To list on [Smithery](https://smithery.ai):
1. Fork or submit to the Smithery registry with the `smithery.yaml` in this repo.
2. Gateway URL: `https://hive-mcp-gateway.onrender.com/mining/mcp`
3. Capability tag: `mining-orchestrate`

---

# hive-mcp-mining v1.0.0

**Bitcoin hashrate routing + Boltz BTC↔USDC payout — public MCP shim for the Hive Mining vertical.**

## What's in 1.0.0

8 MCP tools (JSON-RPC 2.0, MCP 2024-11-05) wrapping `hivemorph.onrender.com/v1/mining/*`:

| Tool                  | Endpoint                           | Price   |
|-----------------------|------------------------------------|---------|
| `list_rigs`           | `GET /v1/mining/scan`              | free    |
| `quote_hashrate`      | `POST /v1/mining/route`            | free    |
| `book_hashrate`       | `POST /v1/mining/book`             | $0.05   |
| `mining_pnl`          | `GET /v1/mining/pnl`               | free    |
| `bitcoin_fee_advice`  | `GET /v1/mining/fee-intel`         | $0.02   |
| `next_block_forecast` | `GET /v1/mining/next-block-advice` | $0.03   |
| `payout_btc_to_usdc`  | `POST /v1/mining/payout`           | free*   |
| `mining_economics`    | `GET /v1/mining/economics`         | free    |

*`/payout` takes the 40bps spread fee from the Boltz swap output, not at the gate.

## Real rails

- **Bortlesboat fee intel** is paid for in real Base USDC from the Hive Evaluator hot wallet; every response carries the `consume_tx` hash.
- **Boltz reverse swap** is real or 503. Hive never custodies BTC — `RAILS_RULES.md` Rule 5 keeps the canonical recipient list intact (no BTC address added).
- **Bookings** sign EIP-191 receipts with the Evaluator key; three gates (NEED + YIELD + CLEAN-MONEY) reject any booking that fails capacity, margin, or self-dealing checks.
- **Daily cap** on Bortlesboat spend (`MINING_SATOSHI_DAILY_BUDGET_USD`, default $0.50) — fail-closed with a cache fallback when exhausted.

## Brand

Hive Civilization gold — `#C08D23` (Pantone 1245 C).

## Provenance

- Backend: [`srotzin/hivemorph`](https://github.com/srotzin/hivemorph) `feat(mining): Stage 1 routing + Satoshi consume + Stage 2 Boltz payout`
- Gateway: <https://hive-mcp-gateway.onrender.com/mining/mcp>
- Direct: <https://hivemorph.onrender.com/v1/mining/*>

## License

MIT.
