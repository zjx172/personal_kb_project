import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Plus, Trash2, Edit, Play } from 'lucide-react'
import { evaluationApi, EvaluationDataset, EvaluationDataItem } from '../api'
import DataItemForm from '../components/DataItemForm'

export default function DatasetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [dataset, setDataset] = useState<EvaluationDataset | null>(null)
  const [items, setItems] = useState<EvaluationDataItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<EvaluationDataItem | null>(null)

  useEffect(() => {
    if (id) {
      loadDataset()
      loadItems()
    }
  }, [id])

  const loadDataset = async () => {
    if (!id) return
    try {
      const data = await evaluationApi.getDataset(id)
      setDataset(data)
    } catch (error) {
      console.error('加载数据集失败:', error)
    }
  }

  const loadItems = async () => {
    if (!id) return
    try {
      setLoading(true)
      const data = await evaluationApi.listDataItems(id)
      setItems(data)
    } catch (error) {
      console.error('加载数据项失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (data: {
    question: string
    ground_truth?: string
    context_doc_ids?: string[]
  }) => {
    if (!id) return
    try {
      await evaluationApi.createDataItem(id, data)
      setShowForm(false)
      loadItems()
    } catch (error) {
      console.error('创建数据项失败:', error)
      alert('创建数据项失败')
    }
  }

  const handleUpdate = async (itemId: string, data: {
    question?: string
    ground_truth?: string
    context_doc_ids?: string[]
  }) => {
    if (!id) return
    try {
      await evaluationApi.updateDataItem(id, itemId, data)
      setEditingItem(null)
      loadItems()
    } catch (error) {
      console.error('更新数据项失败:', error)
      alert('更新数据项失败')
    }
  }

  const handleDelete = async (itemId: string) => {
    if (!confirm('确定要删除这个数据项吗？')) return
    if (!id) return
    try {
      await evaluationApi.deleteDataItem(id, itemId)
      loadItems()
    } catch (error) {
      console.error('删除数据项失败:', error)
      alert('删除数据项失败')
    }
  }

  const handleRunEvaluation = async () => {
    if (!id || !dataset) return
    try {
      const run = await evaluationApi.createRun({
        knowledge_base_id: dataset.knowledge_base_id,
        dataset_id: id,
      })
      window.location.href = `/runs/${run.id}`
    } catch (error) {
      console.error('启动评估失败:', error)
      alert('启动评估失败')
    }
  }

  if (loading) {
    return <div className="text-center py-8">加载中...</div>
  }

  if (!dataset) {
    return <div className="text-center py-8">数据集不存在</div>
  }

  return (
    <div>
      <div className="mb-6">
        <Link to="/datasets" className="text-blue-600 hover:text-blue-800">
          ← 返回数据集列表
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {dataset.name}
            </h2>
            {dataset.description && (
              <p className="text-gray-600">{dataset.description}</p>
            )}
            <div className="text-sm text-gray-500 mt-2">
              知识库 ID: {dataset.knowledge_base_id}
            </div>
          </div>
          <button
            onClick={handleRunEvaluation}
            disabled={items.length === 0}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4 mr-2" />
            运行评估
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">评估数据项 ({items.length})</h3>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          添加数据项
        </button>
      </div>

      {showForm && (
        <DataItemForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingItem && (
        <DataItemForm
          item={editingItem}
          onSubmit={(data) => handleUpdate(editingItem.id, data)}
          onCancel={() => setEditingItem(null)}
        />
      )}

      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          还没有数据项，添加一个开始吧
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    {item.question}
                  </h4>
                  {item.ground_truth && (
                    <div className="mb-2">
                      <span className="text-sm font-medium text-gray-700">参考答案：</span>
                      <p className="text-gray-600">{item.ground_truth}</p>
                    </div>
                  )}
                  {item.context_doc_ids && item.context_doc_ids.length > 0 && (
                    <div className="text-sm text-gray-500">
                      相关文档: {item.context_doc_ids.join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingItem(item)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                    title="编辑"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="删除"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

