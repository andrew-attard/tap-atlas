/*
 * File: tools/sample-names.js
 * Purpose: Invented words for the sample data: account and partner names, markets, sub-verticals, success factors
 *          and commentary. Account and partner names use vetted coined stems, so none can pass for a real company.
 * Provides: module.exports ({stems, accountKinds, partnerKinds, markets, countries, subVerticals, successFactors,
 *           commentary, maturity, expertiseProduct})
 * Depends on: nothing
 * Used by: tools/sample-build.js
 */
'use strict';

module.exports = {
  // The vetted list of coined stems: a nonsense root plus a neutral, place-like ending (-holm, -stead, -dal,
  // -wick, -mere, -by, -ford, -thorpe, -vale, -combe), screened so no root is a real word, name or brand
  // fragment, or reads as a joke. Each is used once, with a kind of business ("Bulvamere Water"). Keep at
  // least 30% more stems than the file uses; the tests check names come only from this list.
  stems: [
    'Balqidal', 'Baltevale', 'Basvathorpe', 'Basveby', 'Bilqovale', 'Bilvoby', 'Binvestead', 'Binviby', 'Birdimere',
    'Bonvawick', 'Branvaby', 'Branviford', 'Brenvostead', 'Brisveby', 'Brondevale', 'Bronviby', 'Brosvicombe',
    'Brusvemere', 'Bulqathorpe', 'Bulqomere', 'Bulvamere', 'Burdoby', 'Burveholm', 'Busviford', 'Daltoford',
    'Danvicombe', 'Danvothorpe', 'Denveholm', 'Desvidal', 'Dirvoholm', 'Disvemere', 'Disvidal', 'Dolqawick',
    'Donvithorpe', 'Donvocombe', 'Dralqiby', 'Dranvamere', 'Dranvostead', 'Drarvathorpe', 'Drasviwick', 'Drelqoby',
    'Drenvastead', 'Drenvavale', 'Drilmeby', 'Drisvestead', 'Dronvidal', 'Drulqiwick', 'Drulvivale', 'Drunvastead',
    'Drusvoby', 'Dulqawick', 'Dunvemere', 'Dunvocombe', 'Durdadal', 'Durdiholm', 'Dusvamere', 'Falqoby', 'Fanviby',
    'Fanvocombe', 'Fasvadal', 'Fasvemere', 'Felqithorpe', 'Fenvedal', 'Fervicombe', 'Fesvastead', 'Fesvocombe',
    'Filvothorpe', 'Finviby', 'Firdawick', 'Firdicombe', 'Firkecombe', 'Folqacombe', 'Folqewick', 'Folqimere',
    'Fonvodal', 'Forvoby', 'Fraltostead', 'Frenvethorpe', 'Frenvostead', 'Frervaford', 'Fresvaby', 'Frirkowick',
    'Frirvaford', 'Frisvemere', 'Frondaby', 'Frondeford', 'Frosvacombe', 'Frundaby', 'Frurkewick', 'Fundithorpe',
    'Funvaford', 'Furkovale', 'Galqivale', 'Galtestead', 'Ganvodal', 'Garvimere', 'Gelqemere', 'Girvaholm',
    'Golqiholm', 'Gondostead', 'Gosvavale', 'Gosviford', 'Gosvimere', 'Grasveby', 'Grervemere', 'Gresvaby',
    'Grilmeby', 'Grilqaford', 'Grilqoholm', 'Grilveholm', 'Grilviholm', 'Grinvadal', 'Grirdoby', 'Grisvaford',
    'Grolqewick', 'Grosvecombe', 'Grulmicombe', 'Grulqecombe', 'Grulqestead', 'Grulvithorpe', 'Grulvivale',
    'Grunvodal', 'Grusvadal', 'Grusvovale', 'Gunvomere', 'Haltidal', 'Hasvecombe', 'Henvithorpe', 'Hesvoford',
    'Hinvaholm', 'Hirdicombe', 'Hirkethorpe', 'Horvacombe', 'Horviby', 'Horvocombe', 'Hosvidal', 'Hulqacombe',
    'Hulqavale', 'Husvedal', 'Husvowick', 'Kalqidal', 'Kaltomere', 'Karvoholm', 'Kelqiford', 'Kelqothorpe',
    'Kenvomere', 'Kervaford', 'Kilqaford', 'Kolqethorpe', 'Kolqiwick', 'Kondemere', 'Kondicombe', 'Konveholm',
    'Kosvacombe', 'Kulmostead', 'Kulvavale', 'Kunvecombe', 'Kunvedal', 'Kurvaford', 'Kurvecombe', 'Kusvawick',
    'Lanvacombe', 'Lanvostead', 'Lasvothorpe', 'Lenviford', 'Lervaford', 'Lilmeby', 'Lilvithorpe', 'Lirdedal',
    'Lirkiholm', 'Lolqathorpe', 'Lulmewick', 'Lulqovale', 'Malqacombe', 'Malqedal', 'Manvodal', 'Masvadal',
    'Melqomere', 'Mesvivale', 'Milmimere', 'Milmostead', 'Milqecombe', 'Minviford', 'Morvedal', 'Mosviwick',
    'Mulqoby', 'Mulvowick', 'Musviby', 'Musvicombe', 'Musvomere', 'Nalqastead', 'Naltacombe', 'Nanvaford',
    'Nanveholm', 'Narvecombe', 'Nasvewick', 'Nelqothorpe', 'Nesvaholm', 'Nilqeford', 'Nirvethorpe', 'Nirvocombe',
    'Nirvostead', 'Nisvimere', 'Nolqiwick', 'Nondiby', 'Norkevale', 'Norveby', 'Nosvathorpe', 'Nosvedal',
    'Nulmecombe', 'Nundivale', 'Nunvaford', 'Nunvecombe', 'Nurvistead', 'Nusviford', 'Palqedal', 'Panvivale',
    'Penvavale', 'Penviby', 'Pilvidal', 'Pilvomere', 'Pulmostead', 'Pulqethorpe', 'Punvemere', 'Ralqivale',
    'Raltevale', 'Rarvothorpe', 'Rasvemere', 'Rasvidal', 'Rasvomere', 'Rilmowick', 'Rirdovale', 'Risvathorpe',
    'Rolqawick', 'Ronvicombe', 'Rorkemere', 'Rulqoholm', 'Rundeford', 'Runvevale', 'Runvostead', 'Rurdodal',
    'Salqaby', 'Salqecombe', 'Silqothorpe', 'Solqacombe', 'Solqethorpe', 'Solqowick', 'Sonvaby', 'Sonvedal',
    'Sorkowick', 'Sosviford', 'Sosvoholm', 'Surkiby', 'Susvimere', 'Talqestead', 'Telqeholm', 'Telqidal', 'Tilmemere',
    'Tirkithorpe', 'Tirkovale', 'Tisvothorpe', 'Tolqavale', 'Tralqeby', 'Tralqethorpe', 'Trasveholm', 'Trasvethorpe',
    'Trelqamere', 'Tresviby', 'Trilqimere', 'Trinveholm'
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
