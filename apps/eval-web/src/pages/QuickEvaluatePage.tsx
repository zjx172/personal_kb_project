import { useState } from 'react'
import { Play } from 'lucide-react'
import { evaluationApi } from '../api'

export default function QuickEvaluatePage() {
  const [questions, setQuestions] = useState<string[]>([''])
  const [groundTruths, setGroundTruths] = useState<string[]>([''])
  const [knowledgeBaseId, setKnowledgeBaseId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const addQuestion = () => {
    setQuestions([...questions, ''])
    setGroundTruths([...groundTruths, ''])
  }

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index))
    setGroundTruths(groundTruths.filter((_, i) => i !== index))
  }

  const updateQuestion = (index: number, value: string) => {
    const newQuestions = [...questions]
    newQuestions[index] = value
    setQuestions(newQuestions)
  }

  const updateGroundTruth = (index: number, value: string) => {
    const newGroundTruths = [...groundTruths]
    newGroundTruths[index] = value
    setGroundTruths(newGroundTruths)
  }

  const handleSubmit = async () => {
    const validQuestions = questions.filter(q => q.trim())
    if (validQuestions.length === 0) {
      alert('请至少添加一个问题')
      return
    }

    try {
      setLoading(true)
      const validGroundTruths = groundTruths
        .slice(0, validQuestions.length)
        .map(gt => gt.trim() || undefined)
      
      const response = await evaluationApi.quickEvaluate({
        questions: validQuestions,
        ground_truths: validGroundTruths.length > 0 ? validGroundTruths : undefined,
        knowledge_base_id: knowledgeBaseId.trim() || undefined,
      })
      setResult(response)
    } catch (error) {
      console.error('评估失败:', error)
      alert('评估失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">快速评估</h2>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            知识库 ID（可选）
          </label>
          <input
            type="text"
            value={knowledgeBaseId}
            onChange={(e) => setKnowledgeBaseId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="留空则使用默认知识库"
          />
        </div>

        <div className="space-y-4">
          {questions.map((question, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  问题 {index + 1}
                </span>
                {questions.length > 1 && (
                  <button
                    onClick={() => removeQuestion(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    删除
                  </button>
                )}
              </div>
              <div className="mb-2">
                <label className="block text-sm text-gray-600 mb-1">问题</label>
                <textarea
                  value={question}
                  onChange={(e) => updateQuestion(index, e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="输入问题..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  参考答案（可选）
                </label>
                <textarea
                  value={groundTruths[index]}
                  onChange={(e) => updateGroundTruth(index, e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="输入参考答案（用于计算 context_recall）..."
                />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addQuestion}
          className="mt-4 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
        >
          + 添加问题
        </button>
      </div>

      <div className="flex justify-end mb-6">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300"
        >
          <Play className="w-4 h-4 mr-2" />
          {loading ? '评估中...' : '开始评估'}
        </button>
      </div>

      {result && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">评估结果</h3>
          {result.success ? (
            <div>
              {result.metrics_summary && (
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">指标摘要：</div>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(result.metrics_summary).map(([key, value]: [string, any]) => (
                      <div key={key} className="border border-gray-200 rounded-lg p-3">
                        <div className="text-sm font-medium text-gray-900 mb-1">{key}</div>
                        <div className="text-xs text-gray-600">
                          平均: {(value.mean * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-600">
                          范围: {(value.min * 100).toFixed(1)}% - {(value.max * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-600">
                          数量: {value.count}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="text-sm text-gray-600">
                总评估项数: {result.total_items}
              </div>
            </div>
          ) : (
            <div className="text-red-600">
              评估失败: {result.error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

