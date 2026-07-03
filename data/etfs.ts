// Curated ETF catalog: US-listed majors + UCITS majors.
// Static reference data (TER, domicile, replication, distribution policy)
// that no free API provides reliably; live figures (price, AUM, holdings,
// performance) are enriched at request time from the market-data layer and
// override these baseline values where available. TER/AUM here are the
// issuers' published figures (AUM approximate, USD billions).

export type Replication = "Physical" | "Sampling" | "Synthetic";
export type Distribution = "Accumulating" | "Distributing";
export type EtfAssetClass =
  | "Equity"
  | "Bond"
  | "Commodity"
  | "Real Estate"
  | "Money Market"
  | "Multi-Asset"
  | "Crypto";

export interface EtfCatalogEntry {
  symbol: string; // canonical ticker shown in UI
  yahooSymbol: string; // symbol used for live data
  name: string;
  issuer: string;
  ter: number; // fraction (0.0003 = 0.03%)
  aum: number; // approx USD billions
  domicile: string; // ISO-ish: US, IE, LU, DE, FR
  ucits: boolean;
  replication: Replication;
  distribution: Distribution;
  assetClass: EtfAssetClass;
  region: string; // US | Global | Europe | Emerging Markets | Japan | China ...
  sectorFocus: string; // "Diversified" or a sector/theme
  esg: boolean;
  currency: string;
  exchange: string;
  benchmark: string;
  tags: string[];
  description: string;
  countryWeights?: Record<string, number>; // coarse, fractions
}

type P = Partial<EtfCatalogEntry> &
  Pick<EtfCatalogEntry, "symbol" | "name" | "issuer" | "ter" | "aum" | "benchmark" | "tags" | "description">;

function e(p: P): EtfCatalogEntry {
  return {
    yahooSymbol: p.symbol,
    domicile: "US",
    ucits: false,
    replication: "Physical",
    distribution: "Distributing",
    assetClass: "Equity",
    region: "US",
    sectorFocus: "Diversified",
    esg: false,
    currency: "USD",
    exchange: "NYSE Arca",
    countryWeights: undefined,
    ...p,
  } as EtfCatalogEntry;
}

const US: Record<string, number> = { "United States": 1 };
const WORLD: Record<string, number> = { "United States": 0.63, "Europe": 0.17, "Japan": 0.06, "Canada": 0.03, "Australia": 0.02, "Other": 0.09 };
const ALL_WORLD: Record<string, number> = { "United States": 0.60, "Europe": 0.15, "Japan": 0.06, "China": 0.03, "India": 0.02, "Other": 0.14 };
const EM: Record<string, number> = { "China": 0.25, "India": 0.20, "Taiwan": 0.19, "South Korea": 0.09, "Brazil": 0.05, "Other": 0.22 };
const EUROPE: Record<string, number> = { "United Kingdom": 0.22, "France": 0.16, "Switzerland": 0.14, "Germany": 0.13, "Netherlands": 0.07, "Other": 0.28 };
const DEV_EX_US: Record<string, number> = { "Europe": 0.53, "Japan": 0.21, "Canada": 0.10, "Australia": 0.07, "Other": 0.09 };

export const ETF_CATALOG: EtfCatalogEntry[] = [
  // ------------------------------------------------------------- US core
  e({ symbol: "VOO", name: "Vanguard S&P 500 ETF", issuer: "Vanguard", ter: 0.0003, aum: 520, benchmark: "S&P 500", tags: ["sp500", "core", "low-cost", "large-cap", "us"], description: "The flagship low-cost S&P 500 tracker — 500 largest US companies in one trade.", countryWeights: US }),
  e({ symbol: "SPY", name: "SPDR S&P 500 ETF Trust", issuer: "State Street", ter: 0.000945, aum: 560, benchmark: "S&P 500", tags: ["sp500", "core", "large-cap", "liquid", "us"], description: "The original and most-traded ETF in the world, tracking the S&P 500.", countryWeights: US }),
  e({ symbol: "IVV", name: "iShares Core S&P 500 ETF", issuer: "BlackRock", ter: 0.0003, aum: 500, benchmark: "S&P 500", tags: ["sp500", "core", "low-cost", "large-cap", "us"], description: "iShares' ultra-low-cost core S&P 500 exposure.", countryWeights: US }),
  e({ symbol: "SPLG", name: "SPDR Portfolio S&P 500 ETF", issuer: "State Street", ter: 0.0002, aum: 50, benchmark: "S&P 500", tags: ["sp500", "core", "low-cost", "cheapest", "us"], description: "The cheapest S&P 500 ETF at just 0.02% — built for buy-and-hold investors.", countryWeights: US }),
  e({ symbol: "VTI", name: "Vanguard Total Stock Market ETF", issuer: "Vanguard", ter: 0.0003, aum: 430, benchmark: "CRSP US Total Market", tags: ["total-market", "core", "low-cost", "us"], description: "Every investable US stock — large, mid, small and micro caps — in a single fund.", countryWeights: US }),
  e({ symbol: "QQQ", name: "Invesco QQQ Trust", issuer: "Invesco", ter: 0.002, aum: 300, benchmark: "Nasdaq-100", tags: ["nasdaq100", "tech", "growth", "us"], sectorFocus: "Technology", description: "The Nasdaq-100: 100 of the largest non-financial innovators listed on Nasdaq.", countryWeights: US }),
  e({ symbol: "IWM", name: "iShares Russell 2000 ETF", issuer: "BlackRock", ter: 0.0019, aum: 65, benchmark: "Russell 2000", tags: ["small-cap", "us"], description: "The benchmark for US small-cap stocks — 2,000 smaller companies.", countryWeights: US }),
  e({ symbol: "DIA", name: "SPDR Dow Jones Industrial Average ETF", issuer: "State Street", ter: 0.0016, aum: 35, benchmark: "Dow Jones Industrial Average", tags: ["dow", "blue-chip", "us"], description: "The 30 blue-chip stocks of the Dow Jones Industrial Average.", countryWeights: US }),
  e({ symbol: "VUG", name: "Vanguard Growth ETF", issuer: "Vanguard", ter: 0.0004, aum: 130, benchmark: "CRSP US Large Growth", tags: ["growth", "large-cap", "low-cost", "us"], description: "US large-cap growth companies at rock-bottom cost.", countryWeights: US }),
  e({ symbol: "VTV", name: "Vanguard Value ETF", issuer: "Vanguard", ter: 0.0004, aum: 115, benchmark: "CRSP US Large Value", tags: ["value", "large-cap", "low-cost", "us"], description: "US large-cap value stocks — quality companies at reasonable prices.", countryWeights: US }),

  // -------------------------------------------------------- US intl / global
  e({ symbol: "VT", name: "Vanguard Total World Stock ETF", issuer: "Vanguard", ter: 0.0007, aum: 40, region: "Global", benchmark: "FTSE Global All Cap", tags: ["world", "global", "core", "low-cost", "one-fund"], description: "The entire global stock market — 9,000+ stocks across developed and emerging markets.", countryWeights: ALL_WORLD }),
  e({ symbol: "URTH", name: "iShares MSCI World ETF", issuer: "BlackRock", ter: 0.0024, aum: 4, region: "Global", benchmark: "MSCI World", tags: ["world", "msci-world", "developed"], description: "MSCI World exposure — 1,500 large and mid caps across 23 developed markets.", countryWeights: WORLD }),
  e({ symbol: "VXUS", name: "Vanguard Total International Stock ETF", issuer: "Vanguard", ter: 0.0007, aum: 75, region: "Global ex-US", benchmark: "FTSE Global All Cap ex US", tags: ["international", "ex-us", "low-cost"], description: "Everything outside the US — developed and emerging markets combined.", countryWeights: DEV_EX_US }),
  e({ symbol: "VEA", name: "Vanguard FTSE Developed Markets ETF", issuer: "Vanguard", ter: 0.0005, aum: 140, region: "Developed ex-US", benchmark: "FTSE Developed All Cap ex US", tags: ["developed", "ex-us", "low-cost"], description: "Developed markets outside the US: Europe, Japan, Canada, Australia.", countryWeights: DEV_EX_US }),
  e({ symbol: "VWO", name: "Vanguard FTSE Emerging Markets ETF", issuer: "Vanguard", ter: 0.0008, aum: 85, region: "Emerging Markets", benchmark: "FTSE Emerging Markets All Cap", tags: ["emerging-markets", "low-cost"], description: "Broad emerging-markets exposure: China, India, Taiwan, Brazil and more.", countryWeights: EM }),
  e({ symbol: "EFA", name: "iShares MSCI EAFE ETF", issuer: "BlackRock", ter: 0.0033, aum: 55, region: "Developed ex-US", benchmark: "MSCI EAFE", tags: ["developed", "ex-us", "liquid"], description: "Developed markets in Europe, Australasia and the Far East.", countryWeights: DEV_EX_US }),
  e({ symbol: "EEM", name: "iShares MSCI Emerging Markets ETF", issuer: "BlackRock", ter: 0.0068, aum: 18, region: "Emerging Markets", benchmark: "MSCI Emerging Markets", tags: ["emerging-markets", "liquid"], description: "The most-traded emerging markets ETF.", countryWeights: EM }),
  e({ symbol: "EWJ", name: "iShares MSCI Japan ETF", issuer: "BlackRock", ter: 0.005, aum: 15, region: "Japan", benchmark: "MSCI Japan", tags: ["japan", "single-country"], description: "Large and mid-cap Japanese equities.", countryWeights: { Japan: 1 } }),
  e({ symbol: "MCHI", name: "iShares MSCI China ETF", issuer: "BlackRock", ter: 0.0059, aum: 5, region: "China", benchmark: "MSCI China", tags: ["china", "single-country"], description: "Broad exposure to Chinese equities across share classes.", countryWeights: { China: 1 } }),

  // ------------------------------------------------------ dividend / income
  e({ symbol: "SCHD", name: "Schwab US Dividend Equity ETF", issuer: "Charles Schwab", ter: 0.0006, aum: 65, benchmark: "Dow Jones US Dividend 100", tags: ["dividend", "dividend-growth", "quality", "income", "us"], sectorFocus: "Dividend", description: "100 quality US companies with 10+ years of dividends and strong fundamentals.", countryWeights: US }),
  e({ symbol: "VYM", name: "Vanguard High Dividend Yield ETF", issuer: "Vanguard", ter: 0.0006, aum: 55, benchmark: "FTSE High Dividend Yield", tags: ["dividend", "high-yield", "income", "us"], sectorFocus: "Dividend", description: "400+ US companies with above-average dividend yields.", countryWeights: US }),
  e({ symbol: "VIG", name: "Vanguard Dividend Appreciation ETF", issuer: "Vanguard", ter: 0.0006, aum: 80, benchmark: "S&P US Dividend Growers", tags: ["dividend", "dividend-growth", "quality", "us"], sectorFocus: "Dividend", description: "US companies with 10+ consecutive years of dividend increases.", countryWeights: US }),
  e({ symbol: "JEPI", name: "JPMorgan Equity Premium Income ETF", issuer: "J.P. Morgan", ter: 0.0035, aum: 33, benchmark: "S&P 500 (covered-call overlay)", tags: ["income", "covered-call", "low-volatility", "monthly-income", "us"], sectorFocus: "Income", description: "Monthly income from an actively managed covered-call strategy on US equities.", countryWeights: US }),

  // -------------------------------------------------------------- US sectors
  e({ symbol: "XLK", name: "Technology Select Sector SPDR", issuer: "State Street", ter: 0.0009, aum: 70, benchmark: "Technology Select Sector Index", tags: ["tech", "sector", "us"], sectorFocus: "Technology", description: "S&P 500 technology heavyweights: Apple, Microsoft, Nvidia and peers.", countryWeights: US }),
  e({ symbol: "XLF", name: "Financial Select Sector SPDR", issuer: "State Street", ter: 0.0009, aum: 45, benchmark: "Financial Select Sector Index", tags: ["financials", "sector", "us"], sectorFocus: "Financials", description: "US financial sector: banks, insurers, asset managers, payments.", countryWeights: US }),
  e({ symbol: "XLE", name: "Energy Select Sector SPDR", issuer: "State Street", ter: 0.0009, aum: 35, benchmark: "Energy Select Sector Index", tags: ["energy", "sector", "us"], sectorFocus: "Energy", description: "US energy majors: Exxon, Chevron and the oil & gas complex.", countryWeights: US }),
  e({ symbol: "XLV", name: "Health Care Select Sector SPDR", issuer: "State Street", ter: 0.0009, aum: 38, benchmark: "Health Care Select Sector Index", tags: ["healthcare", "sector", "defensive", "us"], sectorFocus: "Healthcare", description: "US healthcare: pharma, biotech, devices and insurers.", countryWeights: US }),
  e({ symbol: "VGT", name: "Vanguard Information Technology ETF", issuer: "Vanguard", ter: 0.001, aum: 75, benchmark: "MSCI US IMI Info Tech 25/50", tags: ["tech", "sector", "low-cost", "us"], sectorFocus: "Technology", description: "Broad US tech at Vanguard cost — 300+ holdings beyond the mega caps.", countryWeights: US }),
  e({ symbol: "SMH", name: "VanEck Semiconductor ETF", issuer: "VanEck", ter: 0.0035, aum: 20, benchmark: "MVIS US Listed Semiconductor 25", tags: ["semiconductors", "chips", "ai", "tech", "us"], sectorFocus: "Semiconductors", description: "25 leading semiconductor companies — the picks and shovels of the AI era.", countryWeights: US }),
  e({ symbol: "SOXX", name: "iShares Semiconductor ETF", issuer: "BlackRock", ter: 0.0035, aum: 12, benchmark: "NYSE Semiconductor", tags: ["semiconductors", "chips", "ai", "tech", "us"], sectorFocus: "Semiconductors", description: "iShares' take on US-listed semiconductor leaders.", countryWeights: US }),
  e({ symbol: "VNQ", name: "Vanguard Real Estate ETF", issuer: "Vanguard", ter: 0.0012, aum: 33, assetClass: "Real Estate", benchmark: "MSCI US Investable Market Real Estate 25/50", tags: ["reit", "real-estate", "income", "us"], sectorFocus: "Real Estate", description: "US REITs: the simplest way to own income-producing real estate.", countryWeights: US }),

  // ------------------------------------------------------- factor / thematic
  e({ symbol: "MTUM", name: "iShares MSCI USA Momentum Factor ETF", issuer: "BlackRock", ter: 0.0015, aum: 12, benchmark: "MSCI USA Momentum SR Variant", tags: ["momentum", "factor", "us"], sectorFocus: "Factor", description: "US stocks with the strongest recent price momentum.", countryWeights: US }),
  e({ symbol: "QUAL", name: "iShares MSCI USA Quality Factor ETF", issuer: "BlackRock", ter: 0.0015, aum: 45, benchmark: "MSCI USA Sector Neutral Quality", tags: ["quality", "factor", "us"], sectorFocus: "Factor", description: "High-ROE, low-leverage, stable-earnings US companies.", countryWeights: US }),
  e({ symbol: "USMV", name: "iShares MSCI USA Min Vol Factor ETF", issuer: "BlackRock", ter: 0.0015, aum: 24, benchmark: "MSCI USA Minimum Volatility", tags: ["low-volatility", "factor", "defensive", "us"], sectorFocus: "Factor", description: "US equities engineered for a smoother ride.", countryWeights: US }),
  e({ symbol: "COWZ", name: "Pacer US Cash Cows 100 ETF", issuer: "Pacer", ter: 0.0049, aum: 25, benchmark: "Pacer US Cash Cows 100", tags: ["free-cash-flow", "value", "factor", "us"], sectorFocus: "Factor", description: "100 US companies with the highest free-cash-flow yields.", countryWeights: US }),
  e({ symbol: "MOAT", name: "VanEck Morningstar Wide Moat ETF", issuer: "VanEck", ter: 0.0046, aum: 14, benchmark: "Morningstar Wide Moat Focus", tags: ["moat", "quality", "value", "us"], sectorFocus: "Factor", description: "Companies with durable competitive advantages, priced attractively per Morningstar.", countryWeights: US }),
  e({ symbol: "ARKK", name: "ARK Innovation ETF", issuer: "ARK Invest", ter: 0.0075, aum: 7, benchmark: "Actively managed", tags: ["innovation", "disruptive", "growth", "active", "us"], sectorFocus: "Innovation", description: "Cathie Wood's flagship bet on disruptive innovation.", countryWeights: US }),
  e({ symbol: "BOTZ", name: "Global X Robotics & AI ETF", issuer: "Global X", ter: 0.0068, aum: 2.7, region: "Global", benchmark: "Indxx Global Robotics & AI Thematic", tags: ["ai", "robotics", "thematic"], sectorFocus: "AI & Robotics", description: "Global companies in robotics and artificial intelligence.", countryWeights: { "United States": 0.45, Japan: 0.3, Other: 0.25 } }),
  e({ symbol: "ICLN", name: "iShares Global Clean Energy ETF", issuer: "BlackRock", ter: 0.0041, aum: 2.5, region: "Global", esg: true, benchmark: "S&P Global Clean Energy", tags: ["clean-energy", "esg", "thematic"], sectorFocus: "Clean Energy", description: "Global clean-energy producers and technology makers.", countryWeights: { "United States": 0.4, Europe: 0.35, Other: 0.25 } }),
  e({ symbol: "TAN", name: "Invesco Solar ETF", issuer: "Invesco", ter: 0.0067, aum: 1.2, region: "Global", esg: true, benchmark: "MAC Global Solar Energy", tags: ["solar", "clean-energy", "esg", "thematic"], sectorFocus: "Solar", description: "Pure-play global solar energy companies.", countryWeights: { "United States": 0.5, China: 0.2, Other: 0.3 } }),
  e({ symbol: "LIT", name: "Global X Lithium & Battery Tech ETF", issuer: "Global X", ter: 0.0075, aum: 1.3, region: "Global", benchmark: "Solactive Global Lithium", tags: ["lithium", "battery", "ev", "thematic"], sectorFocus: "Battery Tech", description: "The lithium and battery value chain, from mining to EVs.", countryWeights: { China: 0.4, "United States": 0.25, Other: 0.35 } }),
  e({ symbol: "ESGU", name: "iShares ESG Aware MSCI USA ETF", issuer: "BlackRock", ter: 0.0015, aum: 13, esg: true, benchmark: "MSCI USA Extended ESG Focus", tags: ["esg", "core", "us"], sectorFocus: "ESG", description: "Core US equity exposure with an ESG tilt.", countryWeights: US }),

  // ------------------------------------------------------------------- bonds
  e({ symbol: "BND", name: "Vanguard Total Bond Market ETF", issuer: "Vanguard", ter: 0.0003, aum: 120, assetClass: "Bond", benchmark: "Bloomberg US Aggregate Float Adjusted", tags: ["bond", "aggregate", "core", "low-cost", "us"], sectorFocus: "Bonds", description: "The entire US investment-grade bond market in one fund.", countryWeights: US }),
  e({ symbol: "AGG", name: "iShares Core US Aggregate Bond ETF", issuer: "BlackRock", ter: 0.0003, aum: 115, assetClass: "Bond", benchmark: "Bloomberg US Aggregate", tags: ["bond", "aggregate", "core", "low-cost", "us"], sectorFocus: "Bonds", description: "The benchmark US bond fund — treasuries, corporates and MBS.", countryWeights: US }),
  e({ symbol: "TLT", name: "iShares 20+ Year Treasury Bond ETF", issuer: "BlackRock", ter: 0.0015, aum: 50, assetClass: "Bond", benchmark: "ICE US Treasury 20+ Year", tags: ["bond", "treasury", "long-duration", "us"], sectorFocus: "Treasuries", description: "Long-dated US Treasuries — maximum duration, maximum rate sensitivity.", countryWeights: US }),
  e({ symbol: "SHY", name: "iShares 1-3 Year Treasury Bond ETF", issuer: "BlackRock", ter: 0.0015, aum: 24, assetClass: "Bond", benchmark: "ICE US Treasury 1-3 Year", tags: ["bond", "treasury", "short-duration", "cash-like", "us"], sectorFocus: "Treasuries", description: "Short-term US Treasuries — a cash-plus parking spot.", countryWeights: US }),
  e({ symbol: "LQD", name: "iShares iBoxx $ Investment Grade Corporate Bond ETF", issuer: "BlackRock", ter: 0.0014, aum: 30, assetClass: "Bond", benchmark: "Markit iBoxx USD Liquid IG", tags: ["bond", "corporate", "investment-grade", "us"], sectorFocus: "Corporate Bonds", description: "Liquid US investment-grade corporate bonds.", countryWeights: US }),
  e({ symbol: "HYG", name: "iShares iBoxx $ High Yield Corporate Bond ETF", issuer: "BlackRock", ter: 0.0049, aum: 16, assetClass: "Bond", benchmark: "Markit iBoxx USD Liquid HY", tags: ["bond", "high-yield", "income", "us"], sectorFocus: "High Yield", description: "US high-yield ('junk') corporate bonds with higher income and risk.", countryWeights: US }),

  // ------------------------------------------------------------- commodities
  e({ symbol: "GLD", name: "SPDR Gold Shares", issuer: "State Street", ter: 0.004, aum: 75, assetClass: "Commodity", region: "Global", benchmark: "Gold spot (LBMA)", tags: ["gold", "commodity", "hedge", "safe-haven"], sectorFocus: "Gold", description: "The largest physically backed gold ETF.", countryWeights: { Global: 1 } }),
  e({ symbol: "IAU", name: "iShares Gold Trust", issuer: "BlackRock", ter: 0.0025, aum: 33, assetClass: "Commodity", region: "Global", benchmark: "Gold spot (LBMA)", tags: ["gold", "commodity", "hedge", "low-cost", "safe-haven"], sectorFocus: "Gold", description: "Physical gold at a lower fee than GLD.", countryWeights: { Global: 1 } }),

  // ------------------------------------------------------------- UCITS core
  e({ symbol: "CSPX", yahooSymbol: "CSPX.L", name: "iShares Core S&P 500 UCITS ETF (Acc)", issuer: "BlackRock", ter: 0.0007, aum: 95, domicile: "IE", ucits: true, distribution: "Accumulating", exchange: "London SE", benchmark: "S&P 500", tags: ["sp500", "ucits", "core", "accumulating", "low-cost", "us"], description: "Europe's largest S&P 500 UCITS ETF — Irish-domiciled, accumulating.", countryWeights: US }),
  e({ symbol: "VUAA", yahooSymbol: "VUAA.L", name: "Vanguard S&P 500 UCITS ETF (Acc)", issuer: "Vanguard", ter: 0.0007, aum: 20, domicile: "IE", ucits: true, distribution: "Accumulating", exchange: "London SE", benchmark: "S&P 500", tags: ["sp500", "ucits", "core", "accumulating", "low-cost", "us"], description: "Vanguard's accumulating S&P 500 UCITS share class.", countryWeights: US }),
  e({ symbol: "VUSA", yahooSymbol: "VUSA.L", name: "Vanguard S&P 500 UCITS ETF (Dist)", issuer: "Vanguard", ter: 0.0007, aum: 45, domicile: "IE", ucits: true, exchange: "London SE", benchmark: "S&P 500", tags: ["sp500", "ucits", "core", "distributing", "low-cost", "us"], description: "Vanguard's distributing S&P 500 UCITS ETF, quarterly payouts.", countryWeights: US }),
  e({ symbol: "SPYL", yahooSymbol: "SPYL.L", name: "SPDR S&P 500 UCITS ETF (Acc)", issuer: "State Street", ter: 0.0003, aum: 10, domicile: "IE", ucits: true, distribution: "Accumulating", exchange: "London SE", benchmark: "S&P 500", tags: ["sp500", "ucits", "core", "accumulating", "low-cost", "cheapest", "us"], description: "The cheapest S&P 500 UCITS ETF at 0.03% TER.", countryWeights: US }),
  e({ symbol: "SPXS", yahooSymbol: "SPXS.L", name: "Invesco S&P 500 UCITS ETF (Acc)", issuer: "Invesco", ter: 0.0005, aum: 30, domicile: "IE", ucits: true, replication: "Synthetic", distribution: "Accumulating", exchange: "London SE", benchmark: "S&P 500", tags: ["sp500", "ucits", "synthetic", "accumulating", "low-cost", "us"], description: "Synthetic S&P 500 replication — no US withholding tax drag on swaps.", countryWeights: US }),
  e({ symbol: "VWCE", yahooSymbol: "VWCE.DE", name: "Vanguard FTSE All-World UCITS ETF (Acc)", issuer: "Vanguard", ter: 0.0022, aum: 30, domicile: "IE", ucits: true, distribution: "Accumulating", currency: "EUR", exchange: "Xetra", region: "Global", benchmark: "FTSE All-World", tags: ["world", "all-world", "ucits", "core", "accumulating", "one-fund"], description: "The one-fund portfolio: 3,700 stocks across the whole world, accumulating.", countryWeights: ALL_WORLD }),
  e({ symbol: "VWRL", yahooSymbol: "VWRL.L", name: "Vanguard FTSE All-World UCITS ETF (Dist)", issuer: "Vanguard", ter: 0.0022, aum: 30, domicile: "IE", ucits: true, exchange: "London SE", region: "Global", benchmark: "FTSE All-World", tags: ["world", "all-world", "ucits", "core", "distributing", "one-fund"], description: "The distributing share class of Vanguard's global flagship.", countryWeights: ALL_WORLD }),
  e({ symbol: "IWDA", yahooSymbol: "IWDA.AS", name: "iShares Core MSCI World UCITS ETF (Acc)", issuer: "BlackRock", ter: 0.002, aum: 90, domicile: "IE", ucits: true, distribution: "Accumulating", currency: "USD", exchange: "Euronext Amsterdam", region: "Global", benchmark: "MSCI World", tags: ["world", "msci-world", "ucits", "core", "accumulating", "developed"], description: "Europe's favourite MSCI World accumulator — 1,500 developed-market stocks.", countryWeights: WORLD }),
  e({ symbol: "SWRD", yahooSymbol: "SWRD.L", name: "SPDR MSCI World UCITS ETF (Acc)", issuer: "State Street", ter: 0.0012, aum: 8, domicile: "IE", ucits: true, distribution: "Accumulating", exchange: "London SE", region: "Global", benchmark: "MSCI World", tags: ["world", "msci-world", "ucits", "core", "accumulating", "low-cost", "developed"], description: "MSCI World at a bargain 0.12% TER.", countryWeights: WORLD }),
  e({ symbol: "ISAC", yahooSymbol: "ISAC.L", name: "iShares MSCI ACWI UCITS ETF (Acc)", issuer: "BlackRock", ter: 0.002, aum: 12, domicile: "IE", ucits: true, distribution: "Accumulating", exchange: "London SE", region: "Global", benchmark: "MSCI ACWI", tags: ["world", "acwi", "ucits", "core", "accumulating", "one-fund"], description: "Developed plus emerging markets in a single accumulating fund.", countryWeights: ALL_WORLD }),
  e({ symbol: "EIMI", yahooSymbol: "EIMI.L", name: "iShares Core MSCI EM IMI UCITS ETF (Acc)", issuer: "BlackRock", ter: 0.0018, aum: 22, domicile: "IE", ucits: true, distribution: "Accumulating", exchange: "London SE", region: "Emerging Markets", benchmark: "MSCI EM IMI", tags: ["emerging-markets", "ucits", "core", "accumulating", "low-cost"], description: "3,000+ emerging-market stocks including small caps, accumulating.", countryWeights: EM }),
  e({ symbol: "VFEM", yahooSymbol: "VFEM.L", name: "Vanguard FTSE Emerging Markets UCITS ETF (Dist)", issuer: "Vanguard", ter: 0.0022, aum: 2.5, domicile: "IE", ucits: true, exchange: "London SE", region: "Emerging Markets", benchmark: "FTSE Emerging", tags: ["emerging-markets", "ucits", "distributing"], description: "Vanguard's distributing emerging-markets UCITS fund.", countryWeights: EM }),
  e({ symbol: "MEUD", yahooSymbol: "MEUD.PA", name: "Amundi Stoxx Europe 600 UCITS ETF (Acc)", issuer: "Amundi", ter: 0.0007, aum: 10, domicile: "LU", ucits: true, distribution: "Accumulating", currency: "EUR", exchange: "Euronext Paris", region: "Europe", benchmark: "STOXX Europe 600", tags: ["europe", "ucits", "core", "accumulating", "low-cost"], description: "600 European companies at just 0.07% TER.", countryWeights: EUROPE }),
  e({ symbol: "CNDX", yahooSymbol: "CNDX.L", name: "iShares Nasdaq 100 UCITS ETF (Acc)", issuer: "BlackRock", ter: 0.0033, aum: 15, domicile: "IE", ucits: true, distribution: "Accumulating", exchange: "London SE", benchmark: "Nasdaq-100", tags: ["nasdaq100", "tech", "ucits", "growth", "accumulating", "us"], sectorFocus: "Technology", description: "The Nasdaq-100 in UCITS wrapper, accumulating.", countryWeights: US }),
  e({ symbol: "EQQQ", yahooSymbol: "EQQQ.L", name: "Invesco EQQQ Nasdaq-100 UCITS ETF (Dist)", issuer: "Invesco", ter: 0.003, aum: 7, domicile: "IE", ucits: true, exchange: "London SE", benchmark: "Nasdaq-100", tags: ["nasdaq100", "tech", "ucits", "growth", "distributing", "us"], sectorFocus: "Technology", description: "Europe's original Nasdaq-100 tracker, distributing.", countryWeights: US }),

  // -------------------------------------------------- UCITS income/thematic
  e({ symbol: "VHYL", yahooSymbol: "VHYL.L", name: "Vanguard FTSE All-World High Dividend Yield UCITS ETF (Dist)", issuer: "Vanguard", ter: 0.0029, aum: 5, domicile: "IE", ucits: true, exchange: "London SE", region: "Global", benchmark: "FTSE All-World High Dividend Yield", tags: ["dividend", "high-yield", "ucits", "income", "world", "distributing"], sectorFocus: "Dividend", description: "1,800 higher-yielding stocks worldwide, quarterly distributions.", countryWeights: ALL_WORLD }),
  e({ symbol: "ZPRG", yahooSymbol: "ZPRG.DE", name: "SPDR S&P Global Dividend Aristocrats UCITS ETF (Dist)", issuer: "State Street", ter: 0.0045, aum: 1, domicile: "IE", ucits: true, currency: "EUR", exchange: "Xetra", region: "Global", benchmark: "S&P Global Dividend Aristocrats", tags: ["dividend", "dividend-growth", "aristocrats", "ucits", "income", "distributing"], sectorFocus: "Dividend", description: "Global companies with 10+ years of stable or rising dividends.", countryWeights: ALL_WORLD }),
  e({ symbol: "IUIT", yahooSymbol: "IUIT.L", name: "iShares S&P 500 Information Technology Sector UCITS ETF (Acc)", issuer: "BlackRock", ter: 0.0015, aum: 12, domicile: "IE", ucits: true, distribution: "Accumulating", exchange: "London SE", benchmark: "S&P 500 Capped 35/20 Information Technology", tags: ["tech", "sector", "ucits", "accumulating", "us"], sectorFocus: "Technology", description: "The S&P 500's tech sector in UCITS form.", countryWeights: US }),
  e({ symbol: "RBOT", yahooSymbol: "RBOT.L", name: "iShares Automation & Robotics UCITS ETF (Acc)", issuer: "BlackRock", ter: 0.004, aum: 3, domicile: "IE", ucits: true, distribution: "Accumulating", exchange: "London SE", region: "Global", benchmark: "iSTOXX FactSet Automation & Robotics", tags: ["ai", "robotics", "automation", "ucits", "thematic", "accumulating"], sectorFocus: "AI & Robotics", description: "Global automation, robotics and AI enablers in UCITS wrapper.", countryWeights: { "United States": 0.45, Japan: 0.25, Other: 0.3 } }),
  e({ symbol: "XAIX", yahooSymbol: "XAIX.DE", name: "Xtrackers Artificial Intelligence & Big Data UCITS ETF (Acc)", issuer: "DWS Xtrackers", ter: 0.0035, aum: 4, domicile: "IE", ucits: true, distribution: "Accumulating", currency: "EUR", exchange: "Xetra", region: "Global", benchmark: "Nasdaq Global Artificial Intelligence and Big Data", tags: ["ai", "big-data", "ucits", "thematic", "tech", "accumulating"], sectorFocus: "AI", description: "Companies with AI and big-data patent leadership.", countryWeights: { "United States": 0.75, Other: 0.25 } }),
  e({ symbol: "VVSM", yahooSymbol: "VVSM.DE", name: "VanEck Semiconductor UCITS ETF (Acc)", issuer: "VanEck", ter: 0.0035, aum: 3, domicile: "IE", ucits: true, distribution: "Accumulating", currency: "EUR", exchange: "Xetra", benchmark: "MVIS US Listed Semiconductor 10% Capped", tags: ["semiconductors", "chips", "ai", "ucits", "tech", "accumulating"], sectorFocus: "Semiconductors", description: "SMH's UCITS sibling — global chip leaders, accumulating.", countryWeights: US }),
  e({ symbol: "INRG", yahooSymbol: "INRG.L", name: "iShares Global Clean Energy UCITS ETF (Dist)", issuer: "BlackRock", ter: 0.0065, aum: 2.5, domicile: "IE", ucits: true, esg: true, exchange: "London SE", region: "Global", benchmark: "S&P Global Clean Energy", tags: ["clean-energy", "esg", "ucits", "thematic", "distributing"], sectorFocus: "Clean Energy", description: "The UCITS version of the global clean-energy benchmark.", countryWeights: { "United States": 0.4, Europe: 0.35, Other: 0.25 } }),
  e({ symbol: "SUSW", yahooSymbol: "SUSW.L", name: "iShares MSCI World SRI UCITS ETF (Acc)", issuer: "BlackRock", ter: 0.002, aum: 5, domicile: "IE", ucits: true, esg: true, distribution: "Accumulating", exchange: "London SE", region: "Global", benchmark: "MSCI World SRI Select Reduced Fossil Fuel", tags: ["esg", "sri", "world", "ucits", "core", "accumulating"], sectorFocus: "ESG", description: "MSCI World screened for top ESG performers, fossil-fuel reduced.", countryWeights: WORLD }),
  e({ symbol: "IUSN", yahooSymbol: "IUSN.DE", name: "iShares MSCI World Small Cap UCITS ETF (Acc)", issuer: "BlackRock", ter: 0.0035, aum: 4.5, domicile: "IE", ucits: true, distribution: "Accumulating", currency: "EUR", exchange: "Xetra", region: "Global", benchmark: "MSCI World Small Cap", tags: ["small-cap", "world", "ucits", "accumulating", "developed"], description: "3,300 developed-market small caps, accumulating.", countryWeights: WORLD }),
  e({ symbol: "SGLN", yahooSymbol: "SGLN.L", name: "iShares Physical Gold ETC", issuer: "BlackRock", ter: 0.0012, aum: 17, domicile: "IE", ucits: false, assetClass: "Commodity", exchange: "London SE", region: "Global", benchmark: "Gold spot (LBMA)", tags: ["gold", "commodity", "physical", "hedge", "safe-haven", "low-cost"], sectorFocus: "Gold", description: "Physically backed gold ETC at 0.12% — Europe's low-cost gold vault.", countryWeights: { Global: 1 } }),
  e({ symbol: "VAGF", yahooSymbol: "VAGF.DE", name: "Vanguard Global Aggregate Bond UCITS ETF (EUR Hedged, Acc)", issuer: "Vanguard", ter: 0.001, aum: 3, domicile: "IE", ucits: true, assetClass: "Bond", distribution: "Accumulating", currency: "EUR", exchange: "Xetra", region: "Global", benchmark: "Bloomberg Global Aggregate Float Adjusted (EUR hedged)", tags: ["bond", "aggregate", "global", "ucits", "hedged", "core", "accumulating"], sectorFocus: "Bonds", description: "The global investment-grade bond market, EUR-hedged and accumulating.", countryWeights: { Global: 1 } }),
  e({ symbol: "IB01", yahooSymbol: "IB01.L", name: "iShares $ Treasury Bond 0-1yr UCITS ETF (Acc)", issuer: "BlackRock", ter: 0.0007, aum: 12, domicile: "IE", ucits: true, assetClass: "Money Market", distribution: "Accumulating", exchange: "London SE", benchmark: "ICE US Treasury Short Bond", tags: ["cash-like", "treasury", "money-market", "ucits", "short-duration", "accumulating", "us"], sectorFocus: "Cash", description: "T-bills in ETF form — the USD cash-parking standard.", countryWeights: US }),
  e({ symbol: "XEON", yahooSymbol: "XEON.DE", name: "Xtrackers II EUR Overnight Rate Swap UCITS ETF (Acc)", issuer: "DWS Xtrackers", ter: 0.001, aum: 12, domicile: "LU", ucits: true, assetClass: "Money Market", replication: "Synthetic", distribution: "Accumulating", currency: "EUR", exchange: "Xetra", region: "Europe", benchmark: "€STR (Euro Short-Term Rate)", tags: ["cash-like", "money-market", "ucits", "eur", "accumulating"], sectorFocus: "Cash", description: "Earns the euro overnight rate — the EUR cash-parking standard.", countryWeights: { Europe: 1 } }),
];

export function findEtf(symbol: string): EtfCatalogEntry | undefined {
  const s = symbol.toUpperCase();
  return ETF_CATALOG.find(
    (etf) => etf.symbol.toUpperCase() === s || etf.yahooSymbol.toUpperCase() === s
  );
}

export const ETF_REGIONS = [...new Set(ETF_CATALOG.map((e) => e.region))].sort();
export const ETF_ISSUERS = [...new Set(ETF_CATALOG.map((e) => e.issuer))].sort();
export const ETF_ASSET_CLASSES = [...new Set(ETF_CATALOG.map((e) => e.assetClass))].sort();
