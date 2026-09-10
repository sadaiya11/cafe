import { useState } from 'react';

export default function PosMenuGrid({ products, onAddToCart }) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Categories list
  const categories = ['ALL', ...new Set(products.map(p => p.category))];

  // Filter products by category & search
  const filteredProducts = products.filter(product => {
    const title = product.title || product.name || '';
    const desc = product.description || '';
    const matchesCat = selectedCategory === 'ALL' || product.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      desc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col p-4 space-y-4 overflow-hidden bg-[#090d16]">
      
      {/* Category Pills & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        
        {/* Category Pill Buttons */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 scale-105'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Quick Search Input */}
        <div className="relative min-w-[200px]">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-sm">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search food item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

      </div>

      {/* Grid of Product Cards */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl">
            <div className="text-4xl mb-2">🔍</div>
            <p className="text-sm font-bold text-slate-400">No items match your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product) => {
              const isInStock = product.inStock !== false;
              const title = product.title || product.name;
              const price = product.variants?.[0]?.price ?? product.price ?? 0;
              const image = product.variants?.[0]?.image || product.image;
              const key = product.id || product.slug || title;

              const cartItemFormat = {
                id: key,
                name: title,
                title: title,
                price: Number(price),
                image: image,
                category: product.category
              };

              return (
                <button
                  key={key}
                  disabled={!isInStock}
                  onClick={() => onAddToCart(cartItemFormat)}
                  className={`bg-slate-900/90 border rounded-2xl p-3 flex flex-col justify-between text-left transition-all active:scale-95 group relative overflow-hidden ${
                    isInStock 
                      ? 'border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/80 cursor-pointer shadow-lg' 
                      : 'border-slate-800/50 opacity-40 cursor-not-allowed'
                  }`}
                >
                  {/* Item Image / Emoji */}
                  <div className="w-full h-24 bg-slate-950 rounded-xl overflow-hidden mb-2.5 border border-slate-800/80 flex items-center justify-center relative">
                    {image ? (
                      <img 
                        src={image} 
                        alt={title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <span className="text-3xl">☕</span>
                    )}

                    {/* Stock Status Badge */}
                    <span className={`absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold text-white shadow ${
                      isInStock ? 'bg-emerald-500/90' : 'bg-rose-500/90'
                    }`}>
                      {isInStock ? 'AVAILABLE' : 'OUT OF STOCK'}
                    </span>

                    {/* Quick Add Overlay Badge */}
                    {isInStock && (
                      <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">
                          +
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Category Tag */}
                  <div className="text-[9px] font-bold uppercase text-amber-400 tracking-wider">
                    {product.category}
                  </div>

                  {/* Product Title */}
                  <h3 className="text-xs font-bold text-white line-clamp-1 mt-0.5 group-hover:text-amber-300">
                    {title}
                  </h3>

                  {/* Price Footer */}
                  <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                    <span className="text-sm font-black text-amber-400">
                      ₹{price}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                      isInStock ? 'bg-slate-800 text-slate-300' : 'bg-rose-950 text-rose-400'
                    }`}>
                      {isInStock ? 'TAP +' : 'UNAVAILABLE'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
