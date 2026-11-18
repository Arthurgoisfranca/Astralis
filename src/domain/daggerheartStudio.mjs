import catalog from './daggerheartCatalog.json' with { type: 'json' };
import { daggerheart } from './diceEngines.mjs';
import { die } from './manualRules.mjs';
import { communityNotes } from './daggerheartHeritage.mjs';
import { VOID_CLASSES, VOID_DREAD, bloodHunterPdf, summonerPdf } from './daggerheartVoid.mjs';

export const DH_SYSTEM = 'Daggerheart';
export const DH_BUILD = 'daggerheartBuild';
export const DH_PLAY = 'daggerheartPlay';
export const DH_DETAILS = 'daggerheartDetails';
export const draftKey = id => `astralis:daggerheart:draft:${id}`;
export const CLASSES = catalog.classes;
export const ANCESTRIES = catalog.ancestries;
export const COMMUNITIES = Object.fromEntries(Object.entries(catalog.communities).map(([id, community]) => {
  const [description, benefit] = communityNotes[id];
  return [id, { ...community, description, benefit }];
}));
export const TRANSFORMATIONS = catalog.transformations;
export const TRAITS = {
  agility: ['Agilidade', 'Correr, saltar, manobrar'], strength: ['Força', 'Erguer, quebrar, agarrar'],
  finesse: ['Acuidade', 'Controlar, esconder, manipular'], instinct: ['Instinto', 'Perceber, sentir, navegar'],
  presence: ['Presença', 'Encantar, interpretar, enganar'], knowledge: ['Conhecimento', 'Recordar, analisar, entender'],
};
export const TRAIT_KEYS = Object.keys(TRAITS);
export const SOURCE = { core: 'Livro Básico', hope: 'Hope & Fear', void15: 'The Void v1.5 · julho de 2025',
  void4: 'The Void · Blood Hunter', void5: 'The Void · Summoner' };
export const DISTANCES = { Melee: 'Corpo a corpo', 'Very Close': 'Muito perto', Close: 'Perto', Far: 'Longe', 'Very Far': 'Muito longe' };
export const CARD_KINDS = { Spell: 'Magia', Ability: 'Habilidade', Grimoire: 'Grimório' };
const SRD_PDF = 'https://www.daggerheart.com/wp-content/uploads/2026/08/DH_SRD_2_2026_08_25.pdf';
export const CARDS = Object.fromEntries(Object.entries(catalog.cards).map(([id, [name, level, domain, kind, recall, page]]) =>
  [id, { id, name, level, domain, kind, recall, source: domain === 'Blood' ? 'void5' : domain === 'Dread' ? 'hope' : 'core',
    reference: `${domain === 'Blood' ? summonerPdf : SRD_PDF}#page=${page}` }]));
const publishedCards = Object.values(CARDS);
const playtestCards = publishedCards.map(card => VOID_DREAD[card.id] ?? card);
export const WEAPONS = Object.fromEntries(Object.entries(catalog.weapons).map(([id, [name, slot, tier, trait, range, faces, bonus, damage, hands, feature]]) =>
  [id, { id, name, slot, tier, trait, range, faces, bonus, damage, hands, feature }]));
export const ARMOR = Object.fromEntries(Object.entries(catalog.armor).map(([id, [name, tier, major, severe, score, feature]]) =>
  [id, { id, name, tier, major, severe, score, feature }]));
export const UNARMED = { id: 'unarmed', name: 'Ataque desarmado', trait: 'strength', range: 'Melee', faces: 4, bonus: 0, damage: 'phy' };
export const CONDITIONS = ['Vulnerável', 'Contido', 'Oculto'];
export const POTIONS = { health: 'Poção menor de vida', stress: 'Poção menor de vigor' };
export const KIT = ['Tocha', 'Corda de 15 m', 'Suprimentos básicos'];
export const CLASS_GEAR = {
  assassin: ['Lista com nomes riscados', 'Lâmina enferrujada com uma insígnia'], bard: ['Romance', 'Carta selada'],
  brawler: ['Bandagens de um mentor', 'Livro sobre seu passatempo secreto'], druid: ['Bolsa de pedras e ossos', 'Amuleto de um mentor'],
  guardian: ['Totem de um mentor', 'Chave secreta'], ranger: ['Troféu da primeira caça', 'Ovo aparentemente quebrado'],
  rogue: ['Estojo de falsificação', 'Gancho de escalada'], seraph: ['Oferendas', 'Símbolo de sua divindade'],
  sorcerer: ['Orbe sussurrante', 'Herança de família'], warlock: ['Escultura do patrono', 'Anel impossível de remover'],
  warrior: ['Retrato de alguém amado', 'Pedra de amolar'], witch: ['Mascote inofensivo', 'Pedra de vidência'],
  wizard: ['Livro por traduzir', 'Objeto aparentemente inútil'], 'blood-hunter': ['Diário de pesquisa', 'Lembrança de uma caçada'],
  summoner: ['Frasco com espírito inofensivo', 'Par de moedas misteriosas'],
};
export const CLASS_HINTS = {
  assassin: 'Explora a vulnerabilidade de alvos e usa posicionamento para preparar ataques.',
  bard: 'Fortalece aliados com inspiração, música ou palavras.',
  brawler: 'Combate de perto com golpes desarmados e técnicas corporais.',
  druid: 'Canaliza a natureza e assume formas de feras.',
  guardian: 'Absorve pressão em combate e protege o grupo.',
  ranger: 'Persegue alvos e luta com precisão ou ao lado de um companheiro.',
  rogue: 'Opera nas sombras e tira proveito de distrações e contatos.',
  seraph: 'Protege, cura e luta com poder divino.',
  sorcerer: 'Modela a própria magia para atacar ou adaptar efeitos.',
  warlock: 'Recebe poderes e favores de um patrono sobrenatural.',
  warrior: 'Exprime seu estilo de combate por meio de armas e treinamento marcial.',
  witch: 'Combina maldições, rituais e proteção por meio de talismãs ou ilusões.',
  wizard: 'Domina magia estudada, com foco acadêmico ou marcial.',
  'blood-hunter': 'Usa hemocraft para encantar armas e rastrear vestígios de violência.',
  summoner: 'Convoca entidades de outros planos para agir a seu lado.',
};
export const CARD_HINTS = {
  'dread-blighting-strike': 'Conjure contra um alvo Longe. No acerto, use d6+1 com Esperança ou d10+1 com Medo e reduza à metade o dano do próximo ataque bem-sucedido do alvo. Na falha, gaste Esperança ou marque Estresse.',
  'dread-umbral-veil': 'Uma vez por descanso, marque Estresse e ganhe fichas de sombra iguais ao Medo do mestre. Gaste fichas para dar −1 por ficha a um ataque contra você. Limpe as fichas no fim da cena.',
  'dread-voice-of-dread': 'Uma Conjuração bem-sucedida faz o alvo visível marcar Estresse e ficar temporariamente Contido.',
  'dread-hideous-retribution': 'Quando um alvo visível ferir um aliado Perto, faça uma reação de Conjuração. Se passar, marque Estresse para causar dano mágico de d6 com Proficiência.',
  'dread-siphon-essence': 'Uma vez por descanso longo, acerte uma Conjuração contra um alvo Muito Perto. Cause dano mágico de d12+4 com Proficiência e recupere tantos PV quanto o alvo marcar. Com Medo, some +1 à Proficiência.',
  'dread-shared-trauma': 'Uma vez por descanso, transfira uma quantidade de PV marcados entre duas criaturas voluntárias a alcance corpo a corpo.',
  'dread-terrify': 'Acerte uma Conjuração contra um alvo Perto para que ele marque 1d4 Estresse. Você pode fazê-lo recuar uma faixa de alcance. Com Medo, ele também fica temporariamente Vulnerável.',
  'dread-chains-of-affliction': 'Marque 2 Estresse para acorrentar temporariamente um alvo Perto. A criatura que sofrer dano dele marca 1 PV a menos. Só um alvo pode ficar acorrentado.',
  'dread-horror': 'Uma vez por cena, marque Estresse para invocar uma criatura que causa d8+1 de dano mágico com seu atributo de Conjuração contra um alvo Longe. Se ele marcar PV e falhar na reação de dificuldade 12, marca o mesmo número de Estresse.',
  'dread-dire-strike': 'Se seu ataque fizer o alvo marcar PV, você pode gastar 1 Esperança para que o mestre perca 1 Medo.',
  'dread-spectral-mist': 'Gaste 2 Esperança para tornar você e aliados Perto incorpóreos. Podem atravessar objetos e ignoram dano físico até agirem, atravessarem um objeto ou a cena acabar.',
  'dread-darkfire': 'Uma vez por cena, gaste Esperança para atingir um adversário Perto por ponto gasto. Cada alvo faz uma reação de dificuldade 15 para receber metade do dano mágico de d8+6 com seu atributo de Conjuração.',
  'dread-jump-scare': 'Marque Estresse após causar dano mágico para se teleportar até alcance corpo a corpo do alvo. Ele fica Vulnerável até marcar PV.',
  'dread-dread-touched': 'Com quatro cartas Dread ativas, marque 2 Estresse em um sucesso com Medo para impedir que o mestre ganhe Medo. Uma vez por descanso, some o Medo atual do mestre à sua ação.',
  'dread-wall-of-hunger': 'Passe em Conjuração de dificuldade 10 e gaste Esperança para traçar uma muralha entre dois pontos até Longe. Quem estiver nela ou a atravessar marca 2 Estresse.',
  'dread-dark-army': 'Uma vez por descanso longo, passe em Conjuração de dificuldade 14 para receber oito fichas. Cada ficha soma 1d8 ao dano causado Muito Perto ou reduz em 1d8 o dano recebido. O descanso limpa as fichas.',
  'dread-eldritch-flesh': 'Some +1 aos limiares por Estresse marcado. Quando rolar com Medo, você pode gastar 2 Esperança para recuperar um espaço de armadura.',
  'dread-damnation': 'Acerte Conjuração contra um alvo Longe e role 1d20 de dano mágico por Estresse marcado para esse efeito. Se derrotá-lo, adversários ao alcance Longe dele marcam Estresse.',
  'dread-savor-the-anguish': 'Limpe 1 Estresse quando um adversário Perto sofrer dano grave.',
  'dread-avatar-of-terror': 'Marque Estresse para assumir uma forma que soma 1d6 de dano por Medo do mestre. Ganhe Esperança quando ele gastar Medo para dar destaque a um adversário Muito Perto. Manter a forma em cada ação custa 1 Esperança.',
  'dread-invoke-torment': 'Cause o dobro de dano a alvos com todo o Estresse marcado. Ganhe 1 Esperança quando um adversário Perto cair nessas condições.',
  'sage-vicious-entangle': 'Raízes atingem e podem conter o alvo após uma conjuração bem-sucedida.',
  'sage-gifted-tracker': 'Use Esperança para seguir vestígios de uma criatura por meio de perguntas ao mestre.',
  'sage-nature-s-tongue': 'Permite se comunicar com seres e elementos da natureza.',
  'arcana-rune-ward': 'Encante um objeto pessoal para proteger seu portador contra dano.',
  'arcana-wall-walk': 'Gaste Esperança para permitir que uma criatura caminhe por paredes e tetos.',
  'arcana-unleash-chaos': 'Gaste fichas para canalizar magia bruta e ferir um alvo. Estresse pode repor essas fichas.',
  'blade-get-back-up': 'Marque 1 Estresse para reduzir a gravidade de um dano grave em uma faixa.',
  'blade-not-good-enough': 'Melhora jogadas de dano ao permitir trocar resultados baixos dos dados.',
  'blade-whirlwind': 'Após acertar um alvo muito perto, gaste Esperança para estender o ataque a outros alvos próximos por metade do dano.',
  'bone-deft-maneuvers': 'Gaste Estresse para se mover sem rolar. Se terminar junto de um adversário e atacá-lo, ganhe +1 no ataque.',
  'bone-i-see-it-coming': 'Marque Estresse ao ser atacado de longe e ganhe 1d4 de Evasão contra esse ataque.',
  'bone-untouchable': 'Some metade da Agilidade à Evasão.',
  'codex-book-of-ava': 'Grimório com um empurrão mágico, uma proteção de armadura e uma estaca de gelo.',
  'codex-book-of-illiat': 'Grimório para induzir sono, lançar projéteis mágicos e conversar por telepatia.',
  'codex-book-of-tyfar': 'Grimório com chamas em área, uma mão mágica e névoa espessa.',
  'grace-deft-deceiver': 'Gaste Esperança para ter vantagem na tentativa de convencer alguém de uma mentira.',
  'grace-enrapture': 'Cativa um alvo e mantém sua atenção em você por um período limitado.',
  'grace-inspirational-words': 'Use fichas que dependem da Presença para inspirar aliados e aliviar Estresse ou recuperar PV.',
  'midnight-pick-and-pull': 'Dá vantagem ao abrir fechaduras ou desarmar armadilhas comuns e ao roubar objetos.',
  'midnight-rain-of-blades': 'Projeta lâminas mágicas contra várias criaturas ao alcance.',
  'midnight-uncanny-disguise': 'Cria um disfarce ilusório para mudar sua aparência.',
  'splendor-bolt-beacon': 'Dispara luz que fere e revela um alvo, ajudando outros ataques a acertá-lo.',
  'splendor-mending-touch': 'Gaste Esperança para curar ou aliviar o Estresse de uma criatura tocada.',
  'splendor-reassurance': 'Uma vez por descanso, ofereça a um aliado a chance de refazer uma rolagem.',
  'valor-bare-bones': 'Permite usar o próprio corpo como defesa quando estiver sem armadura.',
  'valor-forceful-push': 'Um ataque que atinge também pode afastar o alvo.',
  'valor-i-am-your-shield': 'Use Estresse para receber um ataque no lugar de um aliado próximo.',
  'blood-blood-spike': 'Faça uma conjuração e gaste Esperança no acerto para causar dano mágico e marcar Estresse no alvo.',
  'blood-lifeblood-talisman': 'Marque 1 PV para criar um talismã. Seu portador pode destruí-lo para reduzir em duas faixas a gravidade de um dano grave ou maciço.',
  'blood-power-through-pain': 'Marque fichas ao perder PV. No acerto, gaste-as para acrescentar d6 ao dano.',
};
export const FEATURE_HINTS = {
  'Deadly Determination': 'Gaste 3 Esperança para limpar 2 Estresse.',
  'Make a Scene': 'Distraia um alvo próximo para reduzir a Dificuldade dele em 2.',
  'Square Up': 'Intimide um alvo próximo e deixe-o temporariamente Vulnerável.',
  Evolution: 'Assuma uma forma de fera sem marcar Estresse e melhore um dos atributos enquanto durar a forma.',
  'Frontline Tank': 'Gaste 3 Esperança para recuperar 2 espaços de armadura.',
  'Hold Them Off': 'Reaproveite um acerto com arma contra mais dois adversários que estejam ao alcance.',
  'Rogue’s Dodge': 'Ganhe +2 Evasão até sofrer um acerto ou até o próximo descanso.',
  'Life Support': 'Ajude um aliado próximo a limpar 1 PV marcado.',
  'Volatile Magic': 'Repita dados à sua escolha de uma rolagem de dano mágico.',
  'Patron’s Boon': 'Depois de falhar, faça uma nova rolagem com vantagem.',
  'No Mercy': 'Ganhe +1 nas jogadas de ataque até o próximo descanso.',
  'Not This Time': 'Force um adversário ao alcance a repetir a rolagem de ataque ou de dano.',
  'Blood Maledict': 'Force um adversário próximo a repetir com desvantagem um ataque que acertou.',
  'Aid of the Spirits': 'Distribua 2 Esperança entre outros personagens ao alcance e limpe 1 Estresse seu.',
  "Witch’s Charm": 'Gaste 3 Esperança para transformar uma falha de ação sua ou de um aliado próximo em sucesso com Medo.',
  Hex: 'Marque 1 Estresse para aplicar uma maldição temporária. A Dificuldade e o dano do alvo diminuem conforme seu patamar.',
  Commune: 'Uma vez por descanso longo, faça uma pergunta e role d6 conforme sua Conjuração. Escolha um resultado para receber uma pista.',
  'Herbal Remedies': 'Consumíveis de cura ou de alívio de Estresse recuperam 1 ponto a mais quando você ou um aliado os usa na cena.',
  'Enchanted Talisman': 'Uma vez por descanso, converta Esperança em fichas. Quem segura o talismã pode gastar uma ficha para marcar 1 PV a menos.',
  Fearless: 'Após rolar com Medo, você pode marcar 2 Estresse para trocar o resultado por Esperança.',
  'Dread Visage': 'Você tem vantagem para intimidar criaturas hostis.',
  'Found Family': 'Uma vez por descanso, gaste 1 Esperança para usar uma Experiência de um aliado.',
  'Crimson Rite': 'Marque 1 PV para encantar uma arma ativa até o fim do próximo descanso ou até usar o rito de novo. Seus acertos com ela somam 1d4 de dano mágico por patamar.',
  'Grim Psychometry': 'Passe em Conjuração de dificuldade 12 para inspecionar um local Muito Perto e ver a última criatura que cometeu violência ali. Tenha vantagem para rastreá-la ou lembrar informações sobre ela até o próximo descanso longo ou até usar a habilidade de novo.',
  'Summon Entity': 'Marque Estresse para convocar entidades em número igual ao patamar, até o limite total do seu nível. Trabalham Muito Perto e só exigem Conjuração quando a tarefa exigiria um teste. Um Espírito do Destino pode forçar um adversário Muito Perto a repetir um ataque bem-sucedido e desaparece em seguida.',
};

export const usesVoid = sources => typeof sources?.void15 === 'boolean' ? sources.void15 : Boolean(sources?.void4 || sources?.void5);
export function classInfo(build, id = build.classId) {
  if (!Object.hasOwn(CLASSES, id)) return undefined;
  const official = CLASSES[id];
  if (usesVoid(build.sources) && Object.hasOwn(VOID_CLASSES, id)) return { ...official, ...VOID_CLASSES[id], source: 'void15' };
  if (official.source === 'void4' || official.source === 'void5') return { ...official,
    reference: official.source === 'void4' ? bloodHunterPdf : summonerPdf };
  return official;
}
export const classGear = build => classInfo(build)?.gear ?? CLASS_GEAR[build.classId] ?? [];
export const hasClassGear = build => Boolean(build.gear.trim()) && (classGear(build).includes(build.gear) ||
  !VOID_CLASSES[build.classId]?.gear.includes(build.gear) && classInfo(build)?.source !== 'void15');
export const featureDescription = (info, name) => info?.descriptions?.[name] ?? FEATURE_HINTS[name];
export const domainCards = sources => usesVoid(sources) ? playtestCards : publishedCards;
export const cardInfo = (id, sources) => usesVoid(sources) && Object.hasOwn(VOID_DREAD, id) ? VOID_DREAD[id] : CARDS[id];
export const cardDescription = card => card.description ?? CARD_HINTS[card.id];
export function weaponInfoFor(build, id) {
  const weapon = WEAPONS[id];
  return id === 'primary-scepter' && build.classId === 'warlock' && usesVoid(build.sources)
    ? { ...weapon, damage: 'phy' } : weapon;
}

const has = (object, key) => Object.hasOwn(object, key);
const text = (value, max = 100) => typeof value === 'string' ? value.slice(0, max) : '';
const list = value => Array.isArray(value) ? value : [];
const inCatalog = (table, value) => has(table, value) ? value : '';
const unique = values => [...new Set(values)];
const from = (values, table, max = 30) => unique(list(values).filter(value => typeof value === 'string' && has(table, value))).slice(0, max);
export const integer = (value, min = 0, max = 99) => Math.min(max, Math.max(min, Math.trunc(Number(value) || 0)));
export const signed = n => n >= 0 ? `+${n}` : String(n);
export const tierFor = level => level < 2 ? 1 : level < 5 ? 2 : level < 8 ? 3 : 4;
export const tierEntry = level => [2, 5, 8].includes(level);
export const normalize = value => String(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
export const HOPE_MAX = 6;

export function parseJson(value) {
  try { return typeof value === 'string' ? JSON.parse(value) : value; }
  catch { return null; }
}

export function emptyBuild() {
  return { v: 1, level: 1, classId: '', subclass: '', traits: ['', '', '', ''], ancestry: '', mixed: '', mixedMode: false, community: '',
    transformation: '', primary: '', secondary: '', armor: '', potion: '', gear: '', cards: [], experiences: ['', ''],
    advances: [], sources: { hope: true, void15: false, void4: false, void5: false } };
}

const CATEGORIES = { hp: 'PV +1', stress: 'Estresse +1', evasion: 'Evasão +1', traits: 'Dois atributos +1',
  experience: 'Duas Experiências +1', card: 'Carta adicional', subclass: 'Carta de subclasse',
  proficiency: 'Proficiência +1 (2 escolhas)', multiclass: 'Multiclasse (2 escolhas)', combo: 'Aumentar dado de combo' };
export const ADVANCEMENTS = CATEGORIES;

export function readBuild(value) {
  const row = parseJson(value);
  if (row?.v !== 1) return emptyBuild();
  const classId = inCatalog(CLASSES, row.classId);
  const level = integer(row.level, 1, 10);
  const sources = { hope: row.sources?.hope !== false, void15: usesVoid(row.sources),
    void4: row.sources?.void4 === true, void5: row.sources?.void5 === true };
  return {
    ...emptyBuild(), level, classId, subclass: inCatalog(classInfo({ classId, sources })?.subclasses ?? {}, row.subclass),
    traits: Array.from({ length: 4 }, (_, i) => inCatalog(TRAITS, row.traits?.[i])),
    ancestry: inCatalog(ANCESTRIES, row.ancestry), mixed: inCatalog(ANCESTRIES, row.mixed), mixedMode: row.mixedMode === true || Boolean(row.mixed),
    community: inCatalog(COMMUNITIES, row.community), transformation: inCatalog(TRANSFORMATIONS, row.transformation),
    primary: inCatalog(WEAPONS, row.primary), secondary: inCatalog(WEAPONS, row.secondary), armor: inCatalog(ARMOR, row.armor),
    potion: inCatalog(POTIONS, row.potion), gear: text(row.gear), cards: from(row.cards, CARDS, 2),
    experiences: [text(row.experiences?.[0], 60), text(row.experiences?.[1], 60)],
    advances: Array.from({ length: level - 1 }, (_, i) => {
      const step = row.advances?.[i];
      return { card: inCatalog(CARDS, step?.card), exp: text(step?.exp, 60), choices: list(step?.choices).slice(0, 2).map(choice => ({
        kind: inCatalog(CATEGORIES, choice?.kind), tier: integer(choice?.tier, 2, 4),
        a: text(choice?.a, 60), b: text(choice?.b, 60), c: text(choice?.c, 60),
      })) };
    }),
    sources,
  };
}

export function readDetails(value) {
  const row = parseJson(value);
  const fields = ['pronouns', 'frame', 'focus', 'clothes', 'eyes', 'body', 'color', 'attitude', 'background1', 'background2', 'background3', 'connection1', 'connection2', 'connection3'];
  return Object.fromEntries(fields.map(key => [key, text(row?.[key], ['pronouns', 'frame', 'focus'].includes(key) ? 80 : 145)]));
}

export const canUseClass = (info, sources) => !!info && (info.source === 'core' ||
  (info.source === 'void15' ? usesVoid(sources) : sources?.[info.source] === true));
export const traitAllocation = ['+2', '+1', '+1', '−1'];
const traitValues = [2, 1, 1, -1];
export function baseTraits(build) {
  const initial = Object.fromEntries(TRAIT_KEYS.map(key => [key, 0]));
  build.traits.forEach((key, i) => { if (has(initial, key)) initial[key] = traitValues[i]; });
  return initial;
}
export function suggestedTraits(build) {
  const info = classInfo(build);
  if (info?.suggested) return info.suggested;
  if (build.classId === 'witch') return ['instinct', 'presence', 'knowledge', 'strength'];
  const cast = info?.subclasses[build.subclass]?.spellcast;
  const high = cast || (['warrior', 'guardian', 'brawler'].includes(build.classId) ? 'strength' : 'agility');
  return unique([high, 'agility', 'instinct', 'finesse', 'presence', 'knowledge', 'strength']).slice(0, 4);
}

export function availableCards(main, level, secondary = '', secondaryDomain = '', sources) {
  return domainCards(sources).filter(card => card.level <= level && (main?.domains.includes(card.domain) ||
    (secondary && card.domain === secondaryDomain && card.level <= Math.ceil(level / 2))));
}

const perTier = { traits: 3, hp: 2, stress: 2, experience: 1, card: 1, evasion: 1, subclass: 1, proficiency: 1, multiclass: 1, combo: 1 };
export function progression(build) {
  const main = classInfo(build);
  const traits = baseTraits(build), marked = new Set();
  const experiences = build.experiences.map(name => ({ name, bonus: 2 }));
  const starterCards = new Set(availableCards(main, 1, '', '', build.sources).map(card => card.id));
  const known = from(build.cards, CARDS, 2).filter(id => starterCards.has(id));
  const pending = {}, used = {};
  let hp = 0, stress = 0, evasion = 0, prof = 1, rank = 0, combo = 4, secondClass = '', secondDomain = '', secondSubclass = '';
  for (let level = 2; level <= build.level; level++) {
    const row = build.advances[level - 2] ?? {}, tier = tierFor(level);
    let missing = 0, picks = 0;
    if (tierEntry(level)) {
      prof++;
      if (tier >= 3) marked.clear();
      experiences.push({ name: row.exp ?? '', bonus: 2 });
      if (!row.exp?.trim()) missing++;
    }
    for (const choice of list(row.choices)) {
      const { kind, tier: slot, a, b, c } = choice;
      const cost = ['proficiency', 'multiclass'].includes(kind) ? 2 : 1;
      const key = `${slot}:${kind}`;
      if (!has(perTier, kind) || slot < 2 || slot > tier || picks + cost > 2 || (used[key] ?? 0) >= perTier[kind]) continue;
      if (slot === 2 && ['subclass', 'proficiency', 'multiclass'].includes(kind)) continue;
      if (kind === 'traits') {
        if (!has(traits, a) || !has(traits, b) || a === b || marked.has(a) || marked.has(b)) continue;
        [a, b].forEach(name => { traits[name]++; marked.add(name); });
      }
      if (kind === 'experience') {
        if (a === b || !experiences[a]?.name || !experiences[b]?.name) continue;
        experiences[a].bonus++;
        experiences[b].bonus++;
      }
      if (kind === 'card') {
        const options = availableCards(main, level, secondClass, secondDomain, build.sources);
        if (known.includes(a) || !options.some(card => card.id === a)) continue;
        known.push(a);
      }
      if (kind === 'subclass') {
        if (used[`${slot}:multiclass`] || rank >= (tier === 3 ? 1 : 2)) continue;
        rank++;
      }
      if (kind === 'multiclass') {
        const extra = classInfo(build, a);
        if (secondClass || used[`${slot}:subclass`] || a === build.classId || !canUseClass(extra, build.sources) ||
          !extra.domains.includes(b) || main?.domains.includes(b) || !has(extra.subclasses, c)) continue;
        secondClass = a;
        secondDomain = b;
        secondSubclass = c;
      }
      if (kind === 'hp') hp++;
      if (kind === 'stress') stress++;
      if (kind === 'evasion') evasion++;
      if (kind === 'proficiency') prof++;
      if (kind === 'combo') {
        if (build.classId !== 'brawler' || main.source !== 'void15') continue;
        combo += 2;
      }
      used[key] = (used[key] ?? 0) + 1;
      picks += cost;
    }
    const options = availableCards(main, level, secondClass, secondDomain, build.sources);
    if (row.card && !known.includes(row.card) && options.some(card => card.id === row.card)) known.push(row.card);
    else missing++;
    pending[level] = missing + 2 - picks;
  }
  return { traits, experiences, known, pending, hp, stress, evasion, proficiency: Math.min(6, prof), rank, combo, secondClass, secondDomain, secondSubclass };
}

export function builderStatus(build, name, details = {}) {
  const cls = classInfo(build), sub = cls?.subclasses[build.subclass], advance = progression(build);
  const primary = weaponInfoFor(build, build.primary), secondary = weaponInfoFor(build, build.secondary);
  const weaponLegal = weapon => weapon?.tier === 1 && (weapon.damage === 'phy' || sub?.spellcast);
  const weapons = weaponLegal(primary) && primary.slot === 'primary'
    ? primary.hands === 2 && !secondary || (primary.hands === 1 || build.classId === 'warrior') && weaponLegal(secondary) && secondary.slot === 'secondary' ? 2 : 1 : 0;
  const remaining = {
    subclass: Number(!sub), traits: 4 - new Set(build.traits.filter(Boolean)).size, weapons: 2 - weapons,
    armor: Number(ARMOR[build.armor]?.tier !== 1), inventory: Number(!build.potion) + Number(!hasClassGear(build)) +
      Number(build.classId === 'witch' && !details.focus?.trim()),
    cards: 2 - availableCards(cls, 1, '', '', build.sources).filter(card => build.cards.includes(card.id)).length,
  };
  return {
    remaining,
    stages: [Number(!name.trim()), canUseClass(cls, build.sources) ? Object.values(remaining).reduce((sum, count) => sum + count, 0) : 1,
      Number(!build.ancestry || build.ancestry === build.mixed || build.mixedMode && !build.mixed) + Number(!build.community),
      build.experiences.filter(value => !value.trim()).length + Number(build.experiences[0].trim() && normalize(build.experiences[0].trim()) === normalize(build.experiences[1].trim()) ? true : false),
      Object.values(advance.pending).reduce((sum, count) => sum + count, 0)],
  };
}

export function derive(build, play = {}) {
  const cls = classInfo(build), sub = cls?.subclasses[build.subclass], advance = progression(build);
  const extraClass = classInfo(build, advance.secondClass);
  const extra = extraClass?.subclasses[advance.secondSubclass];
  const spellcast = sub?.spellcast || extra?.spellcast || '';
  const armor = ARMOR[play.armor ?? build.armor], primary = weaponInfoFor(build, play.primary ?? build.primary);
  const secondary = weaponInfoFor(build, play.secondary ?? build.secondary);
  const traits = { ...advance.traits };
  const armorEffects = {
    Flexible: [1, '', 0], Cumbersome: [0, 'finesse', -1], Heavy: [-1, '', 0], Bulky: [-1, '', 0], 'Very Heavy': [-2, 'agility', -1],
  };
  const [bonusEvasion = 0, penaltyTrait, penalty = 0] = armorEffects[armor?.feature] ?? [];
  if (penaltyTrait) traits[penaltyTrait] += penalty;
  const activeWeapons = [primary, secondary].filter(Boolean);
  const sluggish = activeWeapons.filter(item => ['Heavy', 'Massive', 'Barrier'].includes(item.feature)).length;
  traits.finesse -= activeWeapons.filter(item => item.feature === 'Cumbersome').length;
  const shield = activeWeapons.filter(item => ['Protective', 'Barrier'].includes(item.feature))
    .reduce((sum, item) => sum + item.tier + (item.feature === 'Barrier' ? 1 : 0), 0);
  const enchant = armor?.feature === 'Enchanted' ? traits[spellcast] ?? 0 : 0;
  const padded = activeWeapons.filter(item => item.feature === 'Padded').reduce((sum, item) => sum + item.tier + 1, 0);
  const barefoot = !armor && play.cards?.includes('valor-bare-bones');
  const naked = barefoot ? [[9,19],[11,24],[13,31],[15,38]][tierFor(build.level) - 1] : [0, build.level];
  const major = Math.max(1, build.level + (armor?.major ?? naked[0]) + enchant + padded);
  const severe = Math.max(major, build.level + (armor?.severe ?? naked[1]) + enchant + padded);
  const ancestry = ANCESTRIES[build.ancestry], mixed = ANCESTRIES[build.mixed];
  const ancestryFeatures = mixed ? [ancestry?.features[0], mixed.features[1]].filter(Boolean) : ancestry?.features ?? [];
  const communityFeatures = COMMUNITIES[build.community]?.features ?? [];
  const voidBrawler = build.classId === 'brawler' && cls.source === 'void15';
  const bareBrawler = voidBrawler && !activeWeapons.length;
  const unarmed = bareBrawler ? { ...UNARMED, faces: build.subclass === 'juggernaut' ? 10 : 8, extraFaces: 6 } : UNARMED;
  const rugged = voidBrawler && build.subclass === 'juggernaut' && advance.rank >= 1;
  return { ...advance, cls, sub, extra, extraClass, spellcast, traits, armor, primary, secondary, unarmed,
    major, severe: severe + (rugged ? 3 : 0), ancestryFeatures, communityFeatures,
    evasion: Math.max(0, (cls?.evasion ?? 10) + advance.evasion + bonusEvasion - sluggish + Number(bareBrawler) + (play.uses?.includes('rogue-dodge') ? 2 : 0)),
    maxArmor: integer((armor?.score ?? (barefoot ? 3 + traits.strength : 0)) + shield, 0, 12),
    maxHP: integer((cls?.hp ?? 6) + advance.hp, 1, 12),
    maxStress: integer(6 + advance.stress + Number(ancestryFeatures.includes('High Stamina')), 1, 12) };
}

export function startingPlay(build) {
  const voidWarlock = build.classId === 'warlock' && usesVoid(build.sources);
  return { v: 1, hp: 0, stress: 0, hope: 2, usedArmor: 0, conditions: [], cards: progression(build).known.slice(0, 5),
    primary: build.primary, secondary: build.secondary, armor: build.armor,
    weapons: [build.primary, build.secondary].filter(Boolean), armors: [build.armor].filter(Boolean),
    items: [...KIT, POTIONS[build.potion], build.gear, build.community === 'wanderborne' ? 'Mochila nômade' : ''].filter(Boolean),
    gold: [1, 0, 0], uses: [], tokens: 0, shadows: 0, shorts: 0,
    ...(voidWarlock ? { favor: 3, patron: '', spheres: ['', ''] } : {}) };
}

export function readPlay(value, build) {
  const initial = startingPlay(build);
  const row = parseJson(value);
  if (row?.v !== 1) return initial;
  const weapons = from(row.weapons, WEAPONS, 20), armors = from(row.armors, ARMOR, 15);
  const derived = derive(build, row);
  const eligible = id => !!WEAPONS[id] && (weaponInfoFor(build, id).damage === 'phy' || !!derived.spellcast);
  const primary = weapons.includes(row.primary) && WEAPONS[row.primary].slot === 'primary' && eligible(row.primary) ? row.primary : '';
  const secondary = (WEAPONS[primary]?.hands !== 2 || build.classId === 'warrior') && weapons.includes(row.secondary) && WEAPONS[row.secondary].slot === 'secondary' && eligible(row.secondary) ? row.secondary : '';
  const armor = armors.includes(row.armor) ? row.armor : '';
  const stats = derive(build, { primary, secondary, armor });
  return { ...initial, primary, secondary, armor, weapons, armors, hp: integer(row.hp, 0, stats.maxHP),
    stress: integer(row.stress, 0, stats.maxStress), hope: integer(row.hope, 0, HOPE_MAX), usedArmor: integer(row.usedArmor, 0, 12),
    conditions: unique(list(row.conditions).filter(name => CONDITIONS.includes(name))),
    cards: unique(list(row.cards).filter(id => stats.known.includes(id))).slice(0, 5),
    items: list(row.items).map(value => text(value, 55)).filter(Boolean).slice(0, 16),
    gold: initial.gold.map((_, i) => integer(row.gold?.[i], 0, 99)),
    uses: unique(list(row.uses).map(value => text(value, 45)).filter(Boolean)).slice(0, 12),
    tokens: integer(row.tokens, 0, build.classId === 'witch' && usesVoid(build.sources) ? 1 : 6),
    shadows: integer(row.shadows, 0, 12), shorts: integer(row.shorts, 0, 3),
    ...(initial.favor != null ? { favor: integer(row.favor ?? initial.favor), patron: text(row.patron, 55),
      spheres: [text(row.spheres?.[0], 45), text(row.spheres?.[1], 45)] } : {}) };
}

export function damageTaken(amount, stats, mitigation = false, massive = false) {
  const raw = integer(amount, 0, 999);
  const severity = raw === 0 ? 0 : massive && raw >= stats.severe * 2 ? 4 : raw >= stats.severe ? 3 : raw >= stats.major ? 2 : 1;
  return Math.max(0, severity - Number(mitigation));
}

export function weaponDamage(weapon, proficiency, critical = false, random = Math.random) {
  const powerful = ['Massive', 'Powerful'].includes(weapon.feature);
  const dice = Array.from({ length: proficiency + Number(powerful) }, () => die(weapon.faces, random));
  const extra = weapon.extraFaces ? Array.from({ length: proficiency }, () => die(weapon.extraFaces, random)) : [];
  const total = dice.reduce((sum, value) => sum + value, weapon.bonus) - (powerful ? Math.min(...dice) : 0) +
    extra.reduce((sum, value) => sum + value, 0) + (critical ? (weapon.faces + (weapon.extraFaces ?? 0)) * proficiency : 0);
  return { dice: [...dice, ...extra], total, label: weapon.name, title: critical ? 'Dano crítico' : 'Dano',
    detail: `${proficiency}d${weapon.faces}${weapon.extraFaces ? `+${proficiency}d${weapon.extraFaces}` : ''}${signed(weapon.bonus)}` };
}

export function rollCombo(faces, random = Math.random) {
  const dice = [die(faces, random), die(faces, random)];
  while (dice.at(-1) >= dice.at(-2)) dice.push(die(faces, random));
  return dice;
}

export function duality({ title, trait = 0, bonus = 0, mode = 'normal', difficulty, reaction = false }, random = Math.random) {
  const edge = mode === 'normal' ? 0 : die(6, random) * (mode === 'advantage' ? 1 : -1);
  const result = daggerheart({ attribute: trait, bonus: bonus + edge, difficulty: difficulty ?? 0 }, random);
  const good = result.critical || difficulty === null ? result.critical || null : result.good;
  const outcome = result.critical ? 'Sucesso crítico' : reaction ? 'Reação' :
    `${good === null ? 'Resultado' : good ? 'Sucesso' : 'Falha'} com ${result.withHope ? 'Esperança' : 'Medo'}`;
  return { ...result, label: title, title: outcome, good, edge, reaction, difficulty, detail: `${signed(trait)} atributo · ${signed(bonus)} bônus${edge ? ` · ${signed(edge)} d6` : ''}` };
}

export function resolveDuality(play, roll, stats, convert = false) {
  if (roll.reaction || roll.confirmed) return play;
  if (convert && (roll.withHope || roll.critical || !stats.ancestryFeatures.includes('Fearless') || play.stress + 2 > stats.maxStress)) return null;
  return { ...play, hope: integer(play.hope + Number(roll.withHope || convert), 0, HOPE_MAX),
    stress: integer(play.stress + (convert ? 2 : 0) - Number(roll.critical), 0, stats.maxStress) };
}

export function readyCard(play, id, store = '', free = false, maxStress = 6, sources) {
  const card = cardInfo(id, sources);
  if (!card || play.cards.includes(id) || (play.cards.length >= 5 && !play.cards.includes(store))) return null;
  const cost = free ? 0 : card.recall;
  if (play.stress + cost > maxStress) return null;
  return { ...play, stress: play.stress + cost, cards: [...play.cards.filter(card => card !== store), id] };
}

export function rest(play, build, long, actions, random = Math.random) {
  if ((!long && play.shorts >= 3) || actions.length > 2) return null;
  const carriesTalisman = build.classId === 'witch' && build.subclass === 'hedge' && usesVoid(build.sources);
  const next = { ...play, shorts: long ? 0 : play.shorts + 1, tokens: carriesTalisman ? play.tokens : 0, shadows: 0,
    uses: long ? [] : play.uses.filter(key => key === 'commune') };
  if (next.favor != null && actions.includes('tithe')) {
    next.favor = integer(next.favor + Math.max(0, progression(build).traits.presence));
  }
  for (const move of actions) {
    if (move === 'prepare' || move === 'together') next.hope = integer(next.hope + (move === 'together' ? 2 : 1), 0, HOPE_MAX);
    else if (['hp', 'stress', 'usedArmor'].includes(move)) next[move] = long ? 0 : Math.max(0, next[move] - tierFor(build.level) - die(4, random));
  }
  if (build.community === 'frostborne') next.hp = Math.max(0, next.hp - 1);
  return next;
}

export function storeStats(stats, build, play, details) {
  const current = derive(build, play);
  const saved = { [DH_BUILD]: JSON.stringify(build), [DH_PLAY]: JSON.stringify(play), [DH_DETAILS]: JSON.stringify(details) };
  if (Object.values(saved).some(value => value.length > 2400)) throw Error('Uma seção da ficha de Daggerheart excede o limite de salvamento.');
  return { ...stats, ...saved, ...Object.fromEntries(Object.entries(current.traits).map(([key, value]) => [key, String(value)])),
    level: String(build.level), className: current.cls?.name ?? '', subclass: current.sub?.name ?? '', subclasses: current.sub?.name ?? '',
    ancestry: [ANCESTRIES[build.ancestry]?.name, ANCESTRIES[build.mixed]?.name].filter(Boolean).join(' / '),
    community: COMMUNITIES[build.community]?.name ?? '', evasion: String(current.evasion), ac: String(current.evasion),
    hp: `${play.hp}/${current.maxHP}`, stress: `${play.stress}/${current.maxStress}`, hope: `${play.hope}/6`,
    armor: `${Math.max(0, current.maxArmor - play.usedArmor)}/${current.maxArmor}`, minor: '1', major: String(current.major), severe: String(current.severe),
    experiences: current.experiences.map(row => `${row.name} ${signed(row.bonus)}`).join('\n'),
    domains: [...(current.cls?.domains ?? []), current.secondDomain].filter(Boolean).join('\n'),
    domainCardsActive: play.cards.map(id => cardInfo(id, build.sources)?.name).filter(Boolean).join('\n'),
    domainCardsStored: current.known.filter(id => !play.cards.includes(id)).map(id => cardInfo(id, build.sources).name).join('\n'),
    inventory: [...play.items, ...play.weapons.map(id => WEAPONS[id].name), ...play.armors.map(id => ARMOR[id].name)].join('\n') };
}

export function demoGabriel() {
  const build = { ...emptyBuild(), classId: 'witch', subclass: 'hedge', traits: ['instinct', 'presence', 'knowledge', 'strength'],
    ancestry: 'infernis', community: 'reborne', primary: 'primary-casting-dagger', secondary: 'secondary-rune-shield', armor: 'mage-robes',
    potion: 'health', gear: 'Mascote inofensivo', cards: ['dread-blighting-strike', 'dread-umbral-veil'], experiences: ['Bruxo', 'Semideus'] };
  return { name: 'Gabriel', build, details: { ...readDetails(), pronouns: 'Ele/Dele', focus: 'Grimório' }, play: startingPlay(build) };
}
