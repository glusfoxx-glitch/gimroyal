export default function CardModal({ card, onClose, onSelect }) {
  if (!card) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 border-2 border-purple-500 rounded-2xl p-6 max-w-md w-full text-white relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-4 text-gray-400 hover:text-white font-bold text-xl">✕</button>
        
        <div className="flex gap-4 items-start mb-4">
          <img src={`/images/${card.id}.png`} alt={card.name} className="w-24 h-24 object-cover rounded-lg bg-gray-900 border border-gray-700" />
          <div>
            <h2 className="text-2xl font-black uppercase">{card.name}</h2>
            <p className="text-purple-400 text-sm font-bold">{card.title}</p>
            <p className="text-gray-300 text-xs mt-1">Coût en Élixir : {card.cost}</p>
          </div>
        </div>
        
        <div className="bg-gray-900 p-3 rounded-lg mb-4 text-sm border border-gray-700 space-y-2">
          <p className="italic text-gray-300">{card.description}</p>
          {card.cibleEtPortee && <p><b>Cible et Portée :</b> {card.cibleEtPortee}</p>}
          {card.vitesseEtPv && <p><b>Vitesse et PV :</b> {card.vitesseEtPv}</p>}
          {card.mecanique && <p><b>Mécanique Spéciale :</b> {card.mecanique}</p>}
        </div>

        <div className="flex justify-around bg-black/50 p-3 rounded-lg mb-6 font-bold border border-gray-700 text-sm">
          {card.stats?.hp && <span className="text-red-400">❤️ PV: {card.stats.hp}</span>}
          {card.stats?.damage && <span className="text-orange-400">⚔️ Dégâts: {card.stats.damage}</span>}
          {card.stats?.speed && <span className="text-blue-400">⚡ Vit: {card.stats.speed}</span>}
        </div>
        
        {onSelect && (
          <button onClick={() => onSelect(card)} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-colors text-lg uppercase tracking-wide">
            Choisir cette carte
          </button>
        )}
      </div>
    </div>
  );
}
           
