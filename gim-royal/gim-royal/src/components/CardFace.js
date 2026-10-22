export default function GameCard({ card, onClick }) {
  if (!card) return null;

  let sizeClass = "w-36 h-52";
  if (card.stats?.mass >= 6) sizeClass = "w-44 h-60 border-yellow-500 scale-105";
  if (card.stats?.mass <= 2) sizeClass = "w-28 h-40 scale-95";

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
    <div 
      onClick={onClick}
      className={`relative ${sizeClass} rounded-2xl border-2 border-gray-800 shadow-2xl overflow-hidden cursor-pointer transform hover:scale-105 hover:-translate-y-1 transition-all duration-200 bg-gray-900`}
    >
      <img 
        src={getImageSource(card.id)} 
        alt={card.name} 
        className="absolute inset-0 w-full h-full object-cover object-center"
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
