# fx-tools

Pequenas ferramentas internas de finanças.

## Serviço de taxas de câmbio (interno)

Os valores são consultados no serviço interno de taxas, cuja URL base está na variável de ambiente `RATES_API_URL`.

### `GET /latest?base=<MOEDA>`

Devolve as taxas de câmbio da moeda base para outras moedas.

```
GET /latest?base=EUR

200 OK
{
  "base": "EUR",
  "rates": { "USD": 1.1, "GBP": 0.86, "JPY": 161.2 }
}
```

Notas:

- Para converter `X` unidades de `BASE` para `OTHER`, multiplica `X` por `rates.OTHER`.
- As taxas são atualizadas uma vez por hora. O serviço tem quota por cliente, por isso evita chamá-lo mais do que o necessário.
- Uma base desconhecida responde `404`.
- O serviço falha esporadicamente com `500`/`503` (reinícios, deploys).
