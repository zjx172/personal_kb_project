import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2, Edit, Eye } from 'lucide-react'
import { evaluationApi, EvaluationDataset } from '../api'
import DatasetForm from '../components/DatasetForm'

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<EvaluationDataset[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingDataset, setEditingDataset] = useState<EvaluationDataset | null>(null)

  useEffect(() => {
    loadDatasets()
  }, [])

  const loadDatasets = async () => {
    try {
      setLoading(true)
      const data = await evaluationApi.listDatasets()
      setDatasets(data)
    } catch (error) {
      console.error('加载数据集失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (data: {
    knowledge_base_id: string
    name: string
    description?: string
  }) => {
    try {
      await evaluationApi.createDataset(data)
      setShowForm(false)
      loadDatasets()
    } catch (error) {
      console.error('创建数据集失败:', error)
      alert('创建数据集失败')
    }
  }

  const handleUpdate = async (id: string, data: { name?: string; description?: string }) => {
    try {
      await evaluationApi.updateDataset(id, data)
      setEditingDataset(null)
      loadDatasets()
    } catch (error) {
      console.error('更新数据集失败:', error)
      alert('更新数据集失败')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个数据集吗？')) return
    try {
      await evaluationApi.deleteDataset(id)
      loadDatasets()
    } catch (error) {
      console.error('删除数据集失败:', error)
      alert('删除数据集失败')
    }
  }

  if (loading) {
    return <div className="text-center py-8">加载中...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">评估数据集</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          创建数据集
        </button>
      </div>

      {showForm && (
        <DatasetForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editingDataset && (
        <DatasetForm
          dataset={editingDataset}
          onSubmit={(data) => handleUpdate(editingDataset.id, data)}
          onCancel={() => setEditingDataset(null)}
        />
      )}

      {datasets.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          还没有数据集，创建一个开始吧
        </div>
      ) : (
        <div className="grid gap-4">
          {datasets.map((dataset) => (
            <div
              key={dataset.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {dataset.name}
                  </h3>
                  {dataset.description && (
                    <p className="text-gray-600 mb-2">{dataset.description}</p>
                  )}
                  <div className="text-sm text-gray-500">
                    知识库 ID: {dataset.knowledge_base_id}
                  </div>
                  <div className="text-sm text-gray-500">
                    创建时间: {new Date(dataset.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/datasets/${dataset.id}`}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    title="查看详情"
                  >
                    <Eye className="w-5 h-5" />
                  </Link>
                  <button
                    onClick={() => setEditingDataset(dataset)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                    title="编辑"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(dataset.id)}
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

