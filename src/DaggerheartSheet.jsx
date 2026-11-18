import React, { useEffect, useRef, useState } from 'react';
import { Choice, Field, TraitBar, armorMeta, domainText, weaponInfo, weaponMeta } from './DaggerheartBuilder.jsx';
import {
  ANCESTRIES, ARMOR, COMMUNITIES, CONDITIONS, DISTANCES, HOPE_MAX, POTIONS, SOURCE,
  TRAITS, TRAIT_KEYS, TRANSFORMATIONS, WEAPONS, cardDescription, cardInfo, damageTaken, duality, featureDescription,
  integer, readyCard, resolveDuality, rest, rollCombo, signed, tierFor, weaponDamage, weaponInfoFor,
} from './domain/daggerheartStudio.mjs';
import { die } from './domain/manualRules.mjs';

const TABS = ['Cartas e habilidades', 'Equipamento', 'Detalhes', 'Diário'];
const DOWNTIME = [['hp', 'Cuidar das feridas'], ['stress', 'Aliviar Estresse'], ['usedArmor', 'Reparar armadura'],
  ['prepare', 'Preparar-se'], ['together', 'Preparar-se em grupo']];

function Meter({ label, count, total, set, kind }) {
  return <div className="dh-meter" data-kind={kind}>
    <div className="dh-between"><strong>{label}</strong><span>{count}/{total}</span></div>
    <div className="dh-meter-controls">
      <button type="button" onClick={() => set(count - 1)} disabled={count <= 0} aria-label={`Diminuir ${label}`}>−</button>
      <div className="dh-pips" aria-hidden="true">{Array.from({ length: total }, (_, index) =>
        <i key={index} data-marked={index < count}/>)}</div>
      <button type="button" onClick={() => set(count + 1)} disabled={count >= total} aria-label={`Aumentar ${label}`}>+</button>
    </div>
  </div>;
}

const topics = {
  'Ataque': 'Compare a ação ao valor de Evasão ou à Dificuldade indicada pelo mestre.',
  'Conjuração': 'Use o atributo indicado pela sua subclasse. A carta informa a Dificuldade ou o alvo.',
  'Esperança': 'Gaste 1 para usar uma Experiência relevante ou ajudar. Habilidades podem exigir outros custos.',
  'Medo': 'Quando o dado de Medo prevalece em uma ação, o mestre ganha 1 Medo.',
  'Crítico': 'Dados iguais dão sucesso em ações, rendem 1 Esperança e limpam 1 Estresse.',
};

function Help() {
  return <details className="dh-help"><summary>Referência rápida</summary><dl className="dh-glossary">
    {Object.entries(topics).map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}
  </dl></details>;
}

function DamageBox({ play, stats, patch, log }) {
  const [damage, setDamage] = useState('');
  const [armor, setArmor] = useState(false);
  const [talisman, setTalisman] = useState(false);
  const [massive, setMassive] = useState(false);
  const [lined, setLined] = useState(false);
  const [criticalArmor, setCriticalArmor] = useState(false);
  const value = integer(damage, 0, 999);
  const availableArmor = play.usedArmor < stats.maxArmor;
  const spentArmor = armor && availableArmor && value > 0;
  const severity = damageTaken(value, stats, spentArmor, massive);
  const isLined = lined && stats.armor?.feature === 'Lined' && severity === 1 && play.stress < stats.maxStress;
  const spentToken = talisman && !isLined && play.tokens > 0 && severity > 0;
  const spentStress = criticalArmor && severity >= 3 && play.cards.includes('blade-get-back-up') && play.stress < stats.maxStress;
  const marked = isLined ? 0 : severity - Number(spentToken) - Number(spentStress);
  const bulky = stats.armor?.feature === 'Bulky' && severity >= 3;
  const overflow = bulky && play.stress >= stats.maxStress;
  function apply() {
    patch({ hp: integer(play.hp + marked + Number(overflow), 0, stats.maxHP), usedArmor: play.usedArmor + Number(spentArmor),
      tokens: play.tokens - Number(spentToken), stress: integer(play.stress + Number(isLined) + Number(bulky) + Number(spentStress), 0, stats.maxStress) });
    log({ label: 'Dano recebido', title: `${marked + Number(overflow)} PV marcados`, detail: `${value} de dano${spentArmor ? ' · espaço de armadura gasto' : ''}` });
    setDamage(''); setArmor(false); setTalisman(false); setLined(false); setCriticalArmor(false);
  }
  return <details className="dh-damage"><summary>Calcular dano recebido</summary>
    <Field label="Dano recebido" type="number" min={0} limit={999} value={damage} onChange={setDamage}/>
    <label className="dh-toggle"><input type="checkbox" checked={armor && availableArmor} disabled={!availableArmor} onChange={e => setArmor(e.target.checked)}/>Gastar 1 espaço de armadura</label>
    {play.tokens > 0 && <label className="dh-toggle"><input type="checkbox" checked={talisman} onChange={e => setTalisman(e.target.checked)}/>Usar 1 ficha do talismã</label>}
    {stats.armor?.feature === 'Lined' && <label className="dh-toggle"><input type="checkbox" checked={lined} onChange={e => setLined(e.target.checked)}/>Marcar Estresse para anular dano menor</label>}
    {play.cards.includes('blade-get-back-up') && <label className="dh-toggle"><input type="checkbox" checked={criticalArmor}
      disabled={severity < 3 || play.stress >= stats.maxStress} onChange={e => setCriticalArmor(e.target.checked)}/>Get Back Up · gastar 1 Estresse contra dano grave</label>}
    <label className="dh-toggle"><input type="checkbox" checked={massive} onChange={e => setMassive(e.target.checked)}/>Regra opcional de dano maciço</label>
    <button type="button" disabled={!value} onClick={apply}>Aplicar · {marked + Number(overflow)} PV</button>
  </details>;
}

function Downtime({ play, build, patch, open, setOpen, log }) {
  const [type, setType] = useState('short');
  const [moves, setMoves] = useState(['', '']);
  const long = type === 'long';
  const apply = () => {
    const next = rest(play, build, long, moves.filter(Boolean));
    if (!next) return;
    patch(next); setOpen(false); setMoves(['', '']);
    log({ label: 'Tempo livre', title: long ? 'Descanso longo' : 'Descanso curto', detail: 'Recursos atualizados na ficha.' });
  };
  return <details open={open} onToggle={event => setOpen(event.currentTarget.open)} className="dh-panel dh-downtime">
    <summary>Tempo livre e descanso</summary>
    <div className="dh-fields">
      <Choice label="Tipo de descanso" value={type} onChange={setType} options={[['short', 'Descanso curto'], ['long', 'Descanso longo']]}/>
      {moves.map((move, i) => <Choice key={i} label={`Atividade ${i + 1}`} value={move}
        options={[...DOWNTIME, ...(long ? [['project', 'Trabalhar em um projeto']] : []),
          ...(play.favor != null && moves[1 - i] !== 'tithe' ? [['tithe', 'Fazer oferenda ao patrono']] : [])]} placeholder="Nenhuma"
        onChange={value => setMoves(old => old.map((item, j) => i === j ? value : item))}/>)}
    </div>
    <p>{play.shorts >= 3 ? 'Após três descansos curtos consecutivos, faça um descanso longo.' : 'Escolha até duas atividades. Você pode trocar cartas sem custo no início do descanso.'}</p>
    {play.favor != null && <p>Se encerrar o descanso sem fazer uma oferenda, avise ao mestre que ele recebe 1 Medo.</p>}
    <button type="button" disabled={!type || !long && play.shorts >= 3} onClick={apply}>Concluir descanso</button>
  </details>;
}

const dreadChecks = new Set(['blighting-strike', 'voice-of-dread', 'hideous-retribution', 'siphon-essence', 'terrify', 'horror', 'darkfire', 'wall-of-hunger', 'dark-army', 'damnation'].map(key => `dread-${key}`));

function CardPanel({ build, stats, play, patch, downtime, roll, damage, last, fear, mark, pending }) {
  const [vault, setVault] = useState(false);
  const [replacement, setReplacement] = useState('');
  const [tableFear, setTableFear] = useState('');
  const [shadowCost, setShadowCost] = useState('1');
  const shadowHope = integer(shadowCost, 1, HOPE_MAX);
  const stored = stats.known.filter(id => !play.cards.includes(id));
  const active = play.cards.map(id => cardInfo(id, build.sources)).filter(Boolean);
  return <section>
    <div className="dh-between"><h3>Cartas ativas <small>{active.length}/5</small></h3>
      <button type="button" aria-pressed={vault} onClick={() => setVault(value => !value)}>Reserva · {stored.length}</button></div>
    {vault && <div className="dh-effect">
      {play.cards.length === 5 && <Choice label="Carta ativa para devolver à reserva" value={replacement}
        options={active.map(card => [card.id, card.name])} onChange={setReplacement}/>}
      {!stored.length && <p>A reserva está vazia.</p>}
      {stored.map(id => {
        const card = cardInfo(id, build.sources), next = readyCard(play, id, replacement, downtime, stats.maxStress, build.sources);
        return <div className="dh-between dh-vault-row" key={id}><span>{card.name} <small>· {downtime ? 0 : card.recall} Estresse</small></span>
          <button type="button" disabled={!next} onClick={() => { patch(next); setReplacement(''); }}>Resgatar {card.name}</button></div>;
      })}
    </div>}
    {active.map(card => <article key={card.id} className="dh-effect">
      <small>{domainText(card)} · Resgate {card.recall}</small><h4>{card.name}</h4>
      {cardDescription(card) && <p>{cardDescription(card)}</p>}
      <p><a href={card.reference} target="_blank" rel="noreferrer">Consultar regra da carta</a></p>
      <div className="dh-actions">
        {card.kind === 'Spell' && stats.spellcast && (card.domain !== 'Dread' || dreadChecks.has(card.id) &&
          (card.source === 'void15' || !['dread-darkfire', 'dread-horror'].includes(card.id))) && <button type="button"
          onClick={() => roll(card.name, stats.spellcast, 0, card.id)}>{card.id === 'dread-hideous-retribution' ? 'Rolar reação de Conjuração' : 'Rolar Conjuração'}</button>}
        {card.id === 'dread-blighting-strike' && <>
          {[6, 10].map(faces => <button type="button" key={faces}
            disabled={!last?.confirmed || last.id !== card.id || last.good !== true || Boolean(last.withHope) !== (faces === 6)}
            onClick={() => damage({ name: card.name, faces, bonus: 1, damage: 'mag' }, last.critical)}>
            {stats.proficiency}d{faces}+1 · {faces === 6 ? 'Esperança' : 'Medo'}</button>)}
        </>}
        {card.id === 'dread-umbral-veil' && <>
          {card.source === 'void15' ? <>
            <Field label="Esperança para sombras" type="number" min={1} limit={HOPE_MAX} value={shadowCost} onChange={setShadowCost}/>
            <button type="button" disabled={pending || !last?.confirmed || last.withHope || play.hope < shadowHope || play.uses.includes(card.id)}
              onClick={() => mark('hope', -shadowHope, { shadows: shadowHope, uses: [...play.uses, card.id] })}>Ativar sombras com Esperança</button>
          </> : <>
            {fear == null && <Field label="Medo informado pelo mestre" type="number" min={0} limit={12} value={tableFear} onChange={setTableFear}/>}
            <button type="button" disabled={play.uses.includes(card.id) || play.stress >= stats.maxStress || fear == null && tableFear === ''}
              onClick={() => mark('stress', 1, { shadows: integer(fear ?? tableFear, 0, 12), uses: [...play.uses, card.id] })}>1 Estresse · Ativar sombras</button>
          </>}
          <button type="button" disabled={!play.shadows} onClick={() => patch({ shadows: play.shadows - 1 })}>Gastar sombra · {play.shadows}</button>
        </>}
        <button type="button" onClick={() => patch({ cards: play.cards.filter(id => id !== card.id) })}>Guardar</button>
      </div>
    </article>)}
    {!active.length && <p>Resgate cartas da reserva para usá-las na ficha.</p>}
  </section>;
}

function Features({ build, stats, play, mark, patch, log, onCharm, last, pending }) {
  const [amount, setAmount] = useState('1');
  const tokens = integer(amount, 1, HOPE_MAX);
  const witch = build.classId === 'witch', hedge = witch && build.subclass === 'hedge';
  const heritage = ANCESTRIES[build.ancestry]?.name;
  const community = COMMUNITIES[build.community];
  const transformation = TRANSFORMATIONS[build.transformation];
  const sections = [
    [stats.cls.name, stats.cls.features.filter(name => name !== stats.cls.hope), stats.cls],
    [stats.sub.name, [...(stats.sub.foundation ?? []), ...(stats.rank >= 1 ? stats.sub.specialization ?? [] : []), ...(stats.rank >= 2 ? stats.sub.mastery ?? [] : [])], stats.cls],
    [stats.extraClass?.name, [...(stats.extraClass?.features ?? []), ...(stats.extra?.foundation ?? [])], stats.extraClass],
    [heritage, stats.ancestryFeatures], [community?.name, stats.communityFeatures, community], [transformation?.name, transformation?.features],
  ];
  const hopeDescription = featureDescription(stats.cls, stats.cls.hope);
  function commune() {
    const count = integer(stats.traits[stats.spellcast], 0, 12);
    if (!count || play.uses.includes('commune')) return;
    const dice = Array.from({ length: count }, () => die(6));
    patch({ uses: [...play.uses, 'commune'] });
    log({ label: 'Commune', title: 'Escolha um dos resultados', dice,
      detail: '1–3 sensação · 4–5 som ou visão · 6 vivencie uma cena' });
  }
  function spendClassHope() {
    if (witch) { onCharm(); return; }
    if (play.favor != null) {
      const gain = die(4);
      mark('hope', -3, { favor: play.favor + gain });
      log({ label: stats.cls.hope, title: `+${gain} Favor`, dice: [gain], detail: hopeDescription });
      return;
    }
    const effect = build.classId === 'assassin' ? { stress: Math.max(0, play.stress - 2) }
      : build.classId === 'guardian' ? { usedArmor: Math.max(0, Math.min(stats.maxArmor, play.usedArmor) - 2) }
        : build.classId === 'summoner' ? { stress: Math.max(0, play.stress - 1) }
          : build.classId === 'rogue' ? { uses: [...play.uses, 'rogue-dodge'] }
            : build.classId === 'warrior' ? { uses: [...play.uses, 'no-mercy'] } : {};
    mark('hope', -3, effect);
    log({ label: stats.cls.hope, title: '3 Esperança', detail: hopeDescription });
  }
  const alreadyUsed = build.classId === 'rogue' && play.uses.includes('rogue-dodge') || build.classId === 'warrior' && play.uses.includes('no-mercy');
  return <section>
    <h3>Habilidades</h3>
    <article className="dh-effect"><small>Habilidade de Esperança</small><h4>{stats.cls.hope}</h4>
      {hopeDescription && <p>{hopeDescription}</p>}
      <button type="button" disabled={play.hope < 3 || alreadyUsed || stats.cls.hope === 'Staggering Strike' && (pending ||
        !last?.good || !last.weaponAttack || play.uses.includes('staggering-strike'))}
        onClick={stats.cls.hope === 'Staggering Strike' ?
          () => { mark('hope', -3, { uses: [...play.uses, 'staggering-strike'] }); log({ label: stats.cls.hope, title: 'Alvo atordoado', detail: hopeDescription }); }
          : spendClassHope}>Gastar 3 Esperança</button>
      {build.classId === 'rogue' && alreadyUsed && <button type="button"
        onClick={() => patch({ uses: play.uses.filter(key => key !== 'rogue-dodge') })}>Encerrar bônus de Evasão</button>}
    </article>
    {sections.filter(([name, names]) => name && names?.length).map(([name, names, info]) => <article className="dh-effect" key={name}>
      <h4>{name}</h4>
      {info?.benefit && <p>{info.description}</p>}
      {info?.reference && <a href={info.reference} target="_blank" rel="noreferrer">Consultar ficha oficial</a>}
      {names.map(feature => {
        const description = info?.benefit ?? featureDescription(info, feature);
        return <div key={feature} className="dh-feature">
        <strong>{feature}</strong>
        {description && <p>{description}</p>}
        {witch && feature === 'Hex' && <button type="button" disabled={play.stress >= stats.maxStress} onClick={() => mark('stress', 1)}>Marcar 1 Estresse</button>}
        {witch && feature === 'Commune' && <button type="button" disabled={play.uses.includes('commune') || stats.traits[stats.spellcast] <= 0} onClick={commune}>Rolar Commune</button>}
        {hedge && feature === 'Enchanted Talisman' && <div className="dh-actions dh-talisman">
          <Field label="Esperança para imbuir" type="number" min={1} limit={6} value={amount} onChange={setAmount}/>
          <button type="button" disabled={play.hope < tokens || play.uses.includes('talisman')}
            onClick={() => mark('hope', -tokens, { tokens, uses: [...play.uses, 'talisman'] })}>Imbuir talismã</button>
          <button type="button" disabled={play.tokens < 1} onClick={() => patch({ tokens: play.tokens - 1 })}>Gastar ficha · {play.tokens}</button>
        </div>}
        {hedge && feature === 'Tethered Talisman' && <div className="dh-actions">
          <button type="button" disabled={Boolean(play.tokens) || play.uses.includes('talisman')}
            onClick={() => patch({ tokens: 1, uses: [...play.uses, 'talisman'] })}>Encantar talismã</button>
          <button type="button" disabled={!play.tokens} onClick={() => patch({ tokens: 0 })}>Consumir talismã</button>
        </div>}
        {play.favor != null && feature === 'Warlock Patron' && <div className="dh-fields">
          <Field label="Nome do patrono" value={play.patron} onChange={patron => patch({ patron })} max={55}/>
          {play.spheres.map((name, index) => <Field key={index} label={`Esfera ${index + 1} · +${tierFor(build.level) + 1}`}
            value={name} onChange={value => patch({ spheres: play.spheres.map((sphere, i) => i === index ? value : sphere) })} max={45}/>)}
        </div>}
        {play.favor != null && feature === 'Favor' && <Field label="Favor disponível" type="number" min={0} limit={99}
          value={play.favor} onChange={favor => patch({ favor: integer(favor) })}/>}
        {feature === 'Found Family' && <button type="button" disabled={play.hope < 1 || play.uses.includes('found-family')}
          onClick={() => mark('hope', -1, { uses: [...play.uses, 'found-family'] })}>1 Esperança · usar Experiência do aliado</button>}
      </div>; })}
    </article>)}
  </section>;
}

function Equipment({ stats, play, build, patch, log }) {
  const [equipment, setEquipment] = useState('');
  const [custom, setCustom] = useState('');
  const [filter, setFilter] = useState('');
  const search = filter.toLowerCase().trim();
  const weapons = Object.keys(WEAPONS).map(id => weaponInfoFor(build, id))
    .filter(item => item.tier <= tierFor(build.level) && (stats.spellcast || item.damage === 'phy') && !play.weapons.includes(item.id));
  const armors = Object.values(ARMOR).filter(item => item.tier <= tierFor(build.level) && !play.armors.includes(item.id));
  const options = [...weapons, ...armors].filter(item => item.name.toLowerCase().includes(search)).map(item => [item.id, item.name]);
  const equip = item => {
    if (item.slot === 'primary') patch({ primary: play.primary === item.id ? '' : item.id,
      ...(item.hands === 2 && build.classId !== 'warrior' ? { secondary: '' } : {}) });
    else patch({ secondary: play.secondary === item.id ? '' : item.id });
  };
  function consume(item, index) {
    const key = item === POTIONS.health ? 'hp' : 'stress';
    const value = die(4) + Number(build.classId === 'witch' && build.subclass === 'hedge');
    patch({ [key]: Math.max(0, play[key] - value), items: play.items.filter((_, i) => index !== i) });
    log({ label: item, title: `Recupera até ${value}`, detail: key === 'hp' ? 'Pontos de vida' : 'Estresse' });
  }
  return <>
    <div className="dh-fields">{['Punhados', 'Bolsas', 'Baús'].map((label, i) => <Field key={label} label={label} type="number" min={0} limit={99}
      value={play.gold[i]} onChange={value => patch({ gold: play.gold.map((current, j) => i === j ? integer(value, 0, 99) : current) })}/>)}</div>
    <div className="dh-columns">
      <section><h3>Armas e armaduras</h3>
        {play.weapons.map(id => weaponInfoFor(build, id)).filter(Boolean).map(item => <div key={item.id} className="dh-vault-row">
          <div className="dh-between"><span>{item.name}<small>{weaponMeta(item)}</small></span>
            <button type="button" disabled={item.slot === 'secondary' && stats.primary?.hands === 2 && build.classId !== 'warrior' || item.damage !== 'phy' && !stats.spellcast}
              onClick={() => equip(item)}>{play[item.slot] === item.id ? 'Desequipar' : 'Equipar'} {item.name}</button></div>
        </div>)}
        {play.armors.map(id => ARMOR[id]).filter(Boolean).map(item => <div className="dh-between dh-vault-row" key={item.id}>
          <span>{item.name}<small>{armorMeta(item)}</small></span>
          <button type="button" onClick={() => patch({ armor: play.armor === item.id ? '' : item.id })}>{play.armor === item.id ? 'Desequipar' : 'Equipar'} {item.name}</button>
        </div>)}
        <Field label="Buscar no compêndio" value={filter} onChange={setFilter}/>
        <Choice label="Equipamento para adicionar" value={equipment} options={options} onChange={setEquipment}/>
        <button type="button" disabled={!options.some(([id]) => id === equipment) || (WEAPONS[equipment] ? play.weapons.length >= 20 : play.armors.length >= 15)}
          onClick={() => {
            patch(WEAPONS[equipment] ? { weapons: [...play.weapons, equipment] } : { armors: [...play.armors, equipment] });
            setEquipment('');
          }}>Adicionar equipamento</button>
      </section>
      <section><h3>Inventário</h3>
        {play.items.map((item, index) => <div className="dh-vault-row dh-between" key={`${item}:${index}`}><span>{item}</span>
          <div className="dh-actions">
            {Object.values(POTIONS).includes(item) && <button type="button" onClick={() => consume(item, index)}>Usar {item}</button>}
            <button type="button" aria-label={`Remover ${item}`} onClick={() => patch({ items: play.items.filter((_, i) => i !== index) })}>Remover</button>
          </div></div>)}
        <Field label="Novo item" value={custom} onChange={setCustom} max={55}/>
        <button type="button" disabled={!custom.trim() || play.items.length >= 16} onClick={() => {
          patch({ items: [...play.items, custom.trim()] }); setCustom('');
        }}>Adicionar item</button>
      </section>
    </div>
  </>;
}

function RollPanel({ record, confirm, fearless, charm, blightFailure }) {
  if (!record) return null;
  return <section className="dh-roll-card" role="status" aria-live="polite" data-roll={record.critical ? 'critical' : record.withHope ? 'hope' : 'fear'}>
    <div className="dh-between"><b>{record.label}</b><strong>{record.total ?? ''}</strong></div>
    <h4>{record.title}</h4>
    {!!record.dice?.length && <div className="dh-dice">{record.dice.map((value, i) => <span key={i}>
      {record.dual && <small>{i === 0 ? 'Esperança' : 'Medo'}</small>}{value}</span>)}</div>}
    {record.detail && <p>{record.detail}{record.difficulty != null && ` · Dificuldade ${record.difficulty}`}</p>}
    {record.dual && !record.confirmed && <div className="dh-actions">
      {blightFailure ? <>
        <button type="button" disabled={!blightFailure.hope} onClick={() => confirm('hope')}>Falha · gastar 1 Esperança</button>
        <button type="button" onClick={() => confirm('stress')}>Falha · marcar 1 Estresse</button>
      </> : <button type="button" onClick={() => confirm('normal')}>{record.critical ? '+1 Esperança e limpar 1 Estresse'
        : record.withHope ? 'Receber 1 Esperança' : 'Confirmar Medo'}</button>}
      {fearless && <button type="button" onClick={() => confirm('fearless')}>Fearless · 2 Estresse</button>}
      {charm && <button type="button" onClick={() => confirm('charm')}>Witch’s Charm · 3 Esperança</button>}
    </div>}
  </section>;
}

export default function DaggerheartSheet({ form, setForm, build, details, play, stats, patch, onEdit, onPortrait, onLevel, send, fear }) {
  const [tab, setTab] = useState(TABS[0]);
  const [target, setTarget] = useState('');
  const [mode, setMode] = useState('normal');
  const [exp, setExp] = useState([]);
  const [reaction, setReaction] = useState(false);
  const [sphere, setSphere] = useState('');
  const [unarmedTrait, setUnarmedTrait] = useState('strength');
  const [history, setHistory] = useState([]);
  const [record, setRecord] = useState(null);
  const [message, setMessage] = useState('');
  const [downtime, setDowntime] = useState(false);
  const current = useRef(null);
  const lastAction = useRef(null);
  const rollDestination = useRef(null);
  useEffect(() => {
    if (record) rollDestination.current?.scrollIntoView({ block: 'nearest' });
  }, [record]);
  function log(next) {
    setRecord(next);
    setHistory(old => [next, ...old].slice(0, 12));
  }
  function mark(key, change, rest = {}) {
    const limits = { hope: HOPE_MAX, stress: stats.maxStress, hp: stats.maxHP };
    patch({ ...rest, [key]: integer(play[key] + change, 0, limits[key]) });
  }
  async function sendResult(result) {
    if (!send || result.reaction) return;
    // The existing tracker accepts the effective Duality outcome as a pair, while the local log keeps the original dice.
    const swapped = result.withHope !== (result.hopeDie >= result.fearDie);
    try {
      const ack = await send('dice:record', { system: 'Daggerheart', actor: form.name,
        hopeDie: swapped ? result.fearDie : result.hopeDie, fearDie: swapped ? result.hopeDie : result.fearDie });
      if (!ack?.ok) setMessage(ack?.error || 'Rolagem registrada apenas na ficha.');
    } catch { setMessage('A mesa está indisponível. A rolagem ficou na ficha.'); }
  }
  function roll(title, key, bonus = 0, id = '', weaponAttack = false) {
    if (current.current) { setMessage('Confirme a rolagem anterior.'); return; }
    if (play.hope < exp.length) { setMessage('Esperança insuficiente para as Experiências escolhidas.'); return; }
    const isReaction = id === 'dread-hideous-retribution' || reaction && !id.startsWith('dread-');
    const spendFavor = !isReaction && Boolean(sphere && play.spheres?.[Number(sphere) - 1] && play.favor);
    const extra = exp.reduce((sum, index) => sum + (stats.experiences[index]?.bonus ?? 0), 0);
    if (exp.length || spendFavor) patch({ hope: play.hope - exp.length, ...(spendFavor ? { favor: play.favor - 1 } : {}) });
    setExp([]); setSphere(''); setMessage('');
    const favorBonus = spendFavor ? tierFor(build.level) + 1 : 0;
    const next = { ...duality({ title, trait: stats.traits[key], difficulty: target === '' ? null : integer(target, 1, 99),
      bonus: bonus + extra + favorBonus, mode, reaction: isReaction }), id, weaponAttack };
    if (next.reaction) { log({ ...next, confirmed: true }); return; }
    current.current = next;
    setRecord(next);
  }
  const waiting = current.current;
  const pending = Boolean(waiting);
  const canForceHope = waiting && !waiting.withHope && play.stress + 2 <= stats.maxStress && stats.ancestryFeatures.includes('Fearless');
  const canCharm = waiting?.good === false && build.classId === 'witch' && play.hope >= 3;
  const blightFailure = waiting?.id === 'dread-blighting-strike' && waiting.good === false &&
    cardInfo(waiting.id, build.sources).source !== 'void15' ? { hope: play.hope > 0 } : null;
  function confirm(method) {
    const outcome = current.current;
    if (!outcome || (method === 'fearless' && !canForceHope) || (method === 'charm' && !canCharm) ||
      (method === 'hope' && !play.hope)) return;
    if (method === 'fearless' && blightFailure) {
      mark('stress', 2);
      current.current = { ...outcome, withHope: true, title: 'Falha com Esperança · Fearless' };
      setRecord(current.current);
      return;
    }
    let settled = outcome, state = play;
    if (method === 'charm') {
      state = { ...state, hope: state.hope - 3 };
      settled = { ...outcome, withHope: false, good: true, title: 'Sucesso com Medo · Witch’s Charm' };
    } else if (method === 'hope') state = { ...state, hope: state.hope - 1 };
    else if (method === 'stress') state = state.stress >= stats.maxStress ? { ...state, hp: Math.min(stats.maxHP, state.hp + 1) }
      : { ...state, stress: state.stress + 1 };
    const next = resolveDuality(state, settled, stats, method === 'fearless');
    if (!next) return;
    if (method === 'fearless') settled = { ...outcome, withHope: true, title: `${outcome.good === null ? 'Resultado' : outcome.good ? 'Sucesso' : 'Falha'} com Esperança · Fearless` };
    current.current = null;
    const final = { ...settled, confirmed: true };
    lastAction.current = final;
    patch(final.weaponAttack ? { ...next, uses: next.uses.filter(key => key !== 'staggering-strike') } : next);
    log(final); void sendResult(final);
  }
  function damage(weapon, critical = false, weaponAttack = false) {
    if (current.current) { setMessage('Confirme a rolagem anterior.'); return; }
    const short = stats.secondary?.feature === 'Paired' && stats.primary?.id === weapon.id && weapon.range === 'Melee' ? stats.secondary.tier + 1 : 0;
    const training = build.classId === 'warrior' && weapon.damage === 'phy' ? build.level : 0;
    log({ ...weaponDamage({ ...weapon, bonus: weapon.bonus + short + training }, stats.proficiency, critical),
      canCombo: weaponAttack && weapon.range === 'Melee' && stats.cls.features.includes('Combo Strikes') });
  }
  function comboDamage() {
    if (pending || !record?.canCombo || play.stress >= stats.maxStress) return;
    const dice = rollCombo(stats.combo);
    mark('stress', 1);
    log({ ...record, title: 'Dano com combo', canCombo: false, dice: [...record.dice, ...dice],
      total: record.total + dice.reduce((sum, value) => sum + value, 0),
      detail: `${record.detail} · Combo d${stats.combo} (${dice.join(', ')})` });
  }
  const equipped = [stats.primary ?? stats.unarmed, stats.secondary].filter(Boolean);
  const setTrack = (key, limit) => value => patch({ [key]: integer(value, 0, limit) });
  const ancestry = [ANCESTRIES[build.ancestry]?.name, ANCESTRIES[build.mixed]?.name, COMMUNITIES[build.community]?.name].filter(Boolean);
  return <div className="dh-play">
    <div className="dh-sheet-lead">
      <section className="dh-panel dh-character">
        <button type="button" className="dh-avatar" aria-label="Editar retrato" onClick={onPortrait}>
          {form.token ? <img src={form.token} alt=""/> : form.name.slice(0, 1).toUpperCase()}
        </button>
        <div><h2>{form.name}</h2><p>{[details.pronouns, ...ancestry].filter(Boolean).join(' · ')}</p>
          <p>{stats.cls.name} · {stats.sub.name} · Nível {build.level}{stats.extraClass && ` / ${stats.extraClass.name}`}</p>
          {stats.cls.reference && <p><a href={stats.cls.reference} target="_blank" rel="noreferrer">{SOURCE[stats.cls.source]}</a></p>}
          <p>{stats.cls.domains.join(' / ')}{stats.secondDomain && ` / ${stats.secondDomain}`}</p></div>
        <div className="dh-actions"><button type="button" disabled={pending} onClick={onEdit}>Editar no criador</button>
          <button type="button" disabled={pending || build.level >= 10} onClick={onLevel}>Subir de nível</button></div>
      </section>
      <section className="dh-panel">
        <div className="dh-fields">
          <Field label="Dificuldade · opcional" value={target} onChange={setTarget} type="number" min={1} limit={99}/>
          <Choice label="Vantagem" value={mode} options={[['normal', 'Nenhuma'], ['advantage', 'Vantagem +1d6'], ['disadvantage', 'Desvantagem −1d6']]}
            onChange={value => setMode(value || 'normal')}/>
          {play.favor > 0 && play.spheres.some(name => name.trim()) && <Choice label="Usar 1 Favor em ação" value={sphere}
            options={play.spheres.map((name, index) => [String(index + 1), name]).filter(([, name]) => name.trim())} placeholder="Nenhuma esfera" onChange={setSphere}/>}
        </div>
        <label className="dh-toggle"><input type="checkbox" checked={reaction} onChange={e => setReaction(e.target.checked)}/>Teste de reação</label>
        <Help/>
      </section>
    </div>
    <TraitBar traits={stats.traits} onRoll={key => roll(TRAITS[key][0], key)}/>
    <div className="dh-dashboard">
      <section className="dh-panel"><h3>Defesa e saúde</h3>
        <dl className="dh-metrics">
          <div><dt>Evasão</dt><dd>{stats.evasion}</dd></div>
          <div><dt>Maior</dt><dd>{stats.major}</dd></div>
          <div><dt>Grave</dt><dd>{stats.severe}</dd></div>
        </dl>
        <Meter label="Armadura marcada" count={Math.min(play.usedArmor, stats.maxArmor)} total={stats.maxArmor} set={setTrack('usedArmor', stats.maxArmor)} kind="armor"/>
        <Meter label="PV marcados" count={play.hp} total={stats.maxHP} set={setTrack('hp', stats.maxHP)} kind="hp"/>
        <Meter label="Estresse" count={play.stress} total={stats.maxStress} set={setTrack('stress', stats.maxStress)} kind="stress"/>
        {play.hp === stats.maxHP && <p role="status">Todos os PV foram marcados. Escolha um movimento de morte com o mestre.</p>}
        <DamageBox {...{ stats, play, patch, log }}/>
      </section>
      <section className="dh-panel"><h3>Armas ativas</h3><p>Proficiência {stats.proficiency}</p>
        {equipped.map(weapon => <article key={weapon.id} className="dh-weapon">
          <b>{weapon.name}</b><small>{weapon.extraFaces ? TRAITS[unarmedTrait][0] : TRAITS[weapon.trait]?.[0] ?? 'Conjuração'} · {DISTANCES[weapon.range]} · {weaponInfo(weapon)}</small>
          {weapon.extraFaces && <Choice label="Atributo do ataque desarmado" value={unarmedTrait}
            options={TRAIT_KEYS.map(key => [key, TRAITS[key][0]])} onChange={key => setUnarmedTrait(key || 'strength')}/>}
          <div className="dh-actions"><button type="button" onClick={() => roll(weapon.name,
            weapon.extraFaces ? unarmedTrait : weapon.trait === 'spellcast' ? stats.spellcast : weapon.trait,
            Number(weapon.feature === 'Reliable') + Number(play.uses.includes('no-mercy')), weapon.id, true)}>Atacar com {weapon.name}</button>
            <button type="button" onClick={() => damage(weapon, lastAction.current?.id === weapon.id && lastAction.current.critical, true)}>Rolar dano</button></div>
        </article>)}
        {record?.canCombo && !pending && <button type="button" disabled={play.stress >= stats.maxStress} onClick={comboDamage}>1 Estresse · Adicionar combo d{stats.combo}</button>}
        {stats.spellcast && <button type="button" onClick={() => roll('Conjuração', stats.spellcast)}>Conjuração · {TRAITS[stats.spellcast][0]}</button>}
      </section>
      <section className="dh-panel"><h3>Esperança e Experiências</h3>
        <Meter label="Esperança" count={play.hope} total={HOPE_MAX} set={setTrack('hope', HOPE_MAX)} kind="hope"/>
        <div className="dh-experiences">{stats.experiences.filter(entry => entry.name).map((entry, i) =>
          <button type="button" key={i} aria-pressed={exp.includes(i)} disabled={!exp.includes(i) && exp.length >= play.hope}
            onClick={() => setExp(old => old.includes(i) ? old.filter(id => id !== i) : [...old, i])}>{entry.name}<b>{signed(entry.bonus)}</b></button>)}</div>
        <p>{exp.length ? `A próxima rolagem usará ${exp.length} Esperança.` : 'Selecione as Experiências relevantes para a próxima rolagem.'}</p>
        <div className="dh-actions">{CONDITIONS.map(name => <button type="button" key={name} aria-pressed={play.conditions.includes(name)}
          onClick={() => patch({ conditions: play.conditions.includes(name) ? play.conditions.filter(item => item !== name) : [...play.conditions, name] })}>{name}</button>)}</div>
      </section>
    </div>
    <div className="dh-activity">
      <Downtime {...{ play, build, patch, log, open: downtime, setOpen: setDowntime }}/>
      {message && <p role="status">{message}</p>}
      {(waiting || record) && <div ref={rollDestination}>
        <RollPanel record={waiting ?? record} confirm={confirm} fearless={canForceHope} charm={canCharm} blightFailure={blightFailure}/>
      </div>}
      {!!history.length && <details className="dh-history"><summary>Histórico local · {history.length}</summary>{history.map((item, i) =>
        <p key={i}><b>{item.label}</b> · {item.title} {item.total ?? ''}</p>)}</details>}
    </div>
    <div className="dh-library">
      <nav aria-label="Seções da ficha Daggerheart">{TABS.map(name => <button type="button" key={name} aria-pressed={tab === name} onClick={() => setTab(name)}>{name}</button>)}</nav>
      {tab === TABS[0] && <div className="dh-columns">
        <CardPanel {...{ build, play, stats, patch, downtime, roll, damage, last: lastAction.current, fear, mark, pending }}/>
        <Features {...{ build, play, stats, patch, mark, log, last: lastAction.current, pending }} onCharm={() => {
          if (canCharm) confirm('charm');
          else if (!pending) { mark('hope', -3); log({ label: 'Witch’s Charm', title: 'Sucesso com Medo', detail: 'Aplicado a uma ação da mesa.' }); }
          else setMessage('Witch’s Charm se aplica a uma falha de ação.');
        }}/>
      </div>}
      {tab === 'Equipamento' && <Equipment {...{ build, play, stats, patch, log }}/>}
      {tab === 'Detalhes' && <div className="dh-fields">
        {[['Pronomes', 'pronouns'], ['Cenário de campanha', 'frame'], ['Foco de magia', 'focus'], ['Roupas', 'clothes'], ['Olhos', 'eyes'], ['Corpo', 'body'],
          ['Cor de pele', 'color'], ['Atitude', 'attitude'], ['História', 'background'], ['Conexões', 'connection']].map(([label, key]) => {
          const value = details[key] || [1, 2, 3].map(i => details[key + i]).filter(Boolean).join(' · ');
          return value ? <p key={key}><b>{label}</b><br/>{value}</p> : null;
        })}
        <Field label="Aparência e detalhes adicionais" value={form.appearance} max={2400} area onChange={appearance => setForm(old => ({ ...old, appearance }))}/>
      </div>}
      {tab === 'Diário' && <Field label="Diário do personagem" value={form.notes} max={2400} area onChange={notes => setForm(old => ({ ...old, notes }))}/>}
    </div>
  </div>;
}
