// All copy is taken from the Bridge Social company profile.
export const BRAND = {
  name: 'Bridge Social',
  phone: '+971554697908',
  phoneDisplay: '+971 55 469 7908',
  email: 'info@bridgesocialuae.com',
  handle: 'Bridgesocialuae',
  social: 'Bridge Social',
  place: 'United Arab Emirates',
};

// range = scroll progress window. side = which side the 3D station sits on (text goes opposite).
export const CHAPTERS = [
  { id: 'intro', label: 'Arrive', range: [0, 0.08] },
  {
    id: 'about', label: 'Overview', range: [0.08, 0.19], side: 1, accent: '#d4476f',
    kicker: 'Overview',
    title: 'Where luxury meets <em>access</em>',
    lead: 'Bridge Social connects your business to luxury brands, high-end services, and top industry experts, creating strategic partnerships and driving growth. We bridge gaps between luxury hospitality, premium events, media, production companies, and more. With 25+ years of experience, we simplify access, build trusted relationships, and deliver exceptional experiences. We turn connections into real value.',
    vision: 'Connect and empower global businesses, fostering partnerships and growth through trusted relationships and exceptional experiences.',
    mission: 'Leading bridge between luxury brands, high-end services, and industry experts, driving innovation and excellence in the global luxury landscape.',
  },
  {
    id: 'marketing', label: 'Marketing', range: [0.19, 0.40], side: -1, accent: '#ff4f8b',
    kicker: 'Marketing', title: 'Crafting strategies that <em>drive results</em>',
    tag: 'Crafting Strategies That Drive Results',
    items: [
      ['Social Media Management', 'Strategically tailored social media solutions to grow your brand, boost engagement, and turn followers into loyal customers. Building a strong presence that resonates and converts.'],
      ['Production & Content Creation', 'Stunning visuals and compelling content crafted to tell your brand story. Engaging your audience and driving meaningful interactions across all channels.'],
      ['Motion Graphics & Animation', 'Dynamic motion graphics that bring your ideas to life. Captivating visuals that inspire, educate, and leave a lasting impression.'],
      ['Creative Design & Branding', 'Design and branding that reflect your identity with clarity and impact. Crafting memorable visuals that make your brand instantly recognizable.'],
      ['App & Web Development', 'Seamless apps and websites built with professional UI/UX. Combining performance, usability, and aesthetics to create unforgettable digital experiences.'],
      ['Media Buying & Campaign Strategy', 'Precision-targeted campaigns to reach the right audience at the right time. Optimizing ad spend to maximize results and measurable ROI.'],
      ['Influencer Management & UGC', 'Collaborating with trusted creators to amplify your brand reach. Generating authentic content that scales and drives engagement.'],
      ['360° Virtual Tours', 'Interactive virtual experiences that showcase your space from anywhere. Immersive storytelling that connects audiences to your brand.'],
      ['Press & Media Exposure', 'Professional press releases crafted and distributed to reach the right outlets. Ensuring your news gets attention, credibility, and impact.'],
      ['Digital & Outdoor Advertising', 'High-impact digital billboards and strategic placements for maximum visibility. Capturing attention and driving brand recall.'],
      ['Printing & Collateral', 'Premium printing solutions for signage, branded materials, and campaigns. Ensuring your brand looks as good in print as it does online.'],
      ['Social Media Consultancy & Training', 'Hands-on guidance and workshops tailored to your business. Equipping teams with tools, strategies, and confidence to grow and perform.'],
    ],
    cards: ['Social', 'Content', 'Motion', 'Branding', 'Web & App', 'Media Buying', 'Influencers', '360° Tours', 'Press', 'Outdoor', 'Print', 'Training'],
  },
  {
    id: 'events', label: 'Event Entertainment', range: [0.40, 0.53], side: 1, accent: '#ffc46b',
    kicker: 'Event Entertainment', title: 'Seamless live events, from logistics to <em>shows</em>',
    tag: 'Seamless live events, from logistics to shows.',
    items: [
      ['Live Experiences That Thrill', 'Shows, performances, and entertainment that leave a lasting impression. Combining lighting, sound, and production for unforgettable moments.'],
      ['Fireworks & Drone Shows', 'A professionally choreographed fireworks display designed to create a high-impact finale for your event. Fully licensed and executed by certified pyrotechnicians, with show duration, height, and effects customized to your venue and budget. All safety permits and risk assessments handled end-to-end.'],
      ['Event Production & Logistics', 'Full-scale planning, concepting, and execution for any event type. Ensuring seamless operations, from themed décor to aerial displays.'],
    ],
  },
  {
    id: 'fnb', label: 'F&B Advisory', range: [0.53, 0.67], side: -1, accent: '#ff9a3c',
    kicker: 'F&B Advisory', title: 'Complete culinary support, from training to <em>operations</em>',
    tag: 'Complete culinary support, from training to operations and quality.',
    items: [
      ['Culinary Solutions for Your Brand', 'Concept development, menu engineering, and restaurant design to elevate your brand. Ensuring operational efficiency and exceptional guest experiences.'],
      ['Staff Training & Operations Consulting', 'Upskilling your team and optimizing workflows to deliver consistent excellence. Building service standards that impress every time.'],
      ['Food Safety & Quality Consulting', 'Ensuring compliance with hygiene standards while maintaining quality. Protecting your brand reputation with expert guidance.'],
      ['ScanConnect', 'Instantly share info, make payments or connect with us. Just scan!'],
      ['OS&E', 'End-to-end management of all operational supplies & equipment from sourcing to par-level optimization.'],
    ],
  },
  {
    id: 'corporate', label: 'Corporate Events', range: [0.67, 0.78], side: 1, accent: '#8fd3ff',
    kicker: 'Corporate Events', title: 'Seamless corporate events, from planning to <em>execution</em>',
    tag: 'Seamless corporate events, from planning to execution.',
    items: [
      ['Memorable Business Experiences', 'Conferences, product launches, awards, VIP events, and galas designed to impress. Transforming professional gatherings into unforgettable brand moments.'],
      ['Team Building & Workshops', 'Interactive activities that foster collaboration, creativity, and team culture. Helping teams work better, together.'],
      ['Trade Shows & Exhibitions', 'Full support for exhibitions, networking events, and promotional showcases. Maximizing your presence and leaving a professional impact.'],
    ],
  },
  {
    id: 'vip', label: 'VIP Luxury Concierge', range: [0.78, 0.90], side: -1, accent: '#f4e4b8',
    kicker: 'VIP Luxury Concierge', title: 'Your exclusive gateway to <em>luxury</em>',
    tag: 'Your exclusive gateway to luxury.',
    items: [
      ['Private Jet & Helicopter Experiences', 'Access to private jet charters and helicopter experiences worldwide. Offering seamless travel with unmatched comfort and exclusivity.'],
      ['Luxury Car & Yacht Rentals', 'Premium and exotic car & yacht rentals for business or leisure. Delivering performance, style, and prestige at every drive.'],
      ['VIP Event Access', 'Exclusive entry to high-profile events, shows, and private gatherings. Unlocking experiences reserved for a select few.'],
      ['Fine Dining & Exclusive Experiences', 'Curated dining reservations and unique lifestyle experiences. Creating unforgettable moments in the world’s most sought-after venues.'],
      ['Luxury Getaways & Accommodation', 'Bespoke travel packages and high-end hotel bookings. Designing escapes that combine relaxation, luxury, and personalized service.'],
      ['Personal Shopping Concierge', 'Dedicated shopping assistance for luxury fashion and lifestyle needs. Sourcing exclusive items and delivering a seamless experience.'],
    ],
  },
  { id: 'contact', label: 'Contact', range: [0.90, 1], accent: '#f4e4b8' },
];

export const SERVICE_COUNT = CHAPTERS.reduce((n, c) => n + (c.items ? c.items.length : 0), 0);
