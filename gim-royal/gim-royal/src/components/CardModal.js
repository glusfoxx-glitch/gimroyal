export default function CardModal({ card, onClose, onSelect }) {
  if (!card) return null;

  const getImageSource = (id) => {
    const images = {
      theo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300",
      vladimir: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300",
      nolan: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=300",
      matheo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=300",
      mohammed: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300",
      adam: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=300",
      ibrahima: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=300",
      yann: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=300",
      clement: "https://images.unsplash.com/photo-1500048993953-d23a436266cf?auto=format&fit=crop&q=80&w=300",
      aisha: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&q=80&w=300",
      celine: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&q=80&w=300",
      emircan: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&q=80&w=300",
      pasparfait: "https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?auto=format&fit=crop&q=80&w=300",
      alycia: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=300",
      aminematue: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=300",
      beti: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=300",
      bureau: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=300",
      poliakov: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=300",
      brioche: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=300"
    };
    return images[id] || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300";
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 border-2 border-purple-500 rounded-2xl p-6 max-w-md w-full text-white relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-4 text-gray-400 hover:text-white font-bold text-xl">✕</button>
        
        <div className="flex gap-4 items-start mb-4">
          <img src={getImageSource(card.id)} alt={card.name} className="w-24 h-24 object-cover rounded-lg bg-gray-900 border border-gray-700" />
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
           
