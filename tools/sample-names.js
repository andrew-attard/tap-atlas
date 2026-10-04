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

  // Sub-industries as leaders might type them. The planted-case step hands them out in turn across the regions,
  // so a name repeats only when an industry has more rows than names (docs/PLANTED-CASES.md, Q03).
  subVerticals: {
    busServices: ['Professional services firms', 'Shared service centres', 'Consultancies', 'Law firms'],
    culture: ['Museums and galleries', 'Theme parks', 'Heritage sites', 'Concert halls', 'Zoos and aquariums'],
    utilities: ['Water utilities', 'Grid operators', 'District energy', 'Wastewater treatment', 'Renewable generation',
      'Gas distribution', 'Municipal utilities'],
    media: ['Broadcasters', 'Studios', 'Live venues'],
    finance: ['Retail banks', 'Insurers', 'Asset managers', 'Private banks', 'Savings banks', 'Pension funds',
      'Payment providers', 'Credit unions', 'Reinsurers'],
    government: ['City administrations', 'Public agencies', 'Defence estates', 'Courts and justice', 'Tax offices',
      'Regional governments'],
    healthcare: ['Hospitals', 'Outpatient clinics', 'Elder care', 'University hospitals', 'Private hospital groups',
      'Rehabilitation centres', 'Diagnostic labs', 'Mental health services', 'Dental chains', 'Care homes',
      'Day surgery centres', 'Specialist clinics', 'Regional health boards', 'Hospices', 'Medical research centres'],
    hospitality: ['Hotel chains', 'Resorts', 'Conference centres'],
    infotech: ['Software companies', 'Telecom operators', 'IT campuses', 'Cloud service providers', 'Semiconductor firms',
      'IT service providers', 'Network operators', 'Game studios', 'Electronics makers', 'Satellite operators',
      'Cybersecurity firms'],
    ifm: ['Large FM providers', 'Regional FM providers', 'Soft services providers', 'Hard services providers',
      'Cleaning contractors', 'Security services firms', 'Catering contractors', 'Workplace service firms',
      'Energy service companies', 'Property service firms', 'Total FM outsourcers', 'Campus service providers',
      'Hospital FM providers'],
    manufacturing: ['Discrete manufacturing', 'Process industry', 'Automotive suppliers', 'Food and beverage plants',
      'Machinery makers'],
    pharma: ['Research labs', 'Production sites', 'Biotech parks', 'Contract manufacturers', 'Clinical trial sites'],
    retail: ['Store networks', 'Shopping centres', 'Distribution centres', 'Supermarket chains', 'Fashion chains',
      'DIY chains', 'Outlet centres'],
    transport: ['Airports', 'Rail operators', 'Ports and logistics', 'Bus operators', 'Parcel hubs', 'Toll road operators'],
    datacenters: ['Colocation providers', 'Hyperscale campuses', 'Enterprise data centres', 'Edge data centres',
      'Wholesale data centres', 'Modular data centres', 'Telecom data halls', 'Government data centres',
      'Disaster recovery sites', 'Bank data centres', 'Research computing centres', 'University data centres',
      'Managed hosting sites', 'Sovereign cloud sites', 'Interconnection hubs', 'Cloud campuses'],
    education: ['Large university campuses', 'School districts', 'Research institutes', 'Vocational colleges',
      'Private schools', 'Student housing', 'Business schools', 'Community colleges', 'Online universities',
      'Boarding schools', 'Science parks', 'Teacher training colleges'],
    fsm: ['Installation and maintenance', 'Building services contractors', 'Lift and escalator service',
      'HVAC service firms', 'Fire safety service', 'Utility field crews', 'Facility repair networks', 'Equipment rental fleets'],
    property: ['Commercial landlords', 'Residential managers', 'Mixed-use developers', 'Office landlords', 'Logistics parks',
      'Co-working operators', 'Retail landlords']
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
