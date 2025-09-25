'use client';

import { ShoppingList } from '@/lib/types';

interface ShoppingListProps {
  shoppingList: ShoppingList | null;
  loading?: boolean;
}

export default function ShoppingListDisplay({ shoppingList, loading = false }: ShoppingListProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-4">🛒 週間買い物リスト</h2>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!shoppingList) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">🛒 週間買い物リスト</h2>
        <div className="text-center py-8">
          <div className="text-gray-400 text-lg mb-2">🤖</div>
          <p className="text-gray-500">買い物リストを生成中...</p>
          <button className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
            買い物リストを生成
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">🛒 週間買い物リスト</h2>
        <div className="text-lg font-bold text-green-600">
          総額: ¥{shoppingList.totalCost.toLocaleString()}
        </div>
      </div>

      <div className="space-y-6">
        {shoppingList.categories.map((category, categoryIndex) => (
          <div key={categoryIndex} className="border-l-4 border-blue-500 pl-4">
            <h3 className="text-lg font-medium mb-3 text-gray-800">
              {category.name}
            </h3>
            
            <div className="grid gap-3">
              {category.items.map((item, itemIndex) => (
                <div key={itemIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        {item.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {item.amount}{item.unit}
                        {item.notes && (
                          <span className="ml-2 text-gray-500">({item.notes})</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      ¥{item.estimatedPrice.toLocaleString()}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                      item.priority === 'high' ? 'bg-red-100 text-red-800' :
                      item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {item.priority === 'high' ? '重要' :
                       item.priority === 'medium' ? '中' : '低'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 買い物のコツ */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-md font-medium mb-2 text-blue-800">💡 買い物のコツ</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 肉類は特売日を狙ってまとめ買いし、冷凍保存しましょう</li>
          <li>• 野菜は旬のものを選ぶと安価で栄養価も高くなります</li>
          <li>• 調味料は大容量パックが経済的です</li>
          <li>• 冷凍食品も上手に活用して時短調理を心がけましょう</li>
        </ul>
      </div>
    </div>
  );
}