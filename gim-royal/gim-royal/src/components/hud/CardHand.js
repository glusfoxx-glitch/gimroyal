'use client';
// =============================================================================
// Main de 4 cartes + carte suivante. Glisser une carte sur l'arène pour la poser
// (souris ou doigt), ou toucher une carte puis toucher le terrain.
// =============================================================================
import { useEffect, useRef, useState } from 'react';
import { CARDS } from '@shared/cards.js';
import { gameStore, useGame } from '@/lib/store';
import { drag, bridge } from '@/lib/drag';
import { tryDeploy } from '@/lib/actions';
import CardFace from '../CardFace';

const EMPTY = [];

export default function CardHand() {
  const hand = useGame((s) => s.snap?.hd ?? EMPTY);
  const next = useGame((s) => s.snap?.nx ?? null);
  const elixir = useGame((s) => s.snap?.el ?? 0);
  const selected = useGame((s) => s.selected);
  const [dragging, setDragging] = useState(-1);
  const floatRef = useRef(null);
  const rafRef = useRef(0);

  // Carte flottante qui suit le doigt tant qu'il n'est pas au-dessus de l'arène
  useEffect(() => {
    if (dragging < 0) return undefined;
    const tick = () => {
      const el = floatRef.current;
      if (el) {
        el.style.transform = `translate(${drag.sx}px, ${drag.sy}px) translate(-50%, -60%)`;
        el.style.opacity = drag.over && drag.moved ? '0' : '1';
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [dragging]);

  // Si la carte sélectionnée a changé (posée ou plus jouable), on la désélectionne
  useEffect(() => {
    if (selected >= 0 && !hand[selected]) gameStore.set({ selected: -1 });
  }, [hand, selected]);

  function onPointerDown(e, index, cardId) {
    if (!cardId) return;
    e.preventDefault();
    const pointerId = e.pointerId;
    drag.active = true;
    drag.cardId = cardId;
    drag.handIndex = index;
    drag.sx = e.clientX;
    drag.sy = e.clientY;
    drag.startX = e.clientX;
    drag.startY = e.clientY;
    drag.moved = false;
    drag.over = false;
    drag.touchOffset = e.pointerType === 'touch' ? 46 : 0;
    setDragging(index);

    const move = (ev) => {
      if (ev.pointerId !== pointerId) return;
      drag.sx = ev.clientX;
      drag.sy = ev.clientY;
      if (Math.hypot(ev.clientX - drag.startX, ev.clientY - drag.startY) > 10) drag.moved = true;
      drag.over = bridge.isOverCanvas ? bridge.isOverCanvas(ev.clientX, ev.clientY - drag.touchOffset) : false;
    };
    const end = (ev, cancelled) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      const sx = ev.clientX;
      const sy = ev.clientY - drag.touchOffset;
      if (!cancelled) {
        if (drag.moved && bridge.isOverCanvas?.(sx, sy)) {
          const pos = bridge.screenToArena?.(sx, sy);
          if (pos) tryDeploy(index, cardId, pos[0], pos[1]);
        } else if (!drag.moved) {
          const cur = gameStore.get().selected;
          gameStore.set({ selected: cur === index ? -1 : index });
        }
      }
      drag.active = false;
      drag.cardId = null;
      drag.handIndex = -1;
      drag.moved = false;
      drag.over = false;
      setDragging(-1);
    };
    const up = (ev) => end(ev, false);
    const cancel = (ev) => end(ev, true);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
  }

  return (
    <div className="hand">
      <div className="next-card">
        <small>Suivante</small>
        <CardFace id={next} size="xs" />
      </div>
      <div className="hand-cards">
        {[0, 1, 2, 3].map((i) => {
          const id = hand[i];
          const card = CARDS[id];
          const affordable = card ? elixir >= card.cost : false;
          return (
            <button
              key={`${i}-${id}`}
              className={`hand-slot ${dragging === i ? 'is-dragging' : ''}`}
              onPointerDown={(e) => onPointerDown(e, i, id)}
              onContextMenu={(e) => e.preventDefault()}
              aria-label={card ? `${card.name}, ${card.cost} élixir` : 'vide'}
            >
              <CardFace id={id} size="md" dim={!affordable} progress={card ? elixir / card.cost : 0} selected={selected === i} lifted={dragging === i} />
            </button>
          );
        })}
      </div>
      {dragging >= 0 && hand[dragging] && (
        <div ref={floatRef} className="drag-float">
          <CardFace id={hand[dragging]} size="md" />
        </div>
      )}
    </div>
  );
}
