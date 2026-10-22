export default function GameCard({ card, onClick }) {
  if (!card) return null;

  // Définition automatique de la taille selon la masse du personnage définie dans cards.js
  let sizeClass = "w-36 h-52"; // Normal (mass 3 à 5)
  if (card.stats?.mass >= 6) sizeClass = "w-44 h-60 border-yellow-500 scale-105"; // Géant
  if (card.stats?.mass <= 2) sizeClass = "w-28 h-40 scale-95"; // Petit

  return (
    <div 
      onClick={onClick}
      className={`relative ${sizeClass} rounded-2xl border-2 border-gray-800 shadow-2xl overflow-hidden cursor-pointer transform hover:scale-105 hover:-translate-y-1 transition-all duration-200 bg-gray-900`}
    >
      <img 
        src={`/images/${card.id}.png`} 
        alt={card.name} 
        className="absolute inset-0 w-full h-full object-cover object-center"
        onError={(e) => {
          e.target.style.display = 'none'; // Cache l'image si elle n'est pas encore créée
        }}
      />
      
      <div className="absolute top-2 left-2 bg-purple-600 border-2 border-black text-white font-extrabold rounded-full w-9 h-9 flex items-center justify-center shadow-lg text-sm z-10">
        {card.cost}
      </div>

      <div className="absolute bottom-0 w-full bg-gradient-to-t from-black via-black/90 to-transparent pt-12 pb-3 px-2 text-white text-center z-10">
        <h3 className="font-black text-sm uppercase tracking-wide drop-shadow-md">
          {card.name}
        </h3>
        {card.stats?.hp && (
          <div className="flex justify-around items-center text-xs mt-2 font-bold bg-black/50 rounded-lg py-1 px-1 border border-white/10">
            <span className="text-red-400">❤️ {card.stats.hp}</span>
            {card.stats.damage && <span className="text-orange-400">⚔️ {card.stats.damage}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
