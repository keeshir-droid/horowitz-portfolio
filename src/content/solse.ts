/**
 * Solse case study (page #/solse). Source: the Solse repo's portfolio-kit/HANDOFF.md (2026-11-05).
 * Rules from that handoff: keep Live / Built / Designed apart, never "production-ready" or "used by brands", the sample
 * brands (LOUD, Drowsy, Zest., nuit.) are fictional and every sample image is AI-generated, no real brand or client,
 * credit the build to Risheek + AI coding tools. Waitlist: no number (Risheek chose "brands have joined the waitlist").
 */
const IMG = '/media/solse/'

export type SolseState = 'Live' | 'Built' | 'Designed'

export interface Shot {
  src: string
  alt: string
  caption: string
}

const shot = (file: string, alt: string, caption: string): Shot => ({ src: IMG + file, alt, caption })

export const solse = {
  name: 'Solse',
  tagline: 'Software that learns your brand.',
  oneLiner:
    'Two products for product brands: Mona makes ads, and Luce finds and tests the next product before you make it.',
  url: 'https://trysolse.com',
  urlLabel: 'trysolse.com',
  role: 'Founder: product, architecture, design, build',
  year: '2026',
  facts: ['Founder', 'Live at trysolse.com', 'Brands have joined the waitlist', 'Built with Claude Code'],

  hero: shot(
    'mona-hero.webp',
    'Four ads made by Mona for four fictional brands: LOUD hot sauce, Drowsy sleep gummies, Zest sparkling soda and nuit candles',
    'Same software, four brands, nothing alike.',
  ),

  /** Where it stands, at a glance (the full table is `status`). */
  glance: [
    { state: 'Live' as SolseState, text: 'Marketing site, waitlist and referrals at trysolse.com' },
    { state: 'Built' as SolseState, text: 'Mona’s ad engine, running locally' },
    { state: 'Designed' as SolseState, text: 'The learning loop, and Luce' },
  ],

  problem: {
    points: [
      'AI ad makers produce generic ads.',
      'They distort the real product: labels smudge and shapes drift.',
      'They garble the words on the ad.',
      'They forget every correction, so editing is frustrating and nothing stays on-brand.',
      'The result looks like AI, and shoppers don’t trust it.',
      'Testing a new product or category is slow and costly: time, inventory, R&D and an uncertain result.',
    ],
    shot: shot('mona-problem.webp', 'Solse site section: why most AI ad makers disappoint, in five points', 'From the Mona page.'),
  },

  built:
    'I designed Solse’s architecture, the product and the ad engine: brand parameters, ads made from the brand’s real ' +
    'product photo, text added by code so it’s never garbled, and checks before and after each image. I built it with AI ' +
    'coding tools, launched it at trysolse.com, and brands have already joined the waitlist.',

  /** Real product in, ad out (Drowsy, shown on disk as "oddly"). */
  packshot: shot('oddly-packshot.webp', 'Drowsy’s product photo: a blue jar with an orange lid and a crescent-moon label', 'The product photo'),
  ads: [
    shot('oddly-0.webp', 'Drowsy ad: the jar inside a large orange crescent moon on deep blue, gummies floating', 'Ad'),
    shot('oddly-1.webp', 'Drowsy ad: the jar tipped over on blue, gummies spilling out', 'Ad'),
    shot('oddly-3.webp', 'Drowsy ad: the jar on a cloud in front of a glowing moon', 'Ad'),
  ],
  otherBrands: [
    shot('loud-1.webp', 'LOUD hot sauce ad: two bottles clinking on red', 'LOUD · hot sauce'),
    shot('zest-0.webp', 'Zest sparkling soda ad: a pink can on pink and orange', 'Zest. · sparkling soda'),
    shot('nuit-0.webp', 'nuit candle ad: a lit candle in a spotlight on navy', 'nuit. · candles'),
  ],
  fictionNote: 'LOUD, Drowsy, Zest. and nuit. are made-up brands, and every sample image here is AI-generated.',

  thesis:
    'Generic ads come from generic context. The moat is depth of personalization: a brand profile that is specific, ' +
    'traceable and keeps learning. Features are not the moat. One engine serves every brand, so a new customer is a new ' +
    'config, not new code.',

  architecture: [
    {
      title: 'Monorepo',
      lines: [
        'TypeScript, npm workspaces.',
        'apps/web: the marketing site (Next.js 14), live.',
        'apps/mona: the ad engine and app.',
        'apps/luce: the testing engine (not started).',
        'packages/core: the shared brand-config types.',
      ],
    },
    {
      title: 'Infrastructure',
      lines: [
        'Vercel, auto-deploys every push to main.',
        'Supabase (Postgres) stores the waitlist, referrals and contact messages.',
        'Vercel Web Analytics: cookieless, query strings stripped.',
      ],
    },
    {
      title: 'Models',
      lines: [
        'Images: nano-banana, an image-edit model, through fal.ai.',
        'Copy and image QA: Gemini, strict JSON output.',
        'No API key? Every model step falls back to a fixed template, so the app still runs end to end.',
      ],
    },
  ],

  profile: {
    lead: 'Each brand is one typed config, the “brand pack”. It covers allowed backgrounds, light and cast; how each product type behaves physically; text style, copy rules, claims and banned words; and checks.',
    why: 'Every value is stored with its reason and its source, so every decision the engine makes can be traced back to who set it and why.',
    code: `type Why<T> = {
  value: T
  why: string     // the reason
  source: string  // who set it
}`,
    next: 'Designed next: each parameter carries a confidence level (said, then seen, then confirmed). A customer’s word only becomes an enforced rule once it is grounded: measured by code, picked from a fixed list, anchored to their own approved and rejected examples, or backed by a product fact.',
    shot: shot('home-rulebook.webp', 'Drowsy’s rulebook in Solse: every rule with its source, and a proposed rule change waiting for approval', 'Every rule shows why, and where it came from.'),
  },

  pipeline: [
    {
      title: 'Real product in',
      body: 'The model edits a scene around the brand’s own product photo instead of redrawing the product.',
    },
    {
      title: 'Prompt compiler',
      body: 'Builds each image prompt from the brand pack, and tags every prompt line with the field it came from.',
      points: [
        'Describe what things are, never “no X”: image models ignore negatives.',
        'Fixed lists for background, shot, layout and action, so a batch really varies.',
        'Never put the brand name, or any text, in the prompt.',
      ],
      pointsLabel: 'Rules learned in testing',
    },
    {
      title: 'Lint before spending',
      body: 'Blocks an ad before any money is spent if it uses a banned background, a pose models draw wrongly, or a brief that contradicts itself.',
    },
    {
      title: 'Spend gate',
      body: 'One module is the only one that spends money. It shows a cost estimate, needs a human to confirm, and makes one test image before the batch. Jobs run in parallel with a concurrency cap.',
    },
    {
      title: 'Text added by code, never drawn by the model',
      body: 'Copy is checked against the brand’s claims and banned words, then drawn by code.',
      points: [
        'Text colour comes from the measured brightness behind it.',
        'A soft band is added only where the background is busy.',
        'A new headline costs nothing, because the image isn’t regenerated.',
      ],
    },
    {
      title: 'Checks after the image',
      body: 'Both are advisory, with a redo button; nothing respends on its own. A pixel check measures how much of the background is plain white or grey. A vision-model realism check scores 1–5 and flags hands, faces, scale, fused cloth and a product that looks pasted on.',
    },
  ],
  pipelineShots: [
    shot('mona-real-product.webp', 'Solse site: the real product photo next to the ad, with shape, lid colour, label and mark checks', 'Your photo, then the ad, checked against it.'),
    shot('mona-type-and-scores.webp', 'Solse site: the headline as a live text layer in the brand’s font, and one ad shown first with three scores', 'The words are a text layer. One ad first, with its scores.'),
  ],
  /** Where the pixel-check threshold came from. */
  pixelCheck: {
    lead: 'The pixel-check threshold came from 24 real kept and rejected ads.',
    rejected: '46–99%',
    kept: '0–9%',
    unit: 'of the background plain white or grey',
  },

  designed: {
    items: [
      {
        title: 'The learning loop',
        body: 'On a “no”, Mona asks why, and the answer becomes a proposed rule change the brand approves. Small taste changes apply automatically and can be undone. Claims, spend and boundaries always need a click.',
      },
      {
        title: 'Two layers',
        body: 'A shared craft layer (realism and product physics) improves for every brand. A private taste layer belongs to each brand and is never used for another.',
      },
      {
        title: 'Three scores, never blended',
        body: 'Fidelity: is it really their product? Fit: is it how they’d show it? Realism: does it pass as a real photo?',
      },
      {
        title: 'Variety',
        body: 'Repeat the codes (logo, colours, tone), never the content (scene, hook, angle). Variety is checked against the batch, the brand’s history and the category.',
      },
    ],
    shot: shot('home-craft-taste.webp', 'Solse site: the brand rulebook beside “The craft is shared. The taste is yours.” and the three scores', 'The two layers and the three scores, as the site explains them.'),
  },

  luce: {
    lead: 'Luce finds and tests the next product before a brand makes it.',
    steps: [
      'Mine Reddit, X, forums and reviews for demand.',
      'Shape the product concepts: a look, a promise and a price.',
      'Test them with Meta ads, keeping the creative constant.',
      'Report the ad’s pull (clicks) and the product’s pull (paid deposits) separately, against the brand’s own metric.',
    ],
    boundary:
      'Luce never makes the business call: no “sell / don’t sell”, no inventory amounts, and nothing runs without the brand’s consent.',
    example: [
      { value: '147', label: 'demand signals' },
      { value: '3', label: 'concepts' },
      { value: '$450', label: 'test' },
      { value: '36', label: 'deposits' },
    ],
    exampleNote: 'A worked example from the site’s mock. Drowsy is fictional and these are sample numbers.',
    shots: [
      shot('luce-worked-example.webp', 'Luce worked example: 147 posts, 3 concepts, $450 ad spend, 36 paid deposits, and the three Drowsy concepts', 'Explore, shape, test, read, decide.'),
      shot('luce-test-card.webp', 'Luce test card comparing three Drowsy product concepts by reach, clicks, paid deposits and cost per deposit', 'The test card. Clicks and deposits are reported separately.'),
      shot('luce-you-decide.webp', 'Luce compares, you decide: Luce suggests the next test and the founder records the decision', 'It suggests and tests; the founder decides.'),
    ],
  },

  decisions: [
    { title: 'Type is never drawn by the image model', body: 'That fixed garbled text and made editing free.' },
    { title: 'Lint before spending', body: 'Bad ads are caught before they cost money, not after.' },
    { title: 'A human confirms every spend', body: 'And one image is made before a batch.' },
    { title: 'Every rule shows why', body: 'Why it exists and where it came from. No black-box brand kit.' },
    { title: 'Luce’s boundary', body: 'It suggests and tests; the founder decides.' },
    { title: 'The look', body: 'Premium, product-led SaaS: white, the Switzer typeface, real UI mocks and real sample images.' },
  ],

  status: [
    { part: 'Marketing site, waitlist + referrals, contact form, Terms/Privacy', state: 'Live' as SolseState, note: 'at trysolse.com' },
    {
      part: 'Mona ad engine (brand pack, prompt compiler, lint, spend gate, code typesetting, pixel + realism checks)',
      state: 'Built' as SolseState,
      note: 'runs locally; not yet connected to accounts or the database',
    },
    { part: 'Learning loop, three scores, two layers', state: 'Designed' as SolseState, note: '' },
    { part: 'Luce', state: 'Designed' as SolseState, note: 'the site shows a mock of it with sample numbers' },
  ],
  pricing: 'Founding prices: Mona from $19/mo, Luce from $49/mo. Nobody pays yet.',
  credit: 'I designed the product and the architecture, and built it with AI coding tools (Claude Code).',
}
