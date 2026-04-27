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
