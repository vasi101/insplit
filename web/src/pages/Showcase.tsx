import { useEffect, useState } from 'react';

import { ArrowDownToLine, ArrowRight, ArrowUpRight, Check, CheckCheck, Github, Home, Menu, Package, Plus, Receipt, ShieldCheck, Smartphone, Users, Wallet, X } from 'lucide-react';
import './Showcase.css';

const RELEASES = 'https://github.com/vasi101/insplit/releases';

function useDownload() {
  const configured = import.meta.env.VITE_ANDROID_DOWNLOAD_URL?.trim();
  const override = configured && /^https:\/\//i.test(configured) ? configured : undefined;
  const [release, setRelease] = useState({ url: override || RELEASES, version: '', direct: !!override });
  useEffect(() => {
    if (override) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 6000);
    fetch('https://api.github.com/repos/vasi101/insplit/releases?per_page=10', { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Release unavailable'); return response.json(); })
      .then((releases: { draft: boolean; prerelease: boolean; tag_name: string; assets: { name: string; browser_download_url: string }[] }[]) => {
        if (!Array.isArray(releases)) return;
        const latest = releases.find(entry => !entry.draft && !entry.prerelease && entry.tag_name.startsWith('android-v') && entry.assets.some(asset => asset.name.endsWith('.apk')));
        const apk = latest?.assets.find(asset => asset.name.endsWith('.apk'));
        if (apk?.browser_download_url.startsWith('https://github.com/vasi101/insplit/releases/download/')) {
          setRelease({ url: apk.browser_download_url, version: latest!.tag_name.replace('android-', ''), direct: true });
        }
      }).catch(() => { /* The releases page stays available if GitHub is unreachable. */ })
      .finally(() => window.clearTimeout(timeout));
    return () => { controller.abort(); window.clearTimeout(timeout); };
  }, [override]);
  return release;
}

const screens = [
  { image: 'expense-feed.jpg', title: 'Your shared expense feed', label: 'Expense feed', description: 'Every purchase has a place. See who paid, review the details, and approve expenses together.', icon: Receipt },
  { image: 'settlements.jpg', title: 'Know where you stand', label: 'Settlements', description: 'See spending reports and settlement suggestions without piecing together messages and receipts.', icon: Wallet },
  { image: 'inventory.jpg', title: 'Keep your home stocked', label: 'Inventory', description: 'Track household supplies in their own room. Your flat’s groceries stay with your flat.', icon: Package },
];
function Brand() {
  return <span className="lp-brand"><img src="/favicon.svg" alt="" width="36" height="36" />Insplit</span>;
}
function Screen({ index, priority = false }: { index: number; priority?: boolean }) {
  return <div className="lp-device"><div className="lp-device-top"><span>9:41</span><span className="lp-camera" /><span>▮▮▮ ▰</span></div><img src={`/screenshots/${screens[index].image}`} alt={`Insplit Android app: ${screens[index].label}`} width="1080" height={index === 0 ? 2287 : index === 1 ? 2307 : 2317} loading={priority ? 'eager' : 'lazy'} /><div className="lp-device-bottom"><span /></div></div>;
}
export function Showcase() {
  const [menu, setMenu] = useState(false);
  const [active, setActive] = useState(0);
  const release = useDownload();
  const label = release.direct ? 'Download APK' : 'Get Insplit for Android';
  return <div className="lp">
    <a href="#main" className="lp-skip">Skip to content</a>
    <header className="lp-header lp-wrap"><a href="#" aria-label="Insplit home"><Brand /></a><nav aria-label="Main navigation" className={menu ? 'lp-nav open' : 'lp-nav'}><a href="#features" onClick={() => setMenu(false)}>Features</a><a href="#inside" onClick={() => setMenu(false)}>Inside the app</a><a href="#how-it-works" onClick={() => setMenu(false)}>How it works</a></nav><a className="lp-nav-download" href="#download">Get Insplit <ArrowUpRight size={16} /></a><button className="lp-menu" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button></header>
    <main id="main">
      <section className="lp-hero lp-wrap">
        <div className="lp-hero-copy"><span className="lp-badge"><span /> YOUR HOME. ALL IN SYNC.</span><h1>Roommates.<br />Shared expenses.<br /><em>Zero confusion.</em></h1><p>From the grocery run to the electricity bill.<br className="lp-wide" /> Keep expenses, settlements, and household supplies<br className="lp-wide" /> together—with the people you live with.</p><div className="lp-actions"><a className="lp-button lp-primary" href={release.url}><ArrowDownToLine size={19} />{label}<ArrowUpRight size={17} /></a><a className="lp-button lp-secondary" href="#inside">Explore the app <ArrowRight size={17} /></a></div><div className="lp-platform"><Smartphone size={15} /><span>Available for Android</span><span className="lp-separator" />{release.version || 'Direct APK download'}</div><div className="lp-hero-details"><span><ShieldCheck size={17} /> Separate rooms</span><span><CheckCheck size={17} /> Shared verification</span><span><Package size={17} /> Shared stock</span></div></div>
        <div className="lp-hero-preview"><div className="lp-preview-grid" /><div className="lp-back-screen"><Screen index={1} /></div><div className="lp-main-screen"><Screen index={active} priority /></div><div className="lp-notification"><span className="lp-check-circle"><CheckCheck size={22} /></span><div><b>Everyone on the same page.</b><span>A shared record for your room.</span></div></div><div className="lp-screen-switch" aria-label="Choose app preview">{screens.map(({ label, icon: Icon }, index) => <button key={label} aria-label={`Preview ${label}`} aria-pressed={active === index} onClick={() => setActive(index)} className={active === index ? 'active' : ''}><Icon size={17} /><span>{label}</span></button>)}</div></div>
      </section>
      <div className="lp-benefits lp-wrap"><span>ONE APP FOR SHARED LIVING</span><div><Receipt />Track expenses</div><div><Users />Review together</div><div><Wallet />Settle clearly</div><div><Package />Share supplies</div></div>
      <section id="features" className="lp-section lp-wrap"><div className="lp-section-heading"><div><span className="lp-kicker">BUILT AROUND YOUR ROOM</span><h2>Everything shared.<br /><span>Nothing scattered.</span></h2></div><p>Your household has enough going on.<br />Give the everyday details a place to live.</p></div><div className="lp-feature-grid"><article className="lp-feature-card lp-feature-wide"><span className="lp-icon"><Receipt /></span><h3>A feed everyone can trust.</h3><p>Add a purchase, attach a receipt, and let your roommates approve or reject it. Keep a clear history of what was shared.</p><div className="lp-status-flow"><span><span /> Pending</span><ArrowRight size={17} /><span><Check size={14} /> Verified</span><span className="lp-flow-caption">Reviewed by your roommates</span></div></article><article className="lp-feature-card"><span className="lp-icon"><Wallet /></span><h3>Balances that make sense.</h3><p>Understand your spending, see settlement suggestions, and record payments in one place.</p><div className="lp-card-tag"><CheckCheck size={15} /> Less back-and-forth</div></article><article className="lp-feature-card"><span className="lp-icon"><Package /></span><h3>Your flat. Your supplies.</h3><p>Keep household stock and contributions organized. Every room has its own inventory.</p><div className="lp-supply-tags"><span>Rice</span><span>Oil</span><span>Daal</span></div></article><article className="lp-feature-card lp-feature-wide"><span className="lp-icon"><Home /></span><h3>Different rooms. Separate records.</h3><p>Create a room and invite your people with a code. Switch households without mixing their expenses or supplies.</p><div className="lp-room-pills"><span><Home size={16} /> Your flat <ShieldCheck size={14} /></span><span><Home size={16} /> Another room <ShieldCheck size={14} /></span></div></article></div></section>
      <section id="inside" className="lp-inside"><div className="lp-wrap"><div className="lp-centered"><span className="lp-kicker">THIS IS INSPLIT</span><h2>A closer look at<br /><span>life in your room.</span></h2><p>Real screens from the Android app. Built for the everyday.</p></div><div className="lp-screen-gallery">{screens.map(({ title, description, label }, index) => <article key={label}><div className="lp-gallery-label"><span>0{index + 1}</span>{label}<ArrowUpRight size={16} /></div><Screen index={index} /><h3>{title}</h3><p>{description}</p></article>)}</div><p className="lp-capture-note">App screenshots from an earlier release. Some screens may look different in the latest version.</p></div></section>
      <section id="how-it-works" className="lp-section lp-wrap"><div className="lp-section-heading"><div><span className="lp-kicker">A SIMPLE START</span><h2>Get your room<br /><span>on the same page.</span></h2></div><a className="lp-text-link" href="#download">Start with Insplit <ArrowUpRight size={17} /></a></div><div className="lp-steps">{[{ title: 'Create your space.', text: 'Sign up, verify your email, and create a room for your household.', icon: Home }, { title: 'Bring your people.', text: 'Share the invite code. Your roommates join the same shared space.', icon: Users }, { title: 'Make sharing simpler.', text: 'Add expenses, review purchases, and keep supplies and balances in sync.', icon: CheckCheck }].map(({ title, text, icon: Icon }, index) => <article key={title}><div><span>0{index + 1}</span><Icon size={24} /></div><h3>{title}</h3><p>{text}</p></article>)}</div></section>
      <section id="download" className="lp-download lp-wrap"><div className="lp-download-copy"><span className="lp-kicker">READY WHEN YOUR ROOM IS</span><h2>Less keeping tabs.<br /><span>More living together.</span></h2><p>Take your shared home out of the group chat.<br />Download Insplit and make room for the good stuff.</p><a className="lp-button lp-primary" href={release.url}><ArrowDownToLine size={19} />{label}<ArrowUpRight size={18} /></a><div className="lp-download-meta"><span>Android APK {release.version && `· ${release.version}`}</span><a href={RELEASES} target="_blank" rel="noreferrer">Release notes <ArrowUpRight size={13} /></a></div></div><div className="lp-install-card"><div className="lp-install-brand"><Brand /><span>ANDROID</span></div><h3>Your room starts here.</h3><ol><li><span>1</span><div><b>Download the APK</b><p>Open the download on your Android phone.</p></div></li><li><span>2</span><div><b>Install Insplit</b><p>Allow installation from your browser if prompted.</p></div></li><li><span>3</span><div><b>Make yourself at home</b><p>Sign in, or create an account and a room.</p></div></li></ol><span className="lp-install-note"><Smartphone size={14} /> Public download available for Android.</span></div></section>
      <section className="lp-faq lp-wrap lp-section"><div><span className="lp-kicker">GOOD TO KNOW</span><h2>A few questions.<br /><span>Clear answers.</span></h2></div><div>{[
        ['Are rooms kept separate?', 'Yes. Each room has its own members, expenses, and inventory. Select a room in the app to work with that household’s records.'],
        ['Does Insplit transfer money?', 'No. Pay using your preferred payment method, then record the settlement in Insplit to keep your shared records up to date.'],
        ['How do I update the app?', 'Download the latest APK and install it over your existing Insplit app. This page automatically links to the newest published Android release with a downloadable APK.'],
        ['Is there an iPhone download?', 'The public download here is for Android. An iPhone download is not available on this website yet.'],
      ].map(([question, answer]) => <details key={question}><summary>{question}<Plus size={18} /></summary><p>{answer}</p></details>)}</div></section>
      <section id="maker" className="lp-maker lp-wrap"><div><span className="lp-kicker">MORE FROM THE MAKER</span><h3>Small ideas. Useful products.</h3><a href="https://github.com/vasi101" target="_blank" rel="noreferrer"><Github size={15} /> @vasi101 <ArrowUpRight size={13} /></a></div><a href="https://github.com/vasi101/MINotes" target="_blank" rel="noreferrer"><span className="lp-maker-monogram">M</span><span><b>Minotes</b><small>A home for your thoughts.</small></span><ArrowUpRight size={19} /></a><a href="https://github.com/vasi101/FlipClock" target="_blank" rel="noreferrer"><span className="lp-maker-monogram clock">09</span><span><b>Flipclock</b><small>A little more focus.</small></span><ArrowUpRight size={19} /></a></section>
    </main>
    <footer className="lp-footer lp-wrap"><div><a href="#" aria-label="Insplit home"><Brand /></a><p>Shared living. Simplified.</p></div><nav aria-label="Footer"><a href={RELEASES} target="_blank" rel="noreferrer">Releases <ArrowUpRight size={13} /></a><a href="https://github.com/vasi101/insplit" target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={13} /></a></nav><div className="lp-footer-bottom"><span>© {new Date().getFullYear()} Insplit</span><span>Made by @vasi101 for the places we share.</span><a href="#">Back to top ↑</a></div></footer>
  </div>;
}
