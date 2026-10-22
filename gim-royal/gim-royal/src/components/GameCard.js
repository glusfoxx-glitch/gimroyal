export default function GameCard({ name, image, cost, hp, damage, onClick }) {
  return (
    <div 
      onClick={onClick}
      className="relative w-32 h-44 rounded-xl border-2 border-gray-800 shadow-xl overflow-hidden cursor-pointer transform hover:scale-105 transition-transform bg-gray-900"
    >
      <img src={image} alt={name} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute top-1 left-1 bg-purple-600 border border-black text-white font-bold rounded-full w-8 h-8 flex items-center justify-center shadow-md text-sm z-10">
        {cost}
      </div>
      <div className="absolute bottom-0 w-full bg-gradient-to-t from-black via-black/90 to-transparent pt-8 pb-2 px-2 text-white text-center z-10">
        <p className="font-black text-xs uppercase tracking-wider drop-shadow-md">{name}</p>
        <div className="flex justify-between text-[10px] mt-1 font-bold text-gray-300 px-1">
          <span>❤️ {hp}</span>
          <span>⚔️ {damage}</span>
        </div>
      </div>
    </div>
  );
}

