import { CARDS } from '@shared/cards.js';

export default function CardFace({ card, id, size = "normal", dim, progress, selected, lifted }) {
  // Récupère les données de la carte soit par l'objet `card`, soit par l'ID
  const cardData = card || CARDS[id] || { id: id, name: id, cost: "?", stats: {} };

  let sizeClass = "w-36 h-52";
  if (cardData.stats?.mass >= 6) sizeClass = "w-44 h-60 border-yellow-500 scale-105";
  if (cardData.stats?.mass <= 2) sizeClass = "w-28 h-40 scale-95";

  if (size === "xs" || size === "sm") {
    sizeClass = "w-20 h-28 text-xs";
  } else if (size === "lg") {
    sizeClass = "w-48 h-64";
  }

  // Association directe avec de superbes artworks officiels Clash Royale selon l'ID
  const getOfficialArtwork = (cardId) => {
    const artworks = {
      theo: "https://api-assets.clashroyale.com/cards/300/mega-knight.png", // Tank costaud
      vladimir: "https://api-assets.clashroyale.com/cards/300/lumberjack.png", // Rusher rapide
      nolan: "https://api-assets.clashroyale.com/cards/300/magic-archer.png", // Sniper à distance
      matheo: "https://api-assets.clashroyale.com/cards/300/monk.png", // Soutien / Corps à corps
      mohammed: "https://api-assets.clashroyale.com/cards/300/electro-giant.png", // Colosse massif
      adam: "https://api-assets.clashroyale.com/cards/300/bandit.png", // Fonceur / Assassin
      ibrahima: "https://api-assets.clashroyale.com/cards/300/pekka.png", // Chevalier géant en armure
      yann: "https://api-assets.clashroyale.com/cards/300/royal-ghost.png", // Fantôme invisible
      clement: "https://api-assets.clashroyale.com/cards/300/fisherman.png", // Électrocuteur / Pêcheur
      aisha: "https://api-assets.clashroyale.com/cards/300/mega-minion.png", // Unité volante
      celine: "https://api-assets.clashroyale.com/cards/300/hunter.png", // Stratège
      emircan: "https://api-assets.clashroyale.com/cards/300/valkyrie.png", // Combattant
      pasparfait: "https://api-assets.clashroyale.com/cards/300/musketeer.png", // Canonnier
      alycia: "https://api-assets.clashroyale.com/cards/300/ice-spirit.png", // Supportrice rapide
      aminematue: "https://api-assets.clashroyale.com/cards/300/goblins.png", // Sapeur gobelin
      beti: "https://api-assets.clashroyale.com/cards/300/elixir-collector.png", // Bâtiment
      bureau: "https://api-assets.clashroyale.com/cards/300/inferno-tower.png", // Tour de l'enfer
      poliakov: "https://api-assets.clashroyale.com/cards/300/rage.png", // Sort de rage
      brioche: "https://api-assets.clashroyale.com/cards/300/heal-spirit.png" // Sort de soin
    };
    return artworks[cardId] || "https://api-assets.clashroyale.com/cards/300/knight.png";
  };

  return (
    <div className={`relative ${sizeClass} rounded-2xl border-2 border-gray-800 shadow-2xl overflow-hidden cursor-pointer bg-gray-900 select-none transition-transform duration-150 ${selected ? 'ring-4 ring-purple-500 -translate-y-2' : ''} ${lifted ? 'opacity-40' : ''}`}>
      
      {/* L'image officielle de la carte */}
      <img 
        src={getOfficialArtwork(cardData.id)} 
        alt={cardData.name} 
        className="absolute inset-0 w-full h-full object-cover object-center"
      />
      
      {/* Ombre portée pour la lisibilité */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* Coût d'élixir */}
      {cardData.cost !== undefined && (
        <div className="absolute top-2 left-2 bg-purple-600 border-2 border-black text-white font-extrabold rounded-full w-8 h-8 flex items-center justify-center shadow-lg text-xs z-10">
          {cardData.cost}
        </div>
      )}

      {/* Barre de progression si pas assez d'élixir */}
      {dim && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] z-20 pointer-events-none" />
      )}

      {/* Nom et Stats en bas */}
      <div className="absolute bottom-0 w-full bg-gradient-to-t from-black via-black/90 to-transparent pt-10 pb-2 px-2 text-white text-center z-30">
        <h3 className="font-black text-xs uppercase tracking-wide drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)] truncate">
          {cardData.name}
        </h3>
        {cardData.stats?.hp && size !== "xs" && (
          <div className="flex justify-around items-center text-[10px] mt-1 font-bold bg-black/60 rounded py-0.5 px-1 border border-white/10">
            <span className="text-red-400">❤️ {cardData.stats.hp}</span>
            {cardData.stats?.damage && <span className="text-orange-400">⚔️ {cardData.stats.damage}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
