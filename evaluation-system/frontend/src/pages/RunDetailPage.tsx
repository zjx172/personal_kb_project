import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { evaluationApi, EvaluationRun, EvaluationResult } from '../api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [run, setRun] = useState<EvaluationRun | null>(null)
  const [results, setResults] = useState<EvaluationResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadRun()
      loadResults()
    }
  }, [id])

  useEffect(() => {
    if (run && (run.status === 'running' || run.status === 'pending')) {
      // 如果运行中，定期刷新
      const interval = setInterval(() => {
        loadRun()
        loadResults()
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [run?.status])

  const loadRun = async () => {
    if (!id) return
    try {
      const data = await evaluationApi.getRun(id)
      setRun(data)
    } catch (error) {
      console.error('加载运行记录失败:', error)
    }
  }

  const loadResults = async () => {
    if (!id) return
    try {
      setLoading(true)
      const data = await evaluationApi.getRunResults(id)
      setResults(data)
    } catch (error) {
      console.error('加载结果失败:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !run) {
    return <div className="text-center py-8">加载中...</div>
  }

  if (!run) {
    return <div className="text-center py-8">运行记录不存在</div>
  }

  // 准备图表数据
  const chartData = results.map((result, index) => {
    const data: any = { index: index + 1, question: result.question.substring(0, 20) + '...' }
    if (result.metrics) {
      Object.entries(result.metrics).forEach(([key, value]) => {
        data[key] = value
      })
    }
    return data
  })

  const metricNames = results.length > 0 && results[0].metrics
    ? Object.keys(results[0].metrics)
    : []

  return (
    <div>
      <div className="mb-6">
        <Link to="/runs" className="flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回运行列表
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">运行详情</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">状态</div>
            <div className="text-lg font-semibold">{run.status}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">进度</div>
            <div className="text-lg font-semibold">
              {run.completed_items} / {run.total_items}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">知识库 ID</div>
            <div className="text-sm">{run.knowledge_base_id}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">数据集 ID</div>
            <div className="text-sm">{run.dataset_id}</div>
          </div>
        </div>
        {run.metrics && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm font-medium text-gray-700 mb-2">平均指标：</div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(run.metrics).map(([key, value]) => (
                <div key={key} className="text-sm">
                  <span className="text-gray-600">{key}:</span>{' '}
                  <span className="font-semibold">
                    {(value.mean * 100).toFixed(1)}% (min: {(value.min * 100).toFixed(1)}%, max: {(value.max * 100).toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4">指标趋势</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="index" />
              <YAxis domain={[0, 1]} />
              <Tooltip />
              <Legend />
              {metricNames.map((metric) => (
                <Line
                  key={metric}
                  type="monotone"
                  dataKey={metric}
                  stroke={`#${Math.floor(Math.random() * 16777215).toString(16)}`}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4">详细结果 ({results.length})</h3>
        {results.length === 0 ? (
          <div className="text-center py-8 text-gray-500">暂无结果</div>
        ) : (
          <div className="space-y-4">
            {results.map((result) => (
              <div
                key={result.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="mb-2">
                  <div className="font-semibold text-gray-900">问题：</div>
                  <div className="text-gray-700">{result.question}</div>
                </div>
                {result.answer && (
                  <div className="mb-2">
                    <div className="font-semibold text-gray-900">答案：</div>
                    <div className="text-gray-700">{result.answer}</div>
                  </div>
                )}
                {result.metrics && (
                  <div className="mb-2">
                    <div className="font-semibold text-gray-900">指标：</div>
                    <div className="flex gap-4">
                      {Object.entries(result.metrics).map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className="text-gray-600">{key}:</span>{' '}
                          <span className="font-semibold">
                            {(value * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {result.context && result.context.length > 0 && (
                  <div>
                    <div className="font-semibold text-gray-900">上下文：</div>
                    <div className="text-sm text-gray-600">
                      {result.context.length} 个片段
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

