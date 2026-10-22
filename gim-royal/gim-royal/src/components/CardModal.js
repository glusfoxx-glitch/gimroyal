export default function CardModal({ card, onClose, onSelect }) {
  if (!card) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border-2 border-purple-500 rounded-2xl p-6 max-w-sm w-full text-white relative">
        <button onClick={onClose} className="absolute top-2 right-4 text-gray-400 hover:text-white font-bold text-xl">X</button>
        <h2 className="text-2xl font-black text-center mb-4 uppercase">{card.name}</h2>
        
        <img src={card.image} alt={card.name} className="w-full h-48 object-contain rounded-lg mb-4 drop-shadow-lg" />
        
        <div className="flex justify-around bg-gray-900 p-3 rounded-lg mb-4 font-bold border border-gray-700">
          <span>💧 {card.cost}</span>
          <span>❤️ {card.hp}</span>
          <span>⚔️ {card.damage}</span>
        </div>
        
        <p className="text-gray-300 text-sm text-center mb-6 italic">{card.description}</p>
        
        <button onClick={() => onSelect(card)} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-colors">
          Choisir cette carte
        </button>
      </div>
    </div>
  );
}

