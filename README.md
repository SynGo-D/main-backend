# Main Backend

Core backend service for the Automated Code Review platform — the single
HTTP gateway `web-interface` talks to, sitting in front of
`integration-service` and `analysis-engine`.

`GET/repositories/:owner/:repo/analysis[...]` proxies `analysis-engine`'s
`AnalysisResult` (findings + `AnalysisMetrics` + `rule_statistics` +
`file_statistics`) through as bare JSON — `analysis-engine` computes every
metric; this service and `web-interface` only ever forward/display it, per
the platform-wide boundary:

```text
Backend  = analysis + calculation + persistence
Frontend = presentation + interaction
```

## Tech Stack

- Node.js
- TypeScript
- Express
- PostgreSQL

## Run

npm install

npm run dev