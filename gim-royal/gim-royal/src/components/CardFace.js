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
    <div className={`relative w-full h-full min-h-[100px] rounded-xl border border-purple-500/50 shadow-md overflow-hidden cursor-pointer bg-gray-900 select-none flex flex-col justify-between transition-transform ${selected ? 'ring-2 ring-purple-400 scale-105' : ''} ${lifted ? 'opacity-40' : ''}`}>
      
      {/* Illustration officielle en fond */}
      <div className="absolute inset-0 z-0">
        <img 
          src={getOfficialArtwork(cardData.id)} 
          alt={cardData.name} 
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
      </div>

      {/* Coût en élixir en haut à gauche */}
      <div className="relative z-10 p-1">
        {cardData.cost !== undefined && (
          <span className="bg-purple-600 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border border-black shadow">
            {cardData.cost}
          </span>
        )}
      </div>

      {/* Voile sombre si la carte n'est pas jouable */}
      {dim && <div className="absolute inset-0 bg-black/60 z-20 pointer-events-none" />}

      {/* Nom unique de la carte en bas */}
      <div className="relative z-10 p-1 text-center bg-black/70 backdrop-blur-xs border-t border-white/10">
        <h3 className="font-extrabold text-[10px] text-white uppercase tracking-tight truncate">
          {cardData.name}
        </h3>
      </div>
    </div>
  );
}
