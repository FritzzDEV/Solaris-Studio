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
  const ROUTES = [['home','Home','index.html'],['list','List','list.html'],['members','Members','members.html'],['games','Games','games.html'],['updates','Updates','updates.html'],['arts','Arts','arts.html'],['groups','Groups','groups.html'],['download','Download','download.html'],['shop','Shop','shop.html']];
  const PRIMARY_ROLE_LABELS = {assistant:'Assistant','ai-assistant':'AI Assistant',developer:'Developer',member:'Member',visitor:'Visitor'};
  const PRIMARY_ROLE_EXPLANATIONS = {
    assistant:'Supports studio coordination and helps keep Solaris projects moving.',
    'ai-assistant':'An AI contributor that helps with Solaris Studio work under human direction.',
    developer:'Builds, tests, or maintains Solaris Studio projects.',
    owner:'Owns Solaris Studio and manages its team roles.'
  };
  const SECONDARY_ROLE_TAGS = ['Scripter','Coder','Modeler','Tester','Updater','Announcer','Debugger','App tester','Artist'];
  const EMPTY_FRIEND_CARD = {published:false,likes:'',dislikes:'',favoriteThing:'',lookingFor:'',personalityTags:[],aspectRatio:'1:1',backgroundImage:'',backgroundColor:'#fff8e9',backgroundOverlayColor:'#ffffff',backgroundOverlayOpacity:18,borderStyle:'solid',borderColor:'#dcae55',borderWidth:2,borderImage:'',titleColor:'#302344',textColor:'#302344',mutedTextColor:'#766b7d',tagTextColor:'#302344',buttonColor:'#3c315b',buttonOverlayColor:'#ffffff',buttonOverlayOpacity:0,buttonImage:'',buttonTextColor:'#ffffff',buttonBorderStyle:'solid',buttonBorderColor:'#3c315b',buttonBorderImage:'',effect:'glow'};
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const paragraphs = value => String(value || '').split(/\n\s*\n/).map(part => part.trim()).filter(Boolean).map(part => `<p>${esc(part)}</p>`).join('');
  const app = $('#app');
  const page = document.body.dataset.page || 'home';
  const titles = {home:'',list:'List',members:'Members',games:'Games',updates:'Updates',account:'Profile',arts:'Arts',groups:'Groups',download:'Download',shop:'Shop',project:'Project',artwork:'Artwork'};
  let currentUser = null;
  let memberProfiles = [];
  let firebaseSetupKnown = false;
  let firebaseEnabled = false;
  let firebaseMissingSettings = [];
  let firebasePublicConfig = null;
  let firebaseClientPromise = null;
  let firebaseClient = null;
  let firebaseSetupError = '';
  let isGuest = new URLSearchParams(location.search).get('guest') === '1';
  try {
    isGuest = isGuest || sessionStorage.getItem('solaris-guest') === '1';
    if (isGuest) sessionStorage.setItem('solaris-guest','1');
  } catch (_) {}
  let editingProfile = false;
  let editingFriendCard = false;
  let viewingPersonalInfo = false;
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
  const memberFilterOptions = ['Assistant','AI Assistant','Developer','Member',...SECONDARY_ROLE_TAGS,...DATA.games.map(game => game.name)];
  function tagsForMember(member) {
    return [...new Set([...(member.roles || []),...(member.projects || [])])];
  }
  function renderMemberFilters() {
    const bar = $('.member-filter-bar');
    if (!bar) return;
    const tags = [...new Set([...memberFilterOptions,...DATA.members.flatMap(member => tagsForMember(member))])];
    if (activeMemberTag !== 'All' && !tags.includes(activeMemberTag)) activeMemberTag = 'All';
    bar.innerHTML = `<button class="member-filter-chip" type="button" data-member-filter="All" aria-pressed="${activeMemberTag === 'All'}">All</button>${tags.map(tag => `<button class="member-filter-chip" type="button" data-member-filter="${esc(tag)}" aria-pressed="${activeMemberTag === tag}">${esc(tag)}</button>`).join('')}`;
  }
  function memberCard(member) {
    const tags = tagsForMember(member);
    const photo = member.id ? `<a class="member-avatar-link" href="account.html?user=${encodeURIComponent(member.id)}" aria-label="Open ${esc(member.online)}’s full profile">${avatar(member.online,'',member.avatarImage)}</a>` : avatar(member.online,'',member.avatarImage);
    return `<article class="member" data-member-card data-tags="${esc(tags.join('|'))}" data-search="${esc([member.online,member.real,...member.roles,...member.projects].join(' '))}">${photo}<div><h3>${esc(member.online)}</h3><p><strong>Real name:</strong> ${esc(member.real)}</p><div class="member-tags" aria-label="Member roles and projects">${tags.map(tag => `<span class="tag member-tag${DATA.games.some(game => game.name === tag) ? ' member-tag-project' : ''}">${esc(tag)}</span>`).join('')}</div>${member.id ? `<a class="member-profile-link" href="account.html?user=${encodeURIComponent(member.id)}">View profile <span aria-hidden="true">↗</span></a>` : ''}</div></article>`;
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
      if (page === 'list' && container) { container.innerHTML = DATA.members.map(memberCard).join(''); renderMemberFilters(); updateMemberResults(); }
      updateGlobalSearchResults();
      if (page === 'account' && currentUser && editingProfile) showAccount();
    } catch (_) {
      if (page === 'list' && container) { container.innerHTML = ''; setMessage('#member-load-message','Team profiles could not be loaded. Please refresh the page.'); }
    }
  }
  function normalizedFriendCard(value) {
    return {...EMPTY_FRIEND_CARD,...(value && typeof value === 'object' ? value : {}),personalityTags:Array.isArray(value?.personalityTags) ? value.personalityTags : []};
  }
  const friendCardRatios = ['1:1','2:3','3:2','4:5','5:4'];
  function colorWithOpacity(color, opacity) {
    const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color || '');
    if (!match) return `rgba(255,255,255,${Math.max(0,Math.min(1,Number(opacity) / 100 || 0))})`;
    return `rgba(${parseInt(match[1],16)},${parseInt(match[2],16)},${parseInt(match[3],16)},${Math.max(0,Math.min(1,Number(opacity) / 100 || 0))})`;
  }
  function friendCardStyle(card) {
    const ratio = friendCardRatios.includes(card.aspectRatio) ? card.aspectRatio.replace(':',' / ') : '1 / 1';
    return `--friend-ratio:${ratio};--friend-bg:${esc(card.backgroundColor)};--friend-stroke:${esc(card.borderColor)};--friend-stroke-style:${esc(card.borderStyle)};--friend-stroke-width:${Number(card.borderWidth) || 2}px;--friend-title-color:${esc(card.titleColor)};--friend-text-color:${esc(card.textColor)};--friend-muted-color:${esc(card.mutedTextColor)};--friend-tag-text-color:${esc(card.tagTextColor)};--friend-button-bg:${esc(card.buttonColor)};--friend-button-text:${esc(card.buttonTextColor)};--friend-button-stroke:${esc(card.buttonBorderColor)};--friend-button-stroke-style:${esc(card.buttonBorderStyle)}${card.borderImage ? `;--friend-border-image:url(&quot;${esc(card.borderImage)}&quot;);border:var(--friend-stroke-width) solid transparent;border-image-source:var(--friend-border-image);border-image-slice:28;border-image-width:1` : ''}${card.buttonBorderImage ? `;--friend-button-border-image:url(&quot;${esc(card.buttonBorderImage)}&quot;)` : ''}`;
  }
  function friendCardButtonStyle(card) {
    const image = card.buttonImage ? `;background-image:linear-gradient(${colorWithOpacity(card.buttonOverlayColor,card.buttonOverlayOpacity)},${colorWithOpacity(card.buttonOverlayColor,card.buttonOverlayOpacity)}),url(&quot;${esc(card.buttonImage)}&quot;)` : '';
    return `--friend-button-bg:${esc(card.buttonColor)};--friend-button-text:${esc(card.buttonTextColor)};--friend-button-stroke:${esc(card.buttonBorderColor)};--friend-button-stroke-style:${esc(card.buttonBorderStyle)}${card.buttonBorderImage ? `;--friend-button-border-image:url(&quot;${esc(card.buttonBorderImage)}&quot;);border:2px solid transparent;border-image-source:var(--friend-button-border-image);border-image-slice:28;border-image-width:1` : ''}${image}`;
  }
  function friendCardMarkup(member, full = false, editor = false, openAction = '') {
    const card = normalizedFriendCard(member.friendCard);
    const aspect = friendCardRatios.includes(card.aspectRatio) ? card.aspectRatio : '1:1';
    const effect = ['none','glow','lift','shine'].includes(card.effect) ? card.effect : 'glow';
    const image = card.backgroundImage ? `background-image:linear-gradient(${colorWithOpacity(card.backgroundOverlayColor,card.backgroundOverlayOpacity)},${colorWithOpacity(card.backgroundOverlayColor,card.backgroundOverlayOpacity)}),url(&quot;${esc(card.backgroundImage)}&quot;)` : '';
    const title = esc(member.username || 'Solaris Member');
    const profileAvatar = member.id && !editor ? `<a class="friend-card-profile-link" href="account.html?user=${encodeURIComponent(member.id)}" aria-label="Open ${title}’s full profile">${avatar(member.username,'friend-card-avatar',member.avatarImage)}</a>` : avatar(member.username,'friend-card-avatar',member.avatarImage);
    const tags = card.personalityTags.map(tag => `<span class="friend-personality-tag">${esc(tag)}</span>`).join('');
    const details = [
      ['What I like',card.likes],['What I dislike',card.dislikes],['My favorite thing',card.favoriteThing],['The kind of friend I’m looking for',card.lookingFor]
    ].map(([label,value]) => `<section class="friend-detail"><h3>${label}</h3><p>${esc(value || 'Not added yet.')}</p></section>`).join('');
    const searchData = !full && !editor ? esc([member.username,card.likes,card.dislikes,card.favoriteThing,card.lookingFor,...card.personalityTags].join(' ')) : '';
    const action = openAction === 'own' ? 'data-open-own-friend-card' : `data-open-friend-card="${esc(member.id || '')}"`;
    return `<article class="friend-card friend-card-effect-${effect}${full ? ' friend-card-full' : ' friend-card-preview'}" data-friend-aspect="${aspect}"${!full && !editor ? ` data-friend-member data-friend-search="${searchData}"` : ''} style="${friendCardStyle(card)};${image}" aria-label="${title} Friend-Card">
      <div class="friend-card-top">${profileAvatar}<div class="friend-card-name"><span class="section-eyebrow">SOLARIS MEMBER</span><h2>${title}</h2></div>${!full ? '<span class="friend-card-sun" aria-hidden="true">✦</span>' : ''}</div>
      ${full ? `<div class="friend-card-details">${details}</div>` : `<p class="friend-card-teaser">${esc(card.likes || card.favoriteThing || 'A little introduction is coming soon.')}</p>${card.favoriteThing ? `<p class="friend-card-favorite"><span>Favorite thing</span><strong>${esc(card.favoriteThing)}</strong></p>` : ''}`}
      ${tags ? `<div class="friend-personality-list" aria-label="Personality tags">${full ? tags : card.personalityTags.slice(0,4).map(tag => `<span class="friend-personality-tag">${esc(tag)}</span>`).join('')}${!full && card.personalityTags.length > 4 ? `<span class="friend-personality-more">+${card.personalityTags.length - 4}</span>` : ''}</div>` : !full ? '' : '<p class="friend-card-empty-tags">No personality tags added yet.</p>'}
      ${full ? `<button class="friend-card-open friend-card-custom-button" type="button"${editor ? ' disabled' : ` data-copy-member-link="${esc(member.id || '')}"`} style="${friendCardButtonStyle(card)}">${editor ? 'Preview button' : 'Copy profile link'}</button>` : `<button class="friend-card-open" type="button"${editor ? ' disabled' : action} style="${friendCardButtonStyle(card)}">Open Friend-Card</button>`}
    </article>`;
  }
  function friendCardAssetRow(title, field, value, supportsStk = false) {
    const thumb = value ? `<span class="friend-card-image-thumb" data-friend-card-thumb="${field}" style="background-image:url(&quot;${esc(value)}&quot;)"></span>` : `<span class="friend-card-image-thumb friend-card-image-empty" data-friend-card-thumb="${field}">No image selected</span>`;
    return `<div class="friend-card-asset-row" data-friend-card-asset-row="${field}"><div><strong>${title}</strong><small>${supportsStk ? 'Upload JPG, PNG, WebP, or a Solaris .stk stroke file.' : 'Upload a JPG, PNG, or WebP image.'} Images are resized before saving.</small></div>${thumb}<input type="file" accept="image/png,image/jpeg,image/webp${supportsStk ? ',.stk,application/json' : ''}" data-friend-card-image="${field}" hidden><input type="hidden" name="${field}" value="${esc(value)}"><div class="friend-card-asset-actions"><button class="btn btn-ghost btn-sm" type="button" data-choose-friend-card-image="${field}">Choose image</button><button class="btn btn-ghost btn-sm" type="button" data-remove-friend-card-image="${field}"${value ? '' : ' hidden'}>Remove</button>${supportsStk ? `<button class="btn btn-ghost btn-sm" type="button" data-export-stk="${field}"${value ? '' : ' disabled'}>Export .stk</button>` : ''}</div></div>`;
  }
  function friendColorControl(label, name, value) {
    return `<label class="friend-color-control"><span>${label}</span><span class="friend-color-picker"><input type="color" name="${name}" value="${esc(value)}" aria-label="${label} color"><output data-friend-color-output>${esc(value.toUpperCase())}</output></span></label>`;
  }
  function friendRangeControl(label, name, value) {
    return `<label class="friend-range-control"><span class="friend-range-heading">${label}<output data-friend-range-output>${Number(value)}%</output></span><input type="range" name="${name}" min="0" max="85" step="1" value="${esc(value)}"></label>`;
  }
  function friendCardEditorSection(user) {
    if (user.accountRole === 'owner' || user.primaryRole !== 'member') return '';
    const card = normalizedFriendCard(user.friendCard);
    const options = (values, selected, labels = values) => values.map((value,index) => `<option value="${esc(value)}"${value === selected ? ' selected' : ''}>${esc(labels[index] || value)}</option>`).join('');
    return `<form id="friend-card-form" class="friend-card-editor-form"><section class="account-panel account-panel-wide friend-card-editor"><div class="panel-heading"><div><h2>Edit Custom Friend-Card</h2><p>Design your member card, then save it privately or post it to the Members page. Preview and full view keep the same selected shape.</p></div></div>
      <div class="friend-card-editor-layout"><div class="friend-card-editor-fields">
        <label>What I like<textarea name="friendCardLikes" rows="3" maxlength="400" placeholder="Games, hobbies, music…">${esc(card.likes)}</textarea></label>
        <label>What I dislike<textarea name="friendCardDislikes" rows="3" maxlength="400" placeholder="Things you prefer to avoid…">${esc(card.dislikes)}</textarea></label>
        <label>My favorite thing<input name="friendCardFavoriteThing" maxlength="160" value="${esc(card.favoriteThing)}" placeholder="A favorite game, hobby, or topic"></label>
        <label>What kind of friend I’m looking for<textarea name="friendCardLookingFor" rows="3" maxlength="300" placeholder="Describe the kind of friend you hope to meet…">${esc(card.lookingFor)}</textarea></label>
        <label>Personality tags<input name="friendCardPersonalityTags" maxlength="580" value="${esc(card.personalityTags.join(', '))}" placeholder="Funny, cool, dependable, lazy…"><small>Separate tags with commas. Add up to 20.</small></label>
        <label>Card shape<select name="friendCardAspectRatio">${options(friendCardRatios,card.aspectRatio)}</select></label>
        ${friendCardAssetRow('Friend-Card background image','friendCardBackgroundImage',card.backgroundImage)}
        <div class="friend-design-grid"><h3>Friend-Card appearance</h3>${friendColorControl('Card background','friendCardBackgroundColor',card.backgroundColor)}${friendColorControl('Background image tint','friendCardBackgroundOverlayColor',card.backgroundOverlayColor)}${friendRangeControl('Tint strength','friendCardBackgroundOverlayOpacity',card.backgroundOverlayOpacity)}${friendColorControl('Title text','friendCardTitleColor',card.titleColor)}${friendColorControl('Main text','friendCardTextColor',card.textColor)}${friendColorControl('Muted text','friendCardMutedTextColor',card.mutedTextColor)}${friendColorControl('Tag text','friendCardTagTextColor',card.tagTextColor)}${friendColorControl('Card stroke','friendCardBorderColor',card.borderColor)}<label>Stroke design<select name="friendCardBorderStyle">${options(['solid','dashed','dotted','double','groove','ridge'],card.borderStyle,['Solid','Dashed','Dotted','Double','Groove','Ridge'])}</select></label><label>Stroke width<select name="friendCardBorderWidth">${options(['1','2','3','4','5','6','7','8'],String(card.borderWidth),['1 px','2 px','3 px','4 px','5 px','6 px','7 px','8 px'])}</select></label><label>Card effect<select name="friendCardEffect">${options(['none','glow','lift','shine'],card.effect,['None','Soft glow','Lift on hover','Shine'])}</select></label></div>
        ${friendCardAssetRow('Friend-Card stroke image','friendCardBorderImage',card.borderImage,true)}
        ${friendCardAssetRow('Button background image','friendCardButtonImage',card.buttonImage)}
        <div class="friend-design-grid friend-button-design"><h3>Open Friend-Card button</h3>${friendColorControl('Button background','friendCardButtonColor',card.buttonColor)}${friendColorControl('Button image tint','friendCardButtonOverlayColor',card.buttonOverlayColor)}${friendRangeControl('Tint strength','friendCardButtonOverlayOpacity',card.buttonOverlayOpacity)}${friendColorControl('Button text','friendCardButtonTextColor',card.buttonTextColor)}${friendColorControl('Button stroke','friendCardButtonBorderColor',card.buttonBorderColor)}<label>Button stroke design<select name="friendCardButtonBorderStyle">${options(['solid','dashed','dotted','double','groove','ridge'],card.buttonBorderStyle,['Solid','Dashed','Dotted','Double','Groove','Ridge'])}</select></label></div>
        ${friendCardAssetRow('Button stroke image','friendCardButtonBorderImage',card.buttonBorderImage,true)}
      </div><div class="friend-card-editor-preview"><span class="section-eyebrow">PREVIEW &amp; FULL VIEW</span><div class="friend-card-preview-pair"><div><small>Member page preview</small><div id="friend-card-live-preview">${friendCardMarkup({...user,friendCard:card},false,true)}</div></div><div><small>Full view</small><div id="friend-card-full-preview" class="friend-card-full-preview">${friendCardMarkup({...user,friendCard:card},true,true)}</div></div></div></div></div><div class="friend-card-publish-row"><div><strong>${card.published ? 'Your Friend-Card is posted.' : 'Your Friend-Card is private.'}</strong><p>${card.published ? 'Saving changes will update the card shown on the Members page.' : 'It will appear in Members only after you post it.'}</p></div><div class="friend-card-editor-actions"><button class="btn btn-ghost" type="button" data-save-friend-card>Save Friend-Card</button><button class="btn btn-primary" type="button" data-post-friend-card>${card.published ? 'Update posted Friend-Card' : 'Post custom friend card'}</button></div><p class="form-message" id="friend-card-post-message" role="status"></p></div></section><div class="actions editor-actions"><button class="btn btn-ghost" type="button" data-cancel-edit>Back to profile</button></div></form>`;
  }
  function friendCardFromForm(form) {
    if (!form?.elements.friendCardLikes) return null;
    const get = name => form.elements[name]?.value?.trim() || '';
    return {
      likes:get('friendCardLikes'),dislikes:get('friendCardDislikes'),favoriteThing:get('friendCardFavoriteThing'),lookingFor:get('friendCardLookingFor'),personalityTags:get('friendCardPersonalityTags').split(',').map(item => item.trim()).filter(Boolean),aspectRatio:get('friendCardAspectRatio'),backgroundImage:get('friendCardBackgroundImage'),backgroundColor:get('friendCardBackgroundColor'),backgroundOverlayColor:get('friendCardBackgroundOverlayColor'),backgroundOverlayOpacity:Number(get('friendCardBackgroundOverlayOpacity')),borderStyle:get('friendCardBorderStyle'),borderColor:get('friendCardBorderColor'),borderWidth:Number(get('friendCardBorderWidth')),borderImage:get('friendCardBorderImage'),titleColor:get('friendCardTitleColor'),textColor:get('friendCardTextColor'),mutedTextColor:get('friendCardMutedTextColor'),tagTextColor:get('friendCardTagTextColor'),
      buttonColor:get('friendCardButtonColor'),buttonOverlayColor:get('friendCardButtonOverlayColor'),buttonOverlayOpacity:Number(get('friendCardButtonOverlayOpacity')),buttonImage:get('friendCardButtonImage'),buttonTextColor:get('friendCardButtonTextColor'),buttonBorderStyle:get('friendCardButtonBorderStyle'),buttonBorderColor:get('friendCardButtonBorderColor'),buttonBorderImage:get('friendCardButtonBorderImage'),effect:get('friendCardEffect')
    };
  }
  function updateFriendCardEditorPreview() {
    const form = $('#friend-card-form');
    $$('[data-friend-color-output]').forEach(output => {
      const input = output.closest('.friend-color-control')?.querySelector('input[type="color"]');
      if (input) output.textContent = input.value.toUpperCase();
    });
    $$('[data-friend-range-output]').forEach(output => {
      const input = output.closest('.friend-range-control')?.querySelector('input[type="range"]');
      if (input) output.textContent = `${input.value}%`;
    });
    const preview = $('#friend-card-live-preview');
    const card = friendCardFromForm(form);
    if (preview && card && currentUser) preview.innerHTML = friendCardMarkup({...currentUser,friendCard:card},false,true);
    const fullPreview = $('#friend-card-full-preview');
    if (fullPreview && card && currentUser) fullPreview.innerHTML = friendCardMarkup({...currentUser,friendCard:card},true,true);
  }
  async function compressFriendCardImage(file) {
    if (!file || !/^image\/(?:jpeg|png|webp)$/.test(file.type)) throw new Error('Choose a JPG, PNG, or WebP image.');
    if (file.size > 12 * 1024 * 1024) throw new Error('Choose an image smaller than 12 MB.');
    if (typeof createImageBitmap !== 'function') throw new Error('Image editing is not supported in this browser.');
    const bitmap = await createImageBitmap(file);
    try {
      for (const scale of [1,.82,.66,.5,.38]) {
        const factor = Math.min(scale,1400/bitmap.width,1000/bitmap.height);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1,Math.round(bitmap.width*factor));
        canvas.height = Math.max(1,Math.round(bitmap.height*factor));
        const context = canvas.getContext('2d');
        if (!context) break;
        context.drawImage(bitmap,0,0,canvas.width,canvas.height);
        for (const quality of [.82,.68,.54,.42]) {
          const data = canvas.toDataURL('image/webp',quality);
          if (data.length <= 390_000 && /^data:image\/(?:webp|jpeg|png);base64,/.test(data)) return data;
        }
      }
    } finally { bitmap.close?.(); }
    throw new Error('This image could not be resized enough. Try a smaller image.');
  }
  async function readFriendCardAsset(file) {
    if (!file) throw new Error('Choose an image first.');
    if (file.name.toLowerCase().endsWith('.stk')) {
      if (file.size > 450_000) throw new Error('Choose a .stk file smaller than 450 KB.');
      const payload = JSON.parse(await file.text());
      const image = payload?.format === 'solaris-stroke-v1' ? payload.image : '';
      if (typeof image !== 'string' || !/^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(image) || image.length > 390_000) throw new Error('This .stk file is not a supported Solaris stroke asset.');
      return image;
    }
    return compressFriendCardImage(file);
  }
  function exportFriendCardStk(field) {
    const image = $('#friend-card-form')?.elements[field]?.value;
    if (!image) return;
    const blob = new Blob([JSON.stringify({format:'solaris-stroke-v1',image})],{type:'application/vnd.solaris.stroke+json'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${field.replace(/^friendCard/,'').replace(/Image$/,'').toLowerCase()}.stk`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href),1000);
  }
  async function saveFriendCardChanges(publish, button) {
    const friendCard = friendCardFromForm($('#friend-card-form'));
    if (!friendCard) return;
    button.disabled = true;
    try {
      const result = await api(publish ? '/api/member-friend-card/post' : '/api/member-friend-card/save',publish ? 'POST' : 'PUT',{friendCard});
      currentUser = result.user;
      profilePreview();
      const postButton = $('[data-post-friend-card]');
      const status = $('.friend-card-publish-row strong');
      const description = $('.friend-card-publish-row>div p');
      if (currentUser.friendCard?.published) {
        if (postButton) postButton.textContent = 'Update posted Friend-Card';
        if (status) status.textContent = 'Your Friend-Card is posted.';
        if (description) description.textContent = 'Saving changes will update the card shown on the Members page.';
      } else {
        if (status) status.textContent = 'Your Friend-Card is private.';
        if (description) description.textContent = 'It will appear in Members only after you post it.';
      }
      setMessage('#friend-card-post-message',result.message,false);
      if (currentUser.friendCard?.published) await loadMemberProfiles();
    } catch (error) { setMessage('#friend-card-post-message',error.message); }
    finally { button.disabled = false; }
  }
  function openFriendCardDialog(member) {
    let dialog = $('#friend-card-dialog');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'friend-card-dialog';
      dialog.className = 'friend-card-dialog';
      dialog.setAttribute('aria-label','Full Friend-Card');
      dialog.innerHTML = `<button class="friend-card-dialog-close" type="button" data-close-friend-card aria-label="Close Friend-Card">×</button><div id="friend-card-dialog-content"></div>`;
      dialog.addEventListener('click',event => { if (event.target === dialog) dialog.close(); });
      document.body.append(dialog);
    }
    $('#friend-card-dialog-content',dialog).innerHTML = friendCardMarkup(member,true);
    dialog.showModal();
  }
  async function loadMemberProfiles() {
    const grid = $('#member-card-grid');
    try {
      const result = await api('/api/members');
      memberProfiles = result.members || [];
      if (grid) {
        const postedCards = memberProfiles.filter(member => member.friendCard?.published === true);
        grid.innerHTML = postedCards.map(member => friendCardMarkup(member)).join('');
        filterFriendCards($('[data-friend-search]')?.value || '');
      }
      updateGlobalSearchResults();
    } catch (error) {
      if (grid) {
        grid.innerHTML = '';
        setMessage('#member-card-message',error.message || 'Member cards could not be loaded. Please refresh the page.');
      }
    }
  }
  function filterFriendCards(value) {
    const query = String(value || '').trim().toLowerCase();
    let shown = 0;
    $$('[data-friend-member]').forEach(card => { card.hidden = !card.dataset.friendSearch.toLowerCase().includes(query); if (!card.hidden) shown++; });
    const empty = $('#member-card-empty');
    if (empty) {
      empty.hidden = shown > 0;
      const postedCount = memberProfiles.filter(member => member.friendCard?.published === true).length;
      empty.textContent = postedCount ? 'No posted Friend-Cards match that search.' : 'No custom Friend-Cards have been posted yet.';
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
      if (isGuest) {
        button.innerHTML = avatar('Visitor','guest-avatar');
        button.setAttribute('aria-label','Open Visitor profile preview');
        popover.innerHTML = `<div class="profile-pop-hero guest-pop-hero"><div class="profile-pop-banner guest-pop-banner"><span>VISITOR</span></div><div class="profile-pop-head">${avatar('Visitor','guest-avatar')}<div class="profile-pop-identity"><strong>Visitor</strong><span class="profile-pop-bio">Browsing Solaris as a guest</span><span class="profile-role-chip">Visitor</span></div></div></div><a class="btn btn-primary profile-view" href="account.html?guest=1">View guest profile</a>`;
        return;
      }
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
        <div class="members" id="member-results"></div><p class="empty member-empty" id="member-no-results">Studio team profiles appear here when the Owner assigns Assistant, AI Assistant, or Developer roles.</p><p class="form-message" id="member-load-message" role="status"></p><div class="page-end"></div></div>`;
    },
    members() {
      return `<div class="wrap"><div class="page-head"><span class="section-eyebrow">MEET THE COMMUNITY</span><h1>Members</h1><p>Member accounts make a Friend-Card in their own style. Cards appear here only after the member chooses to post them. Studio roles have their own profiles on the List page.</p></div><section class="member-directory friend-directory" aria-label="Search member Friend-Cards"><label class="member-search-wrap"><span class="visually-hidden">Search member Friend-Cards</span><span class="member-search-icon" aria-hidden="true">⌕</span><input type="search" data-friend-search placeholder="Search posted cards…" autocomplete="off"></label></section><div class="friend-card-grid" id="member-card-grid"></div><p class="empty member-empty" id="member-card-empty">No custom Friend-Cards have been posted yet.</p><p class="form-message" id="member-card-message" role="status"></p><div class="page-end"></div></div>`;
    },
    games() { return `<div class="wrap"><div class="page-head"><h1>Games</h1><p>Solaris Studio is new, with one game in development and one planned for the future.</p></div><div class="grid">${DATA.games.map(projectCard).join('')}</div><div class="page-end"></div></div>`; },
    updates() { return `<div class="wrap"><div class="page-head"><h1>Updates</h1><p>News and development updates from Solaris Studio.</p></div><article class="update-card"><span class="section-eyebrow">DEVELOPMENT NOTE</span><h2>Gamma Frost production is slow</h2><p>Gamma Frost production is moving slowly because I’m currently the only person working on it. That means I can’t build every part of the game at once, so development will take time.</p><p>When Gamma Frost reaches early access, it will not yet be an MMORPG. The game will begin in a more limited form, and its larger online world will take longer to build. Thank you for your patience while I keep working on it.</p></article><div class="page-end"></div></div>`; },
    arts() { return `<div class="wrap"><div class="page-head"><h1>Arts</h1><p>Artwork and visuals from Solaris Studio projects.</p></div><div class="artwork-grid">${DATA.arts.map(artworkCard).join('')}</div><div class="page-end"></div></div>`; },
    groups() { return `<div class="wrap"><div class="page-head"><h1>Groups</h1><p>Join the Solaris Studio community and find our official group links here.</p></div><section class="group-intro"><span class="section-eyebrow">ABOUT OUR COMMUNITY</span><h2>Small team, big dreams.</h2><p>Solaris Studio is an early-stage game development community with two active developers. We make games to bring the things we dream of creating to life.</p></section><section class="account-panel groups-panel"><h2>Solaris communities</h2><a class="group-link" href="https://discord.gg/Wg6Y9Yc4JA" target="_blank" rel="noopener noreferrer"><span class="group-link-icon" aria-hidden="true">◉</span><span><strong>Solaris Studio Discord</strong><small>Join the community</small></span><span class="group-link-arrow" aria-hidden="true">↗</span></a></section><div class="page-end"></div></div>`; },
    download() { const downloadAccess = currentUser ? '<p class="download-access-note">Downloads will be available to signed-in members when the first extras are ready.</p>' : '<div class="download-guest-gate"><p>Guests can browse this page, but downloads require a Solaris account. No downloads are available yet.</p><a class="btn btn-ghost btn-sm" href="account.html?mode=login">Log in to access downloads</a></div>'; return `<div class="wrap"><div class="page-head"><h1>Download</h1><p>Extras and add-ons for Solaris Studio games.</p></div><section class="download-intro"><span class="section-eyebrow">PLUGINS · MODS · EXTRAS</span><h2>Make each game your own</h2><p>This page is a home for extras created for Solaris Studio games: character skins, add-ons, mods, plugins, modding apps, and other useful tools. These creations can give players new ways to personalize a game, try new ideas, and build on the experience. Game builds themselves will be shared on their own project detail pages; this page is for the tools and community-made additions around them.</p><p>There are no downloads available yet. As our games and their tools grow, we’ll add each extra here with details about its game, version, and use. We welcome creativity while asking everyone to use modifications thoughtfully: local servers on your own computer are supported, and public-server use is welcome when the modification is appropriate and safe.</p><h3>Why we support game modification tools</h3><ul class="download-reasons"><li><strong>Personalize your characters.</strong> Use skins and visual add-ons to make a character feel like your own.</li><li><strong>Explore more ways to play.</strong> Mods, plugins, and add-ons can introduce new ideas, features, and experiences to Solaris games.</li><li><strong>Celebrate creativity and hard work.</strong> Modding apps give players a way to experiment, make things, and share the care they put into their creations.</li></ul>${downloadAccess}</section><div class="download-categories"><section class="download-category"><h2>Plugins &amp; tools</h2><p>No plugins or tools are available yet.</p></section><section class="download-category"><h2>Mods &amp; add-ons</h2><p>No mods or add-ons are available yet.</p></section></div><div class="project-download-links"><h2>Game pages</h2>${DATA.games.map(game => `<a class="text-link" href="project.html?id=${encodeURIComponent(game.id)}">${esc(game.name)} project details <span aria-hidden="true">↗</span></a>`).join('')}</div><div class="page-end"></div></div>`; },
    shop() {
      const inventory = currentUser?.tickets || { namecard: 0, who: 0 };
      const ticketCard = (kind, title, summary, count) => `<article class="shop-ticket-card"><img class="shop-ticket-art" src="assets/${kind === 'namecard' ? 'namecard-ticket' : 'who-ticket'}.png" alt="${title} artwork"><div class="shop-ticket-copy"><span class="section-eyebrow">PROFILE TICKET</span><h2>${title}</h2><p>${summary}</p><span class="shop-ticket-count">${currentUser ? `In your inventory: <strong>${count}</strong>` : 'Sign in to view your inventory.'}</span></div>${currentUser ? `<button class="btn btn-primary" type="button" data-shop-ticket="${kind}">Get for free</button>` : '<a class="btn btn-primary" href="account.html?mode=signup">Sign up or log in</a>'}</article>`;
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
      const downloadMessage = !currentUser ? 'Game downloads require a signed-in Solaris account. No public build is available yet.' : game.status === 'In Development' ? 'There are no public game builds yet. Check back as development continues.' : 'This project is planned for the future and has no downloads yet.';
      return `<div class="project-page"><div class="project-banner project-banner-${esc(game.cover)}" role="img" aria-label="${esc(game.name)} project banner">${gameBannerImage(game)}<div class="project-banner-mark">${esc(game.name)}</div></div><div class="wrap project-layout"><main class="project-detail-main"><a class="project-back" href="games.html">← All projects</a><div class="project-heading">${projectIcon(game)}<div><div class="project-status-row">${badge(game.status)}${game.version ? `<span class="project-version">${esc(game.version)}</span>` : ''}</div><h1>${esc(game.name)}</h1><p class="project-subtitle">${esc(game.subtitle)} · ${esc(game.genre)}</p></div></div><section class="project-copy"><h2>About this project</h2><p>${esc(game.details)}</p><p>${esc(game.blurb)}</p></section>${worldIntro}${playerIntro}${releasePlan}<section class="project-copy project-extra"><h2>Downloads</h2><p>${esc(downloadMessage)}</p><a class="text-link" href="download.html">Browse plugins, mods, and extras <span aria-hidden="true">↗</span></a></section>${artworkSection}</main><aside class="project-switcher" aria-label="Solaris projects"><label class="project-search-wrap"><span class="project-search-icon" aria-hidden="true">⌕</span><span class="visually-hidden">Search other games</span><input type="search" data-project-search placeholder="Search other games…" autocomplete="off"></label><section class="project-selected-section"><span class="section-eyebrow">Selected Game</span>${currentProject}</section><div class="project-switch-divider"><span>Explore other games</span></div><div class="project-switch-list">${otherProjects}</div><p class="project-no-results" data-project-empty hidden>No other games match that search.</p></aside></div></div>`;
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
    ensureGlobalSearch();
  }
  function ensureGlobalSearch() {
    const slot = $('.top-in');
    const profile = slot?.querySelector('.profile-wrap');
    if (!slot || !profile || $('#global-search')) return;
    profile.insertAdjacentHTML('beforebegin',`<div class="global-search" id="global-search"><button class="global-search-toggle" type="button" data-global-search-toggle aria-label="Search games, artwork, members, and developers" aria-expanded="false" aria-controls="global-search-panel"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 5 5"></path></svg></button><section class="global-search-panel" id="global-search-panel" data-global-search-panel hidden><label class="global-search-input-wrap"><span class="visually-hidden">Search games, artwork, members, and developers</span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 5 5"></path></svg><input type="search" data-global-search-input placeholder="Search games, artwork, people…" autocomplete="off"></label><div class="global-search-results" data-global-search-results aria-live="polite"><p class="global-search-hint">Search across Solaris Studio.</p></div></section></div>`);
  }
  function closeGlobalSearch() {
    const panel = $('[data-global-search-panel]');
    const toggle = $('[data-global-search-toggle]');
    if (panel) panel.hidden = true;
    toggle?.setAttribute('aria-expanded','false');
  }
  function updateGlobalSearchResults() {
    const results = $('[data-global-search-results]');
    const input = $('[data-global-search-input]');
    if (!results || !input) return;
    const query = input.value.trim().toLowerCase();
    if (!query) { results.innerHTML = '<p class="global-search-hint">Search games, artwork, members, and developers.</p>'; return; }
    const matches = (items, textFor) => items.filter(item => textFor(item).toLowerCase().includes(query)).slice(0,5);
    const groups = [];
    const games = matches(DATA.games,game => [game.name,game.subtitle,game.genre,game.status,game.blurb,game.details].join(' '));
    if (games.length) groups.push(['Games',games.map(game => `<a class="global-search-result" href="project.html?id=${encodeURIComponent(game.id)}">${projectIcon(game,'global-search-thumb')}<span><strong>${esc(game.name)}</strong><small>${esc(game.status)}${game.subtitle ? ` · ${esc(game.subtitle)}` : ''}</small></span><span class="global-search-arrow" aria-hidden="true">↗</span></a>`).join('')]);
    const artworks = matches(DATA.arts,art => [art.title,art.type,art.mainTag,...art.tags].join(' '));
    if (artworks.length) groups.push(['Artworks',artworks.map(art => `<a class="global-search-result" href="${artworkHref(art)}"><span class="global-search-thumb"><img src="${esc(art.image)}" alt=""></span><span><strong>${esc(art.title)}</strong><small>${esc(art.mainTag)} · ${esc(art.type)}</small></span><span class="global-search-arrow" aria-hidden="true">↗</span></a>`).join('')]);
    const members = matches(memberProfiles,member => [member.username].join(' '));
    if (members.length) groups.push(['Members',members.map(member => `<a class="global-search-result" href="account.html?user=${encodeURIComponent(member.id)}">${avatar(member.username,'global-search-avatar',member.avatarImage)}<span><strong>${esc(member.username)}</strong><small>Member profile</small></span><span class="global-search-arrow" aria-hidden="true">↗</span></a>`).join('')]);
    const developers = matches(DATA.members,member => [member.online,member.real,member.primaryRole,...(member.roles || []),...(member.projects || [])].join(' '));
    if (developers.length) groups.push(['Developers & studio team',developers.map(member => `<a class="global-search-result" href="account.html?user=${encodeURIComponent(member.id)}">${avatar(member.online,'global-search-avatar',member.avatarImage)}<span><strong>${esc(member.online)}</strong><small>${esc(member.primaryRole || member.roles?.[0] || 'Studio profile')}${member.real ? ` · ${esc(member.real)}` : ''}</small></span><span class="global-search-arrow" aria-hidden="true">↗</span></a>`).join('')]);
    results.innerHTML = groups.length ? groups.map(([title,items]) => `<section class="global-search-group"><h2>${title}</h2>${items}</section>`).join('') : '<p class="global-search-hint">No matches found.</p>';
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
  async function loadFirebaseSettings() {
    try {
      const setup = await api('/api/firebase-config');
      firebaseSetupKnown = true;
      firebaseEnabled = setup.enabled === true;
      firebaseMissingSettings = Array.isArray(setup.missingSettings) ? setup.missingSettings : [];
      firebasePublicConfig = setup.config || null;
      return true;
    } catch (error) {
      firebaseSetupKnown = true;
      if (!firebasePublicConfig) firebaseEnabled = false;
      firebaseSetupError = error.message;
      return false;
    }
  }
  async function getFirebaseClient() {
    if (!firebaseEnabled || !firebasePublicConfig) throw new Error(firebaseSetupError || 'Firebase Authentication is not configured yet.');
    if (firebaseClient) return firebaseClient;
    if (!firebaseClientPromise) firebaseClientPromise = (async () => {
      const version = '12.19.0';
      const [appSdk, authSdk] = await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`)
      ]);
      const firebaseApp = appSdk.getApps().find(item => item.name === 'solaris-site') || appSdk.initializeApp(firebasePublicConfig, 'solaris-site');
      const auth = authSdk.getAuth(firebaseApp);
      await new Promise(resolve => {
        let unsubscribe = null;
        unsubscribe = authSdk.onAuthStateChanged(auth, () => { unsubscribe?.(); resolve(); });
      });
      firebaseClient = { app: firebaseApp, auth, sdk: authSdk };
      return firebaseClient;
    })().catch(error => {
      firebaseClientPromise = null;
      firebaseSetupError = `Firebase could not load: ${error.message}`;
      throw new Error(firebaseSetupError);
    });
    return firebaseClientPromise;
  }
  function readPendingSignup() {
    try { return JSON.parse(localStorage.getItem('solaris-pending-signup') || 'null'); } catch (_) { return null; }
  }
  async function finishFirebaseSignup(metadata, password = '') {
    const client = await getFirebaseClient();
    const user = client.auth.currentUser;
    if (!user || !user.emailVerified) throw new Error('Verify your email before finishing account setup.');
    const result = await api('/api/signup','POST',{
      username:metadata.username,
      password,
      idToken:await user.getIdToken(true),
      profile:{}
    });
    try { localStorage.removeItem('solaris-pending-signup'); } catch (_) {}
    currentUser = result.user;
    leaveGuestMode();
    editingProfile = false; editingFriendCard = false; viewingPersonalInfo = false;
    profilePreview();
    if (page === 'account') showAccount();
    else renderPage();
    toast(result.message || 'Your verified Solaris account is ready.');
  }
  async function resumePendingFirebaseSignup() {
    if (!firebaseEnabled || currentUser) return;
    const pending = readPendingSignup();
    if (!pending?.username) return;
    const client = await getFirebaseClient();
    const user = client.auth.currentUser;
    if (!user || (pending.email && user.email?.toLowerCase() !== pending.email.toLowerCase())) return;
    await user.reload();
    if (!user.emailVerified) return;
    try { await finishFirebaseSignup(pending); }
    catch (error) {
      if (page === 'account') { app.innerHTML = authView('signup',error.message); const form = $('#signup-form'); if (form) { form.elements.username.value = pending.username; form.elements.email.value = user.email || ''; } }
    }
  }
  async function finishFirebaseLogin(user, password) {
    await user.reload();
    if (!user.emailVerified) {
      try { await firebaseClient.sdk.sendEmailVerification(user,{url:`${location.origin}/account.html?mode=login`}); }
      catch (error) { if (error.code !== 'auth/too-many-requests') throw error; }
      throw new Error('Verify your email first. We sent another verification link if one was needed.');
    }
    const result = await api('/api/login','POST',{idToken:await user.getIdToken(true),password});
    currentUser = result.user;
    leaveGuestMode();
    editingProfile = false; editingFriendCard = false; viewingPersonalInfo = false;
    profilePreview();
    showAccount();
    toast(`Welcome back, ${currentUser.username}.`);
  }
  async function sendFirebasePasswordReset(email, target) {
    if (!email) throw new Error('Enter your email address first.');
    const client = await getFirebaseClient();
    await client.sdk.sendPasswordResetEmail(client.auth,email,{url:`${location.origin}/account.html?mode=login`});
    if (target) setMessage(target,'Password reset email sent. Check your inbox and spam folder.',false);
    else setMessage('#auth-message','Password reset email sent. Check your inbox and spam folder.',false);
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
    return `<section class="account-panel account-panel-wide owner-team-manager"><div class="panel-heading"><div><span class="section-eyebrow">OWNER CONTROLS</span><h2>Assign account roles</h2><p>Your account appears here for your own secondary role tags. Assign another account’s roles from their profile.</p></div></div><p class="form-message" id="team-admin-message" role="status"></p><div class="team-admin-list" id="team-admin-list"><p class="empty-inline">Loading your account…</p></div></section>`;
  }
  async function loadOwnerAccounts() {
    const list = $('#team-admin-list');
    if (!list) return;
    const account = currentUser?.accountRole === 'owner' ? currentUser : null;
    list.innerHTML = account ? `<div class="team-admin-row team-role-row team-role-row-owner" data-role-row data-account-id="${esc(account.id)}"><span class="team-admin-identity">${avatar(account.username,'team-admin-avatar',account.avatarImage)}<span><strong>${esc(account.username)}</strong><small>Your protected Owner account</small></span></span><strong class="profile-role-chip">Owner</strong><input type="hidden" data-primary-role value="owner"><label>My secondary role tags<input data-secondary-roles maxlength="640" value="${esc((account.secondaryRoles || []).join(', '))}" placeholder="Coder, Modeler, Tester…"><small>Separate roles with commas.</small></label><button class="btn btn-primary btn-sm" type="button" data-save-account-roles>Save my tags</button></div>` : '<p class="empty-inline">Your Owner account could not be loaded.</p>';
  }
  async function saveAccountRoles(button) {
    const row = button.closest('[data-role-row]');
    if (!row) return;
    button.disabled = true;
    try {
      const result = await api('/api/admin/account-roles','PUT',{
        accountId:row.dataset.accountId,
        primaryRole:$('[data-primary-role]',row).value,
        secondaryRoles:$('[data-secondary-roles]',row).value
      });
      if (currentUser?.id === result.account.id) currentUser.secondaryRoles = result.account.secondaryRoles;
      setMessage('#team-admin-message','Account roles saved.',false);
      await Promise.all([loadOwnerAccounts(),loadTeamMembers()]);
      if (currentUser?.id === result.account.id) {
        showAccount();
        setMessage('#team-admin-message','Account roles saved.',false);
      }
    } catch (error) { setMessage('#team-admin-message',error.message); }
    finally { button.disabled = false; }
  }
  function viewedUserRoleManager(user) {
    if (currentUser?.accountRole !== 'owner' || user.accountRole === 'owner') return '';
    const assignableRoles = [['assistant','Assistant'],['ai-assistant','AI Assistant'],['developer','Developer'],['member','Member']];
    const currentRole = PRIMARY_ROLE_LABELS[user.primaryRole] || 'Member';
    const secondaryHelp = user.primaryRole === 'member' ? 'Available when this account has a studio role.' : 'Separate staff roles with commas.';
    return `<section class="account-panel account-panel-wide profile-role-manager"><div class="panel-heading"><div><span class="section-eyebrow">OWNER CONTROLS</span><h2>Manage account roles</h2><p>Set this account’s primary studio role and optional secondary role tags. Visitor and Owner cannot be assigned.</p></div></div><div class="team-admin-row team-role-row profile-role-row" data-role-row data-account-id="${esc(user.id)}"><span class="team-admin-identity">${avatar(user.username,'profile-role-avatar',user.avatarImage)}<span><strong>${esc(user.username)}</strong><small>Current role: ${esc(currentRole)}</small></span></span><label>Primary role<select data-primary-role aria-label="Primary role for ${esc(user.username)}">${assignableRoles.map(([value,label]) => `<option value="${value}"${user.primaryRole === value ? ' selected' : ''}>${label}</option>`).join('')}</select></label><label>Secondary role tags<input data-secondary-roles maxlength="640" value="${esc((user.secondaryRoles || []).join(', '))}" placeholder="Scripter, Modeler, Tester…"${user.primaryRole === 'member' ? ' disabled' : ''}><small data-secondary-role-help>${secondaryHelp}</small></label><button class="btn btn-primary btn-sm" type="button" data-save-viewed-user-roles>Save role changes</button><p class="form-message profile-role-message" data-viewed-role-message role="status"></p></div></section>`;
  }
  async function saveViewedUserRoles(button) {
    const row = button.closest('[data-role-row]');
    if (!row) return;
    button.disabled = true;
    const status = $('[data-viewed-role-message]',row);
    try {
      await api('/api/admin/account-roles','PUT',{
        accountId:row.dataset.accountId,
        primaryRole:$('[data-primary-role]',row).value,
        secondaryRoles:$('[data-secondary-roles]',row).value
      });
      const result = await api(`/api/public-profile?id=${encodeURIComponent(row.dataset.accountId)}`);
      app.innerHTML = profileDashboard(result.user,false);
      toast('Account roles saved.');
      await loadTeamMembers();
      await loadMemberProfiles();
    } catch (error) {
      if (status) { status.textContent = error.message; status.classList.add('is-error'); }
      else toast(error.message);
    } finally { button.disabled = false; }
  }
  function dangerZone() {
    return `<section class="account-panel account-panel-wide danger-zone"><span class="danger-eyebrow">ACCOUNT MANAGEMENT</span><h2>Danger zone</h2><p>Pause your account for 30 days, or permanently delete it and its Solaris pause backups.</p><div class="danger-actions"><button class="danger-button danger-button-pause" type="button" data-account-action="pause"><strong>Pause account</strong><span>Hide your profile and block logins for 30 days.</span></button><button class="danger-button danger-button-delete" type="button" data-account-action="delete"><strong>Delete account</strong><span>Permanently remove your account and its Solaris backups.</span></button></div><p class="danger-retention-note">Deletion clears account data and pause backups held by Solaris. Git history and backups retained separately by the hosting or database provider follow their own retention policies.</p><div class="account-danger-footer"><button class="btn btn-ghost btn-sm" data-logout>Log out</button></div></section>`;
  }
  function dangerDialog() {
    return `<dialog class="account-danger-dialog" id="account-danger-dialog" aria-labelledby="account-danger-title"><div class="account-danger-dialog-inner"><button class="icon-btn danger-dialog-close" type="button" data-cancel-danger aria-label="Close confirmation">×</button><span class="danger-eyebrow">ACCOUNT MANAGEMENT</span><h2 id="account-danger-title">Confirm account action</h2><p id="account-danger-copy"></p><form id="account-danger-form"><label>Confirm your password<input name="password" type="password" required maxlength="200" autocomplete="current-password"></label><label>Type <strong id="account-danger-word"></strong> to confirm<input name="confirmation" required autocomplete="off"></label><p class="form-message" id="danger-action-message" role="status"></p><div class="danger-dialog-actions"><button class="btn btn-ghost" type="button" data-cancel-danger>Cancel</button><button class="btn btn-danger" id="account-danger-submit" type="submit">Confirm</button></div></form></div></dialog>`;
  }
  function accountSecurityPanel(user) {
    if (!firebaseSetupKnown) return '';
    if (!firebaseEnabled) {
      const missing = firebaseMissingSettings.length ? `<p>Render is missing: <strong>${esc(firebaseMissingSettings.join(', '))}</strong>.</p>` : '';
      return `<section class="account-panel account-panel-wide account-security-panel"><span class="section-eyebrow">SIGN-IN &amp; RECOVERY</span><h2>Email security</h2><p>Firebase Authentication has not been detected by the server. Follow the Firebase and Render setup steps in the README.</p>${missing}</section>`;
    }
    if (user.emailVerified && user.authEmail) return `<section class="account-panel account-panel-wide account-security-panel"><span class="section-eyebrow">SIGN-IN &amp; RECOVERY</span><h2>Email security</h2><p class="security-email"><strong>Verified email</strong><span>${esc(user.authEmail)}</span></p><p>Firebase manages your sign-in password. Send yourself a password reset email whenever you need one.</p><button class="btn btn-ghost btn-sm" type="button" data-password-reset data-reset-email="${esc(user.authEmail)}">Send password reset email</button><p class="form-message" data-security-message role="status"></p></section>`;
    return `<section class="account-panel account-panel-wide account-security-panel"><span class="section-eyebrow">SIGN-IN &amp; RECOVERY</span><h2>Connect a verified email</h2><p>Connect this Solaris profile to Firebase so you can verify your email and recover your password. This keeps your existing profile and username.</p><form id="link-email-form" class="security-link-form"><label>Email address<input name="email" type="email" required maxlength="254" autocomplete="email" value="${esc(user.authEmail || '')}"></label><label>Firebase password<input name="password" type="password" required minlength="10" maxlength="200" autocomplete="new-password" placeholder="At least 10 characters"></label><p class="form-message" id="link-email-message" role="status"></p><button class="btn btn-primary" type="submit">Connect email</button></form></section>`;
  }
  function profileDashboard(user, isOwn = false) {
    const favorites = favoritesFor(user);
    const favoriteCards = [['game',favorites.game],['developer',favorites.developer],['artwork',favorites.artwork]].map(([type,item]) => favoriteCard(type,item)).filter(Boolean);
    const installed = user.installedGames?.length ? user.installedGames.map(game => `<span class="tag">${esc(game)}</span>`).join('') : '<p class="empty-inline">No installed games added yet.</p>';
    const roleLabel = user.accountRole === 'owner' ? 'Solaris Owner' : (PRIMARY_ROLE_LABELS[user.primaryRole] || 'Member');
    const canEditFriendCard = user.accountRole !== 'owner' && user.primaryRole === 'member';
    const profileOptions = isOwn ? `<div class="profile-options-wrap"><button class="profile-options-button" type="button" data-profile-options aria-label="Profile options" aria-expanded="false" aria-controls="profile-options">⋮</button><div class="profile-options-menu" id="profile-options" hidden><button type="button" data-edit-account>Edit Profile</button><button type="button" data-view-personal-info>View Personal Profile Information</button>${canEditFriendCard ? '<button type="button" data-edit-friend-card>Edit Custom friend card</button>' : ''}</div></div>` : '';
    const admin = isOwn && user.accountRole === 'owner' ? ownerTeamManager() : '';
    const viewedRoleManager = !isOwn ? viewedUserRoleManager(user) : '';
    const roleKey = user.accountRole === 'owner' ? 'owner' : user.primaryRole;
    const profileRoles = ['owner','assistant','ai-assistant','developer'].includes(roleKey) ? `<section class="account-panel account-panel-wide profile-roles-panel"><h2>Roles</h2><div class="member-tags"><span class="tag member-tag">${roleKey === 'owner' ? 'Owner' : esc(PRIMARY_ROLE_LABELS[roleKey])}</span>${(user.secondaryRoles || []).map(tag => `<span class="tag member-tag">${esc(tag)}</span>`).join('')}</div><p>${esc(PRIMARY_ROLE_EXPLANATIONS[roleKey])}</p></section>` : '';
    const ownerClaim = isOwn && user.canClaimOwner ? `<section class="account-panel account-panel-wide owner-claim-panel"><span class="section-eyebrow">STUDIO SETUP</span><h2>Claim the Solaris Owner role</h2><p>Your signed-in username is reserved for the Owner account. Enter the one-time setup code configured on the Solaris server to manage registered account roles.</p><form id="owner-claim-form"><label>Owner setup code<input name="ownerSetupCode" type="password" maxlength="200" autocomplete="off" required></label><p class="form-message" id="owner-claim-message" role="status"></p><button class="btn btn-primary" type="submit">Claim Owner role</button></form></section>` : '';
    const security = isOwn ? accountSecurityPanel(user) : '';
    const ownFriendCard = isOwn && canEditFriendCard ? `<section class="account-panel account-panel-wide own-friend-card-panel"><div class="panel-heading"><div><h2>Your Custom Friend-Card</h2><p>This is your card preview. Open it to check the full layout and uploaded assets.</p></div><button class="btn btn-ghost btn-sm" type="button" data-edit-friend-card>Edit Friend-Card</button></div><div class="own-friend-card-preview">${friendCardMarkup(user,false,false,'own')}</div></section>` : '';
    return `<div class="wrap account-wrap">
      <section class="account-hero"><div class="account-banner ${bannerRatioClass(user.bannerRatio)}">${bannerImage(user.bannerImage)}</div>
        ${profileOptions}<div class="account-hero-row">${avatar(user.username,'avatar-large',user.avatarImage)}${noteControl(user.notes,'note-control-full')}<div class="account-hero-name"><h2>${esc(user.username)}</h2><p>${user.realName ? esc(user.realName) : 'Real name not shared'}${user.pronouns ? ` <span class="account-pronouns">· ${esc(user.pronouns)}</span>` : ''}</p><span class="profile-role-chip">${esc(roleLabel)}</span></div></div></section>
      <div class="account-grid">
        <section class="account-panel"><h2>About</h2><dl class="profile-facts"><dt>Username</dt><dd>${esc(user.username)}</dd><dt>Real name</dt><dd>${user.realName ? esc(user.realName) : 'Not shared'}</dd><dt>Pronouns</dt><dd>${user.pronouns ? esc(user.pronouns) : 'Not shared'}</dd></dl><h3>Bio</h3><p>${esc(user.bio || 'No bio added yet.')}</p></section>
        <section class="account-panel"><h2>Social accounts</h2>${socialsMarkup(user.socials)}</section>
        <section class="account-panel"><h2>Likes</h2><p>${esc(user.likes || 'No likes added yet.')}</p></section>
        <section class="account-panel"><h2>Dislikes</h2><p>${esc(user.dislikes || 'No dislikes added yet.')}</p></section>
        <section class="account-panel account-panel-wide"><h2>Favorites</h2>${favoriteCards.length ? `<div class="favorite-grid">${favoriteCards.join('')}</div>` : '<p class="empty-inline">No favorites added yet. Edit your profile to choose favorites.</p>'}</section>
        <section class="account-panel account-panel-wide"><h2>Installed games</h2><div class="tag-list">${installed}</div></section>${ownFriendCard}${profileRoles}${security}${admin}${viewedRoleManager}${ownerClaim}
      </div>${isOwn ? `<p class="account-footnote">Your profile is saved by the Solaris server. Real name and profile details are optional.</p>${dangerZone()}${dangerDialog()}` : ''}</div>`;
  }
  function personalInfoPage(user) {
    const email = user.authEmail || '';
    const verification = email ? (user.emailVerified ? 'Verified' : 'Not verified') : 'No email connected';
    const passwordRecovery = firebaseEnabled && email ? `<button class="btn btn-ghost btn-sm" type="button" data-password-reset data-reset-email="${esc(email)}">Send password reset email</button>` : '<p class="panel-help">Password recovery is available after Firebase email sign-in is connected.</p>';
    return `<div class="wrap account-wrap personal-info-page"><div class="page-head"><h1>Personal Profile Information</h1><p>Private account details are visible only to you.</p></div><div class="account-grid"><section class="account-panel account-panel-wide personal-info-security"><div><span class="section-eyebrow">SIGN-IN DETAILS</span><h2>Email and password</h2></div><dl class="profile-facts"><dt>Email address</dt><dd>${esc(email || 'Not connected')}</dd><dt>Email status</dt><dd>${verification}</dd><dt>Password</dt><dd><span class="password-masked" aria-label="Password hidden">••••••••••••</span><small>Passwords are stored as secure one-way hashes, so they cannot be viewed or revealed with a code.</small></dd><dt>Account ID</dt><dd>${esc(user.id || 'Unavailable')}</dd><dt>Solaris role</dt><dd>${esc(user.accountRole === 'owner' ? 'Owner' : (PRIMARY_ROLE_LABELS[user.primaryRole] || 'Member'))}</dd></dl>${passwordRecovery}<p class="form-message" data-security-message role="status"></p></section><form id="personal-info-form" class="account-panel account-panel-wide"><span class="section-eyebrow">PRIVATE CONTACT DETAILS</span><h2>Phone and secondary email</h2><p class="panel-help">These details stay private and are never shown on your public profile.</p><label>Phone number <span class="optional">optional</span><input name="phoneNumber" type="tel" maxlength="40" autocomplete="tel" value="${esc(user.personalInfo?.phoneNumber || '')}" placeholder="Add a phone number"></label><label>Secondary email <span class="optional">optional</span><input name="secondaryEmail" type="email" maxlength="254" autocomplete="email" value="${esc(user.personalInfo?.secondaryEmail || '')}" placeholder="Add a recovery or contact email"></label><p class="form-message" id="personal-info-message" role="status"></p><div class="actions"><button class="btn btn-primary" type="submit">Save personal information</button><button class="btn btn-ghost" type="button" data-cancel-edit>Back to profile</button></div></form></div></div>`;
  }
  function friendCardEditorPage(user) {
    return `<div class="wrap account-wrap"><div class="page-head"><h1>Custom Friend-Card</h1><p>Shape your card and style its background, strokes, button, and text.</p></div>${friendCardEditorSection(user)}</div>`;
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
    const firebaseReady = firebaseSetupKnown && firebaseEnabled;
    const emailField = `<label>Email address<input name="email" type="email" required maxlength="254" autocomplete="email" placeholder="you@example.com"></label>`;
    return `<div class="wrap account-wrap"><div class="page-head"><h1>Solaris account</h1><p>Create a member profile or log in to manage your account.</p></div>
      <section class="auth-card"><div class="auth-tabs" role="tablist" aria-label="Account access"><button type="button" role="tab" data-auth-mode="signup" aria-selected="${signupSelected}">Sign up</button><button type="button" role="tab" data-auth-mode="login" aria-selected="${!signupSelected}">Log in</button></div>
      <p class="form-message" id="auth-message" role="status">${esc(error)}</p>
      <form id="signup-form" class="form auth-form"${signupSelected ? '' : ' hidden'}><h2>Create your account</h2>${firebaseReady ? emailField : ''}<label>Username<input name="username" required minlength="3" maxlength="24" pattern="[A-Za-z0-9_.-]+( [A-Za-z0-9_.-]+)*" autocomplete="username" placeholder="3–24 characters; spaces allowed"></label>
      <label>Password<input name="password" type="password" required minlength="10" maxlength="200" autocomplete="new-password" placeholder="At least 10 characters"></label><label>Confirm password<input name="confirmPassword" type="password" required minlength="10" maxlength="200" autocomplete="new-password"></label><button class="btn btn-primary" type="submit">Create account</button></form>
      <form id="login-form" class="form auth-form"${!signupSelected ? '' : ' hidden'}><h2>Welcome back</h2>${firebaseReady ? emailField : '<label>Username<input name="username" required maxlength="24" autocomplete="username"></label>'}<label>Password<input name="password" type="password" required maxlength="200" autocomplete="current-password"></label>${firebaseReady ? '<button class="text-link auth-reset-link" type="button" data-reset-auth>Password forgotten? Send a reset email</button>' : ''}<button class="btn btn-primary" type="submit">Log in</button>${firebaseReady ? '<button class="btn btn-ghost guest-entry" type="button" data-legacy-login-toggle>Use an older Solaris username account</button>' : ''}</form>
      ${firebaseReady ? '<div id="legacy-login-panel" hidden><form id="legacy-login-form" class="form auth-form"><h2>Older Solaris account</h2><label>Username<input name="username" required maxlength="24" autocomplete="username"></label><label>Password<input name="password" type="password" required maxlength="200" autocomplete="current-password"></label><button class="btn btn-primary" type="submit">Log in to existing account</button><button class="btn btn-ghost guest-entry" type="button" data-legacy-login-toggle>Back to email sign-in</button></form></div>' : ''}
      ${signupSelected ? '<button class="btn btn-ghost guest-entry" type="button" data-view-guest>View site as guest</button>' : ''}
      <p class="auth-note">${firebaseReady ? 'A verified email is required. Firebase securely manages email verification and password recovery.' : firebaseSetupKnown && firebaseMissingSettings.length ? `Firebase setup is incomplete. Render is missing: ${esc(firebaseMissingSettings.join(', '))}.` : 'Email verification and password recovery become available after Firebase is configured. Until then, existing username accounts continue to work.'}</p></section></div>`;
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
      if (isGuest && !params.has('mode')) app.innerHTML = guestDashboard();
      else app.innerHTML = authView(mode === 'login' ? 'login' : 'signup');
    } else {
      app.innerHTML = editingFriendCard ? friendCardEditorPage(currentUser) : viewingPersonalInfo ? personalInfoPage(currentUser) : editingProfile ? profileEditor(currentUser) : profileDashboard(currentUser,true);
      if (!editingProfile && !editingFriendCard && !viewingPersonalInfo && currentUser.accountRole === 'owner') loadOwnerAccounts();
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
    const legacyPanel = $('#legacy-login-panel');
    if (legacyPanel) legacyPanel.hidden = true;
    $$('[data-auth-mode]').forEach(button => button.setAttribute('aria-selected',String(button.dataset.authMode === mode)));
    setMessage('#auth-message','',false);
  }
  function guestDashboard() {
    return `<div class="wrap account-wrap guest-account-wrap"><section class="account-hero guest-account-hero"><div class="account-banner banner-ratio-21-9 guest-account-banner"><span>VISITOR</span></div><div class="account-hero-row">${avatar('Visitor','avatar-large guest-avatar')}<div class="account-hero-name"><h2>Visitor</h2><span class="profile-role-chip">Visitor</span></div></div></section><section class="account-panel guest-gate-card"><h2>Wish to Log In and access downloads?</h2><p>Click here to fully log in to access downloads and others.</p><div class="actions"><a class="btn btn-primary" href="account.html?mode=login">Log In</a><a class="btn btn-ghost" href="account.html?mode=signup">Create an account</a></div></section></div>`;
  }
  function leaveGuestMode() {
    isGuest = false;
    try { sessionStorage.removeItem('solaris-guest'); } catch (_) {}
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
    try {
      await api('/api/logout','POST',{});
      if (firebaseEnabled) { try { const client = await getFirebaseClient(); await client.sdk.signOut(client.auth); } catch (_) {} }
      currentUser = null; leaveGuestMode(); editingProfile = false; editingFriendCard = false; viewingPersonalInfo = false; closeProfile(); profilePreview(); if (page === 'account') showAccount(); toast('You are logged out.');
    }
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
  loadMemberProfiles();
  Promise.all([api('/api/me'),loadFirebaseSettings()]).then(async ([result]) => {
    currentUser = result.user;
    if (currentUser) leaveGuestMode();
    profilePreview();
    if (page === 'account') showAccount();
    if (['shop','download','project'].includes(page)) renderPage();
    try { await resumePendingFirebaseSignup(); }
    catch (error) { if (page === 'account' && !currentUser) setMessage('#auth-message',error.message); }
  }).catch(error => {
    currentUser = null;
    profilePreview();
    if (page === 'account') app.innerHTML = isGuest && !new URLSearchParams(location.search).has('mode') ? guestDashboard() : authView('signup','Could not reach the account server. Start the site with node server.js and reload.');
  });

  document.addEventListener('click', async event => {
    const menuButton = event.target.closest('[data-menu]');
    const globalSearchToggle = event.target.closest('[data-global-search-toggle]');
    const themeButton = event.target.closest('[data-theme-toggle]');
    const profileButton = event.target.closest('#profile-button');
    const closeButton = event.target.closest('[data-close]');
    const gameButton = event.target.closest('[data-game]');
    const authMode = event.target.closest('[data-auth-mode]');
    const shopTicket = event.target.closest('[data-shop-ticket]');
    const guestEntry = event.target.closest('[data-view-guest]');
    const saveRoles = event.target.closest('[data-save-account-roles]');
    const saveViewedRoles = event.target.closest('[data-save-viewed-user-roles]');
    const postFriendCard = event.target.closest('[data-post-friend-card]');
    const saveFriendCard = event.target.closest('[data-save-friend-card]');
    const addSocial = event.target.closest('[data-add-social]');
    const removeSocial = event.target.closest('[data-remove-social]');
    const openFriendCard = event.target.closest('[data-open-friend-card]');
    const openOwnFriendCard = event.target.closest('[data-open-own-friend-card]');
    const closeFriendCard = event.target.closest('[data-close-friend-card]');
    const copyMemberLink = event.target.closest('[data-copy-member-link]');
    const chooseFriendCardImage = event.target.closest('[data-choose-friend-card-image]');
    const removeFriendCardImage = event.target.closest('[data-remove-friend-card-image]');
    const exportStk = event.target.closest('[data-export-stk]');
    const profileOptions = event.target.closest('[data-profile-options]');
    const accountAction = event.target.closest('[data-account-action]');
    const cancelDanger = event.target.closest('[data-cancel-danger]');
    const memberFilterButton = event.target.closest('[data-member-filter]');
    const openImage = event.target.closest('[data-open-image]');
    const cropCancel = event.target.closest('[data-crop-cancel]');
    const cropSave = event.target.closest('[data-crop-save]');
    const cropRatio = event.target.closest('[data-crop-ratio]');
    const cropRotate = event.target.closest('[data-crop-rotate]');
    const legacyLoginToggle = event.target.closest('[data-legacy-login-toggle]');
    const authPasswordReset = event.target.closest('[data-reset-auth]');
    const profilePasswordReset = event.target.closest('[data-password-reset]');
    if (menuButton) { closeGlobalSearch(); const nav = $('#nav'), open = nav.classList.toggle('open'); menuButton.setAttribute('aria-expanded',String(open)); return; }
    if (globalSearchToggle) {
      const panel = $('[data-global-search-panel]');
      const open = panel.hidden;
      panel.hidden = !open;
      globalSearchToggle.setAttribute('aria-expanded',String(open));
      if (open) $('[data-global-search-input]')?.focus();
      return;
    }
    if (themeButton) {
      closeGlobalSearch();
      const root = document.documentElement; const current = root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); const next = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme',next); try { localStorage.setItem('solaris-theme',next); } catch (_) {} return;
    }
    if (profileButton) { closeGlobalSearch(); const popover = $('#profile-popover'); if (!popover.hidden) closeProfile(); else { popover.hidden = false; profileButton.setAttribute('aria-expanded','true'); } return; }
    if (saveFriendCard) {
      await saveFriendCardChanges(false,saveFriendCard);
      return;
    }
    if (postFriendCard) { await saveFriendCardChanges(true,postFriendCard); return; }
    if (openFriendCard) {
      const member = memberProfiles.find(item => item.id === openFriendCard.dataset.openFriendCard);
      if (member) openFriendCardDialog(member);
      return;
    }
    if (openOwnFriendCard && currentUser) { openFriendCardDialog(currentUser); return; }
    if (closeFriendCard) { $('#friend-card-dialog')?.close(); return; }
    if (copyMemberLink) {
      const url = new URL(`account.html?user=${encodeURIComponent(copyMemberLink.dataset.copyMemberLink)}`,location.href).href;
      try { await navigator.clipboard.writeText(url); toast('Profile link copied.'); }
      catch (_) { window.prompt('Copy this profile link:',url); }
      return;
    }
    if (chooseFriendCardImage) {
      const field = chooseFriendCardImage.dataset.chooseFriendCardImage;
      $$('[data-friend-card-image]').find(input => input.dataset.friendCardImage === field)?.click();
      return;
    }
    if (removeFriendCardImage) {
      const field = removeFriendCardImage.dataset.removeFriendCardImage;
      const form = $('#friend-card-form');
      if (form?.elements[field]) form.elements[field].value = '';
      const row = removeFriendCardImage.closest('[data-friend-card-asset-row]');
      const thumb = $('[data-friend-card-thumb]',row);
      if (thumb) { thumb.className = 'friend-card-image-thumb friend-card-image-empty'; thumb.style.backgroundImage = ''; thumb.textContent = 'No image selected'; }
      removeFriendCardImage.hidden = true;
      $('[data-export-stk]',row)?.setAttribute('disabled','');
      updateFriendCardEditorPreview();
      return;
    }
    if (exportStk) { exportFriendCardStk(exportStk.dataset.exportStk); return; }
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
    if (guestEntry) {
      isGuest = true;
      try { sessionStorage.setItem('solaris-guest','1'); } catch (_) {}
      location.href = 'index.html?guest=1';
      return;
    }
    if (saveRoles) { saveAccountRoles(saveRoles); return; }
    if (saveViewedRoles) { saveViewedUserRoles(saveViewedRoles); return; }
    if (event.target.closest('[data-logout]')) { logout(); return; }
    if (closeButton) { $('#dlg').close(); return; }
    if (gameButton) { projectDialog(gameButton.dataset.game); return; }
    if (authMode) { toggleAuthMode(authMode.dataset.authMode); return; }
    if (legacyLoginToggle) { const panel = $('#legacy-login-panel'); if (panel) { panel.hidden = !panel.hidden; $('#login-form').hidden = !panel.hidden; } return; }
    if (authPasswordReset) { authPasswordReset.disabled = true; try { await sendFirebasePasswordReset($('#login-form [name="email"]')?.value.trim(),'#auth-message'); } catch (error) { setMessage('#auth-message',error.message); } finally { authPasswordReset.disabled = false; } return; }
    if (profilePasswordReset) { profilePasswordReset.disabled = true; try { await sendFirebasePasswordReset(profilePasswordReset.dataset.resetEmail,'[data-security-message]'); } catch (error) { setMessage('[data-security-message]',error.message); } finally { profilePasswordReset.disabled = false; } return; }
    if (addSocial) { const box = $('#social-editor'); if (box) { box.insertAdjacentHTML('beforeend',socialRowsMarkup([{label:'',url:''}])); $('[name="social-label"]',box.lastElementChild)?.focus(); } return; }
    if (removeSocial) { const row = removeSocial.closest('.social-editor-row'); const editor = $('#social-editor'); if (editor.children.length === 1) { $$('input',row).forEach(input => input.value = ''); } else row.remove(); return; }
    if (!event.target.closest('.profile-options-wrap')) {
      const options = $('#profile-options');
      if (options) { options.hidden = true; $('.profile-options-button')?.setAttribute('aria-expanded','false'); }
    }
    if (event.target.closest('[data-edit-account]')) { editingProfile = true; editingFriendCard = false; viewingPersonalInfo = false; showAccount(); return; }
    if (event.target.closest('[data-view-personal-info]')) { editingProfile = false; editingFriendCard = false; viewingPersonalInfo = true; showAccount(); return; }
    if (event.target.closest('[data-edit-friend-card]')) { editingProfile = false; viewingPersonalInfo = false; editingFriendCard = true; showAccount(); return; }
    if (event.target.closest('[data-cancel-edit]')) { editingProfile = false; editingFriendCard = false; viewingPersonalInfo = false; showAccount(); return; }
    if (!event.target.closest('.profile-wrap')) closeProfile();
    if (!event.target.closest('.global-search')) closeGlobalSearch();
    if (!event.target.closest('.top')) { const nav = $('#nav'); nav.classList.remove('open'); $('[data-menu]').setAttribute('aria-expanded','false'); }
  });
  document.addEventListener('submit', async event => {
    if (event.target.id === 'signup-form') {
      event.preventDefault();
      const form = event.target, data = new FormData(form), password = data.get('password');
      if (password !== data.get('confirmPassword')) { setMessage('#auth-message','The passwords do not match.'); return; }
      const submit = $('button[type="submit"]',form); submit.disabled = true;
      try {
        if (firebaseEnabled) {
          const email = String(data.get('email') || '').trim().toLowerCase();
          const client = await getFirebaseClient();
          let user = client.auth.currentUser;
          if (!user || user.email?.toLowerCase() !== email) {
            try { user = (await client.sdk.createUserWithEmailAndPassword(client.auth,email,password)).user; }
            catch (error) {
              if (error.code !== 'auth/email-already-in-use') throw error;
              user = (await client.sdk.signInWithEmailAndPassword(client.auth,email,password)).user;
            }
          }
          const pending = {username:data.get('username'),email};
          try { localStorage.setItem('solaris-pending-signup',JSON.stringify(pending)); } catch (_) {}
          await user.reload();
          if (!user.emailVerified) {
            await client.sdk.sendEmailVerification(user,{url:`${location.origin}/account.html?mode=login`});
            setMessage('#auth-message','Check your email and verify your address. This page can finish creating your Solaris account after you return.',false);
            return;
          }
          await finishFirebaseSignup(pending,password);
          return;
        }
        const result = await api('/api/signup','POST',{username:data.get('username'),password,profile:{}});
        currentUser = result.user; leaveGuestMode(); editingProfile = false; profilePreview(); showAccount(); toast(result.message);
      } catch (error) { setMessage('#auth-message',error.message); }
      finally { submit.disabled = false; }
    } else if (event.target.id === 'login-form') {
      event.preventDefault();
      const form = event.target, data = new FormData(form), submit = $('button[type="submit"]',form); submit.disabled = true;
      try {
        if (firebaseEnabled) {
          const client = await getFirebaseClient();
          const credential = await client.sdk.signInWithEmailAndPassword(client.auth,String(data.get('email') || '').trim(),data.get('password'));
          await finishFirebaseLogin(credential.user,data.get('password'));
        } else {
          const result = await api('/api/login','POST',{username:data.get('username'),password:data.get('password')}); currentUser = result.user; leaveGuestMode(); profilePreview(); showAccount(); toast(`Welcome back, ${currentUser.username}.`);
        }
      }
      catch (error) { setMessage('#auth-message',error.message); }
      finally { submit.disabled = false; }
    } else if (event.target.id === 'legacy-login-form') {
      event.preventDefault();
      const form = event.target, data = new FormData(form), submit = $('button[type="submit"]',form); submit.disabled = true;
      try { const result = await api('/api/login','POST',{username:data.get('username'),password:data.get('password')}); currentUser = result.user; leaveGuestMode(); profilePreview(); showAccount(); toast(`Welcome back, ${currentUser.username}.`); }
      catch (error) { setMessage('#auth-message',error.message); }
      finally { submit.disabled = false; }
    } else if (event.target.id === 'link-email-form') {
      event.preventDefault();
      const form = event.target, data = new FormData(form), submit = $('button[type="submit"]',form), email = String(data.get('email') || '').trim().toLowerCase(), password = data.get('password');
      submit.disabled = true;
      try {
        const client = await getFirebaseClient();
        let user = client.auth.currentUser;
        if (!user || user.email?.toLowerCase() !== email) {
          try { user = (await client.sdk.createUserWithEmailAndPassword(client.auth,email,password)).user; }
          catch (error) {
            if (error.code !== 'auth/email-already-in-use') throw error;
            user = (await client.sdk.signInWithEmailAndPassword(client.auth,email,password)).user;
          }
        } else await client.sdk.reauthenticateWithCredential(user,client.sdk.EmailAuthProvider.credential(email,password));
        await user.reload();
        if (!user.emailVerified) {
          await client.sdk.sendEmailVerification(user,{url:`${location.origin}/account.html?mode=login`});
          setMessage('#link-email-message','We sent a verification email. After verifying it, return to this profile and submit the same email and password again.',false);
          return;
        }
        const result = await api('/api/auth/link','POST',{idToken:await user.getIdToken(true),password});
        currentUser = result.user; profilePreview(); showAccount(); toast(result.message);
      } catch (error) { setMessage('#link-email-message',error.message); }
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
    } else if (event.target.id === 'personal-info-form') {
      event.preventDefault();
      const form = event.target, submit = $('button[type="submit"]',form);
      submit.disabled = true;
      try {
        const result = await api('/api/personal-info','PUT',{phoneNumber:form.elements.phoneNumber.value,secondaryEmail:form.elements.secondaryEmail.value});
        currentUser = result.user;
        setMessage('#personal-info-message',result.message,false);
        toast(result.message);
      } catch (error) { setMessage('#personal-info-message',error.message); }
      finally { submit.disabled = false; }
    } else if (event.target.id === 'account-danger-form') {
      event.preventDefault();
      const form = event.target, data = new FormData(form), submit = $('#account-danger-submit');
      const action = form.dataset.action;
      submit.disabled = true;
      try {
        const endpoint = action === 'pause' ? '/api/account/pause' : '/api/account/delete';
        const password = data.get('password');
        let authProof = {};
        if (currentUser?.emailVerified) {
          const client = await getFirebaseClient();
          const user = client.auth.currentUser;
          if (!user || user.email?.toLowerCase() !== currentUser.authEmail?.toLowerCase()) throw new Error('Please sign in with your verified email again before changing account status.');
          await client.sdk.reauthenticateWithCredential(user,client.sdk.EmailAuthProvider.credential(user.email,password));
          authProof.idToken = await user.getIdToken(true);
        }
        const result = await api(endpoint,'POST',{password,confirmation:data.get('confirmation'),...authProof});
        $('#account-danger-dialog').close();
        if (firebaseEnabled) { try { const client = await getFirebaseClient(); await client.sdk.signOut(client.auth); } catch (_) {} }
        currentUser = null; editingProfile = false; editingFriendCard = false; viewingPersonalInfo = false; profilePreview();
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
    const roleSelect = event.target.closest('select[data-primary-role]');
    if (roleSelect) {
      const row = roleSelect.closest('[data-role-row]');
      const secondaryRoles = row?.querySelector('[data-secondary-roles]');
      if (secondaryRoles) {
        secondaryRoles.disabled = roleSelect.value === 'member';
        if (secondaryRoles.disabled) secondaryRoles.value = '';
        const help = row.querySelector('[data-secondary-role-help]');
        if (help) help.textContent = secondaryRoles.disabled ? 'Available when this account has a studio role.' : 'Separate staff roles with commas.';
      }
      return;
    }
    if (event.target.closest('#profile-form') && event.target.name?.startsWith('friendCard')) { updateFriendCardEditorPreview(); return; }
    if (event.target.closest('#friend-card-form') && event.target.name?.startsWith('friendCard')) { updateFriendCardEditorPreview(); return; }
    const friendImage = event.target.closest('[data-friend-card-image]');
    if (friendImage && currentUser) {
      const file = friendImage.files?.[0];
      const field = friendImage.dataset.friendCardImage;
      friendImage.value = '';
      if (!file) return;
      try {
        const data = await readFriendCardAsset(file);
        const form = $('#friend-card-form');
        form.elements[field].value = data;
        const row = friendImage.closest('[data-friend-card-asset-row]');
        const thumb = $('[data-friend-card-thumb]',row);
        if (thumb) { thumb.className = 'friend-card-image-thumb'; thumb.style.backgroundImage = `url("${data}")`; thumb.textContent = ''; }
        $('[data-remove-friend-card-image]',row).hidden = false;
        const exportButton = $('[data-export-stk]',row);
        if (exportButton) exportButton.disabled = false;
        updateFriendCardEditorPreview();
      } catch (error) { toast(file.name.toLowerCase().endsWith('.stk') ? 'That .stk file is not valid. Use a Solaris Friend-Card stroke export.' : error.message); }
      return;
    }
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
    if (event.target.matches('[data-global-search-input]')) { updateGlobalSearchResults(); return; }
    if (event.target.matches('[data-friend-search]')) {
      filterFriendCards(event.target.value);
      return;
    }
    if (event.target.closest('#profile-form') && event.target.name?.startsWith('friendCard')) { updateFriendCardEditorPreview(); return; }
    if (event.target.closest('#friend-card-form') && event.target.name?.startsWith('friendCard')) { updateFriendCardEditorPreview(); return; }
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
    closeGlobalSearch();
    const options = $('#profile-options');
    if (options) { options.hidden = true; $('.profile-options-button')?.setAttribute('aria-expanded','false'); }
  });
  $('#dlg').addEventListener('click', event => { if (event.target === $('#dlg')) $('#dlg').close(); });
})();
