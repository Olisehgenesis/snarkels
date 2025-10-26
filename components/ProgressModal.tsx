import React from 'react';
import { CheckCircle, XCircle, Loader2, AlertCircle, Trophy, Database, Smartphone, Shield } from 'lucide-react';

interface CreationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
  error?: string;
}

interface ProgressModalProps {
  isOpen: boolean;
  steps: CreationStep[];
  currentStep: number;
  onClose: () => void;
  onRetry?: () => void;
  className?: string;
}

const getStepIcon = (stepId: string, status: CreationStep['status']) => {
  const baseClasses = 'w-8 h-8 rounded-full flex items-center justify-center';
  
  switch (status) {
    case 'completed':
      return <CheckCircle className={`${baseClasses} bg-green-500 text-white`} />;
    case 'loading':
      return <Loader2 className={`${baseClasses} bg-blue-500 text-white animate-spin`} />;
    case 'error':
      return <XCircle className={`${baseClasses} bg-red-500 text-white`} />;
    default:
      return <div className={`${baseClasses} bg-gray-300 text-gray-600`} />;
  }
};

const getStepIconByType = (stepId: string) => {
  switch (stepId) {
    case 'create-quiz':
      return <Database className="w-4 h-4" />;
    case 'validate-token':
      return <Shield className="w-4 h-4" />;
    case 'deploy-session':
      return <Smartphone className="w-4 h-4" />;
    case 'update-database':
      return <Database className="w-4 h-4" />;
    default:
      return <Trophy className="w-4 h-4" />;
  }
};

export const ProgressModal: React.FC<ProgressModalProps> = ({
  isOpen,
  steps,
  currentStep,
  onClose,
  onRetry,
  className = '',
}) => {
  if (!isOpen) return null;

  const hasErrors = steps.some(step => step.status === 'error');
  const isCompleted = steps.every(step => step.status === 'completed');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100 ${className}`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-4 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Trophy size={20} />
            </div>
            <div>
              <h3 className="font-handwriting text-lg font-bold">
                {hasErrors ? 'Creation Failed' : isCompleted ? 'Creation Complete!' : 'Creating Reward Session'}
              </h3>
              <p className="text-purple-100 text-sm">
                {hasErrors ? 'Some steps failed' : isCompleted ? 'Your quiz is ready!' : 'Setting up rewards...'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-start gap-3">
                {/* Step icon */}
                <div className="flex-shrink-0">
                  {getStepIcon(step.id, step.status)}
                </div>
                
                {/* Step content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-handwriting font-bold text-gray-900">
                      {step.title}
                    </span>
                    {step.status === 'loading' && (
                      <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                        In Progress
                      </span>
                    )}
                    {step.status === 'completed' && (
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                        Complete
                      </span>
                    )}
                    {step.status === 'error' && (
                      <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                        Failed
                      </span>
                    )}
                  </div>
                  
                  <p className="font-handwriting text-sm text-gray-600 mb-2">
                    {step.description}
                  </p>
                  
                  {/* Error message */}
                  {step.status === 'error' && step.error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="font-handwriting text-sm text-red-700">
                          {step.error}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="mt-6">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>Progress</span>
              <span>{steps.filter(s => s.status === 'completed').length} of {steps.length}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(steps.filter(s => s.status === 'completed').length / steps.length) * 100}%` 
                }}
              />
            </div>
          </div>

          {/* Success message */}
          {isCompleted && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="font-handwriting font-bold text-green-800">
                    Reward session created successfully!
                  </p>
                  <p className="font-handwriting text-sm text-green-600">
                    Your quiz is now ready with reward functionality.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error summary */}
          {hasErrors && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-handwriting font-bold text-red-800">
                    Creation failed
                  </p>
                  <p className="font-handwriting text-sm text-red-600">
                    Some steps encountered errors. You can retry or continue without rewards.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex gap-3">
          {hasErrors && onRetry && (
            <button
              onClick={onRetry}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-handwriting font-bold"
            >
              Retry Failed Steps
            </button>
          )}
          
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg transition-colors font-handwriting font-medium ${
              hasErrors 
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-purple-500 text-white hover:bg-purple-600'
            }`}
          >
            {hasErrors ? 'Continue Without Rewards' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}; 