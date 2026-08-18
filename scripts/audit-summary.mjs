import { readFileSync } from "node:fs";

const file = process.argv[2] || "audit.json";
const report = JSON.parse(readFileSync(file, "utf8"));
const vulnerabilities = report.vulnerabilities || {};
const rows = Object.entries(vulnerabilities)
  .map(([name, value]) => ({
    name,
    severity: value.severity || "unknown",
    direct: Boolean(value.isDirect),
    fix: value.fixAvailable === true
      ? "available"
      : value.fixAvailable && typeof value.fixAvailable === "object"
        ? `${value.fixAvailable.name || name}@${value.fixAvailable.version || "?"}${value.fixAvailable.isSemVerMajor ? " (major)" : ""}`
        : "none",
    via: Array.isArray(value.via)
      ? value.via.map((item) => typeof item === "string" ? item : item.title || item.name || "advisory").slice(0, 3).join("; ")
      : "",
  }))
  .sort((a, b) => ["critical", "high", "moderate", "low", "unknown"].indexOf(a.severity) - ["critical", "high", "moderate", "low", "unknown"].indexOf(b.severity));

console.log("Dependency audit summary");
console.log(`total=${rows.length}`);
for (const row of rows) {
  console.log(`${row.severity.toUpperCase()} | ${row.name} | ${row.direct ? "direct" : "transitive"} | fix=${row.fix}${row.via ? ` | ${row.via}` : ""}`);
}

const metadata = report.metadata?.vulnerabilities || {};
console.log(`counts: critical=${metadata.critical || 0} high=${metadata.high || 0} moderate=${metadata.moderate || 0} low=${metadata.low || 0}`);

if ((metadata.critical || 0) > 0) {
  console.error("Critical dependency vulnerability blocks BUILD 12.");
  process.exit(1);
}
