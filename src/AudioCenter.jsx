import React, { useCallback, useEffect, useRef, useState } from 'react';
import { makeId } from './SharedTools.jsx';

// Only one HTMLMediaElement is mounted for the lifetime of the active room.
const timeLabel = seconds => { const s = Math.max(0, Math.floor(Number(seconds) || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const projectedPosition = value => Math.max(0, Number(value.position || 0) + (value.playing && value.startedAt ? Math.max(0, ((Date.now() - (value.clockOffset || 0)) - value.startedAt) / 1000) : 0));
const isYoutube = url => /(?:youtube\.com|youtu\.be)/i.test(url || '');
export default function AudioCenter({ value, isGM, send, upload, visible }) {
  const audioRef = useRef(null);
  const [enabled, setEnabled] = useState(false);
  const [duration, setDuration] = useState(0), [progress, setProgress] = useState(0);
  const [seeking, setSeeking] = useState(false), [drawer, setDrawer] = useState(false), [minimized, setMinimized] = useState(false);
  const [title, setTitle] = useState(''), [url, setUrl] = useState('');
  const [working, setWorking] = useState(false), [message, setMessage] = useState('');
  const [localVolume, setLocalVolume] = useState(value.volume ?? .65);
  const playlist = value.playlist || [];
  const current = playlist.find(item => item.id === value.currentId) || playlist[0];
  const currentId = current?.id || '';
  const youtube = current && isYoutube(current.url);
  const compact = !visible || minimized;

  const command = useCallback((changes = {}) => {
    if (!isGM) return;
    return send('music:control', {
      trackId: currentId, playing: value.playing, position: audioRef.current && !youtube ? audioRef.current.currentTime || 0 : projectedPosition(value),
      volume: value.volume, loop: !!value.loop, shuffle: !!value.shuffle, ...changes
    });
  }, [isGM, send, currentId, value, youtube]);

  const chooseNext = useCallback((direction = 1) => {
    if (!playlist.length || !isGM) return;
    const index = Math.max(0, playlist.findIndex(t => t.id === currentId));
    const others = playlist.filter(t => t.id !== currentId);
    const next = value.shuffle && direction > 0 && others.length ? others[Math.floor(Math.random() * others.length)] : playlist[(index + direction + playlist.length) % playlist.length];
    command({trackId: next.id, position: 0, playing: true});
  }, [playlist, currentId, value.shuffle, isGM, command]);

  // Preserve playhead across tab changes. Reconcile only on authoritative server transitions.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!current || youtube) { audio.pause(); audio.removeAttribute('src'); return; }
    if (audio.getAttribute('src') !== current.url) { audio.setAttribute('src', current.url); audio.load(); setDuration(0); }
  }, [currentId, current?.url, youtube]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current || youtube) return;
    audio.volume = Math.min(1, Math.max(0, Number(value.volume ?? .65)));
    const expected = projectedPosition(value);
    if (!seeking && Number.isFinite(expected) && Math.abs(audio.currentTime - expected) > 1.5) {
      try { audio.currentTime = Number.isFinite(audio.duration) ? Math.min(expected, audio.duration) : expected; } catch (_) {}
    }
    if (value.playing && enabled) audio.play().catch(() => setMessage('Para ouvir, clique em Ativar áudio neste dispositivo.'));
    else audio.pause();
    setLocalVolume(value.volume ?? .65);
  }, [value.startedAt, value.position, value.playing, value.volume, currentId, youtube, enabled]);

  const setQueue = tracks => send('music:playlist', { tracks });
  const move = (index, delta) => {
    const target = index + delta; if (target < 0 || target >= playlist.length) return;
    const next = [...playlist]; [next[index], next[target]] = [next[target], next[index]]; setQueue(next);
  };
  const addTrack = async event => {
    event.preventDefault();
    const nextTitle = title.trim(), nextUrl = url.trim();
    if (!nextTitle || !/^https:\/\//i.test(nextUrl)) { setMessage('Informe um título e link HTTPS direto para o áudio.'); return; }
    const result = await setQueue([...playlist, {id:makeId(),title:nextTitle,url:nextUrl}]);
    if (result?.ok) { setTitle(''); setUrl(''); setMessage('Faixa adicionada à fila.'); }
  };
  const addFiles = async event => {
    const files = Array.from(event.target.files || []); event.target.value = '';
    if (!files.length) return;
    setWorking(true);
    try {
      const newTracks = [];
      for (const file of files) {
        if (!/^audio\/(mpeg|mp3|ogg|wav|webm|mp4)$/i.test(file.type) && !/\.(mp3|ogg|wav|m4a)$/i.test(file.name)) throw new Error('Envie arquivos de áudio MP3, OGG, WAV ou M4A.');
        setMessage('Enviando ' + file.name + '…');
        const saved = await upload(file, {scope:'public',kind:'music'});
        if (!/^https:\/\//i.test(saved.url)) throw new Error('As faixas compartilhadas precisam de um URL HTTPS público (Supabase Storage).');
        newTracks.push({id:makeId(), title:file.name.replace(/\.[^.]+$/, ''), url:saved.url});
      }
      const result = await setQueue([...playlist, ...newTracks]);
      if (!result?.ok) throw new Error(result.error || 'Falha ao atualizar fila.');
      setMessage(newTracks.length + ' faixa(s) adicionada(s).');
    } catch (error) { setMessage(error.message); }
    finally { setWorking(false); }
  };
  const seek = seconds => { setProgress(seconds); setSeeking(true); };
  const commitSeek = () => { if (!seeking) return; setSeeking(false); if (isGM) command({position:progress}); };
  return <section className={'audio-center surface ' + (compact ? 'audio-mini' : 'audio-visible')} aria-label="Central de áudio da mesa">
    <audio ref={audioRef} preload="metadata" onTimeUpdate={e => { if (!seeking) setProgress(e.currentTarget.currentTime); }} onLoadedMetadata={e => {const target=e.currentTarget;setDuration(Number.isFinite(target.duration) ? target.duration : 0);try {target.currentTime=Math.min(projectedPosition(value),Number.isFinite(target.duration)?target.duration:projectedPosition(value));}catch(_){} if(value.playing&&enabled)target.play().catch(()=>{});}} onDurationChange={e => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)} onEnded={() => { if (!isGM) return; if (value.loop) command({position:0,playing:true}); else chooseNext(); }}/>
    {compact && <div className="audio-mini-controls" role="group" aria-label="Mini-player da mesa">
      <span className="audio-mini-icon" aria-hidden="true">♫</span>
      <div className="audio-mini-info"><b title={current?.title}>{current?.title || 'Trilha sonora'}</b><small>{value.playing ? 'Reproduzindo' : 'Pausado'} · {playlist.length} na fila</small></div>
      <button type="button" aria-label={value.playing ? 'Pausar música' : 'Reproduzir música'} disabled={!isGM || !current || !!youtube} onClick={() => command({playing: !value.playing})}>{value.playing ? 'Ⅱ' : '▶'}</button>
      <button type="button" aria-label={drawer?'Fechar fila':'Abrir fila'} aria-expanded={drawer} onClick={() => setDrawer(v=>!v)}>☷</button>
      {visible && <button type="button" aria-label="Expandir player" onClick={()=>setMinimized(false)}>▢</button>}
    </div>}
    {!compact && <>
      <div className="audio-header"><div><span className="section-eyebrow">CENTRAL DE ÁUDIO • EM TEMPO REAL</span><h2>{current?.title || 'Nenhuma faixa selecionada'}</h2><p>{value.playing ? 'Reproduzindo para a mesa' : 'Pausado'} · {playlist.length} faixa(s)</p></div><button className="button secondary" type="button" onClick={() => setDrawer(v => !v)} aria-expanded={drawer}>{drawer ? 'Fechar fila' : `☷ Fila (${playlist.length})`}</button><button type="button" className="button quiet" onClick={()=>{setMinimized(true);setDrawer(false)}}>− Mini-player</button></div>
      {youtube && <p className="audio-note">Este link é do YouTube e não oferece controle HTML5 compartilhado. Use links diretos de áudio HTTPS ou envie MP3 para ter sincronização completa.</p>}
      {!enabled && !youtube && <button className="button secondary" onClick={() => { setEnabled(true); if (audioRef.current && value.playing) audioRef.current.play().catch(() => {}); }}>▶ Ativar áudio neste dispositivo</button>}
      <div className="audio-timeline"><span>{timeLabel(seeking ? progress : (enabled ? progress : projectedPosition(value)))}</span><input aria-label="Posição da música" type="range" min="0" max={Math.max(1,duration || projectedPosition(value))} step="0.1" value={Math.min(seeking ? progress : progress, Math.max(1,duration || projectedPosition(value)))} disabled={!isGM || !current || !duration || !!youtube} onChange={e => seek(Number(e.target.value))} onPointerUp={commitSeek} onKeyUp={commitSeek} onBlur={commitSeek}/><span>{timeLabel(duration)}</span></div>
      <div className="audio-actions"><button disabled={!isGM || !playlist.length} aria-label="Faixa anterior" onClick={() => chooseNext(-1)}>⏮</button><button disabled={!isGM || !current || !!youtube} aria-label={value.playing ? 'Pausar' : 'Reproduzir'} className="audio-play" onClick={() => command({playing:!value.playing})}>{value.playing ? '⏸' : '▶'}</button><button disabled={!isGM || !playlist.length} aria-label="Próxima faixa" onClick={() => chooseNext(1)}>⏭</button><button disabled={!isGM} className={value.loop ? 'selected' : ''} aria-pressed={!!value.loop} onClick={() => command({loop:!value.loop})}>↻ Repetir</button><button disabled={!isGM} className={value.shuffle ? 'selected' : ''} aria-pressed={!!value.shuffle} onClick={() => command({shuffle:!value.shuffle})}>⤨ Aleatório</button><label>🔊 <input aria-label="Volume master" type="range" min="0" max="100" value={Math.round(localVolume*100)} onChange={e => setLocalVolume(Number(e.target.value)/100)} onPointerUp={() => command({volume:localVolume})} onKeyUp={() => command({volume:localVolume})} disabled={!isGM}/></label></div>
      {message && <p role="status" className="audio-note">{message}</p>}
    </>}
    {drawer && <div className="audio-queue" role="dialog" aria-label="Fila de reprodução"><div className="audio-queue-header"><h3>Fila de reprodução</h3><button type="button" className="button quiet" onClick={()=>setDrawer(false)} aria-label="Recolher fila">✕ Fechar</button></div>{isGM && <><form onSubmit={addTrack} className="audio-add"><input aria-label="Nome da música" placeholder="Nome da faixa" value={title} onChange={e=>setTitle(e.target.value)} required/><input aria-label="Link HTTPS da música" placeholder="https://.../musica.mp3" type="url" value={url} onChange={e=>setUrl(e.target.value)} required/><button className="button secondary">Adicionar link</button></form><label className="button quiet file-button">{working ? 'Enviando músicas…' : '+ Enviar arquivos MP3'}<input type="file" accept="audio/*,.mp3,.m4a,.ogg,.wav" multiple disabled={working} onChange={addFiles}/></label></>}
        <div className="audio-queue-rows">{playlist.map((item,index)=><div className={'audio-queue-item '+(item.id===currentId?'playing':'')} key={item.id}><span>{index+1}.</span><b title={item.title}>{item.title}</b>{isGM && <div><button title="Tocar" onClick={() => command({trackId:item.id,position:0,playing:true})}>▶</button><button title="Subir" disabled={index===0} onClick={()=>move(index,-1)}>↑</button><button title="Descer" disabled={index===playlist.length-1} onClick={()=>move(index,1)}>↓</button><button title="Remover da fila" onClick={()=>setQueue(playlist.filter(track=>track.id!==item.id))}>×</button></div>}</div>)}{!playlist.length && <p className="muted-copy">A fila está vazia.</p>}</div></div>}
  </section>;
}
