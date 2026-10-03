/*
 * File: tools/sample-names.js
 * Purpose: Invented words for the sample data: account and partner names, markets, sub-verticals, success factors
 *          and commentary. Account and partner names are coined nonsense words, so none can pass for a real company.
 * Provides: module.exports ({stems, accountKinds, partnerKinds, markets, countries, subVerticals, successFactors,
 *           commentary, maturity, expertiseProduct})
 * Depends on: nothing
 * Used by: tools/sample-build.js
 */
'use strict';

module.exports = {
  // Coined words, combined with a kind of business ("Quorbel Logistics"). Each name is used once in the file.
  stems: [
    'Quorbel', 'Vantrisk', 'Zelmora', 'Brindlecap', 'Ostravel', 'Fenwyrd', 'Kalvenna', 'Mirrowen', 'Plimsoth',
    'Tarnquill', 'Axelbrim', 'Calvexa', 'Dornquist', 'Elvaroth', 'Gribbleton', 'Hollowmere', 'Istravon', 'Jorvanta',
    'Kestrelwick', 'Lumbervox', 'Mossgrave', 'Nimbrook', 'Orvelline', 'Pellucar', 'Quillmarsh', 'Rustavel',
    'Sombrevane', 'Tindlewharf', 'Umbrafeld', 'Valquessa', 'Wendrak', 'Xanthorpe', 'Yarrowmede', 'Zorvalith',
    'Brackenvolt', 'Cindermoor', 'Draxwell', 'Embervale', 'Frostlinden', 'Glimmerholt', 'Hazelquort', 'Ironwimple',
    'Juniperra', 'Kobblestane', 'Larkspindle', 'Marrowgate', 'Nettlebrisk', 'Ombravia', 'Pimbleford', 'Quinsbarrow',
    'Ravenbrisk', 'Saltmarrow', 'Thistlequay', 'Ulvenbrook', 'Wimbleshaw', 'Yelvarran', 'Zandrovic',
    'Arvenhusk', 'Belquorra', 'Corvenna', 'Dremblewick', 'Estravane', 'Fizzlemoor', 'Grommelin', 'Hextravel',
    'Inglefrost', 'Jabberlune', 'Krindlemark', 'Lornquessa', 'Mabblethorn', 'Noxberrow', 'Opalwhistle', 'Pruntavel',
    'Quibbleton', 'Rindlevast', 'Snorrendal', 'Trevvelin', 'Uptwhistle', 'Vorpaline', 'Wobblecombe', 'Xyrellian',
    'Yonderquill', 'Zibbleford', 'Amberquoth', 'Blusterfen', 'Crumblevane', 'Dabbleroot', 'Eldertwine', 'Fumblequay',
    'Gloamstead', 'Hobblemere', 'Ickleburn', 'Jollimarsh', 'Knottlewick', 'Lumpkinvale', 'Mizzleton', 'Nobblecrest',
    'Oddlethwaite', 'Puddlequirk', 'Quagmorrow', 'Rumbleshaw', 'Spindlewhit', 'Tumbleforth', 'Umbleton', 'Vexillor',
    'Wizzlecroft', 'Yabbleton', 'Zonkerfield', 'Antlerquay', 'Bimblewood', 'Crankleton', 'Drizzlefen', 'Elbowmere',
    'Flimmerlake', 'Gobbleshire', 'Hufflemarsh', 'Inkwhistle', 'Jumblecross', 'Lollygrove', 'Muddlecombe',
    'Niblethorpe', 'Ozzlewick', 'Prattlefen', 'Quizzlebank', 'Ruddlestone', 'Squabbleby', 'Twiddlemore',     'Vimbleshore', 'Waddlecote', 'Yammerholt', 'Zigglebrook', 'Brumbleton', 'Clatterwick', 'Doddlemere', 'Fiddlestow',
    'Grizzlefen', 'Hiccupvale', 'Jigglethorn', 'Kibblewick', 'Mumblefield', 'Noodlecombe', 'Rattlebury',
    'Scrumbleton', 'Tottlemere', 'Wibbleford', 'Zumbleshaw', 'Blimberly', 'Chortlewick', 'Dinglequay', 'Frazzlemoor',
    'Gruntlefield', 'Honklewick', 'Jangleshire', 'Klonkerby', 'Mozzlebrook', 'Nubbleton', 'Pifflestead', 'Quackenvale',
    'Rumpleford', 'Snickerholt', 'Tiddlecombe', 'Wonkleton', 'Zizzlemere', 'Bonkersby', 'Cobblequirk', 'Dozzlefen',
    'Fribbleton', 'Glumberwick', 'Hootlecombe', 'Jostlemere', 'Mangleshaw', 'Nozzlebury', 'Pozzlewick',
    'Quibberfen', 'Razzlecombe', 'Shimbleford', 'Twonkleby', 'Whiffleton', 'Zoodlemere'
  ],

  // Kinds of business per industry, for account names.
  accountKinds: {
    busServices: ['Advisory', 'Business Services', 'Outsourcing'], culture: ['Museums', 'Heritage Trust', 'Leisure Parks'],
    utilities: ['Energy', 'Water', 'Grid'], media: ['Media', 'Studios', 'Broadcasting'], finance: ['Bank', 'Insurance', 'Capital'],
    government: ['City Council', 'Public Works', 'Agency'], healthcare: ['Health', 'Clinics', 'Hospital Group'],
    hospitality: ['Hotels', 'Resorts', 'Hospitality'], infotech: ['Software', 'Data', 'Tech'], ifm: ['Facility Services', 'FM Group'],
    manufacturing: ['Manufacturing', 'Industries', 'Works'], pharma: ['Pharma', 'Biotech', 'Labs'], retail: ['Stores', 'Retail', 'Markets'],
    transport: ['Logistics', 'Rail', 'Airports'], datacenters: ['Data Centers', 'Hosting', 'Cloud Campus'],
    education: ['University', 'Schools', 'Academy'], fsm: ['Field Services', 'Service Fleet'], property: ['Properties', 'Real Estate', 'Estates'],
    other: ['Holdings', 'Group'], unapplied: ['Group']
  },
  partnerKinds: ['Integration', 'Systems', 'Consulting', 'Solutions Partner', 'Digital Works'],

  // Markets (New Business rows) and countries (accounts) per region.
  markets: {
    na: ['US East', 'US West', 'US Central', 'Canada'], latam: ['Brazil', 'Mexico', 'Andean countries', 'Southern Cone'],
    neu: ['Nordics', 'British Isles', 'Benelux', 'Baltics'], seu: ['Iberia', 'Italy', 'France South', 'Greece and Cyprus'],
    ceu: ['DACH', 'Poland', 'Czechia and Slovakia', 'Hungary'], mea: ['Gulf states', 'Southern Africa', 'North Africa', 'Levant'],
    apac: ['Australia and NZ', 'Southeast Asia', 'Japan', 'India']
  },
  countries: {
    na: ['United States', 'Canada'], latam: ['Brazil', 'Mexico', 'Chile', 'Colombia', 'Argentina'],
    neu: ['Sweden', 'Norway', 'Denmark', 'Finland', 'Ireland', 'United Kingdom'], seu: ['Spain', 'Portugal', 'Italy', 'Greece'],
    ceu: ['Germany', 'Austria', 'Switzerland', 'Poland', 'Czechia'], mea: ['United Arab Emirates', 'Saudi Arabia', 'South Africa', 'Egypt'],
    apac: ['Australia', 'Singapore', 'Japan', 'India', 'New Zealand']
  },

  subVerticals: {
    busServices: ['Professional services firms', 'Shared service centres', 'Consultancies'],
    culture: ['Museums and galleries', 'Theme parks', 'Heritage sites'],
    utilities: ['Water utilities', 'Grid operators', 'District energy'],
    media: ['Broadcasters', 'Studios', 'Live venues'],
    finance: ['Retail banks', 'Insurers', 'Asset managers'],
    government: ['City administrations', 'Public agencies', 'Defence estates'],
    healthcare: ['Hospitals', 'Outpatient clinics', 'Elder care'],
    hospitality: ['Hotel chains', 'Resorts', 'Conference centres'],
    infotech: ['Software companies', 'Telecom operators', 'IT campuses'],
    ifm: ['Large FM providers', 'Regional FM providers'],
    manufacturing: ['Discrete manufacturing', 'Process industry', 'Automotive suppliers'],
    pharma: ['Research labs', 'Production sites', 'Biotech parks'],
    retail: ['Store networks', 'Shopping centres', 'Distribution centres'],
    transport: ['Airports', 'Rail operators', 'Ports and logistics'],
    datacenters: ['Colocation providers', 'Hyperscale campuses', 'Enterprise data centres'],
    education: ['Large university campuses', 'School districts', 'Research institutes'],
    fsm: ['Installation and maintenance', 'Building services contractors'],
    property: ['Commercial landlords', 'Residential managers', 'Mixed-use developers']
  },

  successFactors: ['Dedicated marketing assets', 'Local references', 'Specialist partner', 'Product gaps to close',
    'Industry expert hire', 'Reference visits', 'Partner enablement', 'Localised offering', 'Executive sponsorship',
    'Integration with local systems'],

  // Leader commentary by situation (Market Coverage).
  commentary: {
    strong: ['Strong base and good references.', 'Our strongest market; keep investing.', 'Well placed, with a clear winning recipe.'],
    notYet: ['Attractive, but we lack references.', 'Large untapped base; we need more expertise.', 'Interesting market; product gaps hold us back.'],
    weak: ['Limited traction so far.', 'Opportunistic only.', 'A small market for us.'],
    group: ['Group priority; plan aligned.', 'Group priority, building the team.']
  },

  maturity: ['Emerging', 'Developing', 'Established'],
  expertiseProduct: ['Product line 1', 'Product line 2', 'Product line 3', 'Product lines 1 and 2', 'All product lines']
};
