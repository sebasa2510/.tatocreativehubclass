/**
 * knowledge-base.ts — Saggio's curated IRS-grounded knowledge.
 *
 * Short, general educational excerpts. Each cites its IRS source. These are
 * paraphrases for education, not verbatim reproductions.
 *
 * COVERAGE RULE: every chunk must have a real, checkable IRS source. If a topic
 * has no source here, Saggio is expected to say so (or answer in the clearly
 * labelled `general` tier) rather than imply IRS backing it does not have.
 */

export interface KnowledgeChunk {
  id: string;
  source: string;
  section: string;
  content: string;
  keywords: string[];
}

export const KNOWLEDGE_BASE: KnowledgeChunk[] = [
  // ───────────────────────── Filing basics ─────────────────────────
  {
    id: 'std-deduction',
    source: 'IRS Rev. Proc. 2024-40; Form 1040 instructions',
    section: 'Standard deduction (tax year 2025)',
    content:
      'For tax year 2025 the basic standard deduction is $15,750 for a single filer or married filing separately, $23,625 for head of household, and $31,500 for married filing jointly. Taxpayers 65 or older or blind may add an additional amount.',
    keywords: ['standard deduction', 'deduction', 'single', 'married', 'jointly', 'head of household'],
  },
  {
    id: 'filing-status',
    source: 'IRS Publication 501, Dependents, Standard Deduction, and Filing Information',
    section: 'Filing status',
    content:
      'Your filing status depends on marital status and family situation. The five statuses are single, married filing jointly, married filing separately, head of household, and qualifying surviving spouse. Filing status affects your standard deduction, tax brackets, and eligibility for many credits.',
    keywords: ['filing status', 'head of household', 'qualifying surviving spouse', 'married filing', 'single filer'],
  },
  {
    id: '1040-overview',
    source: 'IRS Form 1040 instructions',
    section: 'Form 1040 — individual income tax return',
    content:
      'Form 1040 has two main parts: income and adjustments (which produce adjusted gross income), and deductions, tax, and credits (which produce total tax or refund). Taxable income is adjusted gross income minus the standard or itemized deduction.',
    keywords: ['1040', 'adjusted gross income', 'agi', 'taxable income', 'refund', 'overview'],
  },
  {
    id: 'who-must-file',
    source: 'IRS Publication 501; Form 1040 instructions',
    section: 'Who must file a return',
    content:
      'Whether you must file depends on your gross income, filing status, age, and whether you are a dependent. Income thresholds are set annually. Even below the threshold, you should generally file to claim a refund of withheld tax or to claim refundable credits such as the Earned Income Tax Credit.',
    keywords: ['who must file', 'do i need to file', 'filing requirement', 'gross income threshold', 'must file'],
  },
  {
    id: 'extensions',
    source: 'IRS Form 4868; IRS Publication 505',
    section: 'Filing extensions',
    content:
      'Form 4868 gives an automatic six-month extension to FILE a return, generally pushing the deadline to October 15. An extension to file is not an extension to PAY — any tax owed is still due by the original April deadline, and interest and penalties may accrue on amounts unpaid after that date.',
    keywords: ['extension', '4868', 'extend', 'october 15', 'more time to file', 'late filing'],
  },
  {
    id: 'free-file',
    source: 'IRS Free File; IRS Direct File',
    section: 'Free filing options',
    content:
      'IRS Free File provides brand-name tax software at no cost for taxpayers under an income threshold, available only through the IRS website. IRS Direct File is a separate free option in participating states. Be cautious of lookalike sites that charge for what the IRS offers free.',
    keywords: ['free file', 'free filing', 'direct file', 'free tax software', 'irs free'],
  },
  {
    id: 'amended-return',
    source: 'IRS Form 1040-X instructions',
    section: 'Amending a filed return',
    content:
      'Use Form 1040-X to correct a return you already filed. Generally file an amended return within three years of the original filing date or two years after the tax was paid, whichever is later. If you amend a federal return, you may also need to amend your state return.',
    keywords: ['amend', '1040-x', 'amended return', 'correction', 'fix my return', 'mistake on return'],
  },
  {
    id: 'recordkeeping',
    source: 'IRS Publication 583, Starting a Business and Keeping Records',
    section: 'Recordkeeping',
    content:
      'Keep records that support every income and expense item on your return. Good records help you monitor your business, prepare accurate returns, and support items if the IRS asks questions. Records supporting a return should generally be kept for at least three years, and longer for some situations.',
    keywords: ['records', 'receipts', 'bookkeeping', 'documentation', 'support', 'keep records', 'how long to keep'],
  },
  {
    id: 'penalties-interest',
    source: 'IRS Publication 17; IRS Penalties page',
    section: 'Penalties and interest',
    content:
      'The failure-to-file penalty is generally higher than the failure-to-pay penalty, which is why filing on time matters even if you cannot pay in full. Interest compounds daily on unpaid balances. Penalty relief may be available in limited circumstances, such as first-time abatement.',
    keywords: ['penalty', 'penalties', 'interest', 'late filing penalty', 'late payment', 'failure to file'],
  },

  // ───────────────────────── Income & withholding ─────────────────────────
  {
    id: 'w2',
    source: 'IRS Form W-2 instructions; Publication 15-A',
    section: 'Form W-2 — wages',
    content:
      'Form W-2 reports wages paid to an employee and the taxes withheld. Box 1 is taxable wages, Box 2 is federal income tax withheld, and Boxes 3 and 5 are Social Security and Medicare wages. Your employer must furnish it by the end of January.',
    keywords: ['w-2', 'w2', 'wages', 'withholding', 'box 1', 'employer', 'employee income'],
  },
  {
    id: '1099-nec',
    source: 'IRS Form 1099-NEC instructions; Publication 334',
    section: 'Form 1099-NEC — nonemployee compensation',
    content:
      'Form 1099-NEC reports payments of $600 or more to a nonemployee for services. This is self-employment income, reported on Schedule C, and it is generally subject to self-employment tax. There is no withholding on this income, so quarterly estimated payments are usually needed.',
    keywords: ['1099', '1099-nec', 'nonemployee compensation', 'freelance', 'contractor income', 'self employed income'],
  },
  {
    id: '1099-k',
    source: 'IRS Form 1099-K; IRS payment-card reporting guidance',
    section: 'Form 1099-K — payment card and third-party network payments',
    content:
      'Form 1099-K reports payments made through payment cards and third-party settlement organizations. A Form 1099-K is an information return, not a new tax — income is taxable regardless of the form. The threshold for reporting has changed repeatedly, so check the current-year threshold.',
    keywords: ['1099-k', '1099k', 'paypal', 'venmo', 'stripe', 'gig income', 'third party network'],
  },
  {
    id: 'interest-dividends',
    source: 'IRS Publication 550, Investment Income and Expenses',
    section: 'Interest and dividend income',
    content:
      'Interest you receive is generally taxable as ordinary income and is reported on Form 1099-INT. Ordinary dividends reported on Form 1099-DIV are taxable; qualified dividends are taxed at capital-gain rates. Interest on certain municipal bonds may be tax-exempt.',
    keywords: ['interest income', '1099-int', 'dividends', '1099-div', 'qualified dividends', 'investment income'],
  },
  {
    id: 'capital-gains',
    source: 'IRS Publication 550; Schedule D instructions',
    section: 'Capital gains and losses',
    content:
      'Selling an investment for more than its basis produces a capital gain. Held one year or less it is short-term and taxed at ordinary rates; held longer it is long-term and generally taxed at 0%, 15%, or 20% depending on income. Capital losses can offset gains plus up to $3,000 of ordinary income, with the remainder carried forward.',
    keywords: ['capital gains', 'capital loss', 'schedule d', 'stock', 'sell investments', 'long term', 'short term'],
  },
  {
    id: 'retirement-distributions',
    source: 'IRS Publication 575, Pension and Annuity Income',
    section: 'Retirement plan distributions',
    content:
      'Distributions from IRAs and 401(k)s are generally taxable as ordinary income and reported on Form 1099-R. Taking money before age 59½ may trigger an additional 10% tax unless an exception applies. Many retirement accounts require minimum distributions after a certain age.',
    keywords: ['1099-r', 'retirement', 'distribution', '401k', 'ira withdrawal', 'pension', 'early withdrawal'],
  },
  {
    id: 'unemployment',
    source: 'IRS Publication 525, Taxable and Nontaxable Income',
    section: 'Unemployment compensation',
    content:
      'Unemployment compensation is taxable income and is reported on Form 1099-G. You can choose to have federal income tax withheld from benefits, and you may need to make estimated payments if you did not.',
    keywords: ['unemployment', '1099-g', 'jobless benefits', 'unemployment compensation'],
  },
  {
    id: 'social-security-tax',
    source: 'IRS Publication 915, Social Security and Equivalent Railroad Retirement Benefits',
    section: 'Taxation of Social Security benefits',
    content:
      'Up to 85% of Social Security benefits may be taxable depending on your combined income, which is adjusted gross income plus nontaxable interest plus half of your benefits. Many beneficiaries owe no tax on their benefits at all.',
    keywords: ['social security', 'ssa-1099', 'taxable social security', 'benefits', 'combined income'],
  },
  {
    id: 'gambling-hobby',
    source: 'IRS Publication 525; Publication 529, Miscellaneous Deductions',
    section: 'Gambling winnings and hobby income',
    content:
      'Gambling winnings are fully taxable and must be reported; losses may be deductible only up to winnings and only if you itemize. A hobby is an activity not pursued for profit — hobby expenses are generally not deductible, and hobby income is reported on the return.',
    keywords: ['gambling', 'winnings', 'w-2g', 'lottery', 'hobby income', 'losses'],
  },

  // ───────────────────────── Adjustments & deductions ─────────────────────────
  {
    id: 'itemized-vs-standard',
    source: 'IRS Schedule A instructions; Publication 501',
    section: 'Choosing standard or itemized deductions',
    content:
      'You may either take the standard deduction or itemize on Schedule A, whichever gives the larger deduction. Itemized deductions include certain medical expenses, state and local taxes within the cap, mortgage interest, and charitable contributions. Most taxpayers take the standard deduction.',
    keywords: ['itemize', 'itemized', 'schedule a', 'standard vs itemized', 'which deduction'],
  },
  {
    id: 'salt-cap',
    source: 'IRS Schedule A instructions; Publication 17',
    section: 'State and local tax (SALT) deduction',
    content:
      'If you itemize you may deduct state and local income or sales taxes plus property taxes, subject to an annual combined cap. The cap has changed with recent legislation, so verify the current-year limit before assuming a full deduction.',
    keywords: ['salt', 'state and local tax', 'property tax', 'sales tax', 'state tax deduction'],
  },
  {
    id: 'mortgage-interest',
    source: 'IRS Publication 936, Home Mortgage Interest Deduction',
    section: 'Mortgage interest deduction',
    content:
      'If you itemize, you may deduct interest on a mortgage secured by a qualified home, subject to a limit on the debt principal. Interest on a home-equity loan is generally deductible only if the loan was used to buy, build, or substantially improve the home.',
    keywords: ['mortgage interest', 'home loan', '1098', 'home equity', 'deduct mortgage'],
  },
  {
    id: 'charitable',
    source: 'IRS Publication 526, Charitable Contributions',
    section: 'Charitable contributions',
    content:
      'Donations to qualified organizations may be deductible if you itemize. You must have a bank record or written acknowledgment from the charity substantiating any contribution of $250 or more. Political donations and gifts to individuals are never deductible.',
    keywords: ['charity', 'charitable', 'donation', 'deduct donations', 'contributions', 'goodwill'],
  },
  {
    id: 'medical-expenses',
    source: 'IRS Publication 502, Medical and Dental Expenses',
    section: 'Medical expense deduction',
    content:
      'If you itemize, you may deduct medical and dental expenses for you, your spouse, and your dependents to the extent they exceed a percentage of adjusted gross income. Qualified expenses include premiums, prescriptions, and certain travel for care.',
    keywords: ['medical expenses', 'medical deduction', 'doctor bills', 'dental', 'health costs'],
  },
  {
    id: 'student-loan-interest',
    source: 'IRS Publication 970, Tax Benefits for Education',
    section: 'Student loan interest deduction',
    content:
      'You may deduct up to $2,500 of interest paid on qualified student loans as an adjustment to income, without itemizing. The deduction phases out above certain income levels and is not available if you are claimed as a dependent.',
    keywords: ['student loan interest', '1098-e', 'education loan', 'student loans'],
  },
  {
    id: 'ira-hsa',
    source: 'IRS Publication 590-A; Publication 969, Health Savings Accounts',
    section: 'IRA and HSA contributions',
    content:
      'Contributions to a traditional IRA may be deductible and grow tax-deferred, subject to annual limits and income-based phase-outs when you are covered by a workplace plan. HSA contributions are deductible and distributions for qualified medical expenses are tax-free.',
    keywords: ['ira', 'traditional ira', 'roth ira', 'hsa', 'health savings', 'retirement contribution', 'deductible contribution'],
  },
  {
    id: 'educator-other-adjustments',
    source: 'IRS Publication 17; Schedule 1 instructions',
    section: 'Other adjustments to income',
    content:
      'Adjustments reduce gross income before the standard or itemized deduction. Common examples include educator expenses, certain moving expenses for active-duty military, self-employed health insurance, and the deductible part of self-employment tax.',
    keywords: ['adjustments', 'schedule 1', 'educator expenses', 'above the line', 'adjustments to income'],
  },

  // ───────────────────────── Credits ─────────────────────────
  {
    id: 'child-tax-credit',
    source: 'IRS Schedule 8812 instructions; Publication 972',
    section: 'Child Tax Credit',
    content:
      'The Child Tax Credit is worth up to a set amount per qualifying child under 17, and part may be refundable as the Additional Child Tax Credit. It phases out above certain income levels. A separate credit may be available for other dependents.',
    keywords: ['child tax credit', 'ctc', 'schedule 8812', 'credit for children', 'dependent credit'],
  },
  {
    id: 'earned-income-credit',
    source: 'IRS Publication 596, Earned Income Credit',
    section: 'Earned Income Tax Credit (EITC)',
    content:
      'The EITC is a refundable credit for workers with low to moderate income, with or without children. The amount depends on income, filing status, and number of qualifying children, and it requires that you have earned income and meet investment-income limits.',
    keywords: ['earned income credit', 'eitc', 'refundable credit', 'low income credit'],
  },
  {
    id: 'education-credits',
    source: 'IRS Publication 970, Tax Benefits for Education',
    section: 'Education credits',
    content:
      'The American Opportunity Tax Credit covers the first four years of higher education and is partly refundable; the Lifetime Learning Credit covers additional education and is not refundable. You claim them on Form 8863 and cannot claim both for the same student in the same year.',
    keywords: ['education credit', 'american opportunity', 'lifetime learning', '8863', '1098-t', 'college credit'],
  },
  {
    id: 'childcare-credit',
    source: 'IRS Publication 503, Child and Dependent Care Expenses',
    section: 'Child and dependent care credit',
    content:
      'You may claim a credit for care expenses that let you work or look for work, up to a limit of expenses per qualifying person. The credit percentage decreases as income rises. You generally need the care provider\u2019s name, address, and taxpayer identification number.',
    keywords: ['child care', 'childcare credit', 'dependent care', 'daycare', 'after school care'],
  },
  {
    id: 'saver-credit',
    source: 'IRS Form 8880 instructions; Publication 590-A',
    section: "Saver's Credit",
    content:
      "The Saver's Credit is a nonrefundable credit for eligible low-to-moderate-income taxpayers who contribute to a retirement account. Income limits apply, and certain full-time students and dependents do not qualify.",
    keywords: ["savers credit", 'saver', 'retirement savings credit', '8880'],
  },
  {
    id: 'residential-energy',
    source: 'IRS Form 5695 instructions; IRS clean energy guidance',
    section: 'Residential clean energy and efficiency credits',
    content:
      'The Residential Clean Energy Credit offsets part of the cost of qualifying solar, wind, geothermal, and battery storage installations. A separate Energy Efficient Home Improvement Credit covers certain insulation, windows, doors, and heat pumps, with annual and lifetime caps.',
    keywords: ['solar', 'energy credit', '5695', 'heat pump', 'energy efficient', 'home improvement credit'],
  },
  {
    id: 'premium-tax-credit',
    source: 'IRS Publication 974; Form 8962 instructions',
    section: 'Premium Tax Credit',
    content:
      'The Premium Tax Credit helps eligible taxpayers pay for health insurance bought through the Health Insurance Marketplace. If you received advance payments, you reconcile them on Form 8962 — if advance payments were too large you may owe some back, and if too small you may get a refund.',
    keywords: ['premium tax credit', 'marketplace', 'obamacare', 'health insurance credit', '8962', '1095-a'],
  },

  // ───────────────────────── Self-employment & business ─────────────────────────
  {
    id: 'schedule-c',
    source: 'IRS Publication 535, Business Expenses; Schedule C instructions',
    section: 'Schedule C — profit or loss from a business',
    content:
      'Schedule C reports the gross receipts of a sole proprietorship minus ordinary and necessary business expenses. An expense is ordinary if common in your trade and necessary if helpful and appropriate. Net profit flows to Form 1040 and is subject to self-employment tax.',
    keywords: ['schedule c', 'business', 'expense', 'deduction', 'sole proprietor', 'receipts', 'profit'],
  },
  {
    id: 'se-tax',
    source: 'IRS Publication 334, Tax Guide for Small Business; Schedule SE',
    section: 'Self-employment tax',
    content:
      'Self-employment tax funds Social Security and Medicare. Net earnings are about 92.35% of net profit; the 2025 Social Security wage base is $176,100. You may deduct half of self-employment tax as an adjustment to income on Form 1040.',
    keywords: ['self-employment tax', 'se tax', 'schedule se', 'medicare', 'social security', 'se tax deduction'],
  },
  {
    id: 'estimated-tax',
    source: 'IRS Publication 505, Tax Withholding and Estimated Tax',
    section: 'Estimated tax payments',
    content:
      'People who are self-employed generally pay tax quarterly through estimated tax payments. Underpayment can result in an estimated tax penalty. Payments are made with Form 1040-ES.',
    keywords: ['estimated tax', 'quarterly', '1040-es', 'withholding', 'underpayment', 'penalty'],
  },
  {
    id: 'home-office',
    source: 'IRS Publication 587, Business Use of Your Home',
    section: 'Home office deduction',
    content:
      'You may deduct expenses for a home office used exclusively and regularly as your principal place of business or a place to meet clients. Options include the regular method and the simplified method (a set rate per square foot).',
    keywords: ['home office', 'business use of home', 'dedicated space', 'simplified method', '587'],
  },
  {
    id: 'vehicle',
    source: 'IRS Publication 463, Travel, Gift, and Car Expenses',
    section: 'Standard mileage rate',
    content:
      'Instead of tracking actual car expenses, self-employed taxpayers may use the standard mileage rate for business miles. You cannot use the standard mileage rate if you used certain accelerated depreciation in an earlier year. Commuting from home to a regular workplace is not deductible mileage.',
    keywords: ['mileage', 'car', 'vehicle', 'standard mileage', 'business miles', 'travel', 'commute'],
  },
  {
    id: 'meals-travel',
    source: 'IRS Publication 463; Publication 535',
    section: 'Business meals and travel',
    content:
      'Ordinary and necessary business meals are generally deductible at 50% when business is conducted during or immediately before or after the meal. Travel expenses away from home that are ordinary and necessary for business may be deducible; lavish or personal expenses are not.',
    keywords: ['business meals', '50 percent', 'travel expenses', 'per diem', 'entertainment'],
  },
  {
    id: 'quarterly-deadlines',
    source: 'IRS Form 1040-ES; IRS estimated tax payment due dates',
    section: 'Estimated payment schedule',
    content:
      'For a calendar-year taxpayer, individual estimated tax payments are generally due April 15, June 15, September 15, and January 15 of the following year. If a due date falls on a weekend or holiday, it moves to the next business day.',
    keywords: ['estimated payment due', 'quarterly dates', 'april 15', 'june 15', 'september 15', 'january 15'],
  },
  {
    id: 'llc-entity',
    source: 'IRS Publication 3402; IRS Entity Classification guidance',
    section: 'Business structure and entity type',
    content:
      'A single-member LLC is generally disregarded for federal tax purposes and reports on Schedule C, while an S corporation files Form 1120-S and pays shareholders reasonable compensation. Electing entity status is done with Form 2553 or Form 8832 and has payroll and filing consequences.',
    keywords: ['llc', 's corporation', 'scorp', '1120-s', 'business structure', 'incorporate', 'entity type'],
  },
  {
    id: 'business-startup',
    source: 'IRS Publication 535, Business Expenses',
    section: 'Start-up and organizational costs',
    content:
      'You may generally deduct a limited amount of start-up and organizational costs in the year the business begins, with the remainder amortized over 15 years. Costs must be for creating the business rather than for operating it.',
    keywords: ['startup costs', 'start-up', 'organizational costs', 'new business', 'amortize'],
  },
  {
    id: 'depreciation',
    source: 'IRS Publication 946, How to Depreciate Property',
    section: 'Depreciation and Section 179',
    content:
      'Property used in a business with a useful life beyond one year is generally recovered through depreciation rather than expensed immediately. Section 179 and bonus depreciation allow accelerated recovery within annual limits, and some vehicles are subject to special caps.',
    keywords: ['depreciation', 'section 179', 'bonus depreciation', 'equipment', '946', 'asset purchase'],
  },

  // ───────────────────────── Life events & special situations ─────────────────────────
  {
    id: 'new-baby',
    source: 'IRS Publication 501; Schedule 8812 instructions',
    section: 'New child or dependent',
    content:
      'A new child usually means updating your withholding, adding a dependent, and checking eligibility for the Child Tax Credit and the child and dependent care credit. A child must have a Social Security number (or other accepted identifier) to be claimed for most benefits.',
    keywords: ['new baby', 'new child', 'dependent', 'claim a child', 'birth', 'adoption'],
  },
  {
    id: 'marriage-divorce',
    source: 'IRS Publication 501; Publication 504, Divorced or Separated Individuals',
    section: 'Marriage, divorce, and separation',
    content:
      'Marital status on December 31 generally determines your filing status for the whole year. After a divorce, rules govern who may claim a child, how alimony is treated, and how to split items between former spouses. Name and address changes should be reported to the Social Security Administration and the IRS.',
    keywords: ['married', 'marriage', 'divorce', 'separated', 'name change', 'alimony'],
  },
  {
    id: 'moving',
    source: 'IRS Publication 521, Moving Expenses',
    section: 'Moving expenses',
    content:
      'Moving expense deductions are generally limited to members of the armed forces on active duty moving under orders. For most other taxpayers moving expenses are no longer deductible, though moving reimbursements may still be taxable.',
    keywords: ['moving expenses', 'relocation', 'moved', '521'],
  },
  {
    id: 'selling-home',
    source: 'IRS Publication 523, Selling Your Home',
    section: 'Gain on the sale of a home',
    content:
      'You may exclude up to $250,000 of gain on the sale of your main home ($500,000 for a qualifying joint return) if you owned and lived in it for two of the five years before the sale. Gain above the exclusion may be taxable, and a loss on a personal residence is not deductible.',
    keywords: ['selling home', 'sell my house', 'selling my house', 'sale of home', 'home sale', '523', 'primary residence', 'capital gain home'],
  },
  {
    id: 'rental-income',
    source: 'IRS Publication 527, Residential Rental Property',
    section: 'Rental income and expenses',
    content:
      'Rental income is taxable and reported on Schedule E. You may deduct ordinary and necessary expenses such as mortgage interest, property tax, insurance, repairs, and depreciation. Personal use of a rental unit limits the expenses you can deduct.',
    keywords: ['rental', 'schedule e', 'landlord', 'airbnb', 'rental property', '527'],
  },
  {
    id: 'inheritance-gift',
    source: 'IRS Publication 559, Survivors, Executors, and Administrators',
    section: 'Inheritances and gifts',
    content:
      'Inheritances and gifts you receive are generally not taxable income to you. However, income the inherited assets later produce is taxable, and the estate may owe tax above an exclusion amount. The giver may owe gift tax above the annual exclusion, but the recipient generally does not.',
    keywords: ['inheritance', 'inherited', 'gift', 'estate', '559', 'received money'],
  },
  {
    id: 'student-status',
    source: 'IRS Publication 501; Publication 970',
    section: 'Students and dependents',
    content:
      'A full-time student may still be claimed as a qualifying child up to age 24 if other tests are met. Scholarship amounts used for tuition and required fees are generally tax-free, while amounts used for room and board are usually taxable.',
    keywords: ['student', 'college student', 'dependent student', 'scholarship', 'full time student'],
  },
  {
    id: 'military',
    source: 'IRS Publication 3, Armed Forces\u2019 Tax Guide',
    section: 'Military taxpayers',
    content:
      'Combat pay may be excluded from income and can increase eligibility for refundable credits. Service members may qualify for special rules on residency, moving expenses, and deadline extensions while serving in a combat zone.',
    keywords: ['military', 'combat pay', 'armed forces', 'deployment', 'servicemember'],
  },
  {
    id: 'disaster',
    source: 'IRS disaster relief guidance; Publication 547',
    section: 'Disaster losses and relief',
    content:
      'Casualty losses from a federally declared disaster may be deductible, generally only for losses not covered by insurance. The IRS often grants extended deadlines and penalty relief to taxpayers in a federally declared disaster area.',
    keywords: ['disaster', 'casualty loss', 'hurricane', 'flood', 'storm damage', '547'],
  },

  // ───────────────────────── Identity, payments & process ─────────────────────────
  {
    id: 'itin',
    source: 'IRS ITIN guidance; Form W-7 instructions',
    section: 'Individual Taxpayer Identification Number (ITIN)',
    content:
      'An ITIN is for people who must file a federal return but are not eligible for a Social Security number. Apply with Form W-7. ITINs expire if unused for three consecutive years and must be renewed before a return can be processed.',
    keywords: ['itin', 'w-7', 'no social security number', 'individual taxpayer identification'],
  },
  {
    id: 'ptin',
    source: 'IRS PTIN requirements; Treasury Circular 230',
    section: 'Who may prepare returns for compensation',
    content:
      'Anyone who prepares or assists in preparing all or substantially all of a federal tax return for compensation must have a valid Preparer Tax Identification Number (PTIN).',
    keywords: ['ptin', 'preparer', 'circular 230', 'compensation', 'who can prepare'],
  },
  {
    id: 'choosing-preparer',
    source: 'IRS Choosing a Tax Professional; Circular 230',
    section: 'Choosing a tax professional',
    content:
      'Enrolled agents, CPAs, and attorneys have unlimited representation rights before the IRS; preparers without those credentials have limited representation rights. All paid preparers must have a PTIN and, if they prepare certain returns, an Annual Filing Season Program record of completion.',
    keywords: ['tax preparer', 'accountant', 'cpa', 'enrolled agent', 'choose preparer', 'tax professional'],
  },
  {
    id: 'refund',
    source: 'IRS.gov — Where\u2019s My Refund?',
    section: 'Checking your refund status',
    content:
      'The official IRS Where\u2019s My Refund? tool on irs.gov is the only place to check federal refund status. TatoIQ links to it and never stores your refund query data.',
    keywords: ['refund', 'where is my refund', 'refund status', 'federal refund'],
  },
  {
    id: 'refund-timing',
    source: 'IRS Refunds guidance; PATH Act',
    section: 'When to expect a refund',
    content:
      'Most refunds are issued within 21 days of acceptance for electronically filed returns with direct deposit. Returns claiming the Earned Income Tax Credit or Additional Child Tax Credit cannot be issued before mid-February by law. Paper returns and refunds by check take longer.',
    keywords: ['refund timing', 'how long refund', '21 days', 'refund delay', 'direct deposit', 'path act'],
  },
  {
    id: 'direct-pay',
    source: 'IRS Direct Pay; IRS payment options',
    section: 'Paying the IRS',
    content:
      'IRS Direct Pay lets you pay directly from a bank account with no fee, and IRS2Go offers mobile options. Payment plans are available online for balances under a threshold, and installment agreements can be requested through the IRS website.',
    keywords: ['pay irs', 'direct pay', 'payment plan', 'payment options', 'how to pay', 'irs2go'],
  },
  {
    id: 'id-protection-pin',
    source: 'IRS Identity Protection PIN (IP PIN) guidance',
    section: 'Identity Protection PIN',
    content:
      'An Identity Protection PIN is a six-digit number that must be entered on your return to prevent someone else from filing in your name. Once issued it changes every year, and you should never share it with anyone except a trusted preparer.',
    keywords: ['ip pin', 'identity protection pin', 'identity theft pin', 'protect my return'],
  },
  {
    id: 'irs-notices-general',
    source: 'IRS Understanding Your IRS Notice or Letter',
    section: 'Understanding an IRS notice',
    content:
      'Every IRS notice has a number in the upper right corner that identifies the topic. The notice explains what the IRS believes and what, if anything, you must do. Keep a copy and respond by the deadline shown; ignoring a notice generally makes the situation worse.',
    keywords: ['irs notice', 'letter from irs', 'notice number', 'what does this notice mean'],
  },
  {
    id: 'statute-of-limitations',
    source: 'IRS Publication 17; IRS examination guidance',
    section: 'How long the IRS can review a return',
    content:
      'The IRS generally has three years after a return is filed to assess additional tax, extended to six years when substantial income is omitted, and with no limit when no return is filed or a fraudulent return is filed.',
    keywords: ['statute of limitations', 'how long audit', 'three years', 'irs review period'],
  },
  {
    id: 'e-file-signature',
    source: 'IRS e-file signature requirements; Form 8879',
    section: 'E-signing a return',
    content:
      'An electronically filed return requires a signed Form 8879, IRS e-file Signature Authorization, before the preparer can transmit it. A personal identification number serves as the electronic signature, and the preparer must retain the signed form.',
    keywords: ['8879', 'e-sign', 'signature', 'e-file signature', 'authorize filing'],
  },
  {
    id: 'state-return',
    source: 'IRS Publication 17; state tax authority guidance',
    section: 'State returns',
    content:
      'Many states require a state return in addition to the federal return, and some cities and localities levy their own income tax. Federal adjusted gross income is usually the starting point for state taxable income, but each state has its own rules, rates, and credits.',
    keywords: ['state return', 'state tax', 'local tax', 'city tax', 'file state'],
  },
  {
    id: 'estimated-vs-withholding',
    source: 'IRS Publication 505; Form W-4 instructions',
    section: 'Withholding and the W-4',
    content:
      'Form W-4 tells an employer how much federal income tax to withhold. If you had a large refund or a balance due, adjusting your W-4 or estimated payments brings withholding closer to your actual liability. The IRS Tax Withholding Estimator can suggest an amount.',
    keywords: ['w-4', 'w4', 'withholding', 'adjust withholding', 'too much withheld', 'big refund'],
  },

  // ───────────────── High-frequency topics added for broader coverage ─────────────────
  {
    id: 'tax-brackets',
    source: 'IRS Rev. Proc. 2024-40; Form 1040 instructions',
    section: 'Tax brackets and marginal rates (tax year 2025)',
    content:
      'The federal income tax is progressive: taxable income is divided into bands, and each band is taxed at its own rate. Your marginal rate is the rate on your last dollar of taxable income, not the rate on all of it. Filing status sets the bracket thresholds. Long-term capital gains and qualified dividends generally use separate preferential rate schedules.',
    keywords: ['tax bracket', 'tax brackets', 'marginal rate', 'tax rate', 'federal income tax rate', 'progressive tax'],
  },
  {
    id: 'dependents',
    source: 'IRS Publication 501',
    section: 'Dependents and qualifying children',
    content:
      'A dependent is either a qualifying child or a qualifying relative. The tests look at relationship, age, residency, support, and whether the person files a joint return. A qualifying child generally must live with you for more than half the year, be under 19 or a full-time student under 24, and not provide more than half of their own support. A qualifying relative has different support and gross-income tests.',
    keywords: ['dependent', 'dependents', 'qualifying child', 'qualifying relative', 'claim a dependent', 'dependency test'],
  },
  {
    id: 'head-of-household',
    source: 'IRS Publication 501',
    section: 'Head of household filing status',
    content:
      'Head of household generally requires you to be unmarried on the last day of the year, pay more than half the cost of maintaining a home that is the main home for a qualifying person for more than half the year, and not be a nonresident alien. It provides a larger standard deduction and wider tax brackets than the single status.',
    keywords: ['head of household', 'hoh', 'unmarried', 'main home', 'filing status'],
  },
  {
    id: '1099-misc',
    source: 'IRS Form 1099-MISC instructions; Publication 525',
    section: 'Form 1099-MISC income',
    content:
      'Form 1099-MISC reports miscellaneous income such as rents, prizes and awards, other income payments, and certain medical or health care payments. It is not the form for nonemployee compensation for services; that is Form 1099-NEC. Income is reportable even if no form arrives.',
    keywords: ['1099-misc', 'miscellaneous income', 'rents', 'prizes', 'awards', 'other income'],
  },
  {
    id: '1099-b',
    source: 'IRS Form 1099-B instructions; Schedule D instructions',
    section: 'Form 1099-B and securities sales',
    content:
      'Form 1099-B reports proceeds from sales of stocks, bonds, mutual funds, and other securities. It may also report cost basis and whether a gain is short-term or long-term. Check the basis reported; it is not always correct, especially for older, gifted, or transferred assets.',
    keywords: ['1099-b', 'brokerage', 'stock sale', 'securities', 'proceeds', 'cost basis', 'schedule d'],
  },
  {
    id: '1099-da',
    source: 'IRS Form 1099-DA instructions; IRS digital asset guidance',
    section: 'Form 1099-DA and digital assets',
    content:
      'Form 1099-DA is the information return for digital asset transactions. Digital assets are treated as property for federal tax purposes, so selling, exchanging, or paying with them can produce capital gain or loss. Keep records of basis and fair market value at the time of each transaction.',
    keywords: ['1099-da', 'crypto', 'cryptocurrency', 'bitcoin', 'digital asset', 'nft', 'virtual currency'],
  },
  {
    id: '1099-c',
    source: 'IRS Publication 4681; Form 1099-C instructions',
    section: 'Cancellation of debt income',
    content:
      'Cancellation of debt can produce taxable income when a lender forgives a debt. Form 1099-C reports the cancelled amount. Exceptions and exclusions exist, including certain bankruptcies, insolvency, and qualified principal residence debt, but they are fact-specific and require careful analysis.',
    keywords: ['1099-c', 'cancelled debt', 'canceled debt', 'forgiven debt', 'debt forgiveness', 'cancellation of debt'],
  },
  {
    id: '1099-s',
    source: 'IRS Form 1099-S instructions; Publication 523',
    section: 'Form 1099-S and real estate sales',
    content:
      'Form 1099-S reports the sale or exchange of real estate. Gross proceeds are not the same as taxable gain; basis, selling costs, and the home-sale exclusion determine the gain. Keep the closing statement and records of improvements.',
    keywords: ['1099-s', 'sale of property', 'real estate sale', 'closing statement', 'selling home'],
  },
  {
    id: 'k1',
    source: 'IRS Schedule K-1 instructions (Form 1065 and Form 1120-S)',
    section: 'Schedule K-1 pass-through income',
    content:
      'A Schedule K-1 reports your share of a partnership, S corporation, or estate or trust income, deductions, credits, and other items. You generally report the items on your own return using the codes in the K-1 instructions, even if you received no cash distribution.',
    keywords: ['k-1', 'k1', 'schedule k-1', 'partnership', 's corporation', 's corp', 'estate income', 'trust income'],
  },
  {
    id: 'equity-compensation',
    source: 'IRS Publication 525; Publication 550',
    section: 'Stock options and restricted stock units',
    content:
      'Stock options and restricted stock units are taxed differently. Nonqualified options are generally taxed as ordinary income when exercised, while incentive stock options can have alternative minimum tax consequences. Restricted stock units are generally taxed as ordinary income when they vest. Report sales on Schedule D and check your basis.',
    keywords: ['rsu', 'restricted stock', 'stock options', 'iso', 'nso', 'equity compensation', 'vesting', '83(b)'],
  },
  {
    id: 'qbi-deduction',
    source: 'IRS Form 8995 instructions; Publication 535',
    section: 'Qualified business income deduction',
    content:
      'The qualified business income (QBI) deduction may allow eligible owners of sole proprietorships, partnerships, S corporations, and some trusts and estates to deduct up to 20% of qualified business income, subject to limitations based on W-2 wages, property, and taxable income. It is not available for wage income or for certain specified service businesses above the thresholds.',
    keywords: ['qbi', 'qualified business income', '20 percent deduction', '199a', 'pass-through deduction'],
  },
  {
    id: 'se-health-insurance',
    source: 'IRS Publication 535; Schedule 1 (Form 1040) instructions',
    section: 'Self-employed health insurance deduction',
    content:
      'Self-employed taxpayers may deduct health insurance premiums for themselves, their spouse, and dependents as an adjustment to income if the policy is established under the business and they are not eligible for an employer-subsidized plan. The deduction cannot exceed net self-employment income.',
    keywords: ['self-employed health insurance', 'health insurance deduction', 'premiums', 'schedule 1', 'self employed insurance'],
  },
  {
    id: 'retirement-plans-self-employed',
    source: 'IRS Publication 560',
    section: 'SEP, SIMPLE, and solo 401(k) plans',
    content:
      'Self-employed taxpayers can use SEP, SIMPLE, or solo 401(k) plans. Contributions are generally deductible, and the plan type determines contribution limits and deadlines. A SEP can generally be established and funded by the extended due date; a solo 401(k) generally must be established by year-end.',
    keywords: ['sep ira', 'solo 401k', 'self-employed retirement', 'retirement plan contribution', 'simple ira', 'keogh'],
  },
  {
    id: '529-able',
    source: 'IRS Publication 970; IRS ABLE account guidance',
    section: '529 plans and ABLE accounts',
    content:
      'Qualified distributions from a 529 plan are tax-free when used for qualified education expenses. A 529-to-Roth IRA rollover is available only under specific limits and conditions. ABLE accounts help eligible people with disabilities save without losing certain benefits, subject to annual contribution limits.',
    keywords: ['529', 'college savings', 'able account', 'education savings', 'roth rollover', 'qualified tuition program'],
  },
  {
    id: 'adoption-credit',
    source: 'IRS Form 8839 instructions',
    section: 'Adoption credit and employer benefits',
    content:
      'The adoption credit and employer-provided adoption benefits can offset qualified adoption expenses, subject to income limits and a dollar cap. The credit is nonrefundable, but excess amounts may be carried forward. Special rules apply to special-needs adoptions.',
    keywords: ['adoption credit', '8839', 'adoption expenses', 'adopt', 'adoption benefits'],
  },
  {
    id: 'clean-vehicle-credit',
    source: 'IRS Form 8936 instructions; IRS clean vehicle guidance',
    section: 'Clean vehicle credit',
    content:
      'The clean vehicle credit may apply to qualifying new or used electric vehicles, subject to income, price, assembly, and battery-sourcing requirements. The rules have changed frequently, so the year of purchase and the specific vehicle matter.',
    keywords: ['ev credit', 'ev tax credit', 'electric vehicle', 'electric vehicle tax credit', 'clean vehicle', '8936', 'used ev', 'plug-in hybrid'],
  },
  {
    id: 'sales-tax-deduction',
    source: 'IRS Schedule A instructions; Publication 17',
    section: 'State and local sales tax deduction',
    content:
      'State and local sales tax can be deducted instead of state income tax if you itemize, but not both for the same year. The SALT cap applies to the combined deduction. Most taxpayers take the standard deduction instead.',
    keywords: ['sales tax', 'salt', 'state tax', 'itemized', 'state and local taxes'],
  },
  {
    id: 'payroll-tax',
    source: 'IRS Publication 15; Form 941 instructions',
    section: 'Payroll taxes and employer reporting',
    content:
      'Payroll taxes include federal income tax withholding, Social Security, and Medicare. Employers withhold the employee share and pay the employer share, then report and deposit the amounts on a schedule. Misclassifying employees as contractors can create payroll tax liability.',
    keywords: ['payroll tax', '941', 'fica', 'social security tax', 'medicare tax', 'employer tax', 'payroll'],
  },
  {
    id: 'worker-classification',
    source: 'IRS Publication 15-A; IRS worker classification guidance',
    section: 'Employee or independent contractor',
    content:
      'Worker classification depends on the degree of behavioral control, financial control, and the relationship of the parties. A contract label does not decide it. Misclassification can trigger employment taxes, penalties, and benefits issues.',
    keywords: ['independent contractor', 'employee classification', '1099 vs w2', 'worker classification', 'misclassification', 'contractor'],
  },
  {
    id: 'reasonable-compensation',
    source: 'IRS S corporation compensation guidance; Publication 15-A',
    section: 'S corporation reasonable compensation',
    content:
      'S corporation shareholder-employees must generally be paid reasonable compensation for services before taking distributions. The amount depends on the work, skills, and comparable pay. Paying no salary to avoid payroll tax is a common audit issue.',
    keywords: ['reasonable compensation', 's corp salary', 'shareholder employee', 'distributions', 's corporation'],
  },
  {
    id: 'hobby-vs-business',
    source: 'IRS Publication 535; Publication 525',
    section: 'Hobby or business',
    content:
      'A bona fide business is run to make a profit, and the IRS looks at factors such as time and effort, expertise, history of income or losses, and expectation of profit. Hobby expenses are generally not deductible, while business expenses can be. The distinction affects whether Schedule C and self-employment tax apply.',
    keywords: ['hobby', 'business vs hobby', 'profit motive', 'schedule c', 'hobby loss'],
  },
  {
    id: 'estimated-tax-safe-harbor',
    source: 'IRS Publication 505',
    section: 'Estimated tax safe harbor',
    content:
      'You can generally avoid an estimated tax penalty by paying at least 90% of the current year tax or 100% of the prior year tax (110% if prior-year AGI was high). The prior-year safe harbor is not available to everyone, and the rules depend on your situation.',
    keywords: ['safe harbor', 'estimated tax penalty', '90 percent', '110 percent', 'underpayment', 'estimated payment'],
  },
  {
    id: 'tip-income',
    source: 'IRS Publication 531; Form 4137 instructions',
    section: 'Tip income',
    content:
      'Tips are taxable income and must be reported to your employer. Employees generally report tips of $20 or more in a month by the 10th day of the following month. Unreported tips may need to be reported on Form 4137 and are subject to Social Security and Medicare tax.',
    keywords: ['tips', 'tip income', '4137', 'reported tips', 'unreported tips', 'service charge'],
  },

  // ───────────────────────── Withholding and payroll ─────────────────────────
  {
    id: 'w4-withholding',
    source: 'IRS Form W-4; IRS Publication 505',
    section: 'Adjusting withholding (Form W-4)',
    content:
      'Form W-4 tells an employer how much federal income tax to withhold. Filing status, the dependent credit steps, other income, and deductions each change the amount, and the multiple-jobs worksheet prevents under-withholding when you hold more than one job. You can submit a new W-4 at any time, and checking withholding mid-year is the simplest way to avoid a surprise balance due.',
    keywords: ['w-4', 'withholding', 'paycheck', 'change withholding', 'form w4', 'withholding calculator', 'adjust withholding'],
  },
  {
    id: 'estimated-penalty',
    source: 'IRS Form 2210; IRS Publication 505',
    section: 'Underpayment penalty (Form 2210)',
    content:
      'Form 2210 calculates the underpayment penalty when withholding and estimated payments fall short of the required amount. The penalty is interest-like and applies to each quarter separately, so paying late in the year does not cure an early shortfall. Annualized income and safe-harbor elections can reduce or eliminate it when income was uneven.',
    keywords: ['form 2210', 'underpayment penalty', 'estimated tax penalty', 'annualized income', 'penalty for not paying', 'underpaid estimates'],
  },
  {
    id: 'household-employee',
    source: 'IRS Publication 926; Schedule H instructions',
    section: 'Household employees (nanny tax)',
    content:
      'If you pay a household worker such as a nanny, housekeeper, or caregiver, you may be a household employer with payroll obligations. Cash wages above the annual threshold trigger Social Security, Medicare, and unemployment tax, and you generally need an EIN and Schedule H. Paying casually does not remove the obligation.',
    keywords: ['household employee', 'nanny tax', 'schedule h', 'babysitter', 'caregiver payroll', 'domestic worker'],
  },
  {
    id: 'fringe-benefits',
    source: 'IRS Publication 15-B',
    section: 'Fringe benefits',
    content:
      'Fringe benefits are generally taxable unless a specific exclusion applies. Common exclusions include qualified health coverage, certain employer-paid group-term life insurance, and de minimis benefits; company cars, gym memberships, and many awards are usually taxable. The value is reported on the W-2, and the employer must apply the correct valuation rule.',
    keywords: ['fringe benefits', 'employee benefits', 'company car', 'de minimis', 'taxable fringe', 'w-2 benefits'],
  },
  {
    id: 'accountable-plan',
    source: 'IRS Publication 463; IRS Publication 15-B',
    section: 'Accountable reimbursement plans',
    content:
      'An accountable plan reimburses employees for business expenses and keeps the reimbursement out of taxable wages, but only if the expense has a business connection, is substantiated within a reasonable time, and excess advances are returned. Without those three elements the arrangement is a nonaccountable plan and the payments become taxable wages.',
    keywords: ['accountable plan', 'reimbursement', 'employee expenses', 'per diem', 'expense report', 'nonaccountable'],
  },
  {
    id: 'ein',
    source: 'IRS Employer Identification Numbers',
    section: 'Employer identification number (EIN)',
    content:
      'An employer identification number is the business equivalent of an SSN and is used for payroll, business bank accounts, and most entity filings. Most entities can apply online and receive it immediately using Form SS-4. Never use an SSN where an EIN is required, and keep the EIN confirmation with your permanent records.',
    keywords: ['ein', 'employer identification number', 'business tax id', 'apply for ein', 'ss-4'],
  },

  // ───────────────────── Investments, retirement, property ─────────────────────
  {
    id: 'digital-assets',
    source: 'IRS Digital Assets guidance; IRS Notice 2014-21; Form 1040 instructions',
    section: 'Digital assets and cryptocurrency',
    content:
      'Digital assets such as cryptocurrency and NFTs are property for federal tax purposes. Selling, exchanging one digital asset for another, and using one to pay for goods or services are generally taxable events that require cost basis. The digital asset question on Form 1040 must be answered, and mining or staking rewards are usually ordinary income when received.',
    keywords: ['digital assets', 'cryptocurrency', 'crypto', 'bitcoin', 'nft', 'staking', 'mining', 'virtual currency'],
  },
  {
    id: 'roth-conversion',
    source: 'IRS Publication 590-A; IRS Publication 590-B',
    section: 'Roth conversions',
    content:
      'Converting a traditional IRA or pre-tax 401(k) money to a Roth account is generally taxable in the year of conversion, because pre-tax dollars become after-tax dollars. The converted amount is included in income, and the 10% early-distribution tax can apply to amounts not otherwise eligible. A conversion cannot be recharacterized back, so the tax is locked in even if the account value later falls.',
    keywords: ['roth conversion', 'convert to roth', 'backdoor roth', 'traditional ira', 'roth ira', 'recharacterization'],
  },
  {
    id: 'required-minimum-distributions',
    source: 'IRS Publication 590-B',
    section: 'Required minimum distributions',
    content:
      'Traditional IRA and most employer-plan balances require minimum distributions starting at age 73 for those born from 1951 through 1959 and age 75 for those born in 1960 or later, with the first distribution generally due by April 1 of the following year. Missing a required distribution triggers an excise tax on the shortfall. Roth IRAs do not require distributions during the owner\'s lifetime.',
    keywords: ['required minimum distribution', 'rmd', 'age 73', 'age 75', 'ira distribution', 'missed rmd'],
  },
  {
    id: 'inherited-ira',
    source: 'IRS Publication 590-B',
    section: 'Inherited retirement accounts',
    content:
      'Most non-spouse beneficiaries must empty an inherited IRA within 10 years of the original owner\'s death, and annual distributions may be required depending on when the owner died and whether the beneficiary is an eligible designated beneficiary. A spouse beneficiary has more options, including treating the IRA as their own. Confirm the beneficiary category before taking the first distribution.',
    keywords: ['inherited ira', 'beneficiary', '10-year rule', 'stretch ira', 'inherited retirement account', 'eligible designated beneficiary'],
  },
  {
    id: 'like-kind-exchange',
    source: 'IRS Form 8824; IRS Publication 544',
    section: 'Like-kind (1031) exchanges',
    content:
      'A like-kind exchange under Section 1031 defers gain when business or investment real property is exchanged for other real property of like kind. The replacement property must generally be identified within 45 days and acquired within 180 days, and the exchange must be structured through a qualified intermediary. Personal-use property, and since 2018 most personal property, no longer qualify.',
    keywords: ['1031', 'like-kind exchange', 'exchange property', 'qualified intermediary', 'deferred gain'],
  },
  {
    id: 'installment-sale',
    source: 'IRS Publication 537; Form 6252 instructions',
    section: 'Installment sales',
    content:
      'An installment sale reports gain as payments are received instead of all at once, using Form 6252. Each payment carries a proportional share of the gain based on the gross profit percentage. Related-party sales and sales of depreciable property have special rules that can accelerate the gain.',
    keywords: ['installment sale', 'seller financing', 'form 6252', 'gain on payments', 'notes receivable'],
  },
  {
    id: 'section-179',
    source: 'IRS Publication 946; Form 4562 instructions',
    section: 'Section 179 expensing',
    content:
      'Section 179 lets a business deduct the cost of qualifying equipment and off-the-shelf software in the year it is placed in service, up to an annual limit that phases out above a purchase threshold. It cannot create or increase a business loss, and the property must be used predominantly for business. Bonus depreciation is a separate election with different rules.',
    keywords: ['section 179', '179 deduction', 'bonus depreciation', 'equipment deduction', 'form 4562', 'placed in service'],
  },
  {
    id: 'rental-depreciation',
    source: 'IRS Publication 527; IRS Publication 946',
    section: 'Depreciating rental property',
    content:
      'Residential rental property is generally depreciated over 27.5 years and nonresidential real property over 39 years, using the mid-month convention. Depreciation is required even if you do not claim it, and it reduces your basis, which increases the gain on sale. Land is never depreciable, so the purchase price must be allocated between land and building.',
    keywords: ['rental depreciation', '27.5 years', '39 years', 'depreciation rental', 'basis', 'land not depreciable'],
  },
  {
    id: 'casualty-loss',
    source: 'IRS Publication 547; Form 4684 instructions',
    section: 'Casualty and theft losses',
    content:
      'A casualty or theft loss is generally deductible for personal-use property only when it results from a federally declared disaster, while business or income-producing property losses follow different rules. The deduction is reduced by insurance reimbursements, and the timing depends on when the loss occurred and when a claim is filed. Document the value before and after the event.',
    keywords: ['casualty loss', 'theft loss', 'disaster loss', 'form 4684', 'federally declared disaster', 'insurance reimbursement'],
  },
  {
    id: 'passive-activity',
    source: 'IRS Publication 925',
    section: 'Passive activity losses',
    content:
      'Passive activity losses from rentals and businesses you do not materially participate in are generally deductible only against passive income, with disallowed amounts carried forward. The special rental real estate allowance (up to $25,000) phases out at higher income and requires active participation. Material participation is tested by hours and involvement, not by ownership percentage alone.',
    keywords: ['passive activity', 'passive loss', 'material participation', 'rental loss', 'carryforward', 'active participation'],
  },
  {
    id: 'net-operating-loss',
    source: 'IRS Publication 536; Form 172 instructions',
    section: 'Net operating losses',
    content:
      'A net operating loss occurs when deductible business losses exceed income, and it can generally be carried forward to offset future taxable income. Most losses arising in tax years beginning after 2017 cannot be carried back and can offset only 80% of taxable income in a carryforward year. The calculation follows the loss through later returns and requires a separate schedule.',
    keywords: ['net operating loss', 'nol', 'loss carryforward', 'carryback', '80 percent limit'],
  },
  {
    id: 'municipal-bond-interest',
    source: 'IRS Publication 550',
    section: 'Tax-exempt bond interest',
    content:
      'Interest on most state and local bonds is excluded from federal income tax, but it still counts in some calculations such as how much Social Security benefit is taxable, and your state may tax it. Premium and discount affect basis and the gain or loss when the bond is sold. Tax-exempt does not mean irrelevant to the return.',
    keywords: ['municipal bond', 'tax-exempt interest', 'muni', 'bond premium', 'bond basis'],
  },
  {
    id: 'savings-bond-education',
    source: 'IRS Publication 970; Form 8815 instructions',
    section: 'Savings bonds for education',
    content:
      'Interest on qualified U.S. savings bonds may be excluded from income when used for qualified higher education expenses, subject to income limits and ownership rules. The exclusion is claimed on Form 8815 and requires that the bond owner and the student meet specific relationship tests. Keep the redemption statement and tuition records together.',
    keywords: ['savings bond', 'series ee', 'series i', 'education exclusion', 'form 8815', 'qualified education expenses'],
  },

  // ───────────────────────── Family, life events, business exit ─────────────────────────
  {
    id: 'alimony-support',
    source: 'IRS Publication 504',
    section: 'Alimony and child support',
    content:
      'For divorce or separation agreements executed after 2018, alimony is generally not deductible by the payer and not included in the recipient\'s income. Agreements executed before 2019 follow the older rules unless the parties modify them to adopt the new treatment. Child support is never deductible or taxable.',
    keywords: ['alimony', 'spousal support', 'child support', 'divorce', 'separation agreement'],
  },
  {
    id: 'clergy',
    source: 'IRS Publication 517',
    section: 'Clergy and ministerial income',
    content:
      'Ministers and other clergy generally pay self-employment tax on ministerial income through Schedule SE, even when they are treated as employees for income tax purposes. A housing allowance may be excluded from income tax if properly designated, but it is still included in the self-employment tax calculation. This dual status is why clergy returns are often filed incorrectly.',
    keywords: ['clergy', 'minister', 'housing allowance', 'parsonage', 'self-employment tax clergy'],
  },
  {
    id: 'farm-income',
    source: 'IRS Publication 225',
    section: 'Farm income and expenses',
    content:
      'Farm income and expenses are reported on Schedule F, and farmers may use cash or accrual accounting with special rules for inventory, livestock, and crop insurance. Certain weather-related sales and disaster payments can be deferred to the following year. Depreciation and income averaging are also available in specific cases.',
    keywords: ['farm', 'schedule f', 'agriculture', 'crop insurance', 'livestock', 'farmer'],
  },
  {
    id: 'sale-of-business',
    source: 'IRS Publication 544; Form 8594 instructions',
    section: 'Selling a business',
    content:
      'Selling a business is usually treated as a sale of its assets for tax purposes unless the buyer purchases entity interests, and the price is allocated across categories on Form 8594. Goodwill and customer lists are generally capital assets, while inventory and equipment follow different rules. The structure and the allocation change how much tax the seller pays.',
    keywords: ['sell my business', 'sale of business', 'form 8594', 'asset allocation', 'goodwill', 'business sale'],
  },
  {
    id: 'personal-expenses',
    source: 'IRS Publication 529, Miscellaneous Deductions',
    section: 'Nondeductible personal expenses',
    content:
      'Personal, living, and family expenses are generally not deductible. That usually includes groceries, ordinary clothing, commuting, hobbies, and pets — a dog is a personal expense even when it belongs to a business owner. An expense is only deductible when a specific rule allows it, or when it is an ordinary and necessary business cost with the records to prove it.',
    keywords: ['personal expenses', 'nondeductible', 'not deductible', 'pet', 'dog', 'cat', 'groceries', 'clothing', 'commuting', 'personal use'],
  },
];
