import { CARDS } from '@shared/cards.js';

export default function CardFace({ card, id, size, dim, selected, lifted }) {
  const cardData = card || CARDS[id] || { id: id, name: id, cost: "?", stats: {} };

  const getOfficialArtwork = (cardId) => {
    const artworks = {
      theo: "https://api-assets.clashroyale.com/cards/300/mega-knight.png",
      vladimir: "https://api-assets.clashroyale.com/cards/300/lumberjack.png",
      nolan: "https://api-assets.clashroyale.com/cards/300/magic-archer.png",
      matheo: "https://api-assets.clashroyale.com/cards/300/monk.png",
      mohammed: "https://api-assets.clashroyale.com/cards/300/electro-giant.png",
      adam: "https://api-assets.clashroyale.com/cards/300/bandit.png",
      ibrahima: "https://api-assets.clashroyale.com/cards/300/pekka.png",
      yann: "https://api-assets.clashroyale.com/cards/300/royal-ghost.png",
      clement: "https://api-assets.clashroyale.com/cards/300/fisherman.png",
      aisha: "https://api-assets.clashroyale.com/cards/300/mega-minion.png",
      celine: "https://api-assets.clashroyale.com/cards/300/hunter.png",
      emircan: "https://api-assets.clashroyale.com/cards/300/valkyrie.png",
      pasparfait: "https://api-assets.clashroyale.com/cards/300/musketeer.png",
      alycia: "https://api-assets.clashroyale.com/cards/300/ice-spirit.png",
      aminematue: "https://api-assets.clashroyale.com/cards/300/goblins.png",
      beti: "https://api-assets.clashroyale.com/cards/300/elixir-collector.png",
      bureau: "https://api-assets.clashroyale.com/cards/300/inferno-tower.png",
      poliakov: "https://api-assets.clashroyale.com/cards/300/rage.png",
      brioche: "https://api-assets.clashroyale.com/cards/300/heal-spirit.png"
    };
    return artworks[cardId] || "https://api-assets.clashroyale.com/cards/300/knight.png";
  };

  return (
    <div className={`relative w-full h-full min-h-[110px] rounded-xl border border-purple-500/40 shadow-lg overflow-hidden cursor-pointer bg-gray-900 select-none flex flex-col justify-between transition-transform ${selected ? 'ring-2 ring-purple-400 scale-105' : ''} ${lifted ? 'opacity-40' : ''}`}>
      
      {/* Image de fond de la carte */}
      <div className="absolute inset-0 z-0">
        <img 
          src={getOfficialArtwork(cardData.id)} 
          alt={cardData.name} 
          className="w-full h-full object-cover object-center opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
      </div>

      {/* En-tête : Coût en élixir */}
      <div className="relative z-10 flex justify-between items-start p-1.5">
        {cardData.cost !== undefined && (
          <span className="bg-purple-600 text-white font-extrabold text-[10px] px-1.5 py-0.5 rounded-full border border-black shadow">
            {cardData.cost}
          </span>
        )}
      </div>

      {/* Masque assombrissant si non disponible */}
      {dim && <div className="absolute inset-0 bg-black/60 z-20 pointer-events-none" />}

      {/* Informations en bas : Nom et stats */}
      <div className="relative z-10 p-1.5 bg-black/80 backdrop-blur-xs text-center border-t border-white/10">
        <h3 className="font-bold text-[11px] text-white uppercase tracking-tight truncate">
          {cardData.name}
        </h3>
        {cardData.stats?.hp && size !== "xs" && (
          <div className="flex justify-center gap-1 text-[9px] font-semibold mt-0.5 text-gray-300">
            <span className="text-red-400">❤️ {cardData.stats.hp}</span>
            {cardData.stats?.damage && <span className="text-orange-400">⚔️ {cardData.stats.damage}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
