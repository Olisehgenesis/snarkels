'use client';

import React, { useState, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  BookOpen,
  Settings,
  Zap,
  Upload,
  FileText,
  Type,
  File
} from 'lucide-react';

interface AIGenerateSnarkelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (quizData: any) => void;
}

interface QuizData {
  title: string;
  description: string;
  questions: Array<{
    question: string;
    options: {
      A: string;
      B: string;
      C: string;
      D: string;
    };
    correctAnswer: string;
    explanation: string;
  }>;
}

export default function AIGenerateSnarkelModal({ 
  isOpen, 
  onClose, 
  onGenerate 
}: AIGenerateSnarkelModalProps) {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [generatedQuiz, setGeneratedQuiz] = useState<QuizData | null>(null);
  const [inputType, setInputType] = useState<'topic' | 'file' | 'text'>('topic');
  const [uploadedText, setUploadedText] = useState('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setUploadedText(text);
    };
    reader.readAsText(file);
  };

  const handleGenerate = async () => {
    if (inputType === 'topic' && !topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    if (inputType === 'file' && !uploadedText.trim()) {
      setError('Please upload a file first');
      return;
    }

    if (inputType === 'text' && !uploadedText.trim()) {
      setError('Please enter some text');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      let content = '';
      if (inputType === 'topic') {
        content = topic.trim();
      } else {
        content = uploadedText.trim();
      }

      const response = await fetch('/api/generate-snarkel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          inputType,
          difficulty,
          questionCount
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate quiz');
      }

      setGeneratedQuiz(data.quiz);
    } catch (err: any) {
      setError(err.message || 'Failed to generate quiz');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseQuiz = () => {
    if (generatedQuiz) {
      onGenerate(generatedQuiz);
      onClose();
    }
  };

  const handleReset = () => {
    setTopic('');
    setDifficulty('medium');
    setQuestionCount(5);
    setError('');
    setGeneratedQuiz(null);
    setUploadedText('');
    setFileName('');
    setInputType('topic');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-purple-500" />
            <h2 className="text-xl font-bold text-gray-800">AI Quiz Maker</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!generatedQuiz ? (
            /* Generation Form */
            <div className="space-y-6">
              {/* Input Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Choose Input Method
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setInputType('topic')}
                    className={`p-3 border rounded-lg flex flex-col items-center gap-2 transition-colors ${
                      inputType === 'topic' 
                        ? 'border-purple-500 bg-purple-50 text-purple-700' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Type className="w-5 h-5" />
                    <span className="text-sm">Topic</span>
                  </button>
                  <button
                    onClick={() => setInputType('file')}
                    className={`p-3 border rounded-lg flex flex-col items-center gap-2 transition-colors ${
                      inputType === 'file' 
                        ? 'border-purple-500 bg-purple-50 text-purple-700' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <File className="w-5 h-5" />
                    <span className="text-sm">File</span>
                  </button>
                  <button
                    onClick={() => setInputType('text')}
                    className={`p-3 border rounded-lg flex flex-col items-center gap-2 transition-colors ${
                      inputType === 'text' 
                        ? 'border-purple-500 bg-purple-50 text-purple-700' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                    <span className="text-sm">Text</span>
                  </button>
                </div>
              </div>

              {/* Topic Input */}
              {inputType === 'topic' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <BookOpen className="w-4 h-4 inline mr-2" />
                    Quiz Topic
                  </label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Enter a topic for your quiz (e.g., 'JavaScript Fundamentals', 'Crypto Basics', 'World History')"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
              )}

              {/* File Upload */}
              {inputType === 'file' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Upload className="w-4 h-4 inline mr-2" />
                    Upload Document
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.doc,.docx,.pdf,.md"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                    >
                      Choose File
                    </button>
                    {fileName && (
                      <div className="mt-3 text-sm text-gray-600">
                        <File className="w-4 h-4 inline mr-2" />
                        {fileName}
                      </div>
                    )}
                  </div>
                  {uploadedText && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        File Content Preview
                      </label>
                      <textarea
                        value={uploadedText}
                        onChange={(e) => setUploadedText(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        rows={4}
                        placeholder="File content will appear here..."
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Text Input */}
              {inputType === 'text' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FileText className="w-4 h-4 inline mr-2" />
                    Document Text
                  </label>
                  <textarea
                    value={uploadedText}
                    onChange={(e) => setUploadedText(e.target.value)}
                    placeholder="Paste your document text here or type your content..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={6}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Settings className="w-4 h-4 inline mr-2" />
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Zap className="w-4 h-4 inline mr-2" />
                    Questions (5-10)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="10"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-700">{error}</span>
                  </div>
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || (
                  (inputType === 'topic' && !topic.trim()) ||
                  (inputType === 'file' && !uploadedText.trim()) ||
                  (inputType === 'text' && !uploadedText.trim())
                )}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Quiz...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Quiz
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Generated Quiz Preview */
            <div className="space-y-6">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-green-700 font-medium">Quiz Generated Successfully!</span>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{generatedQuiz.title}</h3>
                <p className="text-gray-600 mb-4">{generatedQuiz.description}</p>
                
                <div className="space-y-4">
                  {generatedQuiz.questions.map((question, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-800 mb-3">
                        {index + 1}. {question.question}
                      </h4>
                      <div className="space-y-2">
                        {Object.entries(question.options).map(([key, value]) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                              key === question.correctAnswer 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {key}
                            </span>
                            <span className="text-gray-700">{value}</span>
                            {key === question.correctAnswer && (
                              <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-700">
                          <strong>Explanation:</strong> {question.explanation}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleUseQuiz}
                  className="flex-1 py-3 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Use This Quiz
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 py-3 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Generate New Quiz
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 