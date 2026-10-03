(() => {
  const DATA = {
    games: [
      { id: 'gamma-frost', name: 'Gamma Frost', subtitle: 'Hollow Shift', genre: 'MMORPG', status: 'In Development', version: 'v0.0.2', cover: 'frost', icon: 'assets/hollow-shift-icon.webp', banner: 'assets/gamma-frost-banner.webp',
        blurb: 'Tame animals, explore a living world, adventure, and experiment in an MMORPG shaped by the time of day where you play.',
        details: 'Gamma Frost is Solaris Studio’s current work in progress. Its world follows realistic local time: daytime where you are brings day to the game, and nighttime brings night. Hollow Shift is its secondary title.',
        worldIntro: `Welcome to Granvoil, a world where humans and monsters live together. Granvoil was once peaceful, until an anomaly drove many monsters berserk. The chaos lasted three days and three nights. Only those who escaped the kingdom survived, and many people were killed, greatly reducing humanity’s numbers.\n\nThree years later, humans learned to control nictrons: magical molecules that float through the air. Nictrons are everywhere and began to spread after the anomaly. Scientists discovered that they could be used to create powers such as fire and water, and to control the ground and air. They cannot create light, gravity, or darkness.\n\nIn the new generation, humans fight for their lives against the berserk monsters. For reasons still unknown, monsters with humanlike forms—such as cat people, dog people, dwarves, and elves—were not affected by the anomaly. Scientists theorize that elves escaped its effects because they are considered a higher class than humans. After the discovery of nictrons became public, elves were the first to access them, though only some have a high aptitude for their use.\n\nOver time, guilds became a way for people to make a living by fighting monsters or setting out as adventurers.`,
        playerIntro: `After a very long time without a day off, you finally have one—and you’re excited to decide how to spend it. Lost in thought, you don’t notice a truck speeding toward you. By the time you see it, it’s too late. The truck hits you and sends you flying.\n\nYour consciousness slowly fades, leaving you trapped in darkness. After a while in the void, you slowly open your eyes to a bright sky. You have been reincarnated in Granvoil.`,
        releasePlan: 'Gamma Frost is planned for an early access release in the future. Its early access launch will not be an MMORPG; the game will begin in a more limited form while its larger online world continues to develop.' },
      { id: 'omiwo', name: 'OmiWo: Collide', subtitle: 'Ominous World', genre: 'Open-world gacha', status: 'Future project', version: '', cover: 'collide',
        blurb: 'A planned open-world gacha game featuring six main characters and three partners.',
        details: 'OmiWo means “Ominous World.” Each partner has a unique storyline, and all three storylines follow the same path. The characters know one another and belong to Six Arrows, the famous party of the adventurers’ guild. This is a future project and is not currently in development.' }
    ],
    members: [],
    arts: [
      { id:'gamma-frost-icon', title:'Gamma Frost Icon', image:'assets/hollow-shift-icon.webp', shape:'icon', type:'Game icon', projectId:'gamma-frost', mainTag:'From Gamma Frost', tags:['AI artwork','No owner','1girl','cute','short','blush','high quality','black hair','medium hair','wavy hair','headband','bridal veil','white crown','white background','open smile','blue eyes','facing viewer','4k'] },
      { id:'gamma-frost-banner', title:'Gamma Frost Banner', image:'assets/gamma-frost-banner.webp', shape:'banner', type:'Game banner', projectId:'gamma-frost', mainTag:'From Gamma Frost', tags:['AI artwork','No owner','1girl','cute','short','blush','high quality','black hair','medium hair','wavy hair','headband','bridal veil','white crown','white background','open smile','full body','blue eyes','facing viewer','4k','cinematic pose','lying on ground','looking back at viewer'] }
    ]
  };
  const ROUTES = [['home','Home','index.html'],['list','List','list.html'],['games','Games','games.html'],['updates','Updates','updates.html'],['arts','Arts','arts.html'],['groups','Groups','groups.html'],['download','Download','download.html'],['shop','Shop','shop.html']];
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const paragraphs = value => String(value || '').split(/\n\s*\n/).map(part => part.trim()).filter(Boolean).map(part => `<p>${esc(part)}</p>`).join('');
  const app = $('#app');
  const page = document.body.dataset.page || 'home';
  const titles = {home:'',list:'List',games:'Games',updates:'Updates',account:'Profile',arts:'Arts',groups:'Groups',download:'Download',shop:'Shop',project:'Project',artwork:'Artwork'};
  let currentUser = null;
  let editingProfile = false;
  let cropSession = null;
  let cropDialog = null;
  let toastTimer;

  const avatarLetters = name => String(name || 'Solaris').trim().split(/\s+/).filter(Boolean).slice(0,2).map(word => word[0]).join('').toUpperCase() || 'SS';
  const avatar = (name, extra = '', image = '') => `<span class="avatar ${extra}" aria-hidden="true">${image ? `<img src="${esc(image)}" alt="">` : esc(avatarLetters(name))}</span>`;
  const bannerImage = image => image ? `<img class="profile-banner-image" src="${esc(image)}" alt="">` : '';
  const bannerRatioClass = ratio => ratio === '16:9' ? 'banner-ratio-16-9' : 'banner-ratio-21-9';
  const noteControl = (note, extra = '') => note ? `<div class="note-control ${extra}"><button class="note-ellipsis" type="button" data-note-toggle aria-expanded="false" aria-label="Show profile note">...</button><div class="note-bubble" hidden>${esc(note)}</div></div>` : '';
  const gameById = id => DATA.games.find(game => game.id === id);
  const gameByName = name => DATA.games.find(game => game.name === name);
  const artById = id => DATA.arts.find(art => art.id === id);
  const projectIcon = (game, extra = '') => `<span class="project-icon project-icon-${esc(game.cover)} ${extra}" aria-hidden="true">${game.icon ? `<img src="${esc(game.icon)}" alt="">` : esc(game.name === 'Gamma Frost' ? 'GF' : 'OW')}</span>`;
  const gameBannerImage = game => game.banner ? `<img class="game-cover-image" src="${esc(game.banner)}" alt="">` : '';
  const artworkHref = art => `artwork.html?id=${encodeURIComponent(art.id)}`;
  function artworkCard(art) {
    return `<article class="artwork-card"><a href="${artworkHref(art)}"><div class="artwork-card-image artwork-card-image-${esc(art.shape)}"><img src="${esc(art.image)}" alt="${esc(art.title)}"></div><div class="artwork-card-copy"><span class="artwork-main-tag">${esc(art.mainTag)}</span><h2>${esc(art.title)}</h2><span class="artwork-type">${esc(art.type)}</span><div class="artwork-tags">${art.tags.map(tag => `<span class="artwork-tag">${esc(tag)}</span>`).join('')}</div><span class="artwork-open">Artwork details <span aria-hidden="true">↗</span></span></div></a></article>`;
  }
  const badge = status => `<span class="badge ${status === 'In Development' ? 'b-dev' : 'b-soon'}">${esc(status)}</span>`;
  const socialIcon = label => ({Instagram:'◎',YouTube:'▶',Discord:'◉',Twitch:'▣',TikTok:'♪',Website:'↗',Bluesky:'✳',X:'𝕏'}[label] || '↗');
  const favoriteIcon = type => ({game:'🎮',developer:'✦',artwork:'▧'}[type] || '★');
  const favoritesFor = user => user?.favorites || {};

  function projectCard(game) {
    return `<article class="game"><div class="cover cover-${game.cover}" aria-hidden="true">${gameBannerImage(game)}<span class="cover-kicker">${esc(game.subtitle)}</span><strong>${esc(game.name)}</strong></div>
      <div class="game-body"><div class="game-top"><div class="game-card-title">${projectIcon(game)}<h3>${esc(game.name)}</h3></div>${badge(game.status)}</div><p class="meta">${esc(game.genre)}${game.version ? ` · ${esc(game.version)}` : ''}</p>
      <p>${esc(game.blurb)}</p><a class="btn btn-ghost btn-sm" href="project.html?id=${encodeURIComponent(game.id)}">Project details</a></div></article>`;
  }
  const memberFilterOptions = ['Coder / Scripter','Modeler','Tester','Artist','Updater','Announcer',...DATA.games.map(game => game.name)];
  function tagsForMember(member) {
    const roleText = member.roles.join(' ').toLowerCase();
    const tags = [];
    if (/coder|scripter/.test(roleText)) tags.push('Coder / Scripter');
    if (/modeler|modeller/.test(roleText)) tags.push('Modeler');
    if (/tester/.test(roleText)) tags.push('Tester');
    if (/artist/.test(roleText)) tags.push('Artist');
    if (/updater/.test(roleText)) tags.push('Updater');
    if (/announcer/.test(roleText)) tags.push('Announcer');
    return [...new Set([...tags,...member.projects])];
  }
  function memberCard(member) {
    const tags = tagsForMember(member);
    return `<article class="member" data-member-card data-tags="${esc(tags.join('|'))}" data-search="${esc([member.online,member.real,member.title,...member.roles,...member.projects].join(' '))}">${avatar(member.online,'',member.avatarImage)}<div><h3>${esc(member.online)}</h3><p class="role">${esc(member.title)}</p><p><strong>Real name:</strong> ${esc(member.real)}</p><p><strong>Roles:</strong> ${member.roles.map(esc).join(', ')}</p><div class="member-tags" aria-label="Member roles and projects">${tags.map(tag => `<span class="tag member-tag${DATA.games.some(game => game.name === tag) ? ' member-tag-project' : ''}">${esc(tag)}</span>`).join('')}</div>${member.id ? `<a class="member-profile-link" href="account.html?user=${encodeURIComponent(member.id)}">View profile <span aria-hidden="true">↗</span></a>` : ''}</div></article>`;
  }
  let activeMemberTag = 'All';
  function updateMemberResults() {
    const query = ($('#member-search')?.value || '').trim().toLowerCase();
    const cards = $$('[data-member-card]');
    let shown = 0;
    cards.forEach(card => {
      const tags = card.dataset.tags.split('|');
      const matchesTag = activeMemberTag === 'All' || tags.includes(activeMemberTag);
      const matchesQuery = !query || `${card.dataset.search} ${card.dataset.tags}`.toLowerCase().includes(query);
      card.hidden = !(matchesTag && matchesQuery);
      if (!card.hidden) shown++;
    });
    const empty = $('#member-no-results');
    if (empty) empty.hidden = shown > 0;
  }
  async function loadTeamMembers() {
    const container = $('#member-results');
    try {
      const result = await api('/api/team');
      DATA.members = result.members || [];
      if (page === 'list' && container) { container.innerHTML = DATA.members.map(memberCard).join(''); updateMemberResults(); }
      if (page === 'account' && currentUser && editingProfile) showAccount();
    } catch (_) {
      if (page === 'list' && container) { container.innerHTML = ''; setMessage('#member-load-message','Team profiles could not be loaded. Please refresh the page.'); }
    }
  }
  function favoriteCard(type, item) {
    if (!item?.title) return '';
    const game = type === 'game' ? gameByName(item.title) : null;
    const art = type === 'artwork' ? DATA.arts.find(entry => entry.title === item.title) : null;
    const artworkClass = type === 'game' ? `favorite-cover cover-${game?.cover || 'frost'}` : `favorite-icon favorite-icon-${type}`;
    const icon = type === 'game' ? `<span class="${artworkClass}" aria-hidden="true">${game?.icon ? `<img src="${esc(game.icon)}" alt="">` : `<b>${esc(item.title.slice(0,1))}</b>`}</span>` : art ? `<span class="favorite-cover favorite-artwork-cover" aria-hidden="true"><img src="${esc(art.image)}" alt=""></span>` : `<span class="${artworkClass}" aria-hidden="true">${favoriteIcon(type)}</span>`;
    return `<article class="favorite-card">${icon}<div class="favorite-copy"><span class="favorite-type">Favorite ${esc(type)}</span><strong>${esc(item.title)}</strong><p>${esc(item.comment || 'No comment added.')}</p></div></article>`;
  }
  function socialsMarkup(socials) {
    const items = Array.isArray(socials) ? socials.filter(item => item?.label && item?.url) : [];
    return items.length ? `<ul class="social-list">${items.map(item => `<li><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer"><span class="social-icon" aria-hidden="true">${esc(socialIcon(item.label))}</span><span><b>${esc(item.label)}</b><small>${esc(item.url.replace(/^https:\/\//, '').replace(/\/$/, ''))}</small></span></a></li>`).join('')}</ul>` : '<p class="empty-inline">No social accounts added yet.</p>';
  }
  function profilePreview() {
    const button = $('#profile-button');
    const popover = $('#profile-popover');
    if (!currentUser) {
      button.innerHTML = avatar('Guest');
      button.setAttribute('aria-label', 'Open account sign-in preview');
      popover.innerHTML = `<div class="profile-pop-head">${avatar('Guest')}<div><strong>Welcome to Solaris</strong><span>Sign in or create a profile</span></div></div>
        <p class="profile-pop-note">Create an account to add your bio, social links, and favorites.</p><div class="profile-pop-actions"><a class="btn btn-ghost btn-sm" href="account.html?mode=login">Log in</a><a class="btn btn-primary btn-sm" href="account.html?mode=signup">Sign up</a></div>`;
      return;
    }
    button.innerHTML = avatar(currentUser.username, '', currentUser.avatarImage);
    button.setAttribute('aria-label', `Open ${currentUser.username} profile preview`);
    const favs = favoritesFor(currentUser);
    const cards = [['game',favs.game],['developer',favs.developer],['artwork',favs.artwork]].map(([type,item]) => favoriteCard(type,item)).filter(Boolean).join('');
    const installed = currentUser.installedGames?.length ? `<div class="preview-section"><h3>Installed games</h3><div class="tag-list">${currentUser.installedGames.map(game => `<span class="tag">${esc(game)}</span>`).join('')}</div></div>` : '';
    const socials = currentUser.socials?.length ? `<div class="preview-section"><h3>Social accounts</h3>${socialsMarkup(currentUser.socials)}</div>` : '';
    const favorites = cards ? `<div class="preview-section"><h3>Favorites</h3><div class="favorite-list">${cards}</div></div>` : '';
    const bio = currentUser.bio || 'No bio added yet.';
    const pronouns = currentUser.pronouns ? `<span class="profile-pop-pronouns">${esc(currentUser.pronouns)}</span>` : '';
    const note = noteControl(currentUser.notes, 'note-control-pop');
    popover.innerHTML = `<div class="profile-pop-hero"><div class="profile-pop-banner">${bannerImage(currentUser.bannerImage)}</div>${note}
      <div class="profile-pop-head">${avatar(currentUser.username, '', currentUser.avatarImage)}<div class="profile-pop-identity"><strong>${esc(currentUser.username)}</strong><span class="profile-pop-bio">${esc(bio)}</span>${pronouns}</div></div></div>
      <div class="profile-pop-content">${socials}${favorites}${installed}${(!socials && !favorites && !installed) ? '<p class="profile-pop-note">Add social accounts, favorites, and installed games from your profile page.</p>' : ''}</div>
      <a class="btn btn-primary profile-view" href="account.html">View full account</a>`;
  }

  const views = {
    home() {
      const game = DATA.games[0];
      return `<section class="hero" aria-labelledby="hero-title"><div class="hero-in"><h1 id="hero-title">Solaris<br>Studio</h1>
        <p class="lede">A new independent studio making worlds to explore. Our first game is in development.</p>
        <div class="actions"><a class="btn btn-primary" href="games.html">Explore our games</a><a class="btn btn-ghost" href="list.html">Meet the team</a></div></div><div class="sun-wrap" aria-hidden="true"><div class="rays"></div><div class="sun"></div></div></section>
        <div class="wrap"><section class="studio-story block" aria-labelledby="studio-story-title"><div class="studio-story-head"><span class="studio-story-eyebrow">Our community</span><h2 id="studio-story-title">A small studio built around a big dream</h2><p>Solaris Studio grew from a Minecraft server into a place to learn, create games, and share the worlds we hope to make.</p></div>
        <div class="studio-story-grid"><article class="studio-story-card"><span class="studio-story-number">01</span><h3>From SolarisSMP to Solaris Studio</h3><p>Our community began on Discord around SolarisSMP, my Minecraft server. Even as I played on and posted about it, its players stayed within the same circle of classmates and people I already knew. Since I love games, I started learning to code so I could make one for others to enjoy. After a year and several months, I turned the Discord server into a game development community, disconnected the Minecraft server, and shut it down.</p></article>
        <article class="studio-story-card"><span class="studio-story-number">02</span><h3>What the sun means</h3><p>The sun is a light for gamers beginning to grow and achieve what they want. For Solaris, it also means a new beginning: this is our first major project beyond school projects.</p></article>
        <article class="studio-story-card"><span class="studio-story-number">03</span><h3>Why we make games</h3><p>Making games is something we want and dream to achieve. We hope to give gamers more challenges and new worlds to enjoy, and make experiences that help people have fun, feel happy, and feel better.</p></article>
        <article class="studio-story-card"><span class="studio-story-number">04</span><h3>Mods and add-ons belong</h3><p>We support add-ons, game modifications, plugins, and tools for our games. Use them on a local server on your computer; public-server use is welcome when the changes are appropriate and safe.</p></article>
        <article class="studio-story-card"><span class="studio-story-number">05</span><h3>A team of two active members</h3><p>For the past three months, two of us—me and a friend—have been the ones actively working. Other developers are mostly inactive; some check in briefly before going offline again.</p></article></div></section>
        <section class="block" aria-labelledby="h-feat"><div class="sec-head"><h2 id="h-feat">Now in development</h2><a class="more" href="games.html">All projects</a></div>
        <article class="feature"><div class="cover cover-${game.cover}" aria-hidden="true">${gameBannerImage(game)}<span class="cover-kicker">${esc(game.subtitle)}</span><strong>${esc(game.name)}</strong></div>
        <div class="feature-body"><div>${badge(game.status)}</div><h3>${esc(game.name)}: ${esc(game.subtitle)}</h3><p>${esc(game.blurb)}</p><p class="meta">${esc(game.genre)} · ${esc(game.version)}</p><a class="btn btn-primary" href="project.html?id=${encodeURIComponent(game.id)}">Project details</a></div></article></section>
        <section class="block" aria-labelledby="h-projects"><div class="sec-head"><h2 id="h-projects">Studio projects</h2><a class="more" href="games.html">Browse games</a></div><div class="grid">${DATA.games.map(projectCard).join('')}</div></section>
        <section class="band" aria-labelledby="h-team"><div><h2 id="h-team">Meet the Solaris team</h2><p>Solaris Studio is currently built by two active members.</p></div><a class="btn" href="list.html">View the team</a></section></div>`;
    },
    list() {
      return `<div class="wrap"><div class="page-head"><h1>List</h1><p>Meet the active members of Solaris Studio.</p></div>
        <section class="member-directory" aria-label="Search and filter members"><label class="member-search-wrap"><span class="visually-hidden">Search by member, role, or project</span><span class="member-search-icon" aria-hidden="true">⌕</span><input id="member-search" type="search" data-member-search placeholder="Search members, roles, or games…" autocomplete="off"></label>
        <div class="member-filter-bar" role="group" aria-label="Filter members by role or project"><button class="member-filter-chip" type="button" data-member-filter="All" aria-pressed="true">All</button>${memberFilterOptions.map(tag => `<button class="member-filter-chip" type="button" data-member-filter="${esc(tag)}" aria-pressed="false">${esc(tag)}</button>`).join('')}</div></section>
        <div class="members" id="member-results"></div><p class="empty member-empty" id="member-no-results">Team profiles will appear here when members create accounts and the Owner connects them to the studio list.</p><p class="form-message" id="member-load-message" role="status"></p><div class="page-end"></div></div>`;
    },
    games() { return `<div class="wrap"><div class="page-head"><h1>Games</h1><p>Solaris Studio is new, with one game in development and one planned for the future.</p></div><div class="grid">${DATA.games.map(projectCard).join('')}</div><div class="page-end"></div></div>`; },
    updates() { return `<div class="wrap"><div class="page-head"><h1>Updates</h1><p>News and development updates from Solaris Studio.</p></div><article class="update-card"><span class="section-eyebrow">DEVELOPMENT NOTE</span><h2>Gamma Frost production is slow</h2><p>Gamma Frost production is moving slowly because I’m currently the only person working on it. That means I can’t build every part of the game at once, so development will take time.</p><p>When Gamma Frost reaches early access, it will not yet be an MMORPG. The game will begin in a more limited form, and its larger online world will take longer to build. Thank you for your patience while I keep working on it.</p></article><div class="page-end"></div></div>`; },
    arts() { return `<div class="wrap"><div class="page-head"><h1>Arts</h1><p>Artwork and visuals from Solaris Studio projects.</p></div><div class="artwork-grid">${DATA.arts.map(artworkCard).join('')}</div><div class="page-end"></div></div>`; },
    groups() { return `<div class="wrap"><div class="page-head"><h1>Groups</h1><p>Join the Solaris Studio community and find our official group links here.</p></div><section class="group-intro"><span class="section-eyebrow">ABOUT OUR COMMUNITY</span><h2>Small team, big dreams.</h2><p>Solaris Studio is an early-stage game development community with two active developers. We make games to bring the things we dream of creating to life.</p></section><section class="account-panel groups-panel"><h2>Solaris communities</h2><a class="group-link" href="https://discord.gg/Wg6Y9Yc4JA" target="_blank" rel="noopener noreferrer"><span class="group-link-icon" aria-hidden="true">◉</span><span><strong>Solaris Studio Discord</strong><small>Join the community</small></span><span class="group-link-arrow" aria-hidden="true">↗</span></a></section><div class="page-end"></div></div>`; },
    download() { return `<div class="wrap"><div class="page-head"><h1>Download</h1><p>Extras and add-ons for Solaris Studio games.</p></div><section class="download-intro"><span class="section-eyebrow">PLUGINS · MODS · EXTRAS</span><h2>Make each game your own</h2><p>This page is a home for extras created for Solaris Studio games: character skins, add-ons, mods, plugins, modding apps, and other useful tools. These creations can give players new ways to personalize a game, try new ideas, and build on the experience. Game builds themselves will be shared on their own project detail pages; this page is for the tools and community-made additions around them.</p><p>There are no downloads available yet. As our games and their tools grow, we’ll add each extra here with details about its game, version, and use. We welcome creativity while asking everyone to use modifications thoughtfully: local servers on your own computer are supported, and public-server use is welcome when the modification is appropriate and safe.</p><h3>Why we support game modification tools</h3><ul class="download-reasons"><li><strong>Personalize your characters.</strong> Use skins and visual add-ons to make a character feel like your own.</li><li><strong>Explore more ways to play.</strong> Mods, plugins, and add-ons can introduce new ideas, features, and experiences to Solaris games.</li><li><strong>Celebrate creativity and hard work.</strong> Modding apps give players a way to experiment, make things, and share the care they put into their creations.</li></ul></section><div class="download-categories"><section class="download-category"><h2>Plugins &amp; tools</h2><p>No plugins or tools are available yet.</p></section><section class="download-category"><h2>Mods &amp; add-ons</h2><p>No mods or add-ons are available yet.</p></section></div><div class="project-download-links"><h2>Game pages</h2>${DATA.games.map(game => `<a class="text-link" href="project.html?id=${encodeURIComponent(game.id)}">${esc(game.name)} project details <span aria-hidden="true">↗</span></a>`).join('')}</div><div class="page-end"></div></div>`; },
    shop() {
      const inventory = currentUser?.tickets || { namecard: 0, who: 0 };
      const ticketCard = (kind, title, summary, count) => `<article class="shop-ticket-card"><span class="shop-ticket-mark" aria-hidden="true">${kind === 'namecard' ? '✦' : '？'}</span><div class="shop-ticket-copy"><span class="section-eyebrow">PROFILE TICKET</span><h2>${title}</h2><p>${summary}</p><span class="shop-ticket-count">${currentUser ? `In your inventory: <strong>${count}</strong>` : 'Sign in to view your inventory.'}</span></div>${currentUser ? `<button class="btn btn-primary" type="button" data-shop-ticket="${kind}">Get for free</button>` : '<a class="btn btn-primary" href="account.html?mode=signup">Sign up or log in</a>'}</article>`;
      return `<div class="wrap"><div class="page-head"><h1>Shop</h1><p>Get profile tickets for the changes you want to make.</p></div><section class="shop-intro"><span class="section-eyebrow">SOLARIS MEMBER SHOP</span><h2>Useful tickets, no currency needed</h2><p>The shop is new, so tickets are free while Solaris has no currency system. Add a ticket to your account here, then use it when editing your profile. Namecard tickets let you change your username during its one-week cooldown. A WHO? ticket lets you change the real name you made permanent when you first added it.</p><p>Tickets are saved to your account. You can keep up to 99 of each ticket.</p></section><div class="shop-ticket-list">${ticketCard('namecard','Namecard ticket','Change your username without waiting for the seven-day cooldown.',inventory.namecard || 0)}${ticketCard('who','WHO? ticket','Change a real name after the first saved value made it permanent.',inventory.who || 0)}</div><div class="page-end"></div></div>`;
    },
    project() {
      const requestedId = new URLSearchParams(location.search).get('id');
      const game = gameById(requestedId) || DATA.games[0];
      const currentProject = `<a class="project-switch-card is-current" href="project.html?id=${encodeURIComponent(game.id)}" aria-current="page">${projectIcon(game)}<span class="project-switch-copy"><strong>${esc(game.name)}</strong><small>${esc(game.subtitle)}</small><span class="project-switch-status">${esc(game.status)}</span></span><span class="project-switch-arrow" aria-hidden="true">↗</span></a>`;
      const otherProjects = DATA.games.filter(project => project.id !== game.id).map(project => `<a class="project-switch-card" data-switch-project data-project-text="${esc([project.name,project.subtitle,project.genre,project.status].join(' '))}" href="project.html?id=${encodeURIComponent(project.id)}">${projectIcon(project)}<span class="project-switch-copy"><strong>${esc(project.name)}</strong><small>${esc(project.subtitle)}</small><span class="project-switch-status">${esc(project.status)}</span></span><span class="project-switch-arrow" aria-hidden="true">↗</span></a>`).join('');
      const relatedArtworks = DATA.arts.filter(art => art.projectId === game.id);
      const artworkSection = relatedArtworks.length ? `<section class="project-copy related-artwork-section"><h2>Related artwork</h2><div class="related-artwork-list">${relatedArtworks.map(art => `<a class="related-artwork-link" href="${artworkHref(art)}"><img src="${esc(art.image)}" alt=""><span><strong>${esc(art.title)}</strong><small>${esc(art.mainTag)}</small></span><span aria-hidden="true">↗</span></a>`).join('')}</div></section>` : '';
      const worldIntro = game.worldIntro ? `<section class="project-copy project-story"><h2>Short introduction</h2>${paragraphs(game.worldIntro)}</section>` : '';
      const playerIntro = game.playerIntro ? `<section class="project-copy project-story"><h2>Your story begins</h2>${paragraphs(game.playerIntro)}</section>` : '';
      const releasePlan = game.releasePlan ? `<section class="project-copy project-release"><h2>Early access plans</h2><p>${esc(game.releasePlan)}</p></section>` : '';
      return `<div class="project-page"><div class="project-banner project-banner-${esc(game.cover)}" role="img" aria-label="${esc(game.name)} project banner">${gameBannerImage(game)}<div class="project-banner-mark">${esc(game.name)}</div></div><div class="wrap project-layout"><main class="project-detail-main"><a class="project-back" href="games.html">← All projects</a><div class="project-heading">${projectIcon(game)}<div><div class="project-status-row">${badge(game.status)}${game.version ? `<span class="project-version">${esc(game.version)}</span>` : ''}</div><h1>${esc(game.name)}</h1><p class="project-subtitle">${esc(game.subtitle)} · ${esc(game.genre)}</p></div></div><section class="project-copy"><h2>About this project</h2><p>${esc(game.details)}</p><p>${esc(game.blurb)}</p></section>${worldIntro}${playerIntro}${releasePlan}<section class="project-copy project-extra"><h2>Downloads</h2><p>${game.status === 'In Development' ? 'There are no public game builds yet. Check back as development continues.' : 'This project is planned for the future and has no downloads yet.'}</p><a class="text-link" href="download.html">Browse plugins, mods, and extras <span aria-hidden="true">↗</span></a></section>${artworkSection}</main><aside class="project-switcher" aria-label="Solaris projects"><label class="project-search-wrap"><span class="project-search-icon" aria-hidden="true">⌕</span><span class="visually-hidden">Search other games</span><input type="search" data-project-search placeholder="Search other games…" autocomplete="off"></label><section class="project-selected-section"><span class="section-eyebrow">Selected Game</span>${currentProject}</section><div class="project-switch-divider"><span>Explore other games</span></div><div class="project-switch-list">${otherProjects}</div><p class="project-no-results" data-project-empty hidden>No other games match that search.</p></aside></div></div>`;
    },
    artwork() {
      const artwork = artById(new URLSearchParams(location.search).get('id')) || DATA.arts[0];
      const project = gameById(artwork.projectId);
      const currentArt = `<a class="artwork-switch-card is-current" href="${artworkHref(artwork)}" aria-current="page"><img src="${esc(artwork.image)}" alt=""><span><strong>${esc(artwork.title)}</strong><small>${esc(artwork.type)}</small></span></a>`;
      const otherArt = DATA.arts.filter(art => art.id !== artwork.id).map(art => `<a class="artwork-switch-card" data-switch-artwork data-artwork-text="${esc([art.title,art.type,art.mainTag,...art.tags].join(' '))}" href="${artworkHref(art)}"><img src="${esc(art.image)}" alt=""><span><strong>${esc(art.title)}</strong><small>${esc(art.type)}</small></span></a>`).join('');
      return `<div class="wrap artwork-detail-layout"><main class="artwork-detail-main"><a class="project-back" href="arts.html">← Back to Arts</a><figure class="artwork-detail-image artwork-detail-image-${esc(artwork.shape)}"><img src="${esc(artwork.image)}" alt="${esc(artwork.title)}"><figcaption>${esc(artwork.title)}</figcaption></figure><span class="artwork-main-tag">${esc(artwork.mainTag)}</span><h1>${esc(artwork.title)}</h1><p class="artwork-detail-type">${esc(artwork.type)}${project ? ` · <a href="project.html?id=${encodeURIComponent(project.id)}">${esc(project.name)}</a>` : ''}</p><section class="artwork-detail-section"><h2>Artwork details</h2><dl><dt>Type</dt><dd>${esc(artwork.type)}</dd><dt>Credit</dt><dd>No owner listed</dd><dt>Project</dt><dd>${project ? esc(project.name) : 'Solaris Studio'}</dd></dl></section><section class="artwork-detail-section"><h2>Tags</h2><div class="artwork-tags artwork-tags-detail">${artwork.tags.map(tag => `<span class="artwork-tag">${esc(tag)}</span>`).join('')}</div></section></main><aside class="artwork-switcher" aria-label="Browse artwork"><label class="project-search-wrap"><span class="project-search-icon" aria-hidden="true">⌕</span><span class="visually-hidden">Search other artwork</span><input type="search" data-artwork-search placeholder="Search other artwork…" autocomplete="off"></label><section class="project-selected-section"><span class="section-eyebrow">Selected Artwork</span>${currentArt}</section><div class="project-switch-divider"><span>Explore other art</span></div><div class="artwork-switch-list">${otherArt}</div><p class="project-no-results" data-artwork-empty hidden>No other artwork matches that search.</p></aside></div>`;
    },
    account() { return '<div class="wrap"><div class="page-head"><h1>Profile</h1><p>Loading your Solaris account…</p></div></div>'; }
  };
  function renderPage() {
    app.innerHTML = (views[page] || views.home)();
    const selectedProject = page === 'project' ? gameById(new URLSearchParams(location.search).get('id')) || DATA.games[0] : null;
    const selectedArtwork = page === 'artwork' ? artById(new URLSearchParams(location.search).get('id')) || DATA.arts[0] : null;
    document.title = selectedProject ? `${selectedProject.name} | Solaris Studio` : selectedArtwork ? `${selectedArtwork.title} | Solaris Studio` : `${titles[page] ? `${titles[page]} | ` : ''}Solaris Studio`;
    $('#nav-list').innerHTML = ROUTES.map(([id,label,href]) => `<li><a href="${href}"${id === page ? ' aria-current="page"' : ''}>${label}</a></li>`).join('');
  }
  function toast(message) {
    const node = $('#toast'); node.textContent = message; node.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('show'), 3400);
  }
  async function api(path, method = 'GET', body) {
    const response = await fetch(path, { method, credentials: 'same-origin', headers: body ? {'Content-Type':'application/json'} : undefined, body: body ? JSON.stringify(body) : undefined });
    let result = {};
    try { result = await response.json(); } catch (_) {}
    if (!response.ok) throw new Error(result.error || 'The account request could not be completed.');
    return result;
  }
  async function getShopTicket(button) {
    const ticketType = button.dataset.shopTicket;
    button.disabled = true;
    try {
      const result = await api('/api/shop/purchase-ticket','POST',{ticketType});
      currentUser = result.user;
      profilePreview();
      renderPage();
      toast(result.message);
    } catch (error) { toast(error.message); }
    finally { button.disabled = false; }
  }
  function closeProfile() {
    const popover = $('#profile-popover');
    popover.hidden = true;
    $('#profile-button').setAttribute('aria-expanded','false');
    $$('[data-note-toggle]',popover).forEach(button => {
      const bubble = button.nextElementSibling;
      if (bubble) bubble.hidden = true;
      button.hidden = false;
      button.closest('.note-control')?.classList.remove('is-expanded');
      button.setAttribute('aria-expanded','false');
      button.setAttribute('aria-label','Show profile note');
    });
  }
  window.addEventListener('pagehide', () => {
    $$('[data-note-toggle]').forEach(button => {
      const bubble = button.nextElementSibling;
      if (bubble) bubble.hidden = true;
      button.hidden = false;
      button.closest('.note-control')?.classList.remove('is-expanded');
    });
  });
  function favoriteControl(type, current) {
    const options = type === 'game' ? DATA.games.map(game => [game.name,game.name]) : type === 'developer' ? DATA.members.map(member => [member.online,member.online]) : DATA.arts.map(art => [art.title,art.title]);
    const emptyText = type === 'artwork' && !options.length ? 'No Solaris artwork is available to favorite yet.' : 'None';
    const disabled = !options.length ? ' disabled' : '';
    return `<label>Favorite ${esc(type)}<select name="favorite-${type}"${disabled}><option value="">${esc(emptyText)}</option>${options.map(([value,label]) => `<option value="${esc(value)}"${current?.title === value ? ' selected' : ''}>${esc(label)}</option>`).join('')}</select></label>
      <label class="favorite-comment-label">Your comment<textarea name="favorite-${type}-comment" rows="2" maxlength="240" placeholder="What do you like about it?"${disabled}>${esc(current?.comment || '')}</textarea></label>`;
  }
  function socialRowsMarkup(socials) {
    const rows = socials?.length ? socials : [{label:'',url:''}];
    return rows.map(item => `<div class="social-editor-row"><label>Account name<input name="social-label" maxlength="30" placeholder="Instagram, Discord, website…" value="${esc(item.label || '')}"></label><label>Profile link<input name="social-url" type="url" maxlength="240" placeholder="https://…" value="${esc(item.url || '')}"></label><button class="icon-btn social-remove" type="button" data-remove-social aria-label="Remove social account">Remove</button></div>`).join('');
  }
  function ownerTeamManager() {
    return `<section class="account-panel account-panel-wide owner-team-manager"><div class="panel-heading"><div><h2>Team account connections</h2><p>Connect member accounts to the Solaris List page.</p></div></div><p class="form-message" id="team-admin-message" role="status"></p><div class="team-admin-list" id="team-admin-list"><p class="empty-inline">Loading member accounts…</p></div></section>`;
  }
  async function loadOwnerAccounts() {
    const list = $('#team-admin-list');
    if (!list) return;
    try {
      const result = await api('/api/admin/accounts');
      list.innerHTML = result.accounts.length ? result.accounts.map(account => `<label class="team-admin-row"><span><strong>${esc(account.username)}</strong><small>${account.accountRole === 'owner' ? 'Solaris Owner account' : 'Member account'}</small></span><select data-team-assignment data-account-id="${esc(account.id)}" aria-label="Team position for ${esc(account.username)}"><option value=""${!account.teamKey ? ' selected' : ''}>Not on the List</option><option value="owner"${account.teamKey === 'owner' ? ' selected' : ''} disabled>Owner</option><option value="assistant"${account.teamKey === 'assistant' ? ' selected' : ''}>Assistant</option></select></label>`).join('') : '<p class="empty-inline">No accounts have signed up yet.</p>';
    } catch (error) {
      setMessage('#team-admin-message',error.message);
      list.innerHTML = '';
    }
  }
  function dangerZone() {
    return `<section class="account-panel account-panel-wide danger-zone"><span class="danger-eyebrow">ACCOUNT MANAGEMENT</span><h2>Danger zone</h2><p>Pause your account for 30 days, or permanently delete it and its Solaris pause backups.</p><div class="danger-actions"><button class="danger-button danger-button-pause" type="button" data-account-action="pause"><strong>Pause account</strong><span>Hide your profile and block logins for 30 days.</span></button><button class="danger-button danger-button-delete" type="button" data-account-action="delete"><strong>Delete account</strong><span>Permanently remove your account and its Solaris backups.</span></button></div><p class="danger-retention-note">Deletion clears account data and pause backups held by Solaris. Git history and backups retained separately by the hosting or database provider follow their own retention policies.</p><div class="account-danger-footer"><button class="btn btn-ghost btn-sm" data-logout>Log out</button></div></section>`;
  }
  function dangerDialog() {
    return `<dialog class="account-danger-dialog" id="account-danger-dialog" aria-labelledby="account-danger-title"><div class="account-danger-dialog-inner"><button class="icon-btn danger-dialog-close" type="button" data-cancel-danger aria-label="Close confirmation">×</button><span class="danger-eyebrow">ACCOUNT MANAGEMENT</span><h2 id="account-danger-title">Confirm account action</h2><p id="account-danger-copy"></p><form id="account-danger-form"><label>Confirm your password<input name="password" type="password" required maxlength="200" autocomplete="current-password"></label><label>Type <strong id="account-danger-word"></strong> to confirm<input name="confirmation" required autocomplete="off"></label><p class="form-message" id="danger-action-message" role="status"></p><div class="danger-dialog-actions"><button class="btn btn-ghost" type="button" data-cancel-danger>Cancel</button><button class="btn btn-danger" id="account-danger-submit" type="submit">Confirm</button></div></form></div></dialog>`;
  }
  function profileDashboard(user, isOwn = false) {
    const favorites = favoritesFor(user);
    const favoriteCards = [['game',favorites.game],['developer',favorites.developer],['artwork',favorites.artwork]].map(([type,item]) => favoriteCard(type,item)).filter(Boolean);
    const installed = user.installedGames?.length ? user.installedGames.map(game => `<span class="tag">${esc(game)}</span>`).join('') : '<p class="empty-inline">No installed games added yet.</p>';
    const roleLabel = user.accountRole === 'owner' ? 'Solaris Owner' : user.teamKey === 'assistant' ? 'The Assistant' : 'Solaris Member';
    const profileOptions = isOwn ? `<div class="profile-options-wrap"><button class="profile-options-button" type="button" data-profile-options aria-label="Profile options" aria-expanded="false" aria-controls="profile-options">⋮</button><div class="profile-options-menu" id="profile-options" hidden><button type="button" data-edit-account>Edit Profile</button></div></div>` : '';
    const admin = isOwn && user.accountRole === 'owner' ? ownerTeamManager() : '';
    const ownerClaim = isOwn && user.canClaimOwner ? `<section class="account-panel account-panel-wide owner-claim-panel"><span class="section-eyebrow">STUDIO SETUP</span><h2>Claim the Solaris Owner role</h2><p>Your signed-in username is reserved for the Owner account. Enter the one-time setup code configured on the Solaris server to connect it to the List and manage team accounts.</p><form id="owner-claim-form"><label>Owner setup code<input name="ownerSetupCode" type="password" maxlength="200" autocomplete="off" required></label><p class="form-message" id="owner-claim-message" role="status"></p><button class="btn btn-primary" type="submit">Claim Owner role</button></form></section>` : '';
    return `<div class="wrap account-wrap">
      <section class="account-hero"><div class="account-banner ${bannerRatioClass(user.bannerRatio)}">${bannerImage(user.bannerImage)}</div>
        ${profileOptions}<div class="account-hero-row">${avatar(user.username,'avatar-large',user.avatarImage)}${noteControl(user.notes,'note-control-full')}<div class="account-hero-name"><h2>${esc(user.username)}</h2><p>${user.realName ? esc(user.realName) : 'Real name not shared'}${user.pronouns ? ` <span class="account-pronouns">· ${esc(user.pronouns)}</span>` : ''}</p><span class="profile-role-chip">${esc(roleLabel)}</span></div></div></section>
      <div class="account-grid">
        <section class="account-panel"><h2>About</h2><dl class="profile-facts"><dt>Username</dt><dd>${esc(user.username)}</dd><dt>Real name</dt><dd>${user.realName ? esc(user.realName) : 'Not shared'}</dd><dt>Pronouns</dt><dd>${user.pronouns ? esc(user.pronouns) : 'Not shared'}</dd></dl><h3>Bio</h3><p>${esc(user.bio || 'No bio added yet.')}</p></section>
        <section class="account-panel"><h2>Social accounts</h2>${socialsMarkup(user.socials)}</section>
        <section class="account-panel"><h2>Likes</h2><p>${esc(user.likes || 'No likes added yet.')}</p></section>
        <section class="account-panel"><h2>Dislikes</h2><p>${esc(user.dislikes || 'No dislikes added yet.')}</p></section>
        <section class="account-panel account-panel-wide"><h2>Favorites</h2>${favoriteCards.length ? `<div class="favorite-grid">${favoriteCards.join('')}</div>` : '<p class="empty-inline">No favorites added yet. Edit your profile to choose favorites.</p>'}</section>
        <section class="account-panel account-panel-wide"><h2>Installed games</h2><div class="tag-list">${installed}</div></section>${admin}${ownerClaim}
      </div>${isOwn ? `<p class="account-footnote">Your profile is saved by the Solaris server. Real name and profile details are optional.</p>${dangerZone()}${dangerDialog()}` : ''}</div>`;
  }
  function profileEditor(user) {
    const socials = socialRowsMarkup(user.socials);
    const favs = favoritesFor(user);
    const ticketCounts = user.tickets || { namecard: 0, who: 0 };
    const namecardOption = ticketCounts.namecard > 0 ? `<label class="ticket-choice"><input type="checkbox" name="useNamecardTicket"><span>Use a Namecard ticket (${ticketCounts.namecard} available)</span></label>` : `<p class="panel-help">Namecard tickets in your inventory: ${ticketCounts.namecard || 0}. <a class="text-link" href="shop.html">Get one in the Shop</a>.</p>`;
    const realNameNotice = user.realName ? (ticketCounts.who > 0 ? `<p class="panel-help">Your saved real name is permanent unless you use a WHO? ticket (${ticketCounts.who} available).</p><label class="ticket-choice"><input type="checkbox" name="useWhoTicket"><span>Use a WHO? ticket for this change</span></label>` : `<p class="panel-help">Your saved real name is permanent. <a class="text-link" href="shop.html">Get a WHO? ticket in the Shop</a> if you need to change it.</p>`) : '<p class="real-name-warning">Warning: the first real name you save becomes permanent. To change it later, you will need a WHO? ticket from the Shop.</p>';
    return `<div class="wrap account-wrap"><div class="page-head"><h1>Edit profile</h1><p>Choose what to share on your Solaris profile. Only your username is required for your account.</p></div>
      <form id="profile-form" class="account-editor">
        <div class="account-grid">
          <section class="account-panel account-panel-wide image-settings"><h2>Profile appearance</h2><p class="panel-help">Click either image to choose a photo, then drag, zoom, and rotate it to fit.</p>
            <div class="appearance-pickers"><button class="banner-picker ${bannerRatioClass(user.bannerRatio)}" type="button" data-open-image="banner" aria-label="Change profile banner"><span class="banner-picker-image">${bannerImage(user.bannerImage)}</span><span class="picker-caption">Change banner</span></button>
              <button class="avatar-picker" type="button" data-open-image="avatar" aria-label="Change profile picture">${avatar(user.username,'avatar-edit-large',user.avatarImage)}<span class="avatar-picker-scrim" aria-hidden="true"></span><span class="picker-caption">Change</span></button></div>
            <input type="file" accept="image/png,image/jpeg,image/webp" data-image-input="banner" hidden><input type="hidden" name="bannerImage" value="${esc(user.bannerImage || '')}"><input type="hidden" name="bannerRatio" value="${esc(user.bannerRatio || '21:9')}">
            <input type="file" accept="image/png,image/jpeg,image/webp" data-image-input="avatar" hidden><input type="hidden" name="avatarImage" value="${esc(user.avatarImage || '')}"></section>
            <section class="account-panel"><h2>About you</h2><label>Username<input name="username" required minlength="3" maxlength="24" pattern="[A-Za-z0-9_.-]+( [A-Za-z0-9_.-]+)*" autocomplete="username" value="${esc(user.username)}"></label><p class="panel-help">Username changes have a seven-day cooldown. A Namecard ticket skips the wait.</p>${namecardOption}<label>Real name <span class="optional">optional</span><input name="realName" maxlength="80" autocomplete="name" value="${esc(user.realName || '')}"></label>${realNameNotice}<label>Pronouns <span class="optional">optional</span><input name="pronouns" maxlength="32" placeholder="e.g. they/them" value="${esc(user.pronouns || '')}"></label>
            <label>Bio<textarea name="bio" rows="4" maxlength="500" placeholder="A little about you…">${esc(user.bio || '')}</textarea></label><label>Profile note<textarea name="notes" rows="2" maxlength="160" placeholder="A short note shown in a speech bubble by your picture…">${esc(user.notes || '')}</textarea></label></section>
          <section class="account-panel"><h2>Likes &amp; dislikes</h2><label>Likes<textarea name="likes" rows="4" maxlength="400" placeholder="Games, genres, things you enjoy…">${esc(user.likes || '')}</textarea></label><label>Dislikes<textarea name="dislikes" rows="4" maxlength="400" placeholder="Anything you prefer to avoid…">${esc(user.dislikes || '')}</textarea></label></section>
          <section class="account-panel account-panel-wide"><div class="panel-heading"><div><h2>Social accounts</h2><p>Add links you want to share. Only secure https links are accepted.</p></div><button class="btn btn-ghost btn-sm" type="button" data-add-social>Add account</button></div><div class="social-editor" id="social-editor">${socials}</div></section>
          <section class="account-panel account-panel-wide"><h2>Favorites</h2><p class="panel-help">Add an optional comment to each favorite.</p><div class="favorite-editor-grid">
            <div class="favorite-editor-item">${favoriteControl('game',favs.game)}</div><div class="favorite-editor-item">${favoriteControl('developer',favs.developer)}</div><div class="favorite-editor-item">${favoriteControl('artwork',favs.artwork)}</div></div></section>
          <section class="account-panel account-panel-wide"><h2>Installed games</h2><p class="panel-help">List the Solaris games you have installed, separated by commas. You can leave this blank.</p><label class="visually-hidden" for="installed-games">Installed Solaris games</label><input id="installed-games" name="installedGames" maxlength="500" value="${esc((user.installedGames || []).join(', '))}" placeholder="e.g. Gamma Frost"></section>
        </div><p class="form-message" id="profile-message" role="status"></p><div class="actions editor-actions"><button class="btn btn-primary" type="submit">Save profile</button><button class="btn btn-ghost" type="button" data-cancel-edit>Cancel</button></div>
      </form></div>`;
  }
  function authView(mode = 'signup', error = '') {
    const signupSelected = mode !== 'login';
    return `<div class="wrap account-wrap"><div class="page-head"><h1>Solaris account</h1><p>Create a member profile or log in to manage your account.</p></div>
      <section class="auth-card"><div class="auth-tabs" role="tablist" aria-label="Account access"><button type="button" role="tab" data-auth-mode="signup" aria-selected="${signupSelected}">Sign up</button><button type="button" role="tab" data-auth-mode="login" aria-selected="${!signupSelected}">Log in</button></div>
      <p class="form-message" id="auth-message" role="status">${esc(error)}</p>
      <form id="signup-form" class="form auth-form"${signupSelected ? '' : ' hidden'}><h2>Create your account</h2><label>Username<input name="username" required minlength="3" maxlength="24" pattern="[A-Za-z0-9_.-]+( [A-Za-z0-9_.-]+)*" autocomplete="username" placeholder="3–24 characters; spaces allowed"></label>
      <label>Password<input name="password" type="password" required minlength="10" maxlength="200" autocomplete="new-password" placeholder="At least 10 characters"></label><label>Confirm password<input name="confirmPassword" type="password" required minlength="10" maxlength="200" autocomplete="new-password"></label><details class="owner-setup"><summary>Studio owner setup</summary><label>Owner setup code<input name="ownerSetupCode" type="password" maxlength="200" autocomplete="off"></label><small>Only the reserved studio owner should use this server setup code.</small></details><button class="btn btn-primary" type="submit">Create account</button></form>
      <form id="login-form" class="form auth-form"${!signupSelected ? '' : ' hidden'}><h2>Welcome back</h2><label>Username<input name="username" required maxlength="24" autocomplete="username"></label><label>Password<input name="password" type="password" required maxlength="200" autocomplete="current-password"></label><button class="btn btn-primary" type="submit">Log in</button></form>
      <p class="auth-note">Email is not required. Use a unique password and keep it somewhere safe; password recovery is unavailable until the studio has an email service.</p></section></div>`;
  }
  function showAccount() {
    const params = new URLSearchParams(location.search);
    const publicId = params.get('user');
    if (publicId && publicId !== currentUser?.id) {
      app.innerHTML = `<div class="wrap account-wrap"><p class="empty-inline">Loading profile…</p></div>`;
      api(`/api/public-profile?id=${encodeURIComponent(publicId)}`).then(result => { app.innerHTML = profileDashboard(result.user,false); }).catch(error => { app.innerHTML = `<div class="wrap account-wrap"><div class="page-head"><h1>Profile unavailable</h1><p>${esc(error.message)}</p><a class="btn btn-ghost" href="list.html">Back to the List</a></div></div>`; });
      return;
    }
    if (!currentUser) {
      const mode = params.get('mode') || 'signup';
      app.innerHTML = authView(mode === 'login' ? 'login' : 'signup');
    } else {
      app.innerHTML = editingProfile ? profileEditor(currentUser) : profileDashboard(currentUser,true);
      if (!editingProfile && currentUser.accountRole === 'owner') loadOwnerAccounts();
    }
  }
  function setMessage(id, message, isError = true) {
    const element = $(id);
    if (!element) return;
    element.textContent = message;
    element.classList.toggle('is-error', isError);
    element.classList.toggle('is-success', !isError);
  }
  function toggleAuthMode(mode) {
    const signup = mode === 'signup';
    $('#signup-form').hidden = !signup;
    $('#login-form').hidden = signup;
    $$('[data-auth-mode]').forEach(button => button.setAttribute('aria-selected',String(button.dataset.authMode === mode)));
    setMessage('#auth-message','',false);
  }
  function accountFromForm(form) {
    const get = name => $( `[name="${name}"]`, form)?.value?.trim() || '';
    const socials = $$('.social-editor-row',form).map(row => ({label:$('[name="social-label"]',row).value.trim(),url:$('[name="social-url"]',row).value.trim()})).filter(item => item.label && item.url);
    const favorites = {};
    for (const type of ['game','developer','artwork']) {
      const title = get(`favorite-${type}`);
      if (title) favorites[type] = {title,comment:get(`favorite-${type}-comment`)};
    }
    const installedGames = get('installedGames').split(',').map(item => item.trim()).filter(Boolean);
    return {username:get('username'),realName:get('realName'),pronouns:get('pronouns'),bio:get('bio'),notes:get('notes'),avatarImage:get('avatarImage'),bannerImage:get('bannerImage'),bannerRatio:get('bannerRatio'),likes:get('likes'),dislikes:get('dislikes'),socials,favorites,installedGames,useNamecardTicket:form.elements.useNamecardTicket?.checked === true,useWhoTicket:form.elements.useWhoTicket?.checked === true};
  }
  function ensureCropDialog() {
    if (cropDialog) return cropDialog;
    cropDialog = document.createElement('dialog');
    cropDialog.id = 'image-crop-dialog';
    cropDialog.className = 'image-crop-dialog';
    cropDialog.setAttribute('aria-labelledby','crop-title');
    cropDialog.innerHTML = `<div class="crop-head"><div><p class="profile-kicker">PROFILE IMAGE</p><h2 id="crop-title">Adjust image</h2></div><button type="button" class="icon-btn" data-crop-cancel>Cancel</button></div>
      <p class="crop-help">Drag the image to choose the crop. Use zoom and rotation to fine-tune it.</p>
      <div class="crop-ratios" role="group" aria-label="Banner crop ratio" hidden><button type="button" data-crop-ratio="16:9">16:9</button><button type="button" data-crop-ratio="21:9">21:9</button></div>
      <div class="crop-viewport"><canvas id="crop-canvas" aria-label="Image crop preview"></canvas></div>
      <div class="crop-control-grid"><label>Zoom<input id="crop-zoom" type="range" min="1" max="3" step="0.01" value="1"></label>
        <div class="crop-rotation"><span>Rotate</span><div><button type="button" class="icon-btn" data-crop-rotate="-90">−90°</button><input id="crop-rotation" type="range" min="-180" max="180" step="1" value="0" aria-label="Fine-tune rotation"><button type="button" class="icon-btn" data-crop-rotate="90">+90°</button></div></div></div>
      <p class="crop-message" id="crop-message" role="status"></p><div class="crop-actions"><button type="button" class="btn btn-ghost" data-crop-cancel>Cancel</button><button type="button" class="btn btn-primary" data-crop-save>Use this image</button></div>`;
    document.body.append(cropDialog);
    const canvas = $('#crop-canvas',cropDialog);
    canvas.addEventListener('pointerdown',event => {
      if (!cropSession) return;
      cropSession.drag = {x:event.clientX,y:event.clientY};
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove',event => {
      if (!cropSession?.drag) return;
      const rect = canvas.getBoundingClientRect();
      cropSession.offsetX += (event.clientX - cropSession.drag.x) * canvas.width / rect.width;
      cropSession.offsetY += (event.clientY - cropSession.drag.y) * canvas.height / rect.height;
      cropSession.drag = {x:event.clientX,y:event.clientY};
      paintCrop();
    });
    canvas.addEventListener('pointerup',() => { if (cropSession) cropSession.drag = null; });
    canvas.addEventListener('pointercancel',() => { if (cropSession) cropSession.drag = null; });
    cropDialog.addEventListener('cancel',() => discardCrop());
    cropDialog.addEventListener('click',event => { if (event.target === cropDialog) discardCrop(); });
    return cropDialog;
  }
  function cropDimensions(kind, ratio) {
    if (kind === 'avatar') return {width:800,height:800};
    return ratio === '16:9' ? {width:960,height:540} : {width:1050,height:450};
  }
  function drawCrop(ctx,width,height,session,previewScale=1) {
    const bitmap = session.bitmap;
    const radians = session.rotation * Math.PI / 180;
    const cosine = Math.abs(Math.cos(radians)), sine = Math.abs(Math.sin(radians));
    const rotatedWidth = bitmap.width * cosine + bitmap.height * sine;
    const rotatedHeight = bitmap.width * sine + bitmap.height * cosine;
    const scale = Math.max(width / rotatedWidth,height / rotatedHeight) * session.zoom;
    const drawWidth = bitmap.width * scale, drawHeight = bitmap.height * scale;
    const extentX = (drawWidth * cosine + drawHeight * sine) / 2;
    const extentY = (drawWidth * sine + drawHeight * cosine) / 2;
    const offsetX = Math.max(-(extentX-width/2),Math.min(extentX-width/2,session.offsetX * previewScale));
    const offsetY = Math.max(-(extentY-height/2),Math.min(extentY-height/2,session.offsetY * previewScale));
    ctx.clearRect(0,0,width,height);
    ctx.fillStyle = '#171018'; ctx.fillRect(0,0,width,height);
    ctx.save(); ctx.translate(width/2+offsetX,height/2+offsetY); ctx.rotate(radians);
    ctx.drawImage(bitmap,-drawWidth/2,-drawHeight/2,drawWidth,drawHeight); ctx.restore();
    return {extentX,extentY};
  }
  function paintCrop() {
    if (!cropSession) return;
    const canvas = $('#crop-canvas',cropDialog);
    const {width,height} = cropDimensions(cropSession.kind,cropSession.ratio);
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    const ctx = canvas.getContext('2d');
    const extents = drawCrop(ctx,width,height,cropSession);
    cropSession.offsetX = Math.max(-(extents.extentX-width/2),Math.min(extents.extentX-width/2,cropSession.offsetX));
    cropSession.offsetY = Math.max(-(extents.extentY-height/2),Math.min(extents.extentY-height/2,cropSession.offsetY));
    $('#crop-zoom',cropDialog).value = cropSession.zoom;
    $('#crop-rotation',cropDialog).value = cropSession.rotation;
    $$('[data-crop-ratio]',cropDialog).forEach(button => button.setAttribute('aria-pressed',String(button.dataset.cropRatio === cropSession.ratio)));
  }
  async function openCrop(file,kind) {
    if (!file || !/^image\/(?:jpeg|png|webp)$/.test(file.type)) throw new Error('Choose a JPG, PNG, or WebP image.');
    if (file.size > 12 * 1024 * 1024) throw new Error('Choose an image smaller than 12 MB.');
    if (typeof createImageBitmap !== 'function') throw new Error('Image editing is not supported in this browser.');
    const bitmap = await createImageBitmap(file);
    if (bitmap.width > 12000 || bitmap.height > 12000 || bitmap.width * bitmap.height > 60_000_000) {
      bitmap.close?.();
      throw new Error('That image is too large to edit. Choose one with smaller dimensions.');
    }
    if (cropSession?.bitmap) cropSession.bitmap.close?.();
    const selectedRatio = $('[name="bannerRatio"]',$('#profile-form'))?.value || currentUser.bannerRatio;
    cropSession = {bitmap,kind,ratio:kind === 'banner' && selectedRatio === '16:9' ? '16:9' : (kind === 'banner' ? '21:9' : '1:1'),zoom:1,rotation:0,offsetX:0,offsetY:0,drag:null};
    const dialog = ensureCropDialog();
    $('#crop-title',dialog).textContent = kind === 'banner' ? 'Adjust profile banner' : 'Adjust profile picture';
    $('.crop-ratios',dialog).hidden = kind !== 'banner';
    $('#crop-message',dialog).textContent = '';
    paintCrop();
    dialog.showModal();
  }
  function discardCrop() {
    if (cropSession?.bitmap) cropSession.bitmap.close?.();
    cropSession = null;
    if (cropDialog?.open) cropDialog.close();
  }
  function saveCroppedImage() {
    if (!cropSession) return;
    const session = cropSession;
    const kind = session.kind;
    const base = kind === 'avatar' ? {width:800,height:800} : (session.ratio === '16:9' ? {width:1920,height:1080} : {width:1680,height:720});
    let result = '';
    for (const scale of [1,.82,.66,.5]) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(base.width*scale); canvas.height = Math.round(base.height*scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) break;
      drawCrop(ctx,canvas.width,canvas.height,session,canvas.width/$('#crop-canvas',cropDialog).width);
      for (const quality of [.84,.72,.6]) {
        const data = canvas.toDataURL('image/webp',quality);
        if (data.length <= 900_000 && /^data:image\/(?:webp|jpeg|png);base64,/.test(data)) { result = data; break; }
      }
      if (result) break;
    }
    if (!result) { $('#crop-message',cropDialog).textContent = 'This image could not be compressed enough. Try a smaller image.'; return; }
    const form = $('#profile-form');
    $(`[name="${kind}Image"]`,form).value = result;
    if (kind === 'banner') {
      $('[name="bannerRatio"]',form).value = session.ratio;
      const button = $('[data-open-image="banner"]',form);
      button.className = `banner-picker ${bannerRatioClass(session.ratio)}`;
      button.innerHTML = `<span class="banner-picker-image">${bannerImage(result)}</span><span class="picker-caption">Change banner</span>`;
    } else {
      $('[data-open-image="avatar"]',form).innerHTML = `${avatar(currentUser.username,'avatar-edit-large',result)}<span class="picker-caption">Change picture</span>`;
    }
    discardCrop();
  }
  async function logout() {
    try { await api('/api/logout','POST',{}); currentUser = null; editingProfile = false; closeProfile(); profilePreview(); if (page === 'account') showAccount(); toast('You are logged out.'); }
    catch (error) { toast(error.message); }
  }
  function projectDialog(id) {
    const game = gameById(id); if (!game) return;
    const dialog = $('#dlg');
    $('#dlg-body').innerHTML = `<div class="cover cover-${game.cover} dialog-cover" aria-hidden="true"><span class="cover-kicker">${esc(game.subtitle)}</span><strong>${esc(game.name)}</strong></div><div class="dlg-text"><div>${badge(game.status)}</div><h2>${esc(game.name)}</h2><p class="meta">${esc(game.subtitle)} · ${esc(game.genre)}${game.version ? ` · ${esc(game.version)}` : ''}</p><p>${esc(game.details)}</p><a class="btn btn-ghost btn-sm" href="updates.html" data-close>Studio updates</a></div>`;
    dialog.showModal();
  }

  renderPage();
  profilePreview();
  try { const theme = localStorage.getItem('solaris-theme'); if (theme === 'light' || theme === 'dark') document.documentElement.setAttribute('data-theme',theme); } catch (_) {}
  loadTeamMembers();
  api('/api/me').then(result => {
    currentUser = result.user;
    profilePreview();
    if (page === 'account') showAccount();
    if (page === 'shop') renderPage();
  }).catch(error => {
    currentUser = null;
    profilePreview();
    if (page === 'account') app.innerHTML = authView('signup','Could not reach the account server. Start the site with node server.js and reload.');
  });

  document.addEventListener('click', event => {
    const menuButton = event.target.closest('[data-menu]');
    const themeButton = event.target.closest('[data-theme-toggle]');
    const profileButton = event.target.closest('#profile-button');
    const closeButton = event.target.closest('[data-close]');
    const gameButton = event.target.closest('[data-game]');
    const authMode = event.target.closest('[data-auth-mode]');
    const shopTicket = event.target.closest('[data-shop-ticket]');
    const addSocial = event.target.closest('[data-add-social]');
    const removeSocial = event.target.closest('[data-remove-social]');
    const profileOptions = event.target.closest('[data-profile-options]');
    const accountAction = event.target.closest('[data-account-action]');
    const cancelDanger = event.target.closest('[data-cancel-danger]');
    const memberFilterButton = event.target.closest('[data-member-filter]');
    const openImage = event.target.closest('[data-open-image]');
    const cropCancel = event.target.closest('[data-crop-cancel]');
    const cropSave = event.target.closest('[data-crop-save]');
    const cropRatio = event.target.closest('[data-crop-ratio]');
    const cropRotate = event.target.closest('[data-crop-rotate]');
    if (menuButton) { const nav = $('#nav'), open = nav.classList.toggle('open'); menuButton.setAttribute('aria-expanded',String(open)); return; }
    if (themeButton) {
      const root = document.documentElement; const current = root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); const next = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme',next); try { localStorage.setItem('solaris-theme',next); } catch (_) {} return;
    }
    if (profileButton) { const popover = $('#profile-popover'); if (!popover.hidden) closeProfile(); else { popover.hidden = false; profileButton.setAttribute('aria-expanded','true'); } return; }
    const noteToggle = event.target.closest('[data-note-toggle]');
    if (noteToggle) {
      const bubble = noteToggle.nextElementSibling;
      noteToggle.hidden = true;
      if (bubble) bubble.hidden = false;
      noteToggle.parentElement?.classList.add('is-expanded');
      return;
    }
    if (memberFilterButton) {
      activeMemberTag = memberFilterButton.dataset.memberFilter;
      $$('[data-member-filter]').forEach(button => button.setAttribute('aria-pressed',String(button === memberFilterButton)));
      updateMemberResults();
      return;
    }
    if (profileOptions) {
      const menu = $('#profile-options'), open = menu.hidden;
      menu.hidden = !open; profileOptions.setAttribute('aria-expanded',String(open)); return;
    }
    if (accountAction) {
      const action = accountAction.dataset.accountAction;
      const dialog = $('#account-danger-dialog');
      const form = $('#account-danger-form');
      const pause = action === 'pause';
      form.dataset.action = action;
      form.reset();
      setMessage('#danger-action-message','',false);
      $('#account-danger-title').textContent = pause ? 'Pause your account?' : 'Permanently delete your account?';
      $('#account-danger-copy').textContent = pause
        ? 'Your profile will be removed from the site and kept in a private backup for 30 days. You cannot log in during that time. After 30 days, the account and profile will be restored so you can log in again.'
        : 'This permanently removes your account and any Solaris pause backups. This cannot be undone. Hosting-provider or repository backups have separate retention rules.';
      $('#account-danger-word').textContent = pause ? 'PAUSE' : 'DELETE';
      $('#account-danger-submit').textContent = pause ? 'Pause account' : 'Delete account';
      $('#account-danger-submit').classList.toggle('btn-danger',!pause);
      $('#account-danger-submit').classList.toggle('btn-pause',pause);
      dialog.showModal();
      $('[name="password"]',form)?.focus();
      return;
    }
    if (cancelDanger) { $('#account-danger-dialog')?.close(); return; }
    if (openImage) {
      const input = $(`[data-image-input="${openImage.dataset.openImage}"]`,$('#profile-form'));
      input?.click(); return;
    }
    if (cropCancel) { discardCrop(); return; }
    if (cropSave) { saveCroppedImage(); return; }
    if (cropRatio && cropSession?.kind === 'banner') { cropSession.ratio = cropRatio.dataset.cropRatio; cropSession.offsetX = 0; cropSession.offsetY = 0; paintCrop(); return; }
    if (cropRotate && cropSession) { cropSession.rotation = (cropSession.rotation + Number(cropRotate.dataset.cropRotate) + 360) % 360; if (cropSession.rotation > 180) cropSession.rotation -= 360; paintCrop(); return; }
    if (shopTicket) { getShopTicket(shopTicket); return; }
    if (event.target.closest('[data-logout]')) { logout(); return; }
    if (closeButton) { $('#dlg').close(); return; }
    if (gameButton) { projectDialog(gameButton.dataset.game); return; }
    if (authMode) { toggleAuthMode(authMode.dataset.authMode); return; }
    if (addSocial) { const box = $('#social-editor'); if (box) { box.insertAdjacentHTML('beforeend',socialRowsMarkup([{label:'',url:''}])); $('[name="social-label"]',box.lastElementChild)?.focus(); } return; }
    if (removeSocial) { const row = removeSocial.closest('.social-editor-row'); const editor = $('#social-editor'); if (editor.children.length === 1) { $$('input',row).forEach(input => input.value = ''); } else row.remove(); return; }
    if (!event.target.closest('.profile-options-wrap')) {
      const options = $('#profile-options');
      if (options) { options.hidden = true; $('.profile-options-button')?.setAttribute('aria-expanded','false'); }
    }
    if (event.target.closest('[data-edit-account]')) { editingProfile = true; showAccount(); return; }
    if (event.target.closest('[data-cancel-edit]')) { editingProfile = false; showAccount(); return; }
    if (!event.target.closest('.profile-wrap')) closeProfile();
    if (!event.target.closest('.top')) { const nav = $('#nav'); nav.classList.remove('open'); $('[data-menu]').setAttribute('aria-expanded','false'); }
  });
  document.addEventListener('submit', async event => {
    if (event.target.id === 'signup-form') {
      event.preventDefault();
      const form = event.target, data = new FormData(form), password = data.get('password');
      if (password !== data.get('confirmPassword')) { setMessage('#auth-message','The passwords do not match.'); return; }
      const submit = $('button[type="submit"]',form); submit.disabled = true;
      try {
        const result = await api('/api/signup','POST',{username:data.get('username'),ownerSetupCode:data.get('ownerSetupCode'),password,profile:{}});
        currentUser = result.user; editingProfile = false; profilePreview(); showAccount(); toast(result.message);
      } catch (error) { setMessage('#auth-message',error.message); }
      finally { submit.disabled = false; }
    } else if (event.target.id === 'login-form') {
      event.preventDefault();
      const form = event.target, data = new FormData(form), submit = $('button[type="submit"]',form); submit.disabled = true;
      try { const result = await api('/api/login','POST',{username:data.get('username'),password:data.get('password')}); currentUser = result.user; profilePreview(); showAccount(); toast(`Welcome back, ${currentUser.username}.`); }
      catch (error) { setMessage('#auth-message',error.message); }
      finally { submit.disabled = false; }
    } else if (event.target.id === 'profile-form') {
      event.preventDefault();
      const form = event.target;
      const nextRealName = form.elements.realName.value.trim();
      if (!currentUser.realName && nextRealName && !window.confirm('Real name warning: after you save this name, it becomes permanent. Changing it later requires a WHO? ticket from the Shop. Save this real name?')) return;
      const submit = $('button[type="submit"]',form); submit.disabled = true;
      try { const result = await api('/api/profile','PUT',accountFromForm(form)); currentUser = result.user; editingProfile = false; profilePreview(); showAccount(); toast('Your profile has been saved.'); }
      catch (error) { setMessage('#profile-message',error.message); }
      finally { submit.disabled = false; }
    } else if (event.target.id === 'account-danger-form') {
      event.preventDefault();
      const form = event.target, data = new FormData(form), submit = $('#account-danger-submit');
      const action = form.dataset.action;
      submit.disabled = true;
      try {
        const endpoint = action === 'pause' ? '/api/account/pause' : '/api/account/delete';
        const result = await api(endpoint,'POST',{password:data.get('password'),confirmation:data.get('confirmation')});
        $('#account-danger-dialog').close();
        currentUser = null; editingProfile = false; profilePreview();
        history.replaceState({},'',`${location.pathname}?mode=login`);
        app.innerHTML = authView('login',result.message);
        setMessage('#auth-message',result.message,false);
      } catch (error) { setMessage('#danger-action-message',error.message); }
      finally { submit.disabled = false; }
    } else if (event.target.id === 'owner-claim-form') {
      event.preventDefault();
      const form = event.target, submit = $('button[type="submit"]',form); submit.disabled = true;
      try { const result = await api('/api/owner/claim','POST',{ownerSetupCode:form.elements.ownerSetupCode.value}); currentUser = result.user; profilePreview(); showAccount(); toast('Solaris Owner role claimed.'); }
      catch (error) { setMessage('#owner-claim-message',error.message); }
      finally { submit.disabled = false; }
    }
  });
  document.addEventListener('change', async event => {
    const assignment = event.target.closest('[data-team-assignment]');
    if (!assignment) return;
    assignment.disabled = true;
    try {
      await api('/api/admin/team-member','PUT',{accountId:assignment.dataset.accountId,teamKey:assignment.value});
      setMessage('#team-admin-message','Team connection saved.',false);
      await Promise.all([loadOwnerAccounts(),loadTeamMembers()]);
    } catch (error) { setMessage('#team-admin-message',error.message); await loadOwnerAccounts(); }
    finally { assignment.disabled = false; }
  });
  document.addEventListener('change', async event => {
    const input = event.target.closest('[data-image-input]');
    if (!input || !currentUser) return;
    const form = $('#profile-form');
    const file = input.files?.[0];
    input.value = '';
    if (!file || !form) return;
    const kind = input.dataset.imageInput;
    try {
      await openCrop(file,kind);
    } catch (error) {
      toast(error.message);
    }
  });
  document.addEventListener('input',event => {
    if (event.target.matches('[data-member-search]')) { updateMemberResults(); return; }
    if (event.target.matches('[data-project-search]')) {
      const query = event.target.value.trim().toLowerCase();
      let shown = 0;
      $$('[data-switch-project]').forEach(card => { card.hidden = !card.dataset.projectText.toLowerCase().includes(query); if (!card.hidden) shown++; });
      const empty = $('[data-project-empty]');
      if (empty) empty.hidden = shown > 0;
      return;
    }
    if (event.target.matches('[data-artwork-search]')) {
      const query = event.target.value.trim().toLowerCase();
      let shown = 0;
      $$('[data-switch-artwork]').forEach(card => { card.hidden = !card.dataset.artworkText.toLowerCase().includes(query); if (!card.hidden) shown++; });
      const empty = $('[data-artwork-empty]');
      if (empty) empty.hidden = shown > 0;
      return;
    }
    if (!cropSession) return;
    if (event.target.id === 'crop-zoom') { cropSession.zoom = Number(event.target.value); paintCrop(); }
    else if (event.target.id === 'crop-rotation') { cropSession.rotation = Number(event.target.value); paintCrop(); }
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    closeProfile();
    const options = $('#profile-options');
    if (options) { options.hidden = true; $('.profile-options-button')?.setAttribute('aria-expanded','false'); }
  });
  $('#dlg').addEventListener('click', event => { if (event.target === $('#dlg')) $('#dlg').close(); });
})();
