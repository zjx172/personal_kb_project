import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { EvaluationDataItem } from '../api'

interface DataItemFormProps {
  item?: EvaluationDataItem | null
  onSubmit: (data: {
    question: string
    ground_truth?: string
    context_doc_ids?: string[]
  }) => void
  onCancel: () => void
}

export default function DataItemForm({ item, onSubmit, onCancel }: DataItemFormProps) {
  const [question, setQuestion] = useState('')
  const [groundTruth, setGroundTruth] = useState('')
  const [contextDocIds, setContextDocIds] = useState('')

  useEffect(() => {
    if (item) {
      setQuestion(item.question)
      setGroundTruth(item.ground_truth || '')
      setContextDocIds(item.context_doc_ids?.join(', ') || '')
    }
  }, [item])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) {
      alert('请填写问题')
      return
    }
    onSubmit({
      question: question.trim(),
      ground_truth: groundTruth.trim() || undefined,
      context_doc_ids: contextDocIds.trim()
        ? contextDocIds.split(',').map((id) => id.trim()).filter(Boolean)
        : undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {item ? '编辑数据项' : '添加数据项'}
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
              问题 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              参考答案（可选）
            </label>
            <textarea
              value={groundTruth}
              onChange={(e) => setGroundTruth(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="用于计算 context_recall 指标"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              相关文档 ID（可选，逗号分隔）
            </label>
            <input
              type="text"
              value={contextDocIds}
              onChange={(e) => setContextDocIds(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="doc-id-1, doc-id-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              用于计算 context_recall 指标
            </p>
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
              {item ? '更新' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

