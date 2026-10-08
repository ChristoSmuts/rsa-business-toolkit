# WP-33 search regression diff against `2947fbf` (review pass 20)

Run with `pnpm search:diff 2947fbf` on the pass 20 tip, after the merge of main and the integration. The corpus now also holds "sources for
<noun>" and "bronne vir <noun>" (pass 20 major 1). The tool's own summary line:

> search:diff 2947fbf: 9854 searches, 142 changed first results: 73 better, 0 worse, 0 same-target, 69 ?.

No change is rule-classified `worse`. This file gives a verdict and a reason for every change the
tool could not classify (`?`): better 56, neutral 13; none is worse.

## Pass 19 "neutral by rule" items, re-rated by hand (pass 20 major 2)

`WP-33-diff-733195e.md` called a law-word phrasing neutral when it opened what the bare noun opens.
That says nothing about whether the bare noun's result is right. These are the items from that file
that a first-time owner would plausibly type, each judged on its own against the current code. The
rest are generated phrasings over nouns nobody pairs with a law word (`logo wet`, `regulasies vir
uithangbord`) or review prose (`car show`).

Fixed with data in pass 20 (bets; each is an acceptance row):

| Lang | Queries | Now first |
| --- | --- | --- |
| en | labour law / labour regulations / regulations for labour / what the law says about labour | `core/running-a-pty-ltd#employees-including-yourself` |
| en | credit regulations / regulations for credit | `business-types/vehicle-dealer#if-you-extend-credit-yourself` |
| en | food law / what the law says about food | `core/what-you-need-to-sell-things#if-you-sell-food` |
| af | kos wet / wat die wet oor kos sê | `core/what-you-need-to-sell-things#if-you-sell-food` |
| af | werk wet / wat die wet oor werk sê / arbeidswet | `core/running-a-pty-ltd#employees-including-yourself` |
| af | kredietregulasies / regulasies vir krediet | `business-types/vehicle-dealer#if-you-extend-credit-yourself` |

Re-rated one by one:

| Lang | Query | Now first | Verdict | Reason |
| --- | --- | --- | --- | --- |
| en | `company law` | `lookup/glossary#owner-managed-company` | justified | neither result is the Companies Act: before, "What the law requires either way" on Adding new lines; the glossary entry at least defines the owner-managed company. `companies act` opens the Legislation entry (row) |
| en | `home law` | `lookup/glossary#home-enterprise--home-occupation` | neutral | the zoning term for running a business from home, which is the legal question; before, "If you take cash" |
| en | `uif law` | `lookup/glossary#uif` | neutral | the UIF definition; before, Employees, which also covers UIF |
| en | `health law` | `business-types/services-trades#occupational-health-and-safety` | neutral | occupational health and safety; before, the food page's The wider law. Both are health law |
| en | `name law` | `lookup/glossary#trading-name` | neutral | the trading-name definition; before, "What the law requires either way" |
| en | `vat law` | `lookup/glossary#vat` | neutral | the VAT definition; before, a dealer's notional input tax |
| en | `bank law` | `core/register#business-bank-account` | better | the business bank account section; before, the privacy notice template note |
| en | `business law` | `business-types/pick-your-business-type#what-everyone-needs-regardless-of-type` | fixed | was the You are the business page top; a pass 20 bet now opens What everyone needs (row) |
| en | `what the law says about credit` | `business-types/vehicle-dealer#if-you-extend-credit-yourself` | fixed | was the credit-note definition; a pass 20 bet (`credit law`) now opens the credit section (row) |
| af | `bank wet` | `core/register#business-bank-account` | fixed | was a dealer's bank-finance section; a pass 20 bet now opens the business bank account, as `bank law` does (row) |
| af | `besigheid wet` | `lookup/sources#legislation-this-toolkit-relies-on` | fixed | was the You are the business page top; "besigheid wet" is the Businesses Act written apart, like the alias `maatskappy wet`, so it is now an Act alias (row) |
| af | `regulasies vir werk` | `core/running-a-pty-ltd#employees-including-yourself` | fixed | was You are the business; a pass 20 bet (`werk regulasies`) opens Employees (row) |
| af | `gesondheid wet` | `lookup/glossary#businesses-act-licence` | justified | the Businesses Act licence entry, which covers health licences; before, the beauty page's municipal licence. Both are licensing, neither is wrong |
| af | `handel wet` | `core/register#sole-proprietor-trading-as-yourself` | justified | "handel" is "trade"; neither this nor "What the law requires either way" before is a trade law. Low plausibility as typed |
| af | `verbruiker wet` | `lookup/glossary#voetstoots` | justified | the voetstoots entry explains what the Consumer Protection Act changes; before, If you sell online. `verbruikersbeskerming` and the CPA aliases open the Legislation entry (rows) |
| af | `uif wet` | `lookup/glossary#uif` | neutral | the UIF definition; before, "UIF: sources disagree" |
| af | `veiligheid wet` | `business-types/services-trades#occupational-health-and-safety` | better | the OHS section; before, the Legislation entry |
| af | `voertuig wet` | `core/vehicles` | neutral | the Vehicles page; before, the dealer's warranty section |

## The `?` items

| Lang | Mode | Query | Before | After | Verdict | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| af | finished | `belastingkoers` | `core/start-here#what-is-in-this-toolkit` | `core/tax-and-sars` | better | a pass 20 bet (minor 2): opens Tax and SARS, whose opening table gives the rates |
| af | finished | `bron vir lisensie` | `start/start-here#licence` | `lookup/sources#business-licensing` | better | a source word followed by for/vir asks for sources (pass 20 major 1): opens the register's entry for the topic |
| af | finished | `bron vir maatskappybelasting` | `core/running-a-pty-ltd#4-sars-company-tax` | `lookup/sources` | neutral | a source query (pass 20 major 1) opens the sources register: its top, which lists every entry, or the Legislation entry, which lists every Act. Before, a guide section on the topic, which answers the topic but not where its facts come from |
| af | finished | `bron vir tuiskantoor` | `core/working-from-home-and-safety#home-office-deduction` | `lookup/sources` | neutral | a source query (pass 20 major 1) opens the sources register: its top, which lists every entry, or the Legislation entry, which lists every Act. Before, a guide section on the topic, which answers the topic but not where its facts come from |
| af | finished | `bronne vir aanlyn` | `core/start-here#what-is-in-this-toolkit` | `lookup/sources#working-from-home-payments-and-personal-safety` | better | a source word followed by for/vir asks for sources (pass 20 major 1): opens the register's entry for the topic |
| af | finished | `bronne vir alkohol` | `core/what-you-need-to-sell-things#if-you-sell-alcohol` | `lookup/sources` | neutral | a source query (pass 20 major 1) opens the sources register: its top, which lists every entry, or the Legislation entry, which lists every Act. Before, a guide section on the topic, which answers the topic but not where its facts come from |
| af | finished | `bronne vir handelsmerk` | `start/how-to-use#path-3-i-need-one-specific-answer` | `lookup/sources#branding-tools-referenced` | better | a source word followed by for/vir asks for sources (pass 20 major 1): opens the register's entry for the topic |
| af | finished | `bronne vir huis` | `start/how-to-use#path-3-i-need-one-specific-answer` | `lookup/sources#working-from-home-payments-and-personal-safety` | better | a source word followed by for/vir asks for sources (pass 20 major 1): opens the register's entry for the topic |
| af | finished | `bronne vir inkomstebelasting` | `core/paying-yourself#debit-loan-account-you-owe-the-company` | `lookup/sources#tax-and-sars` | better | a source word followed by for/vir asks for sources (pass 20 major 1): opens the register's entry for the topic |
| af | finished | `bronne vir invoer` | `business-types/retail-online#importing-stock` | `lookup/sources` | neutral | a source query (pass 20 major 1) opens the sources register: its top, which lists every entry, or the Legislation entry, which lists every Act. Before, a guide section on the topic, which answers the topic but not where its facts come from |
| af | finished | `bronne vir kos` | `core/paying-yourself#uif-sources-disagree` | `lookup/sources#legislation-this-toolkit-relies-on` | neutral | a source query (pass 20 major 1) opens the sources register: its top, which lists every entry, or the Legislation entry, which lists every Act. Before, a guide section on the topic, which answers the topic but not where its facts come from |
| af | finished | `bronne vir naam` | `start/how-to-use#path-3-i-need-one-specific-answer` | `lookup/sources#how-to-use-this-file` | better | a source word followed by for/vir asks for sources (pass 20 major 1): opens the register's entry for the topic |
| af | finished | `bronne vir skoonheid` | `core/start-here#what-is-in-this-toolkit` | `lookup/sources#legislation-this-toolkit-relies-on` | neutral | a source query (pass 20 major 1) opens the sources register: its top, which lists every entry, or the Legislation entry, which lists every Act. Before, a guide section on the topic, which answers the topic but not where its facts come from |
| af | finished | `btw-koers` | `core/tax-and-sars#route-3-turnover-tax` | `lookup/glossary#vat` | better | the pass 20 bet `btw koers` (minor 2): opens the VAT glossary entry, which gives the 15% rate, not a turnover-tax section |
| af | finished | `wat die wet oor bank sê` | `business-types/vehicle-dealer#if-a-bank-finances-your-stock-the-bank-holds-title` | `core/register#business-bank-account` | better | the `bank wet` bet (pass 20 major 2, re-rated items): opens the business bank account section, as `bank law` does, not a dealer's bank-finance section |
| af | finished | `wat die wet oor werk sê` | `core/you-are-the-business` | `core/running-a-pty-ltd#employees-including-yourself` | better | the `werk wet` bet (pass 20 major 2): opens Employees (including yourself), not the page top of You are the business |
| af | finished | `werk regulasies` | `core/you-are-the-business` | `core/running-a-pty-ltd#employees-including-yourself` | better | a pass 20 bet (re-rated items): opens Employees (including yourself) |
| af | typed | `belastingkoers` | `lookup/glossary#sbc` | `core/tax-and-sars` | better | a pass 20 bet (minor 2): opens Tax and SARS, whose opening table gives the rates |
| af | typed | `bron vir lisensie` | `start/start-here#licence` | `lookup/sources#business-licensing` | better | a source word followed by for/vir asks for sources (pass 20 major 1): opens the register's entry for the topic |
| af | typed | `bron vir maatskappybelasting` | `core/running-a-pty-ltd#4-sars-company-tax` | `lookup/sources` | neutral | a source query (pass 20 major 1) opens the sources register: its top, which lists every entry, or the Legislation entry, which lists every Act. Before, a guide section on the topic, which answers the topic but not where its facts come from |
| af | typed | `bron vir tuiskantoor` | `core/working-from-home-and-safety#home-office-deduction` | `lookup/sources` | neutral | a source query (pass 20 major 1) opens the sources register: its top, which lists every entry, or the Legislation entry, which lists every Act. Before, a guide section on the topic, which answers the topic but not where its facts come from |
| af | typed | `bronne vir alkohol` | `core/what-you-need-to-sell-things#if-you-sell-alcohol` | `lookup/sources` | neutral | a source query (pass 20 major 1) opens the sources register: its top, which lists every entry, or the Legislation entry, which lists every Act. Before, a guide section on the topic, which answers the topic but not where its facts come from |
| af | typed | `bronne vir handelsmerk` | `start/how-to-use#path-3-i-need-one-specific-answer` | `lookup/sources#branding-tools-referenced` | better | a source word followed by for/vir asks for sources (pass 20 major 1): opens the register's entry for the topic |
| af | typed | `bronne vir huis` | `start/how-to-use#path-3-i-need-one-specific-answer` | `lookup/sources#working-from-home-payments-and-personal-safety` | better | a source word followed by for/vir asks for sources (pass 20 major 1): opens the register's entry for the topic |
| af | typed | `bronne vir inkomstebelasting` | `core/paying-yourself#debit-loan-account-you-owe-the-company` | `lookup/sources#tax-and-sars` | better | a source word followed by for/vir asks for sources (pass 20 major 1): opens the register's entry for the topic |
| af | typed | `bronne vir invoer` | `business-types/retail-online#importing-stock` | `lookup/sources` | neutral | a source query (pass 20 major 1) opens the sources register: its top, which lists every entry, or the Legislation entry, which lists every Act. Before, a guide section on the topic, which answers the topic but not where its facts come from |
| af | typed | `bronne vir logo` | `core/start-here#what-is-in-this-toolkit` | `lookup/sources#branding-tools-referenced` | better | a source word followed by for/vir asks for sources (pass 20 major 1): opens the register's entry for the topic |
| af | typed | `bronne vir naam` | `start/how-to-use#path-3-i-need-one-specific-answer` | `lookup/sources#how-to-use-this-file` | better | a source word followed by for/vir asks for sources (pass 20 major 1): opens the register's entry for the topic |
| af | typed | `bronne vir skoonheid` | `core/start-here#what-is-in-this-toolkit` | `lookup/sources#legislation-this-toolkit-relies-on` | neutral | a source query (pass 20 major 1) opens the sources register: its top, which lists every entry, or the Legislation entry, which lists every Act. Before, a guide section on the topic, which answers the topic but not where its facts come from |
| af | typed | `btw-koers` | `business-types/vehicle-dealer#turnover-tax-is-almost-certainly-wrong-for-a-dealer` | `lookup/glossary#vat` | better | the pass 20 bet `btw koers` (minor 2): opens the VAT glossary entry, which gives the 15% rate, not a turnover-tax section |
| af | typed | `wat die wet oor bank sê` | `business-types/vehicle-dealer#if-a-bank-finances-your-stock-the-bank-holds-title` | `core/register#business-bank-account` | better | the `bank wet` bet (pass 20 major 2, re-rated items): opens the business bank account section, as `bank law` does, not a dealer's bank-finance section |
| af | typed | `wat die wet oor werk sê` | `core/you-are-the-business` | `core/running-a-pty-ltd#employees-including-yourself` | better | the `werk wet` bet (pass 20 major 2): opens Employees (including yourself), not the page top of You are the business |
| af | typed | `werk regulasies` | `core/you-are-the-business` | `core/running-a-pty-ltd#employees-including-yourself` | better | a pass 20 bet (re-rated items): opens Employees (including yourself) |
| en | finished | `business regulations` | `core/you-are-the-business` | `business-types/pick-your-business-type#what-everyone-needs-regardless-of-type` | better | a pass 20 major 2 bet picks the legal sense: Employees, the credit section, What everyone needs, or If you sell food |
| en | finished | `credit law` | `lookup/glossary#credit-note` | `business-types/vehicle-dealer#if-you-extend-credit-yourself` | better | a pass 20 major 2 bet picks the legal sense: Employees, the credit section, What everyone needs, or If you sell food |
| en | finished | `labour regulations` | `business-types/professional-creative#the-turnover-tax-trap` | `core/running-a-pty-ltd#employees-including-yourself` | better | a pass 20 major 2 bet picks the legal sense: Employees, the credit section, What everyone needs, or If you sell food |
| en | finished | `regulations for business` | `core/you-are-the-business` | `business-types/pick-your-business-type#what-everyone-needs-regardless-of-type` | better | a pass 20 major 2 bet picks the legal sense: Employees, the credit section, What everyone needs, or If you sell food |
| en | finished | `regulations for credit` | `lookup/glossary#credit-note` | `business-types/vehicle-dealer#if-you-extend-credit-yourself` | better | a pass 20 major 2 bet picks the legal sense: Employees, the credit section, What everyone needs, or If you sell food |
| en | finished | `regulations for labour` | `business-types/professional-creative#the-turnover-tax-trap` | `core/running-a-pty-ltd#employees-including-yourself` | better | a pass 20 major 2 bet picks the legal sense: Employees, the credit section, What everyone needs, or If you sell food |
| en | finished | `source for company` | `core/paying-yourself#debit-loan-account-you-owe-the-company` | `lookup/sources#company-registration` | better | a source word followed by for/vir asks for sources (pass 20 major 1): opens the register's entry for the topic |
| en | finished | `source for invoice` | `core/start-here#what-is-in-this-toolkit` | `lookup/sources#tax-and-sars` | better | a source word followed by for/vir asks for sources (pass 20 major 1): opens the register's entry for the topic |
| en | finished | `source for tax` | `core/paying-yourself#uif-sources-disagree` | `lookup/sources#tax-and-sars` | better | a source word followed by for/vir asks for sources (pass 20 major 1): opens the register's entry for the topic |
| en | finished | `sources for beauty` | `core/start-here#what-is-in-this-toolkit` | `lookup/sources#legislation-this-toolkit-relies-on` | neutral | a source query (pass 20 major 1) opens the sources register: its top, which lists every entry, or the Legislation entry, which lists every Act. Before, a guide section on the topic, which answers the topic but not where its facts come from |
| en | finished | `sources for brand` | `start/how-to-use#path-3-i-need-one-specific-answer` | `lookup/sources#colour-research-and-signage-materials` | better | a source word followed by for/vir asks for sources (pass 20 major 1): opens the register's entry for the topic |
| en | finished | `sources for business` | `core/paying-yourself#uif-sources-disagree` | `lookup/sources#business-licensing` | better | a source word followed by for/vir asks for sources (pass 20 major 1): opens the register's entry for the topic |
| en | finished | `sources for company tax` | `core/paying-yourself#uif-sources-disagree` | `lookup/sources#paying-yourself-from-a-company` | better | a source word followed by for/vir asks for sources (pass 20 major 1): opens the register's entry for the topic |
| en | finished | `sources for logo` | `core/start-here#what-is-in-this-toolkit` | `lookup/sources#branding-tools-referenced` | better | a source word followed by for/vir asks for sources (pass 20 major 1): opens the register's entry for the topic |
| en | finished | `tax rate` | `lookup/glossary#official-rate-of-interest` | `core/tax-and-sars` | better | a pass 20 bet (minor 2): opens Tax and SARS, not the official rate of interest |
| en | finished | `vat sources` | `business-types/vehicle-dealer#the-conditions-you-must-meet` | `lookup/sources#tax-and-sars` | better | a pass 20 bet (major 1): opens the register's Tax and SARS entry |
| en | finished | `what the law says about business` | `core/you-are-the-business` | `business-types/pick-your-business-type#what-everyone-needs-regardless-of-type` | better | a pass 20 major 2 bet picks the legal sense: Employees, the credit section, What everyone needs, or If you sell food |
| en | finished | `what the law says about food` | `business-types/food` | `core/what-you-need-to-sell-things#if-you-sell-food` | better | a pass 20 major 2 bet picks the legal sense: Employees, the credit section, What everyone needs, or If you sell food |
| en | typed | `business regulations` | `core/you-are-the-business` | `business-types/pick-your-business-type#what-everyone-needs-regardless-of-type` | better | a pass 20 major 2 bet picks the legal sense: Employees, the credit section, What everyone needs, or If you sell food |
| en | typed | `credit law` | `lookup/glossary#credit-note` | `business-types/vehicle-dealer#if-you-extend-credit-yourself` | better | a pass 20 major 2 bet picks the legal sense: Employees, the credit section, What everyone needs, or If you sell food |
| en | typed | `labour regulations` | `business-types/professional-creative#the-turnover-tax-trap` | `core/running-a-pty-ltd#employees-including-yourself` | better | a pass 20 major 2 bet picks the legal sense: Employees, the credit section, What everyone needs, or If you sell food |
| en | typed | `regulations for business` | `core/you-are-the-business` | `business-types/pick-your-business-type#what-everyone-needs-regardless-of-type` | better | a pass 20 major 2 bet picks the legal sense: Employees, the credit section, What everyone needs, or If you sell food |
| en | typed | `regulations for credit` | `lookup/glossary#credit-note` | `business-types/vehicle-dealer#if-you-extend-credit-yourself` | better | a pass 20 major 2 bet picks the legal sense: Employees, the credit section, What everyone needs, or If you sell food |
| en | typed | `regulations for labour` | `business-types/professional-creative#the-turnover-tax-trap` | `core/running-a-pty-ltd#employees-including-yourself` | better | a pass 20 major 2 bet picks the legal sense: Employees, the credit section, What everyone needs, or If you sell food |
| en | typed | `source for company` | `core/paying-yourself#debit-loan-account-you-owe-the-company` | `lookup/sources#company-registration` | better | a source word followed by for/vir asks for sources (pass 20 major 1): opens the register's entry for the topic |
| en | typed | `source for invoice` | `core/start-here#what-is-in-this-toolkit` | `lookup/sources#tax-and-sars` | better | a source word followed by for/vir asks for sources (pass 20 major 1): opens the register's entry for the topic |
| en | typed | `source for tax` | `core/paying-yourself#uif-sources-disagree` | `lookup/sources#tax-and-sars` | better | a source word followed by for/vir asks for sources (pass 20 major 1): opens the register's entry for the topic |
| en | typed | `sources for beauty` | `core/start-here#what-is-in-this-toolkit` | `lookup/sources#legislation-this-toolkit-relies-on` | neutral | a source query (pass 20 major 1) opens the sources register: its top, which lists every entry, or the Legislation entry, which lists every Act. Before, a guide section on the topic, which answers the topic but not where its facts come from |
| en | typed | `sources for brand` | `start/how-to-use#path-3-i-need-one-specific-answer` | `lookup/sources#colour-research-and-signage-materials` | better | a source word followed by for/vir asks for sources (pass 20 major 1): opens the register's entry for the topic |
| en | typed | `sources for business` | `core/paying-yourself#uif-sources-disagree` | `lookup/sources#business-licensing` | better | a source word followed by for/vir asks for sources (pass 20 major 1): opens the register's entry for the topic |
| en | typed | `sources for company tax` | `core/paying-yourself#uif-sources-disagree` | `lookup/sources#paying-yourself-from-a-company` | better | a source word followed by for/vir asks for sources (pass 20 major 1): opens the register's entry for the topic |
| en | typed | `sources for logo` | `core/start-here#what-is-in-this-toolkit` | `lookup/sources#branding-tools-referenced` | better | a source word followed by for/vir asks for sources (pass 20 major 1): opens the register's entry for the topic |
| en | typed | `tax rate` | `lookup/glossary#official-rate-of-interest` | `core/tax-and-sars` | better | a pass 20 bet (minor 2): opens Tax and SARS, not the official rate of interest |
| en | typed | `vat sources` | `business-types/vehicle-dealer#the-conditions-you-must-meet` | `lookup/sources#tax-and-sars` | better | a pass 20 bet (major 1): opens the register's Tax and SARS entry |
| en | typed | `what the law says about business` | `core/you-are-the-business` | `business-types/pick-your-business-type#what-everyone-needs-regardless-of-type` | better | a pass 20 major 2 bet picks the legal sense: Employees, the credit section, What everyone needs, or If you sell food |
| en | typed | `what the law says about food` | `business-types/food` | `core/what-you-need-to-sell-things#if-you-sell-food` | better | a pass 20 major 2 bet picks the legal sense: Employees, the credit section, What everyone needs, or If you sell food |
