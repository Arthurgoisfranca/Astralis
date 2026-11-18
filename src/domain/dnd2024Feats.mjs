const physical = ['strength', 'dexterity'];
const mental = ['intelligence', 'wisdom', 'charisma'];
const all = [...physical, 'constitution', ...mental];

const origin = (label, summary, extra = {}) => ({ label, summary, category: 'origin', ...extra });
const general = (label, abilities, summary, extra = {}) => ({ label, abilities, summary, category: 'general', level: 4, limit: 20, ...extra });
const style = (label, summary) => ({ label, summary, category: 'style', requires: { style: true } });
const epic = (label, summary, extra = {}) => ({ label, summary, category: 'epic', level: 19, limit: 30, abilities: all, ...extra });

export const FEAT_CATEGORIES = { origin: 'Origem', general: 'Geral', style: 'Estilo de Luta', epic: 'Dádiva Épica' };
export const ELEMENTS = ['Ácido', 'Eletricidade', 'Frio', 'Fogo', 'Trovão'];
export const ENERGY = [...ELEMENTS, 'Necrótico', 'Psíquico', 'Radiante', 'Veneno'];

export const FEATS = {
  Alert: origin('Alerta', 'Some o bônus de proficiência à iniciativa. No início do combate, você pode trocar a iniciativa com um aliado voluntário que possa agir.'),
  Crafter: origin('Artifista', 'Aprenda três ferramentas de artesão, pague 20% a menos por itens comuns e improvise equipamento temporário no descanso longo.', { choices: 'craft' }),
  Healer: origin('Curandeiro', 'Gaste um uso do kit e um Dado de Vida da criatura para curá-la pelo resultado do dado mais seu bônus de proficiência. Você pode repetir resultados de 1 nos dados desse benefício e de magias de cura.'),
  Lucky: origin('Sortudo', 'Use Pontos de Sorte iguais ao seu bônus de proficiência para dar vantagem a um teste próprio ou desvantagem a um ataque contra você. Recupera os pontos no descanso longo.'),
  'Magic Initiate': origin('Iniciado em Magia', 'Escolha a lista de Clérigo, Druida ou Mago, dois truques e uma magia de 1º círculo com um uso livre por descanso longo. Pode repetir com outra lista.', { repeatable: true }),
  Musician: origin('Músico', 'Aprenda três instrumentos. Ao terminar um descanso, toque para conceder Inspiração Heroica a aliados em número igual ao seu bônus de proficiência.', { choices: 'music' }),
  'Savage Attacker': origin('Atacante Selvagem', 'Uma vez por turno, ao acertar com uma arma, role os dados de dano da arma duas vezes e escolha o conjunto que vai usar.'),
  Skilled: origin('Habilidoso', 'Escolha três proficiências em perícias ou ferramentas. Você pode adquirir este talento mais de uma vez.', { choices: 'skilled', repeatable: true }),
  'Tavern Brawler': origin('Valentão de Taverna', 'Golpes desarmados causam 1d4 mais Força e podem repetir resultados de 1. Você usa armas improvisadas com proficiência e pode empurrar um alvo uma vez por turno.'),
  Tough: origin('Vigoroso', 'Seu máximo de PV aumenta em 2 por nível, incluindo os níveis já adquiridos.'),

  'Ability Score Improvement': general('Aumento no Valor de Atributo', all, 'Aumente um atributo em 2 ou dois atributos em 1, respeitando o limite de 20.', { repeatable: true }),
  Actor: general('Ator', ['charisma'], 'Imite a voz de quem ouviu e tenha vantagem em Enganação ou Atuação ao se passar por alguém enquanto estiver disfarçado.', { requires: { scores: ['charisma'] } }),
  Athlete: general('Atleta', physical, 'Ganhe deslocamento de escalada, levante-se gastando menos movimento e reduza a corrida necessária para saltar.', { requires: { scores: physical } }),
  Charger: general('Agressor', physical, 'Corra mais longe ao Disparar. Depois de avançar em linha reta antes do acerto, acrescente dano ou empurre o alvo.', { requires: { scores: physical } }),
  Chef: general('Chef', ['constitution', 'wisdom'], 'Aprenda utensílios de cozinheiro. Prepare refeições que reforçam a cura em descanso curto e porções que dão PV temporários.', { tool: 'Utensílios de cozinheiro' }),
  'Crossbow Expert': general('Especialista em Besta', ['dexterity'], 'Ignore a recarga de bestas e a desvantagem por inimigos próximos. Some o modificador ao dano do ataque extra com uma besta leve.', { requires: { scores: ['dexterity'] } }),
  Crusher: general('Esmagador', ['strength', 'constitution'], 'Ao causar dano contundente, mova um alvo uma vez por turno. Um crítico contundente abre o alvo a ataques com vantagem.'),
  'Defensive Duelist': general('Duelista Defensivo', ['dexterity'], 'Com uma arma de acuidade, use a reação para somar a proficiência à CA contra ataques corpo a corpo até começar seu próximo turno.', { requires: { scores: ['dexterity'] } }),
  'Dual Wielder': general('Especialista Ambidestro', physical, 'Ao atacar com uma arma leve, amplie as opções para o ataque extra. Você pode sacar ou guardar duas armas quando poderia fazê-lo com uma.', { requires: { scores: physical } }),
  'Durable': general('Resistente', ['constitution'], 'Tenha vantagem nas salvaguardas contra morte e use uma ação bônus para gastar um Dado de Vida e se curar.'),
  'Elemental Adept': general('Adepto Elemental', mental, 'Para o elemento escolhido, suas magias ignoram resistência e você pode tratar 1 nos dados de dano como 2. Escolha um elemento novo a cada aquisição.', { requires: { magic: true }, choices: 'element', repeatable: true }),
  'Fey Touched': general('Tocado por Fadas', mental, 'Prepare Passo Nebuloso e uma magia de Adivinhação ou Encantamento de 1º círculo. Cada uma tem um uso livre por descanso longo.', { spells: 'fey' }),
  Grappler: general('Imobilizador', physical, 'Combine o dano e o agarrão de um golpe desarmado uma vez por turno. Ataque com vantagem quem você agarrou e mova alvos do seu tamanho ou menores sem custo extra.', { requires: { scores: physical } }),
  'Great Weapon Master': general('Mestre em Armas Grandes', ['strength'], 'Acertos com arma pesada na ação Atacar somam a proficiência ao dano. Um crítico ou derrotar um alvo com arma corpo a corpo pode liberar outro ataque.', { requires: { scores: ['strength'] } }),
  'Heavily Armored': general('Especialista em Armaduras Pesadas', ['strength', 'constitution'], 'Ganhe treinamento com armaduras pesadas.', { requires: { armor: 'medium' }, training: ['heavy'] }),
  'Heavy Armor Master': general('Mestre em Armaduras Pesadas', ['strength', 'constitution'], 'Vestindo armadura pesada, reduza em seu bônus de proficiência o dano físico causado por ataques.', { requires: { armor: 'heavy' } }),
  'Inspiring Leader': general('Líder Inspirador', ['wisdom', 'charisma'], 'Depois de um descanso, encoraje até seis aliados com PV temporários vinculados ao nível e ao modificador aumentado.', { requires: { scores: ['wisdom', 'charisma'] } }),
  'Keen Mind': general('Mente Aguçada', ['intelligence'], 'Melhore uma perícia de conhecimento e investigue com a ação Estudar como ação bônus.', { requires: { scores: ['intelligence'] }, choices: 'knowledge' }),
  'Lightly Armored': general('Especialista em Armaduras Leves', physical, 'Ganhe treinamento com armaduras leves e escudos.', { training: ['light', 'shield'] }),
  'Mage Slayer': general('Exterminador de Conjuradores', physical, 'Dificulte a concentração de quem você ferir. Uma vez por descanso, transforme uma falha de salvaguarda mental em sucesso.'),
  'Martial Weapon Training': general('Treinamento com Armas Marciais', physical, 'Ganhe proficiência com armas marciais.', { martial: true }),
  'Medium Armor Master': general('Mestre em Armaduras Médias', physical, 'Com Destreza 16 ou maior, o limite do modificador de Destreza da CA de armadura média sobe para +3.', { requires: { armor: 'medium' } }),
  'Moderately Armored': general('Especialista em Armaduras Médias', physical, 'Ganhe treinamento com armaduras médias.', { requires: { armor: 'light' }, training: ['medium'] }),
  'Mounted Combatant': general('Combatente Montado', [...physical, 'wisdom'], 'Tenha vantagem contra inimigos desmontados menores que a montaria e ajude a montaria a evitar ataques e certos efeitos.'),
  Observant: general('Analítico', ['intelligence', 'wisdom'], 'Melhore Intuição, Investigação ou Percepção e use Procurar como ação bônus.', { requires: { scores: ['intelligence', 'wisdom'] }, choices: 'observant' }),
  Piercer: general('Perfurador', physical, 'Repita um dado de dano perfurante por turno e acrescente um dado perfurante nos críticos.'),
  Poisoner: general('Envenenador', ['dexterity', 'intelligence'], 'Aprenda o kit de envenenador e prepare doses. O veneno aplicado dura até causar dano com o item ou até expirar e seus danos de veneno ignoram resistência.', { tool: 'Kit de envenenador' }),
  'Polearm Master': general('Mestre em Armas de Haste', physical, 'Use a outra ponta da arma para um ataque de ação bônus e reaja quando um inimigo entra no alcance de uma arma elegível.', { requires: { scores: physical } }),
  Resilient: general('Resiliente', all, 'Aumente um atributo sem proficiência de salvaguarda e ganhe essa proficiência.', { save: true }),
  'Ritual Caster': general('Conjurador Ritualista', mental, 'Prepare rituais de 1º círculo em número igual ao bônus de proficiência. Um ritual preparado pode ser acelerado uma vez por descanso longo.', { requires: { scores: mental }, spells: 'ritual' }),
  Sentinel: general('Sentinela', physical, 'Reaja quando um inimigo próximo desengajar ou atacar outro alvo. Seu ataque de oportunidade acertado reduz o deslocamento dele a zero naquele turno.', { requires: { scores: physical } }),
  'Shadow Touched': general('Tocado pelas Sombras', mental, 'Prepare Invisibilidade e uma magia de Ilusão ou Necromancia de 1º círculo. Cada uma tem um uso livre por descanso longo.', { spells: 'shadow' }),
  Sharpshooter: general('Mestre-Atirador', ['dexterity'], 'Ataques com armas à distância ignoram cobertura parcial e de três quartos e evitam penalidades de alcance longo e inimigos adjacentes.', { requires: { scores: ['dexterity'] } }),
  'Shield Master': general('Mestre em Escudos', ['strength'], 'Use o escudo para derrubar ou empurrar um alvo e proteja-se de certos efeitos de área com a reação.', { requires: { armor: 'shield' } }),
  'Skill Expert': general('Especialista em Perícia', all, 'Ganhe uma proficiência em perícia e uma especialização em perícia que você já domina.', { choices: 'expert' }),
  Skulker: general('Sorrateiro', ['dexterity'], 'Ganhe visão às cegas de curto alcance, vantagem para se esconder em combate e mantenha-se oculto após errar um ataque.', { requires: { scores: ['dexterity'] } }),
  Slasher: general('Talhador', physical, 'Dano cortante pode reduzir o deslocamento do alvo. Um crítico cortante prejudica os ataques dele.'),
  Speedy: general('Velocista', ['dexterity', 'constitution'], 'Ganhe 10 pés de deslocamento, atravesse terreno difícil ao Disparar e imponha desvantagem a ataques de oportunidade.', { requires: { scores: ['dexterity', 'constitution'] }, speed: 10 }),
  'Spell Sniper': general('Atirador Arcano', mental, 'Ataques com magia ignoram cobertura parcial e de três quartos. Melhore o alcance de magias elegíveis e ataque de perto sem a penalidade usual.', { requires: { magic: true } }),
  Telekinetic: general('Telecinético', mental, 'Use Mãos Mágicas invisíveis e empurre ou puxe uma criatura como ação bônus. Se já conhece o truque, o alcance e a distância máxima da mão aumentam.', { spells: 'telekinetic' }),
  Telepathic: general('Telepático', mental, 'Fale por telepatia com uma criatura visível e use Detectar Pensamentos com uma conjuração livre por descanso longo.', { spells: 'telepathic' }),
  'War Caster': general('Conjurador Bélico', mental, 'Tenha vantagem para manter concentração, faça gestos com as mãos ocupadas e lance uma magia elegível no lugar de um ataque de oportunidade.', { requires: { magic: true } }),
  'Weapon Master': general('Mestre das Armas', physical, 'Escolha a maestria de uma arma com a qual tenha proficiência. Pode trocar a escolha após um descanso longo.', { choices: 'mastery' }),

  Archery: style('Arquearia', 'Some +2 às jogadas de ataque com armas à distância.'),
  'Blind Fighting': style('Luta às Cegas', 'Ganhe visão às cegas com alcance de 10 pés.'),
  Defense: style('Defensivo', 'Some +1 à CA enquanto estiver usando armadura.'),
  Dueling: style('Duelismo', 'Some +2 ao dano de uma arma corpo a corpo empunhada com uma mão se você não empunhar outra arma.'),
  'Great Weapon Fighting': style('Combate com Armas Grandes', 'Trate 1 e 2 nos dados de dano como 3 ao usar uma arma corpo a corpo de duas mãos ou versátil com as duas mãos.'),
  Interception: style('Interceptação', 'Use sua reação para reduzir o dano de um ataque contra um aliado adjacente, se estiver empunhando arma ou escudo.'),
  Protection: style('Protetivo', 'Com escudo, use a reação para impor desvantagem a ataques contra um alvo adjacente enquanto a proteção se mantiver.'),
  'Thrown Weapon Fighting': style('Combate com Armas de Arremesso', 'Some +2 ao dano de um ataque à distância que acerte com arma de arremesso.'),
  'Two-Weapon Fighting': style('Combate com Duas Armas', 'Some o modificador de atributo ao dano do ataque adicional da propriedade Leve.'),
  'Unarmed Fighting': style('Combate Desarmado', 'Use d6 ou d8 no dano desarmado, conforme o equipamento empunhado, e pressione uma criatura agarrada no início do turno.'),

  'Boon of Combat Prowess': epic('Dádiva da Proeza em Combate', 'Transforme um ataque errado em acerto. O benefício volta no início do seu turno.'),
  'Boon of Dimensional Travel': epic('Dádiva da Viagem Dimensional', 'Após a ação Atacar ou Magia, teleporte-se até 30 pés para um espaço desocupado visível.'),
  'Boon of Energy Resistance': epic('Dádiva da Resistência à Energia', 'Resista a dois tipos de energia, que podem mudar no descanso longo, e reaja para redirecionar energia a outro alvo.', { choices: 'energy' }),
  'Boon of Fate': epic('Dádiva do Destino', 'Ajuste um teste d20 seu ou de uma criatura próxima em até 2d4. Recupere após rolar iniciativa ou descansar.'),
  'Boon of Fortitude': epic('Dádiva da Fortitude', 'Ganhe 40 PV máximos. Uma vez por turno, aumente a cura recebida com seu modificador de Constituição.', { hp: 40 }),
  'Boon of Irresistible Offense': epic('Dádiva do Ataque Irresistível', 'Dano físico ignora resistência. Em um 20 natural, some o valor do atributo aumentado ao dano.', { abilities: physical }),
  'Boon of Recovery': epic('Dádiva da Recuperação', 'Volte de 0 PV a metade do máximo uma vez por descanso longo e use uma reserva de dados para se curar.'),
  'Boon of Skill': epic('Dádiva da Proficiência em Perícia', 'Ganhe proficiência em todas as perícias e escolha uma que ainda não tenha especialização para aprimorar.', { choices: 'allSkills' }),
  'Boon of Speed': epic('Dádiva da Velocidade', 'Ganhe 30 pés de deslocamento. Desengaje como ação bônus e encerre a condição Agarrado ao fazê-lo.', { speed: 30 }),
  'Boon of Spell Recall': epic('Dádiva da Recordação de Magia', 'Ao gastar um espaço de 1º a 4º círculo, role 1d4. Se igualar o círculo, preserve o espaço.', { abilities: mental, requires: { spellcasting: true } }),
  'Boon of the Night Spirit': epic('Dádiva do Espírito da Noite', 'Em penumbra ou escuridão, fique invisível com ação bônus e resista a todos os danos, exceto psíquico e radiante.'),
  'Boon of Truesight': epic('Dádiva da Visão Verdadeira', 'Ganhe visão verdadeira com alcance de 60 pés.'),
};

const initiateLists = { Cleric: 'Clérigo', Druid: 'Druida', Wizard: 'Mago' };
export const ORIGIN_FEATS = Object.entries(FEATS).filter(([, feat]) => feat.category === 'origin').flatMap(([name]) =>
  name === 'Magic Initiate' ? Object.keys(initiateLists).map(list => `Magic Initiate (${list})`) : name);
const featKeys = [...Object.keys(FEATS).filter(name => name !== 'Magic Initiate'), ...ORIGIN_FEATS];
export const FEAT_OPTIONS = [...new Set(featKeys)];
export const STYLES = Object.keys(FEATS).filter(name => FEATS[name].category === 'style');
export function featInfo(name) {
  if (Object.hasOwn(FEATS, name)) return FEATS[name];
  const list = typeof name === 'string' ? /^Magic Initiate \((Cleric|Druid|Wizard)\)$/.exec(name)?.[1] : '';
  if (list) return { ...FEATS['Magic Initiate'], label: `Iniciado em Magia (${initiateLists[list]})`, repeatable: false, list: list.toLowerCase() };
  return null;
}
