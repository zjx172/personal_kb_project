import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { EvaluationDataset } from '../api'

interface DatasetFormProps {
  dataset?: EvaluationDataset | null
  onSubmit: (data: { knowledge_base_id: string; name: string; description?: string }) => void
  onCancel: () => void
}

export default function DatasetForm({ dataset, onSubmit, onCancel }: DatasetFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [knowledgeBaseId, setKnowledgeBaseId] = useState('')

  useEffect(() => {
    if (dataset) {
      setName(dataset.name)
      setDescription(dataset.description || '')
      setKnowledgeBaseId(dataset.knowledge_base_id)
    }
  }, [dataset])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !knowledgeBaseId.trim()) {
      alert('请填写名称和知识库 ID')
      return
    }
    onSubmit({
      knowledge_base_id: knowledgeBaseId,
      name: name.trim(),
      description: description.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {dataset ? '编辑数据集' : '创建数据集'}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              知识库 ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={knowledgeBaseId}
              onChange={(e) => setKnowledgeBaseId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={!!dataset}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              数据集名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {dataset ? '更新' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

